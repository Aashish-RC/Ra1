# RA1 — Complete Platform Reference

> **Generated:** 2026-06-01  
> **Source:** Merged from all markdown files and full codebase scan  
> **Repository:** `origin: https://github.com/Aashish-RC/King`  
> **Latest Commit:** `1fe8e9d44fa557299cb01a56590e716c5fbedfc1`

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Tech Stack](#2-tech-stack)
3. [Infrastructure Orchestration](#3-infrastructure-orchestration)
4. [API Server (Fastify)](#4-api-server-fastify)
5. [Secrets Bootstrap (Infisical)](#5-secrets-bootstrap-infisical)
6. [Credential Vault](#6-credential-vault)
7. [Database Connectors](#7-database-connectors)
8. [Health Module](#8-health-module)
9. [Observability (Logging & Telemetry)](#9-observability-logging--telemetry)
10. [Data & Schema Layer](#10-data--schema-layer)
11. [Infisical Secrets Reference](#11-infisical-secrets-reference)
12. [Authentication & Authorization](#12-authentication--authorization)
13. [Shared Types Package](#13-shared-types-package)
14. [Frontend (Web)](#14-frontend-web)
15. [Implementation Status & Blockers](#15-implementation-status--blockers)
16. [Recommended Next Actions](#16-recommended-next-actions)
17. [File Tree](#17-file-tree)
18. [Execution Changelog](#18-execution-changelog)

---

## 1. System Overview

RA1 is a comprehensive AI infrastructure platform with multi-database support, LLM routing, and observability. It provides a credential vault for secrets management, a health-checked microservice stack, and is designed for extensibility with memory, input, and audit trail engines planned for future implementation.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      Load Balancer                       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                        API (3001)                        │
│  - Fastify REST API                                      │
│  - Authentication & Authorization                        │
│  - Request routing & validation                          │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ PostgreSQL  │   │  Valkey     │   │  LiteLLM    │
│   (5432)    │   │   (6379)    │   │   (4000)    │
└─────────────┘   └─────────────┘   └─────────────┘
        │
        ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ ClickHouse  │   │  Qdrant     │   │   Ollama    │
│  (8123)     │   │  (6333)     │   │ (11434)     │
└─────────────┘   └─────────────┘   └─────────────┘
```

---

## 2. Tech Stack

| Layer | Technology | Version | Location |
|---|---|---|---|
| **Runtime** | Node.js | 20 (Alpine) | Dockerfile, devcontainer |
| **Language** | TypeScript | 5.5.4 | Root tsconfig.json |
| **HTTP Framework** | Fastify | 4.28.1 | `apps/api/package.json` |
| **Secrets Management** | Infisical SDK | 2.1.0 | `apps/api/package.json` |
| **Primary Database** | PostgreSQL | 16.3 Alpine | docker-compose.yml |
| **Postgres Client** | `pg` | 8.12.0 | `apps/api/package.json` |
| **Cache / Queue** | Valkey (Redis-compatible) | 7.2.5 Alpine | docker-compose.yml |
| **Valkey Client** | `ioredis` | 5.4.1 | `apps/api/package.json` |
| **Analytics DB** | ClickHouse | 24.6 Alpine | docker-compose.yml |
| **ClickHouse Client** | `@clickhouse/client` | 1.4.1 | `apps/api/package.json` |
| **Vector DB** | Qdrant | 1.10.1 | docker-compose.yml |
| **Qdrant Client** | `@qdrant/js-client-rest` | 1.11.0 | `apps/api/package.json` |
| **LLM Proxy** | LiteLLM | 1.44.2 (main) | docker-compose.yml |
| **Local LLM** | Ollama | 0.3.6 | docker-compose.yml |
| **Logger** | Pino | 9.3.2 | `apps/api/package.json` |
| **Validation** | Zod | 3.23.8 | `apps/api/package.json` |
| **Auth** | `@fastify/jwt` | 10.1.0 | `apps/api/package.json` |
| **Package Manager** | pnpm | 9.9.0 | package.json, Dockerfile |
| **Containerization** | Docker Compose | v3.8 | docker-compose.yml |

---

## 3. Infrastructure Orchestration

### Status: ✅ Fully Implemented

The entire stack runs via Docker Compose with 8 services on a shared bridge network (`ra1-network`) with named volumes for persistence.

### Services

| Service | Image | Container Name | Internal Port | External Port (Dev) |
|---|---|---|---|---|
| PostgreSQL | postgres:16.3-alpine | ra1-postgres | 5432 | 5432 |
| Valkey | valkey/valkey:7.2.5-alpine | ra1-valkey | 6379 | 6379 |
| ClickHouse | clickhouse/clickhouse-server:24.6-alpine | ra1-clickhouse | 8123 | 8123 |
| Qdrant | qdrant/qdrant:v1.10.1 | ra1-qdrant | 6333 | 6333 |
| Ollama | ollama/ollama:0.3.6 | ra1-ollama | 11434 | 11434 |
| Infisical | infisical/infisical:v0.82.0-postgres | ra1-infisical | 8080 | 8080 |
| LiteLLM | ghcr.io/berriai/litellm:main-v1.44.2 | ra1-litellm | 4000 | 4000 |
| API | Build from `apps/api/` | ra1-api | 3001 | 3001 |

### Key Details

- **Init SQL** is mounted into Postgres (`infra/docker/postgres-init.sql`) and ClickHouse (`infra/docker/clickhouse-init.sql`)
- Every service has a Docker healthcheck with `interval: 10s, timeout: 5s, retries: 5`
- The API service depends on all core services with `condition: service_healthy`
- **Production mode** (`docker-compose.prod.yml`) closes all external ports except API (3001), and caps memory per container:
  - PostgreSQL: 2g, Valkey: 512m, ClickHouse: 4g, Qdrant: 2g, Ollama: 4g, Infisical: 512m, LiteLLM: 1g, API: 1g

### API Dockerfile

Supports two build targets:
- **`dev`** — Uses `tsx watch src/index.ts` with live reload, runs as root
- **`prod`** — Compiled JS via `tsc`, runs as `node` user with `--frozen-lockfile`

### Key Files

| File | Purpose |
|---|---|
| `docker-compose.yml` | Service definitions for all 8 containers |
| `docker-compose.prod.yml` | Production overrides (port closure, resource limits) |
| `apps/api/Dockerfile` | Multi-stage build (dev/prod) |

---

## 4. API Server (Fastify)

### Status: ✅ Fully Implemented

**Entrypoint:** `apps/api/src/index.ts`

### Initialization Sequence

1. **Bootstrap** — Initialize Infisical client, load all secrets, validate with Zod
2. **Database Connectors** — Connect to PostgreSQL, Valkey, ClickHouse, Qdrant, Ollama (in series)
3. **Fastify Instance** — Created with `logger: false` (uses Pino directly)
4. **Middleware Stack** — In order:
   - `helmet` — Security headers
   - `cors` — Open origin (`*`) — **production concern: should be restricted**
   - `rateLimit` — 100 requests/minute per IP
5. **Auth Registration** — `@fastify/jwt` registered with `secrets.JWT_SECRET`
6. **Route Registration** — `healthRoutes`, `vaultRoutes`
7. **Server Listen** — Port `secrets.API_PORT || 3001`, host `0.0.0.0`

### Error Handling

Global error handler produces a standardized JSON shape:

```typescript
{ success: false, error: { code: string, message: string }, requestId?: string }
```

- In production, non-validation errors show "Internal Server Error" instead of the actual message
- In development, the original error message is preserved

### Graceful Shutdown

Handlers for `SIGTERM` and `SIGINT` — calls `app.close()` then `process.exit(0)`. Any startup failure (Infisical init, DB connection errors) causes immediate `process.exit(1)`.

### Key Files

| File | Purpose |
|---|---|
| `apps/api/src/index.ts` | Main entrypoint, Fastify initialization, route registration |
| `apps/api/src/config/secrets.ts` | Zod schema for all runtime secrets + mutable `secrets` object |
| `apps/api/src/config/bootstrap.ts` | Infisical client initialization, secret resolution |
| `apps/api/src/middleware/error.ts` | Global error handler |

---

## 5. Secrets Bootstrap (Infisical)

### Status: ✅ Fully Implemented

**Files:** `apps/api/src/config/bootstrap.ts`, `apps/api/src/config/secrets.ts`

The platform loads all runtime secrets from a self-hosted Infisical instance at startup:

1. Requires `INFISICAL_SERVICE_TOKEN` environment variable (injected via Docker Compose)
2. Creates an `InfisicalClient` singleton with configurable `siteUrl` (defaults to `https://app.infisical.com`)
3. Fetches all secrets from the project/environment using `listSecrets()`
4. Maps `secretKey` → `secretValue` into a plain `Record<string, string>`
5. Validates the map against `appSecretsSchema` (Zod object)
6. Assigns parsed secrets onto a mutable singleton `secrets: AppSecrets`

### AppSecrets Schema (Zod)

```typescript
{
  DATABASE_URL: z.string().url(),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_DB: z.string().default("ra1"),
  VALKEY_URL: z.string().url(),
  CLICKHOUSE_URL: z.string().url(),
  CLICKHOUSE_USER: z.string(),
  CLICKHOUSE_PASSWORD: z.string().optional(),
  CLICKHOUSE_DB: z.string().default("ra1_analytics"),
  QDRANT_URL: z.string().url(),
  OLLAMA_BASE_URL: z.string().url(),
  EMBEDDING_MODEL: z.string().default("nomic-embed-text"),
  LITELLM_URL: z.string().url(),
  LITELLM_MASTER_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  SESSION_SECRET: z.string().min(1),
  API_PORT: z.number().int().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
}
```

### Notes

- **Zero caching** — secrets are fetched once at startup; no runtime re-fetch mechanism exists yet
- **No custom Infisical forks** — uses official `infisical/infisical:v0.82.0-postgres` Docker image
- **No database schema modifications** — relies on Infisical's native PostgreSQL schema
- **No runtime patches** — all integration occurs through the SDK's public API

---

## 6. Credential Vault

### Status: ✅ Core CRUD Complete; Optional Features Stubbed

The Credential Vault is a wrapper around the Infisical SDK that manages user-scoped secrets (API keys, tokens) with a strict store/resolve/rotate/revoke lifecycle.

### Integration Architecture

RA1 integrates with a self-hosted Infisical instance (`ra1-infisical`) via the official `@infisical/sdk` (v2.1.0). The integration is configured through environment variables:

| Variable | Purpose | Default |
|---|---|---|
| `INFISICAL_URL` | Self-hosted Infisical endpoint | `https://app.infisical.com` |
| `INFISICAL_SERVICE_TOKEN` | Machine-to-machine authentication token | Required |
| `INFISICAL_ENVIRONMENT` | Infisical environment namespace | `development` |
| `INFISICAL_PROJECT_ID` | Target project identifier | Required |

### Class Interface

```typescript
export class CredentialVault {
  async store(userId: string, key: string, value: string): Promise<void>;
  async resolve(userId: string, key: string): Promise<string>;
  async rotate(userId: string, key: string, newValue: string): Promise<void>;
  async revoke(userId: string, key: string): Promise<void>;
  async listCredentials(userId: string): Promise<CredentialMetadata[]>;
}
```

### Operation Flow

| Method | Infisical API Call | Local State Update | Telemetry Emitted |
|---|---|---|---|
| `store()` | `createSecret()` | Inserts metadata row (Postgres) | ❌ Missing |
| `resolve()` | `getSecret()` | Updates `last_accessed_at` (Postgres) | ✅ Writes to ClickHouse |
| `rotate()` | `updateSecret()` | No local state change | ❌ Missing |
| `revoke()` | `deleteSecret()` | Sets `status = 'revoked'` (Postgres) | ❌ Missing |

**Class Interface (Detailed):**

```typescript
interface CredentialMetadata {
  id: string;
  key_name: string;
  provider: string | null;
  status: string;          // 'connected' | 'revoked'
  created_at: Date;
  last_accessed_at: Date | null;
}
```

### Resolve Execution Flow

```
resolve(userId, key)
    │
    ├─► Create fresh InfisicalClient call (no caching)
    ├─► Update last_accessed_at in PostgreSQL
    ├─► Write telemetry event to ClickHouse
    └─► Return secret value
```

Key constraints:
- Secrets are resolved fresh at call time, **never cached in memory**
- Client instances are not reused across requests
- No middleware or interceptor caching is applied

### Telemetry Hook (`writeAccessEvent`)

Writes to ClickHouse table `ra1_analytics.credential_access_events`:

```typescript
{
  user_id: string,
  key_name: string,
  success: 1 | 0,
  error_code: string | null
}
```

- **Called only from `resolve()`** — store/revoke/rotate do not emit events
- Silently swallows ClickHouse errors (logs but doesn't rethrow)

### Telemetry Events (Per Spec)

| Event | Trigger Point | Payload |
|---|---|---|
| `vault.credential.written` | After successful `store()` | `{ userId, keyName, success: true }` |
| `vault.credential.resolved` | After successful `resolve()` | `{ userId, keyName, success: true }` |
| `vault.credential.revoked` | After successful `revoke()` | `{ userId, keyName, success: true }` |

Error cases emit the same events with `success: false` and an `errorCode` derived from the error constructor name.

### Sanitization Guards

1. **Logger isolation**: Error logs include `userId` and `keyName` but never the secret value
2. **Response sanitization**: API responses return only `{ success: true }` or `{ error: string }` — never the secret value
3. **Database field exclusion**: `encrypted_value` is never queried or projected
4. **Stack trace filtering**: `CredentialVaultError` provides generic messages to callers

### REST API Routes (`/credentials`)

| Method | Path | Handler | Description |
|---|---|---|---|
| `POST` | `/credentials` | 🔐 Authenticated | Store a credential (body: `{ key, value }`) |
| `GET` | `/credentials` | 🔐 Authenticated | List non-revoked credentials (metadata only) |
| `DELETE` | `/credentials/:keyName` | 🔐 Authenticated | Revoke a credential |

### Authentication Hook

- `vault.routes.ts` registers `fastify.addHook('onRequest', fastify.authenticate)` to protect all credential routes
- `@fastify/jwt` is registered with `secrets.JWT_SECRET`
- The `authenticate` decorator calls `request.jwtVerify()` and maps the payload to `request.auth.user.userId`
- Unauthenticated requests receive `401 { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' } }`

### Stubbed / Missing Features

| Feature | Status | Notes |
|---|---|---|
| OAuth background refresh | ⏳ Stubbed | No `refresh_token` field implemented |
| Credential expiration | ⏳ Stubbed | No `expires_at` enforcement |
| Credential type detection | ⏳ Stubbed | No `credential_type` derivation |
| Label/tag support | ⏳ Stubbed | No `label` field populated |
| Update timestamp | ⏳ Stubbed | No `updated_at` trigger |
| Telemetry for store/rotate/revoke | ❌ Missing | Only `resolve()` emits events |

### File Reference

| File | Purpose |
|---|---|
| `apps/api/src/vault/CredentialVault.ts` | Core vault implementation (149 lines) |
| `apps/api/src/config/bootstrap.ts` | Infisical client initialization |
| `apps/api/src/modules/vault/vault.routes.ts` | REST API endpoints |
| `apps/api/src/db/migrations/001_credential_metadata.sql` | PostgreSQL schema |
| `infra/docker/clickhouse-init.sql` | ClickHouse telemetry schema |
| `docker-compose.yml` | Infisical service definition |

---

## 7. Database Connectors

### Status: ✅ Fully Implemented

All connectors follow a consistent pattern:
```typescript
export async function connect(): Promise<void>;
export async function disconnect(): Promise<void>;
export <clientType> client;
```

### Connector Summary

| Connector | Library | Connection Source | Exports |
|---|---|---|---|
| **PostgreSQL** | `pg` Pool | `secrets.DATABASE_URL` | `{ connect, disconnect, pool }` |
| **Valkey** | `ioredis` | `secrets.VALKEY_URL` | `{ connect, disconnect, redis }` |
| **ClickHouse** | `@clickhouse/client` | `secrets.CLICKHOUSE_URL` + user/pass/db | `{ connect, disconnect, client }` |
| **Qdrant** | `@qdrant/js-client-rest` | `secrets.QDRANT_URL` | `{ connect, disconnect, client }` |
| **Ollama** | Custom HTTP (fetch) | `secrets.OLLAMA_BASE_URL` + model | `{ connect, disconnect, client }` |

### Key Details

#### PostgreSQL (`apps/api/src/db/postgres.ts`)
- Creates a `pg.Pool` from `secrets.DATABASE_URL`
- Calls `pool.connect()` to verify connectivity

#### Valkey (`apps/api/src/db/valkey.ts`)
- Creates an `ioredis` Redis client from `secrets.VALKEY_URL`
- Calls `redis.connect()` — **note:** currently initialized but **unused** in any business logic

#### ClickHouse (`apps/api/src/db/clickhouse.ts`)
- Parses `secrets.CLICKHOUSE_URL` with `new URL()` to extract hostname and port
- Creates a `@clickhouse/client` with `${hostname}:${port}`, username, password, database
- **Known issue:** Only uses `hostname` and `port` from the URL — protocol and path components are ignored

#### Qdrant (`apps/api/src/db/qdrant.ts`)
- Creates a `@qdrant/js-client-rest` client from `secrets.QDRANT_URL`
- **Note:** Client is initialized but **no collections are defined** or created

#### Ollama (`apps/api/src/db/ollama.ts`)
- Custom wrapper (not an SDK) with:
  - `health()` → `GET /api/ps` (3s timeout) — returns `boolean`
  - `generateEmbedding(text)` → `POST /api/embed` with `{ model, input }` (30s timeout) — returns `number[]`
- Uses `AbortSignal.timeout()` (requires Node 20+)
- **No retry logic, circuit breaker, or connection pooling**

### Key Files

| File | Purpose |
|---|---|
| `apps/api/src/db/postgres.ts` | pg Pool connector |
| `apps/api/src/db/valkey.ts` | ioredis connector |
| `apps/api/src/db/clickhouse.ts` | @clickhouse/client connector |
| `apps/api/src/db/qdrant.ts` | @qdrant/js-client-rest connector |
| `apps/api/src/db/ollama.ts` | Custom HTTP client wrapper |

---

## 8. Health Module

### Status: ✅ Fully Implemented

**Files:** `apps/api/src/modules/health/health.routes.ts`, `apps/api/src/modules/health/health.service.ts`

### Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `GET /health` | Public | Aggregated health of all 5 downstream services with 3-second timeouts |
| `GET /health/live` | Public | Simple liveness probe (returns `{ status: "ok" }`) |

### Services Checked

1. PostgreSQL — `pool.query("SELECT 1")`
2. Valkey — `redis.ping()`
3. ClickHouse — `client.ping()`
4. Qdrant — `client.getCollections()`
5. LiteLLM — `fetch({LITELLM_URL}/health)` (raw `fetch()`, not SDK)

Each check uses `Promise.race` with a 3-second timeout via `withTimeout()`.

### Health Status Logic

| Condition | Status |
|---|---|
| All 5 services healthy | `healthy` |
| 1–4 services healthy | `degraded` |
| 0 services healthy | `unhealthy` |

### Response Shape

```typescript
{
  status: "healthy" | "degraded" | "unhealthy",
  latencyMs: number,
  timestamp: string,
  services: [
    { name: string, status: string, latencyMs?: number, error?: string }
  ]
}
```

**Note:** Ollama health is **not** checked in the aggregated health endpoint — only the Ollama connector itself has a `health()` method.

---

## 9. Observability (Logging & Telemetry)

### Status: ✅ Logging Implemented; ❌ No ATRS (Event Routing System)

### Pino Logger

**File:** `apps/api/src/lib/logger.ts`

- Uses Pino 9.3.2 — the fastest JSON logger for Node.js
- In development (`NODE_ENV !== "production"`): level `debug`, with `pino-pretty` transport for human-readable output
- In production: level `info`, pure JSON output (no transport)

### Current Logger Usage

- `index.ts` — startup/shutdown logging
- `bootstrap.ts` — configuration loading status
- `vault.routes.ts` — error logging
- `CredentialVault.ts` — telemetry failure and credential operation errors

### Telemetry (ClickHouse)

Currently, the only telemetry mechanism is direct ClickHouse inserts from `CredentialVault.writeAccessEvent()`, called exclusively from `resolve()`. Event payload:

```typescript
{ user_id: string, key_name: string, success: 1 | 0, error_code: string | null }
```

### What's Missing (ATRS)

- No event bus / pub-sub abstraction
- No middleware pipeline for request/response logging
- No centralized audit trail writer
- No structured event taxonomy (event types, severity levels, routing rules)
- Telemetry from vault operations other than `resolve()` is not captured
- No integration with the `usage_events` ClickHouse table (exists in schema but nothing writes to it)

---

## 10. Data & Schema Layer

### 10.1 PostgreSQL Schema

#### Table: `credential_metadata`
**File:** `apps/api/src/db/migrations/001_credential_metadata.sql`

```sql
CREATE TABLE credential_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  key_name VARCHAR(255) NOT NULL,
  provider VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'connected',
  created_at TIMESTAMPTZ DEFAULT now(),
  last_accessed_at TIMESTAMPTZ,
  UNIQUE(user_id, key_name)
);

CREATE INDEX idx_credential_metadata_user_id ON credential_metadata(user_id);
```

#### Table: `ra1_litellm` (separate database)
**File:** `infra/docker/postgres-init.sql`

```sql
CREATE DATABASE ra1_litellm;
GRANT ALL PRIVILEGES ON DATABASE ra1_litellm TO DEFAULT;
```

- Used by the LiteLLM container (not by RA1 application code directly)

### 10.2 ClickHouse Schema

**File:** `infra/docker/clickhouse-init.sql`

#### Table: `ra1_analytics.usage_events`

```sql
CREATE TABLE ra1_analytics.usage_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    user_id UUID,
    payload String,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (created_at, id)
TTL created_at = addYears(created_at, 2);
```

- Generic event table — **no application code writes to this table** yet

#### Table: `ra1_analytics.credential_access_events`

```sql
CREATE TABLE ra1_analytics.credential_access_events (
    event_id UUID DEFAULT generateUUIDv4(),
    timestamp DateTime DEFAULT now(),
    user_id UUID,
    key_name String,
    success UInt8,
    error_code Nullable(String)
)
ENGINE = MergeTree()
ORDER BY (timestamp, user_id)
TTL timestamp + INTERVAL 2 YEAR;
```

- **Actively written to** by `CredentialVault.writeAccessEvent()` during credential resolution

### 10.3 Qdrant Schema

- **No collections are defined** — the client is initialized but never used to create collections, insert vectors, or perform searches

### 10.4 Valkey Schema / TTL Structures

- **No key patterns or TTL policies are defined** — the client is initialized but never used for any data operations

---

## 11. Infisical Secrets Reference

All secrets required in Infisical for the RA1 project.

### Database Configuration

| Secret Name | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string for main app | `postgresql://user:pass@postgres:5432/ra1` |
| `POSTGRES_USER` | PostgreSQL username | `ra1` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `secure_password` |
| `POSTGRES_DB` | PostgreSQL database name | `ra1` |
| `LITELLM_DATABASE_URL` | LiteLLM database connection | `postgresql://user:pass@postgres:5432/ra1_litellm` |

### Cache & Queue

| Secret Name | Description | Example |
|---|---|---|
| `VALKEY_URL` | Valkey connection string | `redis://valkey:6379` |

### Analytics

| Secret Name | Description | Example |
|---|---|---|
| `CLICKHOUSE_URL` | ClickHouse connection | `clickhouse://clickhouse:8123` |
| `CLICKHOUSE_USER` | ClickHouse username | `default` |
| `CLICKHOUSE_PASSWORD` | ClickHouse password | (optional) |
| `CLICKHOUSE_DB` | ClickHouse database name | `ra1_analytics` |

### Vector Database

| Secret Name | Description | Example |
|---|---|---|
| `QDRANT_URL` | Qdrant connection | `http://qdrant:6333` |

### AI Services

| Secret Name | Description | Example |
|---|---|---|
| `OLLAMA_BASE_URL` | Ollama base URL | `http://ollama:11434` |
| `EMBEDDING_MODEL` | Embedding model name | `nomic-embed-text` |
| `LITELLM_URL` | LiteLLM API URL | `http://litellm:4000` |
| `LITELLM_MASTER_KEY` | LiteLLM master key for auth | `sk-master-key` |

### Authentication

| Secret Name | Description | Example |
|---|---|---|
| `JWT_SECRET` | JWT signing secret | `jwt_secret_key` |
| `SESSION_SECRET` | Session encryption secret | `session_secret_key` |

### Runtime

| Secret Name | Description | Example |
|---|---|---|
| `INFISICAL_URL` | Infisical server URL | `https://app.infisical.com` |
| `INFISICAL_SERVICE_TOKEN` | Infisical service token | (required) |
| `INFISICAL_ENVIRONMENT` | Infisical environment | `development` |
| `INFISICAL_PROJECT_ID` | Infisical project identifier | `proj_xxx` |
| `NODE_ENV` | Node environment | `development` |

### Secret Categories (Summary)

- **Database**: DATABASE_URL, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, LITELLM_DATABASE_URL
- **Cache**: VALKEY_URL
- **Analytics**: CLICKHOUSE_URL, CLICKHOUSE_USER, CLICKHOUSE_PASSWORD, CLICKHOUSE_DB
- **Vector Store**: QDRANT_URL
- **AI Services**: OLLAMA_BASE_URL, EMBEDDING_MODEL, LITELLM_URL, LITELLM_MASTER_KEY
- **Security**: JWT_SECRET, SESSION_SECRET
- **Infisical**: INFISICAL_URL, INFISICAL_SERVICE_TOKEN, INFISICAL_ENVIRONMENT, INFISICAL_PROJECT_ID

---

## 12. Authentication & Authorization

### Status: ⚠️ Partially Implemented

- `@fastify/jwt` registered with `secrets.JWT_SECRET`
- Fastify decorated with `authenticate` decorator that calls `request.jwtVerify()` and maps to `request.auth.user.userId`
- Vault routes (`/credentials`) protected with `onRequest: fastify.authenticate` hook
- **No user management, role-based access control (RBAC), or token issuance endpoints exist** — the auth system is set up but only verifies tokens; there's no registration, login, or token generation

---

## 13. Shared Types Package

### Status: ❌ Empty

**File:** `packages/types/src/index.ts`

```typescript
export type {};
```

- **Empty placeholder** — no shared types, DTOs, or interfaces are defined
- The package is declared (`@ra1/types`) but produces no exports
- Any cross-package type dependency will fail at compile time

### Key Files

| File | Purpose |
|---|---|
| `packages/types/package.json` | Package manifest — `@ra1/types` |
| `packages/types/tsconfig.json` | TypeScript config |
| `packages/types/src/index.ts` | Source file — **empty** |

---

## 14. Frontend (Web)

### Status: ❌ Not Started

No implementation exists. The frontend project (`apps/web/`) is an empty directory, with LibreChat integration planned for Step 6.

---

## 15. Implementation Status & Blockers

### Active Components (Fully or Partially Implemented)

| Component | Status | Description |
|---|---|---|
| **Infrastructure Orchestration** | ✅ Fully implemented | Docker Compose stack with 8 services, healthchecks, resource limits, network isolation |
| **API Server (Fastify)** | ✅ Fully implemented | HTTP server with helmet, CORS, rate-limiting, error handling, graceful shutdown |
| **Secrets Bootstrap (Infisical)** | ✅ Fully implemented | Runtime secret resolution via `@infisical/sdk` with Zod schema validation |
| **Credential Vault (Infisical Wrapper)** | ✅ Fully implemented | User-scoped store/resolve/rotate/revoke with Postgres metadata + ClickHouse telemetry |
| **Health Module** | ✅ Fully implemented | Multi-service health checks for Postgres / Valkey / ClickHouse / Qdrant / LiteLLM |
| **Database Connectors** | ✅ Fully implemented | Connection pools/clients for Postgres, Valkey, ClickHouse, Qdrant, Ollama |
| **Observability (Logging)** | ✅ Fully implemented | Pino logger with structured JSON output; dev-mode pino-pretty formatting |
| **Error Handling Middleware** | ✅ Fully implemented | Standardized error response shape with requestId tracing |
| **Setup & Health Scripts** | ✅ Fully implemented | `setup.sh` (Docker bootstrap), `health-check.sh` (curl-based diagnostics) |
| **Authentication / Authorization** | ⚠️ Partially implemented | JWT verification works; no user management, registration, or token issuance |
| **Shared Types Package** | ⚠️ Stubbed | Empty placeholder — `export type {}` |

### Pending Components (Zero Implementation)

| Component | Notes |
|---|---|
| **Memory Engine** | No files exist; no schema for conversation history or vector indices beyond Qdrant client init |
| **Input Engine** | No files exist; no prompt processing or input routing logic |
| **ATRS (Audit Trail & Routing System)** | Only a raw Pino logger exists; no structured event bus, no routing middleware, no audit trail |
| **Canvas / UI** | Placeholder only — LibreChat frontend planned for Step 6 |

### 🔴 Blockers (Must Fix Before Proceeding)

| # | Blocker | Impact |
|---|---|---|
| **B1** | **Empty Types Package** | No shared contracts between modules. Any cross-package type dependency will fail at compile time. |
| **B2** | **Telemetry Only on `resolve()`** | Incomplete audit trail. `store()`, `revoke()`, and `rotate()` do not emit telemetry events despite the spec requiring them. |

### 🟡 Warnings & Architectural Gaps

| # | Warning | Details |
|---|---|---|
| **W1** | **No ATRS (Event Routing System)** | All observability is direct (Pino calls + ClickHouse inserts). No centralized event bus, routing criteria, or audit trail abstraction. |
| **W2** | **Valkey & Qdrant are initialized but unused** | Both clients are connected during startup but never referenced in any business logic. |
| **W3** | **CORS is wide open** | `@fastify/cors` registered with `{ origin: "*" }`. Must be restricted before production. |
| **W4** | **No runtime secret rotation** | Secrets are fetched once at startup from Infisical. No mechanism for hot-reloading if secrets change. |
| **W5** | **ClickHouse connection lacks URL parsing safety** | `clickhouse.ts` creates a `new URL(secrets.CLICKHOUSE_URL)` but only uses `hostname` and `port` — protocol and path are ignored. |
| **W6** | **Ollama uses raw `fetch()` with no error recovery** | No retry logic, circuit breaker, or connection pooling. A single timeout or 5xx error propagates immediately. |

### LiteLLM Model Configuration

**File:** `infra/docker/litellm-config.yaml`

The LiteLLM proxy is configured with 11 models:

| Model Name | Provider |
|---|---|
| `gpt-4o` | OpenAI |
| `gpt-4o-mini` | OpenAI |
| `gpt-4-turbo` | OpenAI |
| `claude-opus-4` | Anthropic |
| `claude-sonnet-4` | Anthropic |
| `gemini-pro` | Google |
| `gemini-flash` | Google |
| `llama-3.1-70b` | Meta (via provider) |
| `llama-3.1-8b` | Meta (via provider) |
| `mistral-large` | Mistral |
| `deepseek-chat` | DeepSeek |

Settings: `forward_client_headers_to_llm_provider: true`, `drop_params: true`, `verbose: false`

---

## 16. Recommended Next Actions

Priority order:

1. **Populate Shared Types Package** — Move `CredentialMetadata`, `ErrorResponse`, `ServiceStatus`, and other shared interfaces into `packages/types/src/index.ts`. Configure the package's `tsconfig.json` to build independently.

2. **Complete Telemetry Coverage** — Add `writeAccessEvent()` calls (or an ATRS abstraction) to `CredentialVault.store()`, `revoke()`, and `rotate()`.

3. **Implement ATRS (Event Routing System)** — Design a centralized event bus that routes structured events to multiple sinks (Pino logs, ClickHouse, potential future sinks). Replace direct ClickHouse inserts with routed events.

4. **Design Memory Engine** — Define the vector index schema (Qdrant collections), conversation storage (Postgres), and caching strategy (Valkey TTL). The embedding pipeline is partially ready via `OllamaClient.generateEmbedding()`.

5. **Design Input Engine** — Implement the request processing pipeline that feeds into the Memory Engine and LLM routing (LiteLLM).

---

## 17. File Tree

```
/workspaces/King/
├── .env.example                          # Infisical env template (4 vars)
├── .eslintrc.json
├── .gitignore
├── .prettierrc
├── RA1_Complete_Reference.md             # This file — comprehensive reference
├── README.md                             # Project overview + setup guide
├── docker-compose.yml                    # Full stack (8 services)
├── docker-compose.prod.yml               # Production overrides
├── package.json                          # Root workspace config
├── pnpm-lock.yaml
├── pnpm-workspace.yaml                   # packages: apps/*, packages/*
├── tsconfig.json                         # Root TS config
│
├── apps/
│   ├── api/
│   │   ├── .eslintrc.json
│   │   ├── Dockerfile                    # Multi-stage (dev/prod)
│   │   ├── package.json                  # @ra1/api — all dependencies
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                  # Entrypoint + Fastify setup
│   │       ├── config/
│   │       │   ├── bootstrap.ts          # Infisical client + secret fetch
│   │       │   └── secrets.ts            # Zod schema + mutable singleton
│   │       ├── db/
│   │       │   ├── clickhouse.ts         # @clickhouse/client connector
│   │       │   ├── ollama.ts             # Custom HTTP client wrapper
│   │       │   ├── postgres.ts           # pg Pool connector
│   │       │   ├── qdrant.ts             # @qdrant/js-client-rest connector
│   │       │   ├── valkey.ts             # ioredis connector
│   │       │   └── migrations/
│   │       │       └── 001_credential_metadata.sql
│   │       ├── lib/
│   │       │   └── logger.ts             # Pino logger + pino-pretty
│   │       ├── middleware/
│   │       │   └── error.ts              # Global error handler
│   │       ├── modules/
│   │       │   ├── health/
│   │       │   │   ├── health.routes.ts  # /health, /health/live
│   │       │   │   └── health.service.ts # Multi-service checker
│   │       │   └── vault/
│   │       │       └── vault.routes.ts   # /credentials CRUD
│   │       └── vault/
│   │           └── CredentialVault.ts    # Core vault class
│   │
│   └── web/                              # LibreChat frontend (NOT STARTED)
│
├── infra/
│   └── docker/
│       ├── clickhouse-init.sql           # Schema: usage_events, credential_access_events
│       ├── litellm-config.yaml            # Model routing config (11 models)
│       └── postgres-init.sql             # Creates ra1_litellm database
│
├── packages/
│   └── types/
│       ├── package.json                  # @ra1/types
│       ├── tsconfig.json
│       └── src/
│           └── index.ts                  # EMPTY — export type {}
│
└── scripts/
    ├── health-check.sh                   # Curl-based health verification
    └── setup.sh                          # Prereq check + Docker bootstrap
```

---

## 18. Execution Changelog

| Date | Change |
|---|---|
| **2026-06-01** | Auth unblocked: Cleared Blocker B1 by implementing `@fastify/jwt`. Fastify decorated with `authenticate` hook. `request.auth.user.userId` mapping established for Credential Vault routes. |