# RA1 — AI Infrastructure Platform

A comprehensive AI infrastructure platform with multi-database support, LLM routing, credential vault, and observability.

---

## Prerequisites

- **Docker Engine** 24+ & **Docker Compose** v2+
- **pnpm** 9.9.0+ (`npm install -g pnpm@9.9.0`)
- **Node.js** 20+

---

## Quick Start

### GitHub Codespaces

1. Open the repository in GitHub Codespaces (Docker-in-Docker included)
2. Run: `chmod +x scripts/setup.sh && bash scripts/setup.sh`

### Local Setup

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env
# Edit .env with your Infisical credentials

# Start the stack
pnpm docker:up

# Wait for services to be healthy
sleep 30

# Pull the Ollama embedding model
docker exec -it ra1-ollama ollama pull nomic-embed-text
```

---

## Infisical Setup

1. Create an account at [Infisical](https://app.infisical.com) and create a new project
2. Add all secrets from `infra/docker/infisical-secrets-reference.md`
3. Get your Service Token from Project Settings
4. Update `.env`:
   - `INFISICAL_URL=https://app.infisical.com`
   - `INFISICAL_SERVICE_TOKEN=your-service-token`
   - `INFISICAL_ENVIRONMENT=development`
   - `INFISICAL_PROJECT_ID=your-project-id`

---

## Stack Services

| Service | Port | Purpose |
|---|---|---|
| API | 3001 | Main REST API |
| LiteLLM | 4000 | LLM proxy/routing |
| PostgreSQL | 5432 | Primary database |
| Valkey | 6379 | Cache/session store |
| ClickHouse | 8123 | Analytics warehouse |
| Qdrant | 6333 | Vector database |
| Ollama | 11434 | Local model inference |
| Infisical | 8080 | Secrets management |

---

## Commands

| Command | Description |
|---|---|
| `pnpm docker:up` | Start all services |
| `pnpm docker:down` | Stop all services |
| `pnpm docker:logs` | Follow service logs |
| `pnpm docker:reset` | Stop and remove volumes |
| `pnpm health` | Check API health (`bash scripts/health-check.sh`) |

---

## Verification

```bash
# Check all services are running
docker compose ps

# Run health check
pnpm health

# Test API directly
curl http://localhost:3001/health
```

**Expected health response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-...",
  "services": [
    {"name": "postgres", "status": "healthy"},
    {"name": "valkey", "status": "healthy"},
    {"name": "clickhouse", "status": "healthy"},
    {"name": "qdrant", "status": "healthy"},
    {"name": "litellm", "status": "healthy"}
  ]
}
```

---

## Development

```bash
# Start API in dev mode (live reload)
pnpm dev

# Type checking
pnpm exec tsc --noEmit

# Linting
pnpm exec eslint apps/api/src
```

- API source code: `apps/api/src/`
- Full reference: [RA1_Complete_Reference.md](./RA1_Complete_Reference.md)
- Development guide: [DEVELOPMENT.md](./DEVELOPMENT.md)

---

## Production Deployment

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

This closes all external ports except API (3001) and sets per-container memory limits.

---

## Step Progression

| Step | Status | Description |
|---|---|---|
| **Step 1** | ✅ Complete | Infrastructure, API boilerplate, database connectors |
| **Step 2** | ✅ Complete | API routes, service layer, JWT authentication |
| **Step 3** | ❌ Pending | Frontend (LibreChat integration) |
| **Step 4** | ⏳ Partial | Observability — logging done, ATRS/event routing pending |
| **Step 5** | ❌ Pending | Testing & CI/CD pipelines |
| **Step 6** | ❌ Pending | Deployment automation |