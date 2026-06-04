#!/usr/bin/env bash
# ============================================================
# RA1 Universal Docker Launcher for Linux/macOS
# Run from project root:
#   ./run.sh help              — Show this help
#   ./run.sh init              — First-time setup: copy .env and generate secrets
#   ./run.sh dev               — Start dev stack and open browser
#   ./run.sh status            — Show health of all running services
#   ./run.sh up                — Start all services
#   ./run.sh up-min            — Start only essentials (postgres, valkey)
#   ./run.sh up-canvas         — Start canvas + API + infra
#   ./run.sh down              — Stop all services
#   ./run.sh build             — Build all images
#   ./run.sh rebuild           — Force rebuild all images
#   ./run.sh logs [service]    — Tail logs
#   ./run.sh ps                — Show running services
#   ./run.sh restart           — Restart all services
#   ./run.sh clean             — Stop + remove volumes (⚠️ destroys data!)
# ============================================================

set -euo pipefail

ACTION="${1:-help}"
SERVICE="${2:-}"

show_help() {
  cat <<EOF

========================================
  RA1 Universal Docker Launcher (Shell)
========================================

Usage:
  ./run.sh <action> [service]

Actions:
  init           First-time setup: copy .env and generate required secrets
  dev            Start dev stack (canvas + api + postgres + valkey + litellm) and open browser
  status         Show health of all running services
  up             Start all services
  up-min         Start only essentials (postgres, valkey)
  up-canvas      Start canvas + API + full infrastructure
  down           Stop all services
  build          Build all images
  rebuild        Force rebuild all images (no cache)
  logs [svc]     Tail logs (optionally for a specific service)
  ps             Show running services
  restart        Restart all services
  clean          Stop + remove ALL containers AND volumes (WARNING: DESTROYS DATA!)

Examples:
  ./run.sh up               # Start everything
  ./run.sh up-min           # Start only postgres + valkey
  ./run.sh logs canvas      # Follow canvas logs only

EOF
}

case "$ACTION" in
  help)
    show_help
    ;;
  init)
    echo "Initialising RA1..."

    if [ ! -f .env ]; then
      cp .env.example .env
      echo "Created .env from .env.example"
    else
      echo ".env already exists - skipping copy"
    fi

    source .env 2>/dev/null || true

    need_write=false

    auto_fill() {
      local key="$1"
      local val="$2"
      if grep -qE "^${key}=\s*$" .env; then
        sed -i.bak "s|^${key}=.*|${key}=${val}|" .env && rm -f .env.bak
        echo "  Generated ${key}"
        need_write=true
      fi
    }

    auto_fill "POSTGRES_PASSWORD"       "$(openssl rand -hex 16)"
    auto_fill "JWT_SECRET"              "$(openssl rand -hex 32)"
    auto_fill "INFISICAL_ENCRYPTION_KEY" "$(openssl rand -hex 16)"
    auto_fill "INFISICAL_AUTH_SECRET"   "$(openssl rand -hex 32)"

    if grep -qE "^LITELLM_MASTER_KEY=\s*$" .env; then
      sed -i.bak "s|^LITELLM_MASTER_KEY=.*|LITELLM_MASTER_KEY=sk-ra1-$(openssl rand -hex 12)|" .env && rm -f .env.bak
      echo "  Generated LITELLM_MASTER_KEY"
    fi

    echo ""
    echo "Init complete. Run './run.sh dev' to start."
    ;;
  dev)
    if [ ! -f .env ]; then
      echo "No .env found. Run './run.sh init' first."
      exit 1
    fi

    source .env 2>/dev/null || true
    missing=()
    for var in POSTGRES_PASSWORD LITELLM_MASTER_KEY JWT_SECRET; do
      if [ -z "${!var:-}" ]; then
        missing+=("$var")
      fi
    done
    if [ ${#missing[@]} -gt 0 ]; then
      echo "Missing required vars in .env: ${missing[*]}"
      echo "   Run './run.sh init' to auto-generate them."
      exit 1
    fi

    echo "Starting RA1 dev stack (canvas, api, postgres, valkey, litellm)..."
    docker compose up -d canvas api postgres valkey litellm

    echo ""
    echo "Waiting for API to be healthy..."
    attempts=0
    until docker compose exec -T api wget -q --spider http://127.0.0.1:3001/health/live 2>/dev/null; do
      attempts=$((attempts + 1))
      if [ $attempts -ge 30 ]; then
        echo "API didn't become healthy in time - check logs: ./run.sh logs api"
        break
      fi
      printf "."
      sleep 2
    done
    echo ""

    echo "RA1 is running:"
    echo "   Canvas  -> http://localhost:5173"
    echo "   API     -> http://localhost:3001"
    echo "   LiteLLM -> http://localhost:4000"
    echo ""
    echo "   Open Model Test -> http://localhost:5173 (click 'Model Test' tab)"
    echo ""

    URL="http://localhost:5173"
    if command -v open &>/dev/null; then
      open "$URL"
    elif command -v xdg-open &>/dev/null; then
      xdg-open "$URL" &
    elif command -v start &>/dev/null; then
      start "$URL"
    fi
    ;;
  status)
    echo ""
    echo "================================"
    echo "  RA1 Service Status"
    echo "================================"

    check() {
      local name="$1"
      local url="$2"
      local label="$3"
      if wget -q --spider --timeout=2 "$url" 2>/dev/null; then
        printf "  OK %-12s %s\n" "$name" "$label"
      else
        printf "  FAIL %-12s %s\n" "$name" "$label (not reachable)"
      fi
    }

    check "Canvas"   "http://localhost:5173" "-> http://localhost:5173"
    check "API"      "http://localhost:3001/health" "-> http://localhost:3001/health"
    check "LiteLLM"  "http://localhost:4000" "-> http://localhost:4000"

    echo ""
    docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || docker compose ps
    echo ""
    ;;
  up)
    echo "🚀 Starting all RA1 services..."
    docker compose up -d
    ;;
  up-min)
    echo "🚀 Starting minimal stack (postgres, valkey)..."
    docker compose up -d postgres valkey
    ;;
  up-canvas)
    echo "🚀 Starting canvas + API + infrastructure..."
    docker compose up -d canvas api
    ;;
  down)
    echo "🛑 Stopping all RA1 services..."
    docker compose down
    ;;
  build)
    echo "🔨 Building all images..."
    docker compose build
    ;;
  rebuild)
    echo "🔨 Force rebuilding all images (no cache)..."
    docker compose build --no-cache
    ;;
  logs)
    if [ -n "$SERVICE" ]; then
      echo "📋 Following logs for '$SERVICE'..."
      docker compose logs -f "$SERVICE"
    else
      echo "📋 Following logs for all services..."
      docker compose logs -f
    fi
    ;;
  ps)
    docker compose ps
    ;;
  restart)
    echo "🔄 Restarting all services..."
    docker compose restart
    ;;
  clean)
    echo "⚠️  WARNING: This will remove ALL containers AND volumes (DATA LOSS)!"
    read -r -p "Are you sure? (y/N): " CONFIRM
    if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
      docker compose down -v
      echo "✅ Cleaned up."
    else
      echo "❌ Cancelled."
    fi
    ;;
  *)
    echo "Unknown action: $ACTION"
    show_help
    exit 1
    ;;
esac