# RA1 — Development Guide

How to set up, understand, and contribute to the RA1 platform.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Development Setup](#2-development-setup)
3. [Development Workflow](#3-development-workflow)
4. [Service Dependencies](#4-service-dependencies)
5. [Architecture Patterns](#5-architecture-patterns)
6. [Adding a New Module](#6-adding-a-new-module)
7. [Common Operations](#7-common-operations)
8. [Secrets Management](#8-secrets-management)
9. [Debugging & Troubleshooting](#9-debugging--troubleshooting)
10. [Production Build](#10-production-build)
11. [Contribution Guidelines](#11-contribution-guidelines)

---

## 1. Project Structure

The project is a **pnpm workspace monorepo** with three package groups:

```
/workspaces/King/
├── apps/                    # Application packages
│   ├── api/                 # @ra1/api — Fastify REST API (main focus)
│   └── web/                 # @ra1/web — LibreChat frontend (NOT STARTED)
├── packages/                # Shared libraries
│   └── types/               # @ra1/types — Shared TypeScript types (EMPTY)
├── infra/                   # Infrastructure configuration
│   └── docker/              # Docker init scripts, configs
└── scripts/                 # Utility shell scripts
```

### Core Package: `apps/api`

```
apps/api/
└── src/
    ├── index.ts                  # Entrypoint — Fastify init, route registration
    ├── config/
    │   ├── bootstrap.ts          # Infisical client init + secret loading
    │   └── secrets.ts            # Zod schema + mutable secrets singleton
    ├── db/
    │   ├── postgres.ts           # pg Pool connector
    │   ├── valkey.ts             # ioredis connector
    │   ├── clickhouse.ts         # @clickhouse/client connector
    │   ├── qdrant.ts             # @qdrant/js-client-rest connector
    │   ├── ollama.ts             # Custom HTTP client wrapper
    │   └── migrations/           # SQL migration files
    ├── lib/
    │   └── logger.ts             # Pino logger
    ├── middleware/
    │   └── error.ts              # Global error handler
    ├── modules/
    │   ├── health/               # Health module
    │   │   ├── health.routes.ts
    │   │   └── health.service.ts
    │   └── vault/                # Credential vault module
    │       └── vault.routes.ts
    └── vault/
        └── CredentialVault.ts    # Core vault class
```

### Workspace Configuration

- **Workspace root:** `pnpm-workspace.yaml` defines `apps/*` and `packages/*`
- **Root package.json** has convenience scripts (`pnpm docker:up`, `pnpm dev`, etc.)
- **Root tsconfig.json** includes both `apps/api/src` and `packages/types/src`

---

## 2. Development Setup

### Prerequisites

Ensure these are installed:

```bash
# Docker Engine 24+ & Docker Compose v2+
docker --version
docker compose version

# Node.js 20+
node --version

# pnpm 9.9.0+
pnpm --version
```

### First-Time Setup

```bash
# 1. Clone the repository
git clone https://github.com/Aashish-RC/King
cd King

# 2. Install workspace dependencies
pnpm install

# 3. Create environment file
cp .env.example .env

# 4. Start the full Docker stack
pnpm docker:up

# 5. Wait for all services to become healthy (approx. 30s)
sleep 30

# 6. Verify everything is running
pnpm health
```

### Running the API in Dev Mode

The API runs inside Docker with `tsx watch` for live reload. Any code changes to `apps/api/src/` are automatically reflected because the Docker volume mounts the source directory:

```yaml
volumes:
  - ./apps/api/src:/app/src      # In docker-compose.yml
```

You do **not** need to restart the container for code changes — just save the file.

### Relevant Environment Variables (`.env`)

```bash
INFISICAL_URL=https://app.infisical.com
INFISICAL_SERVICE_TOKEN=your-token
INFISICAL_ENVIRONMENT=development
INFISICAL_PROJECT_ID=proj_xxx
```

---

## 3. Development Workflow

### Typical Iteration Loop

1. **Make changes** to TypeScript files in `apps/api/src/`
2. **Save** — `tsx watch` automatically restarts the API inside the container
3. **Test** — hit the API with `curl` or run `pnpm health`
4. **Check logs** — `pnpm docker:logs` to see API output
5. **Repeat**

### TypeScript

- **Config:** Root `tsconfig.json` sets `target: ES2022`, `module: NodeNext`
- **Check types:** `pnpm exec tsc --noEmit` (run from `apps/api/`)
- **Linting:** `pnpm exec eslint apps/api/src` (run from `apps/api/`)
- **Formatting:** Prettier configured at root (`.prettierrc`)

### Adding Dependencies

```bash
# Add to @ra1/api
pnpm --filter api add some-package

# Add dev dependency
pnpm --filter api add -D some-dev-package

# Install all workspace packages (after cloning)
pnpm install
```

### Working with Shared Types

The `packages/types` package is intended for shared interfaces. To add types:

1. Edit `packages/types/src/index.ts`
2. Export your types
3. Import them in `apps/api` via `@ra1/types`

**Note:** The types package is currently empty (`export type {}`). When populated, you'll need to ensure it builds correctly before the API can consume it.

---

## 4. Service Dependencies

### How Services Connect

```
┌─────────┐     ┌──────────┐     ┌────────────┐
│  API    │────▶│ Infisical│────▶│ PostgreSQL │
│ (3001)  │     │  (8080)  │     │   (5432)   │
└────┬────┘     └──────────┘     └────────────┘
     │
     ├────▶ PostgreSQL (5432)   — Primary metadata
     ├────▶ Valkey (6379)       — Cache (currently unused)
     ├────▶ ClickHouse (8123)   — Analytics / telemetry
     ├────▶ Qdrant (6333)       — Vector store (currently unused)
     ├────▶ LiteLLM (4000)      — LLM proxy / routing
     └────▶ Ollama (11434)      — Local embeddings
```

### Service Healthchecks

Every service has a Docker healthcheck (interval: 10s, timeout: 5s, retries: 5). The API waits for all core services to be healthy before starting:

- PostgreSQL — `pg_isready`
- Valkey — `valkey-cli ping`
- ClickHouse — `wget --spider http://localhost:8123/ping`
- Qdrant — `wget --spider http://localhost:6333`
- LiteLLM — `wget --spider http://localhost:4000`

### Connecting to Databases Locally

```bash
# PostgreSQL
docker exec -it ra1-postgres psql -U ra1 -d ra1

# ClickHouse
docker exec -it ra1-clickhouse clickhouse-client --user default

# Valkey
docker exec -it ra1-valkey valkey-cli

# Qdrant API
curl http://localhost:6333/collections

# Ollama API
curl http://localhost:11434/api/ps
```

---

## 5. Architecture Patterns

### Module Structure

Each feature module in `apps/api/src/modules/` follows a standard pattern:

```
modules/<name>/
├── <name>.routes.ts      # Fastify route definitions
└── <name>.service.ts     # Business logic (optional, extracted when complex)
```

### Route Registration Pattern

Routes are registered as Fastify plugins:

```typescript
import { FastifyPluginAsync } from "fastify";

export const myRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/my-path", async (request, reply) => {
    return { hello: "world" };
  });
};
```

Then registered in `index.ts`:

```typescript
await app.register(myRoutes);
```

### Database Connector Pattern

All connectors follow a consistent export interface:

```typescript
async function connect(): Promise<void>    // Initialize + verify connection
async function disconnect(): Promise<void> // Clean shutdown
<clientType> client                         // Client singleton (named export)

export { connect, disconnect, client };
```

### Error Handling Pattern

- **Application errors:** Throw custom error classes (e.g., `CredentialVaultError`)
- **Route handlers:** Catch custom errors and return sanitized responses
- **Unhandled errors:** Caught by global error handler in `middleware/error.ts`

```typescript
// Route handler pattern
fastify.post("/my-route", async (request, reply) => {
  try {
    const result = await someService.doSomething();
    return reply.status(201).send({ success: true, data: result });
  } catch (error) {
    if (error instanceof MyCustomError) {
      return reply.status(500).send({ error: error.message });
    }
    throw error; // Let global handler deal with unexpected errors
  }
});
```

### Authentication Pattern

Protected routes use the `authenticate` hook:

```typescript
fastify.addHook('onRequest', fastify.authenticate);

// Then in handlers, access the user:
const userId = (request.auth as any).user.userId;
```

---

## 6. Adding a New Module

Follow these steps to add a new feature module (e.g., a "memory engine"):

### Step 1: Create Module Files

```bash
mkdir -p apps/api/src/modules/memory/
touch apps/api/src/modules/memory/memory.routes.ts
touch apps/api/src/modules/memory/memory.service.ts
```

### Step 2: Implement the Service

```typescript
// memory.service.ts
export class MemoryEngine {
  async search(userId: string, query: string): Promise<any[]> {
    // Business logic here
    return [];
  }
}
```

### Step 3: Implement Routes

```typescript
// memory.routes.ts
import { FastifyPluginAsync } from "fastify";

export const memoryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate); // If protected

  fastify.get("/memory/search", async (request, reply) => {
    // Handle request
  });
};
```

### Step 4: Register in Entrypoint

```typescript
// apps/api/src/index.ts
import { memoryRoutes } from "./modules/memory/memory.routes";

// In main():
await app.register(memoryRoutes);
```

### Step 5: Add DB Collections/Schemas (if needed)

- **PostgreSQL:** Add migration file in `apps/api/src/db/migrations/` and apply via init SQL in `infra/docker/postgres-init.sql`
- **ClickHouse:** Add table definitions in `infra/docker/clickhouse-init.sql`
- **Qdrant:** Create collections at startup using the `client` from `apps/api/src/db/qdrant.ts`
- **Valkey:** Define key patterns and TTL policies

### Step 6: Add Secrets (if needed)

1. Add the secret to the Zod schema in `apps/api/src/config/secrets.ts`
2. Add the secret to the Infisical reference doc
3. Add the secret to the Docker Compose environment variables

---

## 7. Common Operations

### Docker Commands

```bash
# Start stack
pnpm docker:up

# Stop stack
pnpm docker:down

# Follow logs
pnpm docker:logs

# Stop and remove data volumes (destructive!)
pnpm docker:reset

# Rebuild the API container (after Dockerfile or dependency changes)
docker compose build api
docker compose up -d api

# Restart a specific service
docker compose restart clickhouse

# View logs of a specific service
docker compose logs -f api
```

### Health Checks

```bash
# Quick health check
pnpm health

# Direct API call
curl http://localhost:3001/health

# Liveness probe
curl http://localhost:3001/health/live
```

### Database Maintenance

```bash
# Run a SQL query against PostgreSQL
docker exec -it ra1-postgres psql -U ra1 -d ra1 -c "SELECT * FROM credential_metadata;"

# Run a SQL query against ClickHouse
docker exec -it ra1-clickhouse clickhouse-client --query "SELECT * FROM ra1_analytics.credential_access_events;"

# List Qdrant collections
curl http://localhost:6333/collections
```

### Useful Aliases

```bash
# Add to your shell profile for convenience
alias ra1-logs="docker compose -f /workspaces/King/docker-compose.yml logs -f"
alias ra1-psql="docker exec -it ra1-postgres psql -U ra1 -d ra1"
alias ra1-health="curl -s http://localhost:3001/health | jq ."
```

---

## 8. Secrets Management

### How Infisical Works

1. **Startup:** The API initializes an `InfisicalClient` and fetches all secrets
2. **Validation:** Secrets are validated against a Zod schema (`appSecretsSchema`)
3. **Access:** Validated secrets are available via the mutable `secrets` singleton
4. **Caching:** Secrets are fetched **once** at startup — no runtime refresh yet

### Credential Vault (User Secrets)

The `CredentialVault` class manages user-scoped credentials (API keys, tokens):

- **Store:** Save a credential → stored in Infisical + metadata in PostgreSQL
- **Resolve:** Retrieve a credential → fetched fresh from Infisical (never cached)
- **Rotate:** Update a credential value in Infisical
- **Revoke:** Delete from Infisical + mark revoked in PostgreSQL metadata

**Important:** Every `resolve()` call makes a live API call to Infisical. This guarantees freshness but has latency implications.

### Adding a New Secret

1. **API Schema:** Add to `appSecretsSchema` in `apps/api/src/config/secrets.ts`
2. **Bootstrap:** If the secret needs special handling, update `bootstrap.ts`
3. **Docker Compose:** Add the environment variable to the `api` service
4. **Infisical:** Add the secret to your Infisical project
5. **Docs:** Update `infra/docker/infisical-secrets-reference.md`

---

## 9. Debugging & Troubleshooting

### Common Issues

| Problem | Likely Cause | Solution |
|---|---|---|
| API crashes on startup | Infisical unreachable or invalid token | Check `INFISICAL_URL`, `INFISICAL_SERVICE_TOKEN` |
| `pnpm health` returns `unhealthy` | One or more services not ready | Wait, or check `docker compose ps` |
| API changes not reflected | Docker volume not mounted | Restart the api service: `docker compose restart api` |
| `tsx watch` not reloading | File changes outside volume mount | Ensure you're editing `apps/api/src/` |
| TypeScript errors with `@ra1/types` | Types package is empty | Add types to `packages/types/src/index.ts` |
| Docker build fails | Network issues or ARM64 incompatibility | Check Docker logs, try `docker compose build --no-cache api` |

### Viewing Logs

```bash
# All services
pnpm docker:logs

# API only
docker compose logs -f api

# API with timestamps
docker compose logs -f --timestamps api
```

### Checking Container Health

```bash
# List all containers and their health
docker compose ps

# Inspect a specific container's health
docker inspect ra1-postgres | jq '.[].State.Health'

# Check container resource usage
docker stats ra1-api ra1-postgres ra1-clickhouse
```

### Curl Testing

```bash
# Health check
curl -s http://localhost:3001/health | jq .

# Store a credential (requires JWT token)
curl -X POST http://localhost:3001/credentials \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"key":"my-api-key","value":"sk-xxx"}'

# List credentials
curl -s http://localhost:3001/credentials \
  -H "Authorization: Bearer YOUR_JWT" | jq .
```

---

## 10. Production Build

### Differences from Development

| Aspect | Development | Production |
|---|---|---|
| API build | `tsx watch` (interpreted) | `tsc` (compiled JS) |
| API user | `root` | `node` |
| Ports | All exposed | Only API (3001) exposed |
| Logging | `pino-pretty` (human-readable) | Pure JSON |
| Memory limits | None | Capped per container |
| Cache behavior | Same | Same (no caching yet) |

### Building for Production

```bash
# Build the API
docker compose -f docker-compose.yml -f docker-compose.prod.yml build api

# Start in production mode
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# This will:
# - Build the API using the 'prod' Docker target
# - Close all external ports except API:3001
# - Apply memory limits to all containers
```

### Production Configuration Files

- `docker-compose.prod.yml` — Overrides for production (ports, resources)
- `apps/api/Dockerfile` — Multi-stage: `dev` target (tsx watch) and `prod` target (compiled JS)

---

## 11. Contribution Guidelines

### Branch Strategy

```
main              — Stable, deployable
├── feat/*        — New features (e.g., feat/memory-engine)
├── fix/*         — Bug fixes (e.g., fix/clickhouse-url-parsing)
├── refactor/*    — Code improvements (e.g., refactor/types-package)
└── docs/*        — Documentation updates (e.g., docs/update-readme)
```

### Workflow

1. Create a branch from `main`: `git checkout -b feat/my-feature`
2. Make changes following the patterns in this guide
3. Ensure type checking passes: `pnpm exec tsc --noEmit` (from `apps/api/`)
4. Ensure linting passes: `pnpm exec eslint apps/api/src` (from `apps/api/`)
5. Commit with clear messages: `feat: add memory engine search endpoint`
6. Push and create a Pull Request to `main`

### Code Style

- **Language:** TypeScript with strict mode enabled
- **Module system:** ES modules (`"type": "module"`)
- **Imports:** Use named imports/exports (avoid `export default`)
- **Error handling:** Use custom error classes, never expose raw errors to clients
- **Logging:** Use the Pino logger (`import { logger } from "../../lib/logger"`)
- **Sanitization:** Never log or return secret values in API responses

### Review Checklist

Before submitting a PR, verify:

- [ ] TypeScript compiles without errors
- [ ] ESLint passes with no warnings
- [ ] New features have appropriate test coverage (when tests exist)
- [ ] Secrets never leak into logs or responses
- [ ] Database migrations are idempotent (safe to re-run)
- [ ] Module follows the established patterns
- [ ] Documentation is updated (README, DEVELPOMENT.md, Complete Reference)

---

## Further Reading

- [RA1_Complete_Reference.md](./RA1_Complete_Reference.md) — Full platform reference covering all components, schemas, and implementation status
- [README.md](./README.md) — Quick start and overview
