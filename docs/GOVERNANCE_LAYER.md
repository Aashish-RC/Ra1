# Governance Layer Architecture & Schema Specification

**Module:** `@ra1/backend/engine/governance`  
**Pattern Attribution:** Inspired by LiteLLM's virtual-key/budget conceptual pattern (`github.com/BerriAI/litellm`, MIT Core).  
**Implementation Origin:** **100% Native TypeScript Implementation Written From Scratch.** No code, libraries, or Python dependencies were ported or derived.

---

## 1. Overview & Purpose

The Governance Layer sits in front of the model routing and execution engine, enforcing multi-tenant isolation, enterprise budgeting, sliding-window rate limiting, and access control. 

By utilizing **Virtual Keys**, downstream applications, team members, and automated canvas nodes interact with the model engine without ever exposing or handling real upstream provider credentials (e.g. OpenAI, Anthropic, or OpenRouter master keys).

---

## 2. Virtual Key Architecture (`VirtualKeyManager`)

A Virtual Key is an internally issued bearer token scoped to an individual user, team, or agentic workflow:

```typescript
export interface VirtualKey {
  /** Unique bearer token starting with 'vk-usr-' or 'vk-team-' */
  key: string;
  /** Owner user identifier */
  userId: string;
  /** Optional team/tenant identifier */
  teamId?: string;
  /** Human-readable label */
  name: string;
  /** Creation timestamp in milliseconds */
  createdAt: number;
  /** Optional expiration timestamp */
  expiresAt?: number;
  /** Revocation status */
  revoked?: boolean;
  /** Requests-per-minute cap specific to this key */
  rateLimitRPM?: number;
  /** Tokens-per-minute cap specific to this key */
  rateLimitTPM?: number;
  /** Lifetime or monthly spending cap in USD */
  maxSpendUSD?: number;
  /** Whitelisted models this key is permitted to call */
  allowedModels?: string[];
  /** Blacklisted models strictly forbidden for this key */
  deniedModels?: string[];
}
```

### Security Benefits
- **Zero Credential Exposure**: Callers cannot inspect or extract underlying upstream provider keys.
- **Instant Revocation**: Any compromised or decommissioned virtual key can be revoked immediately via `revokeKey()` without rotating corporate accounts.
- **Granular Scoping**: Keys can be locked to specific budget thresholds and restricted to economy models.

---

## 3. Budget Management (`BudgetTracker`)

The `BudgetTracker` enforces financial caps mapped to user tiers, team budgets, or individual virtual keys:

```typescript
export interface BudgetRecord {
  entityId: string; // userId, teamId, or virtualKey
  entityType: 'user' | 'team' | 'key';
  maxSpendUSD: number;
  currentSpendUSD: number;
  resetPeriod: 'daily' | 'monthly' | 'lifetime';
  periodStart: number;
}
```

### Enforcement Lifecycle
1. **Pre-Execution Check**: Before routing begins, `checkBudget(entityId)` verifies that `currentSpendUSD` has not met or exceeded `maxSpendUSD`. If exceeded, execution is immediately halted with a `BudgetExceededError`.
2. **Automatic Period Reset**: When `resetPeriod` is `'daily'` or `'monthly'`, the tracker automatically checks elapsed time upon inspection and resets `currentSpendUSD` to zero when a new window commences.
3. **Post-Execution Accrual**: Upon successful completion, the exact execution cost (derived from token usage and model pricing) is accrued to the key, user, and team balances.

---

## 4. Rate Limiting (`RateLimiter`)

The `RateLimiter` enforces dual-dimension sliding window throttling:

- **RPM (Requests Per Minute)**: Limits the volume of HTTP/WS dispatches.
- **TPM (Tokens Per Minute)**: Limits total token throughput (prompt + completion tokens) to prevent queue starvation.

```typescript
export interface RateLimitConfig {
  maxRPM: number;
  maxTPM: number;
}
```

When a request exceeds either threshold within a 60-second window, the limiter raises a `RateLimitExceededError` detailing the current consumption and threshold.

---

## 5. Model Access Restrictions

Model access controls are implemented directly at the governance boundary:
- **Key-Level Model Permissions**: A virtual key can declare `allowedModels` and `deniedModels`.
- **Dynamic Merging**: Key-level permissions automatically merge with request-level allow/deny parameters, ensuring enterprise-wide exclusions (such as forbidding high-cost or unapproved vendors) cannot be bypassed by client requests.

---

## 6. Spend Tracking & Pooled Quota Audit (`UsageStore`)

The `UsageStore` maintains an in-memory audit log for every execution:

```typescript
export interface UsageAuditRecord {
  id: string;
  timestamp: number;
  virtualKey?: string;
  userId?: string;
  teamId?: string;
  model: string;
  routeUsed: RoutingPath;
  promptTokens: number;
  completionTokens: number;
  costUSD: number;
  latencyMs: number;
  status: 'success' | 'failed';
  error?: string;
}
```

### Audit Queries
- `getTotalSpendUSD(filter)`: Aggregates spend across users, teams, or virtual keys.
- `getPooledSpendUSD()`: Aggregates total expenditure across the shared corporate quota (`pooled-enterprise` and `pooled-aggregator`).
