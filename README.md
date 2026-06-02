# RA1 — AI Workspace & Model Orchestration Platform

RA1 is a modular AI workspace that combines a **visual canvas interface** (React Flow) with a **Fastify-powered backend** for model discovery, credential management, chat, and observability. It integrates with multiple LLM providers (OpenAI, Anthropic, Google, Mistral, Cohere, Together AI, Groq) and infrastructure services (PostgreSQL, ClickHouse, Qdrant, MinIO, Langfuse, LiteLLM, LibreChat).

---

## 🚀 Quick Start — Universal Docker (One Command)

```bash
# From the project root — start EVERYTHING with one command:
docker compose up -d
```

That's it. This single command spins up:
- **Infrastructure** — PostgreSQL, Valkey, ClickHouse, Qdrant, MinIO, Ollama, Redis, MongoDB
- **Service layer** — LiteLLM (port 4000), Langfuse (port 3002), LibreChat (port 3080), Infisical (port 8080)
- **API server** (port 3001)
- **Canvas frontend** (port 5173)

Or start just what you need:

```bash
docker compose up -d postgres valkey        # Minimal backend only
docker compose up -d canvas api              # Canvas + API + full infra
```

> **Open in browser:** [http://localhost:5173](http://localhost:5173)

---

## Architecture

```
Ra1/                          # Project root
├── docker-compose.yml        # 🆕 Universal orchestrator — runs everything
├── Makefile                  # 🆕 Convenience commands (make up, make logs, etc.)
├── run.ps1                   # 🆕 PowerShell launcher (Windows)
├── run.sh                    # 🆕 Shell launcher (Linux/macOS)
├── canvas/                   # React + Vite frontend (React Flow workspace)
│   └── Dockerfile
├── ra1/
│   ├── api/                  # Fastify backend server
│   ├── packages/             # Shared packages (types)
│   ├── infra/                # Docker init scripts, configs
│   ├── services/             # Service configs (LiteLLM, etc.)
│   └── docker-compose.yml    # Backend service definitions
└── pepper/                   # LibreChat configuration
```

### Key Components

- **Canvas** — A drag-and-drop visual workspace where you can add AI providers, manage API keys, discover models, and configure model parameters.
- **API** — Fastify server providing REST endpoints for model discovery, credential vault, chat, analytics, billing, and more.
- **Infrastructure** — Self-contained stack including PostgreSQL, ClickHouse (analytics), Qdrant (vector DB), MinIO (S3 storage), Langfuse (observability), LiteLLM (model proxy), and LibreChat (chat UI).

---

## Detailed Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ (v20 recommended)
- [pnpm](https://pnpm.io/) (package manager)
- [Docker](https://docker.com/) & [Docker Compose](https://docs.docker.com/compose/) (for full backend)
- [Git](https://git-scm.com/)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Aashish-RC/Ra1.git
cd Ra1

# Install root dependencies
pnpm install

# Install canvas dependencies
cd canvas
pnpm install
cd ..
```

### 2. Set Up Environment

```bash
# Backend environment
cp ra1/.env.example ra1/.env
# Edit ra1/.env with your API keys and settings

# Canvas environment (optional — defaults work for local development)
cp canvas/.env.example canvas/.env
```

### 3. Start Everything with Docker

> **Note**: The full Docker stack requires significant resources. For light development, you can start only required services.

**Option A: Full stack (all services)**
```bash
docker compose up -d
```

**Option B: Minimal stack (development)**
```bash
docker compose up -d postgres valkey
```

**Option C: Canvas + API + full infra**
```bash
docker compose up -d canvas api
```

### 4. Open the App

Navigate to [http://localhost:5173](http://localhost:5173) in your browser.

### Alternative: Run Natively (without Docker)

```bash
# Start infrastructure in Docker
docker compose up -d postgres valkey

# Start API server (separate terminal)
cd ra1 && pnpm --filter @ra1/api dev

# Start canvas frontend (separate terminal)
cd canvas && pnpm dev
```

---

## Canvas Features

### Provider Nodes
- Drag AI provider cards from the **Marketplace** sidebar onto the canvas.
- Each provider node contains configuration options, model management, and credential support.
- Connect API keys and test connectivity inline.

### Model Discovery
- Click **Sync Models** on any provider node to fetch available models from the provider's API.
- New models are discovered automatically and flagged with a **NEW** badge.
- Deprecated models are marked and suggested replacements are shown.

### Credential Vault
- Store API keys securely in the **Credential Vault** (in-memory with localStorage backup).
- Keys are never persisted in plain text — only masked metadata is stored.
- Test connectivity with a single click.

### Models Page
- Browse, search, and filter all models across providers.
- Enable/disable individual models.
- Filter by capabilities (code, reasoning, vision, speed, long-context, budget, etc.)

---

## Project Commands

### Canvas (Frontend)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server (port 5173) |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm start` | Alias for `pnpm dev` |

### API (Backend)

| Command | Description |
|---------|-------------|
| `pnpm --filter @ra1/api dev` | Start in dev mode with hot reload |
| `pnpm --filter @ra1/api build` | Build TypeScript |
| `pnpm --filter @ra1/api start` | Run compiled production build |

---

## Environment Variables

### Key Backend Variables (`ra1/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_USER` | PostgreSQL username | `ra1` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `ra1secret` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `LITELLM_MASTER_KEY` | LiteLLM admin key | `sk-ra1-litellm-master` |
| `JWT_SECRET` | JWT signing secret | (your value) |
| `OPENAI_API_KEY` | OpenAI API key | (your key) |
| `ANTHROPIC_API_KEY` | Anthropic API key | (your key) |
| `GEMINI_API_KEY` | Google AI API key | (your key) |

### Canvas Variables (`canvas/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3001` |

---

## Known Issues & Development Notes

- The `canvas/` app currently has a `.gitignore` that duplicates the root patterns (harmless).
- The `canvas/src/utils/layout.ts` file is a no-op placeholder.
- Favicon is a simple SVG — customize it as desired.

See [DOCS_ISSUES.md](./DOCS_ISSUES.md) for the full audit report.

---

## License

This project is for demonstration purposes. See individual dependencies for their respective licenses.