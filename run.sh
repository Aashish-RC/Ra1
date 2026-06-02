#!/usr/bin/env bash
# ============================================================
# RA1 Universal Docker Launcher for Linux/macOS
# Run from project root:
#   ./run.sh help              — Show this help
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
  up             Start all services
  up-min         Start only essentials (postgres, valkey)
  up-canvas      Start canvas + API + full infrastructure
  down           Stop all services
  build          Build all images
  rebuild        Force rebuild all images (no cache)
  logs [svc]     Tail logs (optionally for a specific service)
  ps             Show running services
  restart        Restart all services
  clean          Stop + remove ALL containers AND volumes (⚠️ DESTROYS DATA!)

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