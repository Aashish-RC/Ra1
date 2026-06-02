# RA1 — Setup & Run Instructions Manual

This guide covers everything you need to get the RA1 platform running on your local machine.

---

## System Requirements

- **OS**: Windows, macOS, or Linux
- **Node.js**: v18+ (v20 recommended)
- **Package Manager**: [pnpm](https://pnpm.io/installation) (install globally: `npm install -g pnpm`)
- **Docker**: [Docker Desktop](https://www.docker.com/products/docker-desktop/) with Docker Compose
- **RAM**: Minimum 8GB (16GB recommended for full stack)
- **Disk Space**: ~5GB for Docker images + dependencies

---

## Quick Install (5 Minutes)

### 1. Clone the Repository

```bash
git clone https://github.com/Aashish-RC/Ra1.git
cd Ra1
```

### 2. Install JavaScript Dependencies

```bash
# Install all workspace packages
pnpm install

# Install canvas frontend dependencies
cd canvas
pnpm install
cd ..
```

### 3. Configure Environment Files

```bash
# Backend configuration
cp ra1/.env.example ra1/.env

# Edit ra1/.env with your values (see "Configuration" section below)
# At minimum, set:
#   JWT_SECRET=<random-string>
#   OPENAI_API_KEY=sk-... (if using OpenAI)
```

```bash
# Frontend configuration (optional — defaults work out of the box)
cp canvas/.env.example canvas/.env
```

### 4. Start Everything with Docker (Universal)

The project now has a **single root-level `docker-compose.yml`** that orchestrates *all* services — infrastructure, API, and Canvas frontend — from one command.

**Option A: Full stack (everything — 12+ services)**
```bash
# From the project root (not ra1/)
docker compose up -d
```

**Option B: Minimal stack (development — postgres + valkey only)**
```bash
docker compose up -d postgres valkey
```

**Option C: Canvas + API + full infrastructure**
```bash
docker compose up -d canvas api
```

> ⏳ First run will download Docker images (~2-4GB). Subsequent runs are instant.
> 📌 The Canvas frontend is served at **http://localhost:5173** with hot-reload.

### 5. (Alternative) Run Natively Without Full Docker

If you prefer running the API and Canvas on your host machine:

```bash
# 1. Start only the infrastructure in Docker
docker compose up -d postgres valkey

# 2. Start the API server (separate terminal)
cd ra1 && pnpm --filter @ra1/api dev

# 3. Start the Canvas frontend (separate terminal)
cd canvas && pnpm dev
```

### 6. Open in Browser

Navigate to **[http://localhost:5173](http://localhost:5173)**

---

## Docker Services Reference

When you run `docker compose up -d` in `ra1/`, these services start:

| Service | Port | Description | Required? |
|---------|------|-------------|-----------|
| PostgreSQL | 5432 | Primary database | ✅ Required |
| Valkey | (internal) | Cache layer | ✅ Required |
| ClickHouse | 8123, 9000 | Analytics database | 🔶 Optional |
| Qdrant | 6333 | Vector database | 🔶 Optional |
| MinIO | 9090, 9091 | S3-compatible storage | 🔶 Optional |
| Ollama | 11434 | Local LLM inference | 🔶 Optional |
| LiteLLM | 4000 | Model proxy/endpoint | 🔶 Optional |
| Langfuse | 3002 | Observability & tracing | 🔶 Optional |
| LibreChat | 3080 | Chat UI | 🔶 Optional |
| Infisical | 8080 | Secret vault | 🔶 Optional |
| Redis | 6379 | Langfuse queue | 🔶 Optional |
| MongoDB | 27017 | LibreChat database | 🔶 Optional |
| API Server | 3001 | Core backend | ✅ Required (run separately) |

> For minimal development, only **PostgreSQL** and **Valkey** are strictly needed.

---

## Configuration

### Backend (`ra1/.env`)

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `JWT_SECRET` | ✅ Yes | JWT signing secret | (must set) |
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string | Auto-generated from POSTGRES_* vars |
| `LITELLM_MASTER_KEY` | 🔶 If using LiteLLM | LiteLLM admin key | `sk-ra1-litellm-master` |
| `OPENAI_API_KEY` | 🔶 If using OpenAI | OpenAI API key | — |
| `ANTHROPIC_API_KEY` | 🔶 If using Anthropic | Anthropic API key | — |
| `GEMINI_API_KEY` | 🔶 If using Google | Google Gemini API key | — |

### Frontend (`canvas/.env`)

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `VITE_API_URL` | 🔶 Only if backend not on :3001 | Backend API URL | `http://localhost:3001` |

---

## Usage Walkthrough

### 1. Canvas Workspace

The main view is the **Canvas** — a drag-and-drop workspace.

- On the **left sidebar**, you'll see the **Marketplace** with available AI providers.
- **Drag** a provider card (e.g., "OpenAI") onto the canvas.
- The provider node will expand automatically.

### 2. Adding an API Key

1. Click on a provider node to expand it (if collapsed).
2. Click **"+ Add API Key"**.
3. Paste your API key and click **"Save"**.
4. Click **"Test"** to verify connectivity.
5. The vault node shows all stored keys and their status.

### 3. Syncing Models

1. In an expanded provider node, click **"Sync Models"**.
2. Available models are fetched from the provider's API.
3. New models are flagged with a **NEW** badge.
4. Deprecated models are marked with **DEPR**.
5. Enable/disable individual models using the toggle switches.

### 4. Browsing Models

Click **"Models"** in the top navigation bar to open the Models page:

- Filter by **provider**, **capability**, or **search by name**.
- Toggle models on/off.
- See pricing, context window, and capabilities at a glance.
- Enable deprecated models if needed (toggle "Show deprecated").

### 5. Credential Vault

The **Credential Vault** node shows all stored API keys:

- Stored keys show **masked values** (only last 4 characters visible).
- Status indicator: green = valid, red = invalid, gray = untested.
- You can **revoke** a key at any time.

---

## Development

### Canvas (Frontend)

```bash
cd canvas
pnpm dev          # Start dev server on :5173
pnpm build        # Production build to dist/
pnpm preview      # Preview production build
pnpm lint         # Run linter (if configured)
```

### API (Backend)

```bash
cd ra1
pnpm --filter @ra1/api dev       # Dev mode with hot reload
pnpm --filter @ra1/api build     # TypeScript compilation
pnpm --filter @ra1/api start     # Run compiled code
```

### Docker Builds

```bash
# Build canvas image
cd canvas
docker build -t ra1-canvas .

# Build API image
cd ra1/api
docker build -t ra1-api .
```

---

## Troubleshooting

### "Cannot find module 'zustand'" (or similar)

Dependencies not installed:

```bash
cd canvas
pnpm install
```

### API server won't connect to PostgreSQL

Make sure Docker services are running:

```bash
cd ra1
docker compose ps
# postgres should be "Up" and "healthy"
```

### Canvas shows blank page / network errors

1. Check that the API server is running on port 3001.
2. Check browser console for CORS errors.
3. If using a custom API URL, update `VITE_API_URL` in `canvas/.env`.

### Docker containers keep restarting

Check logs:

```bash
cd ra1
docker compose logs <service-name>
# e.g., docker compose logs postgres
```

### Port already in use

If port 5173 or 3001 is taken, change them:
- Canvas: edit `canvas/vite.config.ts` → change `server.port`.
- API: set `API_PORT` in `ra1/.env`.

---

## Project Structure

```
Ra1/
├── canvas/                  # React + Vite frontend
│   ├── src/
│   │   ├── components/      # Sidebar, TopBar
│   │   ├── data/            # Provider registry, model definitions
│   │   ├── hooks/           # Changelog sync
│   │   ├── nodes/           # ModelNode, ProviderNode, VaultNode
│   │   ├── pages/           # ModelsPage
│   │   ├── services/        # model-discovery, vault.service
│   │   ├── store/           # Zustand stores (canvas, model, vault)
│   │   └── utils/           # Layout helpers
│   ├── public/              # Static assets
│   ├── Dockerfile
│   └── package.json
├── ra1/                     # Backend monorepo
│   ├── api/                 # Fastify API server
│   │   └── src/
│   │       ├── config/      # Bootstrap, secrets
│   │       ├── db/          # Database connections & migrations
│   │       ├── jobs/        # Background sync jobs
│   │       ├── lib/         # Logger
│   │       ├── middleware/  # Error handler
│   │       ├── modules/     # Route modules (health, vault, chat, etc.)
│   │       └── services/    # Service integrations
│   ├── packages/            # Shared packages (@ra1/types)
│   ├── infra/               # Docker init scripts
│   ├── services/            # Service configs
│   └── docker-compose.yml
├── pepper/                  # LibreChat config
├── README.md                # Project overview
└── SETUP.md                 # This file
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
              ┌─────────────────────────────┐
              │      Infrastructure         │
              │  (Docker containers)        │
              │  PostgreSQL │ Valkey        │
              │  ClickHouse │ Qdrant        │
              │  MinIO      │ Ollama        │
              │  LiteLLM    │ Langfuse      │
              │  LibreChat  │ Infisical     │
              └─────────────────────────────┘
```

---

## Support

- GitHub Issues: [https://github.com/Aashish-RC/Ra1/issues](https://github.com/Aashish-RC/Ra1/issues)
- For questions, open an issue or reach out to the repository maintainer.