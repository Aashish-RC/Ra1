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

### 2. Configure Environment

```bash
cp .env.example .env
```

### 3. Fill in the 5 Quick Start Values

Edit `.env` and generate the required secrets:

```bash
# Generate each value with openssl:
openssl rand -hex 32   # for POSTGRES_PASSWORD, JWT_SECRET, INFISICAL_AUTH_SECRET
openssl rand -hex 16   # for LITELLM_MASTER_KEY (prefix with sk-ra1-), INFISICAL_ENCRYPTION_KEY
```

Set these values in `.env`:
- `POSTGRES_PASSWORD` — any password, e.g. `ra1local`
- `LITELLM_MASTER_KEY` — format: `sk-ra1-` followed by hex, e.g. `sk-ra1-a1b2c3d4e5f6a7b8`
- `JWT_SECRET` — 64 hex chars from `openssl rand -hex 32`
- `INFISICAL_ENCRYPTION_KEY` — 32 hex chars from `openssl rand -hex 16`
- `INFISICAL_AUTH_SECRET` — 64 hex chars from `openssl rand -hex 32`

### 4. Start Everything with Docker

```bash
# Minimal stack (postgres + valkey + api + canvas + litellm):
docker compose up -d canvas api postgres valkey litellm

# Or full stack (all services including optional ones):
docker compose up -d
```

> ⏳ First run will download Docker images (~2-4GB). Subsequent runs are instant.
> 📌 The Canvas frontend is served at **http://localhost:5173** with hot-reload.

### 5. Open in Browser

Navigate to **[http://localhost:5173](http://localhost:5173)** and click the **"Model Test"** tab.

### 6. Add a Provider Key and Test

1. In the Vault section, click **"Add Key"** (or use the Canvas → Vault node).
2. Enter your provider API key (e.g., OpenAI, Anthropic).
3. Click **"Test"** to verify connectivity.
4. Send a chat message to test the full flow.

---

## Docker Services Reference

When you run `docker compose up -d`, these services start:

| Service | Port | Description | Required? |
|---------|------|-------------|-----------|
| PostgreSQL | 5432 | Primary database | ✅ Required |
| Valkey | (internal) | Cache layer | ✅ Required |
| API Server | 3001 | Core backend | ✅ Required |
| Canvas | 5173 | Frontend UI | ✅ Required |
| LiteLLM | 4000 | Model proxy/endpoint | ✅ For model routing |
| Infisical | 8080 | Secret vault | 🔶 Optional (skip for quick start) |
| ClickHouse | 8123, 9000 | Analytics database | 🔶 Optional |
| Qdrant | 6333 | Vector database | 🔶 Optional |
| MinIO | 9090, 9091 | S3-compatible storage | 🔶 Optional |
| Ollama | 11434 | Local LLM inference | 🔶 Optional |
| Langfuse | 3002 | Observability & tracing | 🔶 Optional |
| LibreChat | 3080 | Chat UI | 🔶 Optional |
| Redis | 6379 | Langfuse queue | 🔶 Optional |
| MongoDB | 27017 | LibreChat database | 🔶 Optional |

> For minimal development, only **PostgreSQL** and **Valkey** are strictly needed.

---

## Configuration

### Environment Variables (`.env`)

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `POSTGRES_PASSWORD` | ✅ Yes | PostgreSQL password | (must set) |
| `JWT_SECRET` | ✅ Yes | JWT signing secret | (must set) |
| `LITELLM_MASTER_KEY` | ✅ For LiteLLM | LiteLLM admin key | `sk-ra1-litellm-master` |
| `INFISICAL_ENCRYPTION_KEY` | 🔶 For Infisical | Infisical encryption key | — |
| `INFISICAL_AUTH_SECRET` | 🔶 For Infisical | Infisical auth secret | — |
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
cd apps/canvas
pnpm dev          # Start dev server on :5173
pnpm build        # Production build to dist/
pnpm preview      # Preview production build
pnpm lint         # Run linter (if configured)
```

### API (Backend)

```bash
# From repo root:
pnpm --filter @ra1/api dev       # Dev mode with hot reload
pnpm --filter @ra1/api build     # TypeScript compilation
pnpm --filter @ra1/api start     # Run compiled code
```

### Docker Builds

```bash
# Build canvas image
docker build -f apps/canvas/Dockerfile -t ra1-canvas .

# Build API image
docker build -f apps/api/Dockerfile -t ra1-api .
```

---

## Troubleshooting

### "Cannot find module 'zustand'" (or similar)

Dependencies not installed:

```bash
cd apps/canvas
pnpm install
```

### API server won't connect to PostgreSQL

Make sure Docker services are running:

```bash
docker compose ps
# postgres should be "Up" and "healthy"
```

### Canvas shows blank page / network errors

1. Check that the API server is running on port 3001.
2. Check browser console for CORS errors.
3. If using a custom API URL, update `VITE_API_URL` in `.env`.

### Docker containers keep restarting

Check logs:

```bash
docker compose logs <service-name>
# e.g., docker compose logs postgres
```

### Port already in use

If port 5173 or 3001 is taken, change them:
- Canvas: edit `apps/canvas/vite.config.ts` → change `server.port`.
- API: set `API_PORT` in `.env`.

---

## Project Structure

```
Ra1/
├── apps/
│   ├── api/                    # Fastify API server
│   │   └── src/
│   │       ├── config/         # Bootstrap, secrets
│   │       ├── db/             # Database connections & migrations
│   │       ├── jobs/           # Background sync jobs
│   │       ├── lib/            # Logger
│   │       ├── middleware/     # Error handler
│   │       ├── modules/        # Route modules (health, vault, chat, etc.)
│   │       └── services/       # Service integrations (infisical, litellm, etc.)
│   └── canvas/                 # React + Vite frontend
│       ├── src/
│       │   ├── components/     # Sidebar, TopBar
│       │   ├── data/           # Provider registry, model definitions
│       │   ├── hooks/          # Changelog sync
│       │   ├── nodes/          # ModelNode, ProviderNode, VaultNode
│       │   ├── pages/          # ModelsPage, ModelTestPage
│       │   ├── services/       # model-discovery, vault.service
│       │   ├── store/          # Zustand stores (canvas, model, vault)
│       │   └── utils/          # Layout helpers
│       ├── public/             # Static assets
│       ├── Dockerfile
│       └── package.json
├── packages/
│   └── types/                  # Shared types (@ra1/types)
├── services/
│   ├── infra/                  # Docker init scripts
│   ├── litellm/                # LiteLLM configs
│   └── postgres/               # Multi-DB init script
├── pepper/                     # LibreChat config
├── docker-compose.yml           # Root orchestrator
├── .env.example                # Environment template
├── README.md                   # Project overview
└── SETUP.md                    # This file
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