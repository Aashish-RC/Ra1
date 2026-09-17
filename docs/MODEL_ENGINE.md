# Model Engine Architecture & Routing Specification

**Module:** `@ra1/backend/engine`  
**Base Architecture:** OmniRoute (`github.com/diegosouzapw/OmniRoute`, MIT)  
**Aggregator Integration:** OpenRouter (Zero-setup default upstream provider)  
**Governance Pattern:** LiteLLM-inspired Native TypeScript Implementation  

---

## 1. Executive Summary

The Model Engine provides unified LLM execution, adaptive multi-path routing, task-aware model selection, auto-fallback resilience, and enterprise governance for AI workflows. The engine seamlessly interfaces with the visual canvas and backend execution without modifying canvas UI code.

---

## 2. The 4-Path Routing Priority

The engine enforces a strict 4-path routing hierarchy designed to maximize availability while optimizing compute costs:

```
                  ┌─────────────────────────────────────┐
                  │          Execution Request          │
                  └──────────────────┬──────────────────┘
                                     │
                 ┌───────────────────▼───────────────────┐
                 │       1. Pooled Enterprise Keys       │
                 │  (Direct corporate accounts / lowest  │
                 │   latency & highest SLA tier)         │
                 └───────────────────┬───────────────────┘
                                     │ (unavailable / quota exhausted)
                 ┌───────────────────▼───────────────────┐
                 │       2. Pooled Aggregator            │
                 │  (OpenRouter default zero-setup path; │
                 │   universal catalog access)           │
                 └───────────────────┬───────────────────┘
                                     │ (unavailable / quota exhausted)
                 ┌───────────────────▼───────────────────┐
                 │           3. User BYOK                │
                 │  (User-supplied provider API keys     │
                 │   e.g. personal OpenAI/Anthropic keys)│
                 └───────────────────┬───────────────────┘
                                     │ (unconfigured / exhausted)
                 ┌───────────────────▼───────────────────┐
                 │           4. User BYOI                │
                 │  (User-supplied infrastructure:       │
                 │   local Ollama, vLLM, private cluster)│
                 └───────────────────────────────────────┘
```

### Routing Hierarchy Details
1. **Path 1: Pooled Enterprise Direct Keys (`pooled-enterprise`)**: Checked first. Routes through corporate-tier direct provider API keys when configured.
2. **Path 2: Pooled Aggregator (`pooled-aggregator`)**: The default zero-setup path. Powered by OpenRouter, providing immediate catalog access without requiring individual developer API credentials.
3. **Path 3: User BYOK (`byok`)**: Bring-Your-Own-Key fallback. Activated only when our pooled quota is exhausted or unavailable for the requested model, utilizing credentials supplied by the user.
4. **Path 4: User BYOI (`byoi`)**: Bring-Your-Own-Infrastructure fallback. Dispatches requests to user-specified local endpoints (e.g. `http://localhost:11434` for Ollama) or private self-hosted vLLM/TGI instances.

---

## 3. Model Selection Modes

The engine supports three distinct model selection modes:

1. **Dropdown Mode (`dropdown`)**:
   - The user explicitly designates a specific model (e.g., `anthropic/claude-3-5-sonnet`).
   - The engine attempts execution on that model across the 4 routing paths, falling back to next-tier models only if the primary model fails across all paths.
2. **Search-in-Dropdown Mode (`search`)**:
   - Allows keyword and fuzzy substring filtering across model IDs, provider tags, and functional capabilities (e.g. searching `"code"`, `"gemini"`, or `"multimodal"`).
3. **Auto Mode (`auto`) — Task-Aware Selection**:
   - Dynamically inspects the prompt and message attachments via `classifyTask()`.
   - Categorizes requirements into capabilities: `code`, `math`, `reasoning`, `creative`, `fast`, `multimodal`, and `tools`.
   - Evaluates models against benchmark intelligence ratings, latency scores, and complexity alignment.

---

## 4. Priority Allow/Deny System

The allow/deny system operates under strict semantic rules:

### Allow-List: Priority Signal (Not a Hard Cap)
- An `allowList` is treated as a **priority recommendation**. Allowed models receive a significant scoring boost (`+30` points) in the selection algorithm.
- If a prompt has high complexity (e.g., advanced formal mathematical theorem proving or complex multi-file AST manipulation) and the allow-list only contains low-tier economy models, **Auto mode can reach beyond the allow-list** to select a flagship reasoning model capable of fulfilling the task.

### Deny-List: Hard Exclusion (Never Selected)
- A `denyList` is a **strict, non-negotiable exclusion**.
- Denied models are completely purged from the candidate pool (`score = -Infinity`).
- **A denied model is NEVER selected, under any circumstances, including as a fallback candidate in multi-tier retry chains.**
- Explicit dropdown requests for a denied model immediately reject with a descriptive policy error.

### Per-Prompt Dynamic Evaluation
- Allow/deny lists are evaluated dynamically on each execution request rather than as fixed static environment filters, enabling per-workflow, per-user, or per-node governance.

---

## 5. Configurable Notification Policies

When Auto mode selects a model outside the user's allow-list, the engine evaluates the user's configured `flagPreference`:

| Policy | Behavior |
| :--- | :--- |
| **`always`** | Always emits an `auto_selected_outside_allowlist` notification warning explaining the capability justification. |
| **`cost-impacting`** | Emits a notification **only** if the selected model has a higher cost per token than the most expensive model in the allow-list. If the selected model is equal or cheaper, no notification is fired. |
| **`never`** | Suppresses notifications entirely for silent autonomous execution. |

---

## 6. Auto-Fallback Chains

When a selected provider candidate fails (e.g., HTTP 503, rate limit trip, or connection timeout):
1. The engine catches the failure and logs a resilience event.
2. The candidate is flagged and the circuit breaker trips for that model/route.
3. The engine automatically advances to the next highest-scoring candidate in `fallbackCandidates`.
4. The response flags `fallbackTriggered: true` and includes the complete `fallbackChain` sequence for auditing.

---

## 7. Multimodal & MCP/A2A Capabilities

- **Multimodal**: Native support for image attachments (`MultimodalAttachment`) with automatic filtering to models featuring the `multimodal` capability.
- **MCP / A2A Support**: Tool definitions (`ToolDefinition`) compatible with Anthropic/OpenAI function calling schemas and Model Context Protocol (MCP) server standards.
