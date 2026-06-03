# RA1 — Run Instructions Manual

This guide explains everything needed to get the RA1 platform running on your local machine.
It covers **Docker-based** deployment (recommended) and **native development** setups.

> ⚠️ **Note:** This file uses the *current* project structure. If paths like `apps/canvas/` or `apps/api/`
> seem unfamiliar, you may be looking at older documentation — those are the correct paths.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start — Docker (One Command)](#quick-start--docker-one-command)
- [Step-by-Step Setup](#step-by-step-setup)
  - [1. Clone & Install Dependencies](#1-clone--install-dependencies)
  - [2. Configure Environment](#2-configure-environment)
  - [3. Start Services](#3-start-services)
  - [4. Open the App](#4-open-the-app)
- [Run Methods](#run-methods)
  - [Method A: Docker Full Stack](#method-a-docker-full-stack-recommended)
  - [Method B: Docker Minimal (Development)](#method-b-docker-minimal-development)
  - [Method C: Native Development (Docker + Host)](#method-c-native-development-docker--host)
  - [Method D: Launcher Scripts](#method-d-launcher-scripts)
- [Accessing Services](#accessing-services)
- [Stopping & Cleaning Up](#stopping--cleaning-up)
- [Project Commands Reference](#project-commands-reference)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)

---

## Prerequisites

| Tool | Version | Purpose | Install Guide |
|------|---------|---------|---------------|
| **Node.js** | v18+ (v20 recommended) | Running JS/TS tooling | [nodejs.org](https://nodejs.org/) |
| **pnpm** | Latest | Package manager for monorepo | `npm install -g pnpm` |
| **Docker** | Latest | Container runtime | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **Docker Compose** | v2+ (comes with Docker Desktop) | Multi-container orchestration | Included with Docker Desktop |
| **Git** | Latest | Version control | [git-scm.com](https://git-scm.com/) |

**System Requirements:**
- **RAM:** Minimum 8 GB (16 GB recommended for full stack)
- **Disk Space:** ~5 GB for Docker images + dependencies

---

## Quick Start — Docker (One Command)

```bash
# From the project root (d:\tr\Ra1 or wherever you cloned):
docker compose up -d
```

That's it. This single command starts everything:
- **Infrastructure** — PostgreSQL, Valkey, ClickHouse, Qdrant, MinIO, Ollama, Redis, MongoDB
- **Service layer** — LiteLLM (port 4000), Langfuse (port 3002), LibreChat (port 3080), Infisical (port 8080)
- **API server** (port 3001)
- **Canvas frontend** (port 5173)

> ⏳ **First run:** Docker will pull ~2–4 GB of images. Subsequent runs are instant.

Once services are healthy, open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## Step-by-Step Setup

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/Aashish-RC/Ra1.git
cd Ra1

# Install root workspace dependencies (apps/api, packages/types)
pnpm install

# Install canvas frontend dependencies
cd apps/canvas
pnpm install
cd ../..
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your values.
# At minimum, set these for local development:
#   INFISICAL_SERVICE_TOKEN=    (can leave blank for now)
#   INFISICAL_SYSTEM_PROJECT_ID= (can leave blank)
#   INFISICAL_PROVIDERS_PROJECT_ID= (can leave blank)
#   INFISICAL_ENCRYPTION_KEY=   (generate: openssl rand -hex 16, must be 32 chars)
#   INFISICAL_AUTH_SECRET=      (generate: openssl rand -hex 16)
#   INFISICAL_DB_PASSWORD=      (set a password)
#
# For prompt local development without Infisical, many services work
# with default or empty values. See "Environment Variables" section below.
```

**Canvas (frontend) environment — optional, defaults work locally:**

```bash
cd apps/canvas
cp .env.example .env
cd ../..
```

### 3. Start Services

Pick one of the **Run Methods** below.

### 4. Open the App

Navigate to **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## Run Methods

### Method A: Docker Full Stack (Recommended)

Starts **every** service defined in `docker-compose.yml`.

```bash
# From project root
docker compose up -d
```

- All infrastructure + API + Canvas inside Docker
- Canvas at `http://localhost:5173`
- API at `http://localhost:3001`

### Method B: Docker Minimal (Development)

Starts only the essential infrastructure — good for development when you run the API and Canvas on your host machine.

```bash
# Start only PostgreSQL and Valkey
docker compose up -d postgres valkey

# Or start a broader minimal set
docker compose up -d postgres valkey clickhouse qdrant
```

### Method C: Native Development (Docker + Host)

Run infrastructure in Docker, but the API and Canvas on your host for fast hot-reload.

**Terminal 1 — Start infrastructure:**

```bash
docker compose up -d postgres valkey
```

**Terminal 2 — Start API server:**

```bash
# From project root
pnpm --filter @ra1/api dev
```

The API starts on port 3001 with hot-reload (via `tsx watch`).

**Terminal 3 — Start Canvas frontend:**

```bash
cd apps/canvas
pnpm dev
```

The Canvas starts on port 5173 with Vite hot-reload.

> 💡 **All-in-one command (without Docker):** If you only need the Canvas and API
> without Docker infrastructure, you can use:
> ```bash
> pnpm dev
> ```
> This runs `pnpm -r --parallel --filter=!@ra1/types dev` from the root, starting
> both `@ra1/api` and `@ra1/canvas` in parallel.

### Method D: Launcher Scripts

Platform-specific scripts that wrap common `docker compose` commands.

**Windows (PowerShell):**

```powershell
.\run.ps1 help          # Show available commands
.\run.ps1 up            # Start all services
.\run.ps1 up-min        # Start minimal stack (postgres, valkey)
.\run.ps1 up-canvas     # Start canvas + API + full infra
.\run.ps1 down          # Stop all services
.\run.ps1 logs          # Tail logs
.\run.ps1 logs canvas   # Tail canvas logs only
.\run.ps1 ps            # Show running services
.\run.ps1 restart       # Restart all services
.\run.ps1 clean         # Stop + remove volumes (⚠️ destroys data)
```

**Linux / macOS:**

```bash
chmod +x run.sh
./run.sh help           # Show available commands
./run.sh up             # Start all services
./run.sh up-min         # Start minimal stack (postgres, valkey)
./run.sh up-canvas      # Start canvas + API + full infra
./run.sh down           # Stop all services
./run.sh logs           # Tail logs
./run.sh logs canvas    # Tail canvas logs only
./run.sh ps             # Show running services
./run.sh clean          # Stop + remove volumes (⚠️ destroys data)
```

**Using Make (cross-platform):**

```bash
make help               # Show available commands
make up                 # Start all services
make up-min             # Start minimal stack (postgres, valkey)
make up-canvas          # Start canvas + API + full infra
make down               # Stop all services
make build              # Build all images
make logs               # Tail logs
make ps                 # Show running services
make clean              # Stop + remove volumes (⚠️ destroys data)
```

---

## Accessing Services

Once running, these services are available on your host:

| Service | URL / Port | Description |
|---------|------------|-------------|
| **Canvas** | [http://localhost:5173](http://localhost:5173) | Frontend UI (React + Vite) |
| **API** | [http://localhost:3001](http://localhost:3001) | Backend API (Fastify) |
| **API Health** | [http://localhost:3001/health](http://localhost:3001/health) | Health check endpoint |
| **LiteLLM** | [http://localhost:4000](http://localhost:4000) | Model proxy gateway |
| **Langfuse** | [http://localhost:3002](http://localhost:3002) | Observability & tracing |
| **LibreChat** | [http://localhost:3080](http://localhost:3080) | Chat UI |
| **Infisical** | [http://localhost:8080](http://localhost:8080) | Secret vault management |
| **MinIO Console** | [http://localhost:9091](http://localhost:9091) | S3 storage UI |
| **PostgreSQL** | `localhost:5432` | Primary database |
| **Redis** | `localhost:6379` | In-memory cache (Langfuse) |
| **MongoDB** | `localhost:27017` | LibreChat database |
| **ClickHouse** | `localhost:8123` | Analytics database |
| **Qdrant** | `localhost:6333` | Vector database |

---

## Stopping & Cleaning Up

### Stop services (containers remain, data preserved)

```bash
docker compose down
# or
make down
# or
.\run.ps1 down
```

### Stop + remove volumes (⚠️ destroys all data)

```bash
docker compose down -v
# or
make clean
# or
.\run.ps1 clean
```

---

## Project Commands Reference

### Canvas (Frontend) — `apps/canvas/`

```bash
cd apps/canvas

pnpm dev          # Start dev server on port 5173 (hot-reload)
pnpm build        # Build for production
pnpm preview      # Preview the production build
pnpm start        # Alias for pnpm dev
```

### API (Backend) — workspace package `@ra1/api`

```bash
# From project root (using pnpm workspace filter)
pnpm --filter @ra1/api dev       # Dev mode with hot-reload (port 3001)
pnpm --filter @ra1/api build     # Compile TypeScript
pnpm --filter @ra1/api start     # Run compiled production build

# Or from apps/api/ directory
cd apps/api
pnpm dev
pnpm build
pnpm start
```

### Root Workspace Commands

```bash
pnpm dev          # Run all apps in parallel (except @ra1/types)
pnpm build        # Build types first, then all apps
pnpm typecheck    # Type-check all packages
pnpm lint         # Lint all packages
```

### Docker Builds

```bash
# Build Canvas image
cd apps/canvas
docker build -t ra1-canvas .

# Build API image
cd apps/api
docker build -t ra1-api .

# Build all via Docker Compose
docker compose build
```

---

## Environment Variables

### Root `.env` (Infrastructure & Backend)

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `INFISICAL_URL` | Yes | Infisical instance URL | `http://localhost:8080` |
| `INFISICAL_SERVICE_TOKEN` | For production | Infisical service token | — |
| `INFISICAL_ENCRYPTION_KEY` | Yes (32 chars) | Infisical encryption key (generate with `openssl rand -hex 16`) | — |
| `INFISICAL_AUTH_SECRET` | Yes | Infisical auth secret | — |
| `INFISICAL_DB_PASSWORD` | Yes | Infisical DB password | — |
| `POSTGRES_USER` | No | PostgreSQL username | `ra1` |
| `POSTGRES_DB` | No | PostgreSQL database name | `ra1` |
| `API_PORT` | No | API server port | `3001` |
| `NODE_ENV` | No | Environment mode | `development` |

For production, additional secrets must be stored in Infisical (see `.env.example` for the full list).

### Canvas — `apps/canvas/.env`

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `VITE_API_URL` | Only if API is not on `:3001` | Backend API URL | `http://localhost:3001` |

---

## Troubleshooting

### "Cannot find module 'zustand'" (or similar)

Dependencies are not installed:

```bash
cd apps/canvas
pnpm install
```

### API server won't connect to PostgreSQL

Ensure Docker infrastructure is running:

```bash
docker compose ps
# postgres should show "Up" and "healthy"
```

Check logs for the API:

```bash
docker compose logs api
# or for native dev, check the terminal output
```

### Canvas shows blank page / network errors

1. Check that the API server is running on port 3001.
2. Open browser **DevTools** (F12) → **Console** tab → look for errors.
3. If you see CORS errors, ensure `VITE_API_URL` in `apps/canvas/.env` matches your API address.
4. Try opening `http://localhost:3001/health` directly to verify the API responds.

### Docker containers keep restarting

Check logs for the failing container:

```bash
docker compose logs <service-name>
# Examples:
docker compose logs postgres
docker compose logs api
docker compose logs litellm
```

### Port already in use

If port 5173 (Canvas) or 3001 (API) is already taken:

- **Canvas:** Edit `apps/canvas/vite.config.ts` → change `server.port`.
- **API:** Set `API_PORT` in `.env` to a different value (e.g., `API_PORT=3002`).

Then restart the affected service.

### "pnpm: command not found"

pnpm is not installed globally:

```bash
npm install -g pnpm
```

### Docker: "Cannot connect to the Docker daemon"

Ensure Docker Desktop is running. On Windows, launch **Docker Desktop** from the Start menu and wait for it to show "Running" in the system tray.

### "wget: command not found" inside containers (Windows)

This is expected for some health checks on Windows containers. If the container still starts and shows as healthy after a few seconds, it's fine. If it stays unhealthy, check the specific service logs:

```bash
docker compose logs <service-name>
```

---

## Project Structure

```
Ra1/
├── .env.example              # Environment variable template
├── docker-compose.yml        # Universal orchestrator — runs everything
├── Makefile                  # Convenience commands (make up, make logs, etc.)
├── run.ps1                   # PowerShell launcher (Windows)
├── run.sh                    # Shell launcher (Linux/macOS)
├── pnpm-workspace.yaml       # pnpm workspace definition
├── package.json              # Root workspace package
│
├── apps/
│   ├── api/                  # Fastify backend server (port 3001)
│   │   ├── src/              # Source code (modules, services, routes)
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── canvas/               # React + Vite frontend (port 5173)
│       ├── src/
│       │   ├── components/   # Sidebar, TopBar, etc.
│       │   ├── nodes/        # ModelNode, ProviderNode, VaultNode
│       │   ├── pages/        # ModelsPage
│       │   ├── services/     # model-discovery, vault.service
│       │   ├── store/        # Zustand stores
│       │   └── utils/        # Layout helpers
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   └── types/                # Shared TypeScript types (@ra1/types)
│
├── services/
│   ├── infra/                # Docker init scripts (PostgreSQL init, ClickHouse init)
│   ├── litellm/              # LiteLLM proxy configuration
│   │   └── config.yaml
│   └── postgres/             # Multi-database init script
│
├── pepper/                   # LibreChat configuration
│   └── librechat.yaml
│
└── README.md                 # Project overview
```

---

## Architecture Overview

```
┌──────────────┐     ┌──────────────┐
│   Canvas     │────▶│   API Server │
│  (React,     │     │  (Fastify)   │
│   Vite)      │◀────│  port 3001   │
│  port 5173   │     └──────┬───────┘
└──────────────┘            │
                            ▼
              ┌──────────────────────────────────┐
              │       Infrastructure             │
              │   (Docker containers)            │
              │                                  │
              │  PostgreSQL  │  Valkey           │
              │  ClickHouse  │  Qdrant           │
              │  MinIO       │  Ollama           │
              │  LiteLLM     │  Langfuse         │
              │  LibreChat   │  Infisical        │
              │  Redis       │  MongoDB          │
              └──────────────────────────────────┘
```

The flow:
1. **Canvas** (React frontend) communicates with the **API Server** via REST.
2. **API Server** (Fastify) orchestrates business logic and proxies requests.
3. **LiteLLM** acts as a model proxy gateway to multiple AI providers (OpenAI, Anthropic, Google, Mistral, etc.).
4. **Infrastructure** services provide database, caching, vector storage, observability, and secrets management.

---

## Support

- **GitHub Issues:** [https://github.com/Aashish-RC/Ra1/issues](https://github.com/Aashish-RC/Ra1/issues)
- For questions, open an issue or reach out to the repository maintainer.