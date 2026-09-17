# Ra1 Architecture Reference

This document is the single authoritative reference for Ra1's node contract, model engine, governance layer, connector reference study, and merged node catalog. It was consolidated from five separate documents as part of Phase 3 Step 0 (documentation cleanup).

**Sections:**
1. [Node Contract Specification](#section-1-node-contract-specification--implementation-guide)
2. [Model Engine Architecture & Routing](#section-2-model-engine-architecture--routing-specification)
3. [Governance Layer Architecture](#section-3-governance-layer-architecture--schema-specification)
4. [ActivePieces Reference Study](#section-4-activepieces-piece-declaration-framework-structural-reference-study)
5. [Merged Built-In Nodes Catalog](#section-5-merged-built-in-nodes-catalog--file-reconciliation)
6. [Onboarding Flow & AI Thinking Drawer Architecture](#section-6-onboarding-flow--ai-thinking-drawer-architecture)
7. [ReAct Agent Loop, "Ask Permission First" Approval Card & MCP Wiring Architecture](#section-7-react-agent-loop-ask-permission-first-approval-card--mcp-wiring-architecture)
8. [Authentication, Session Governance & Multi-Tenant Access Control Architecture](#section-8-authentication-session-governance--multi-tenant-access-control-architecture)

---

## Section 1: Node Contract Specification & Implementation Guide

*Sourced from: `NODE_CONTRACT.md` (Phase 1, Step 1)*

This document specifies the TypeScript node contract for the visual canvas system, modeled directly on Ironclad Rivet's core architecture (`packages/core/src/model/NodeBase.ts` and `NodeDefinition.ts`).

---

### 1.1 Core Interfaces & Field Documentation

#### `NodeBase` & `ChartNode`
Every node placed on the canvas satisfies the `NodeBase` contract:

```typescript
export interface NodeBase {
  type: string;
  id: NodeId;
  title: string;
  description?: string;
  isSplitRun?: boolean;
  isSplitSequential?: boolean;
  splitRunMax?: number;
  visualData: VisualData;
  data: unknown;
  variants?: ChartNodeVariant<unknown>[];
  tests?: NodeTestGroup[];
  disabled?: boolean;
  isConditional?: boolean;
  customCode?: string;
}
```

#### Field Details:
- **`type`** (`string`, required): Unique string identifying the node implementation in the registry (e.g. `'code'`, `'chat'`, `'text'`, `'match'`).
- **`id`** (`NodeId`, required): UUID or nanoid string uniquely identifying this specific node instance within a graph.
- **`title`** (`string`, required): Label displayed in the node header bar on the canvas.
- **`description`** (`string`, optional): Optional developer notes, markdown documentation, or user comments for the node.
- **`isSplitRun`** (`boolean`, optional): When enabled, if an input receives an array, the node executes for each item in the array.
- **`isSplitSequential`** (`boolean`, optional): Controls whether split executions run in sequential order rather than in parallel.
- **`splitRunMax`** (`number`, optional): Upper cap on the concurrency of split executions.
- **`visualData`** (`VisualData`, required): Contains the layout coordinates on the canvas:
  - `x`, `y`: Top-left canvas coordinates.
  - `width`, `height`: Dimension overrides.
  - `color`: Custom accent colors `{ border: string; bg: string }`.
  - `zIndex`: Rendering stacking order.
- **`data`** (`unknown`, required): Strongly-typed node configuration state (e.g. CodeNode code string, ChatNode model settings, etc.).
- **`variants`** (`ChartNodeVariant[]`, optional): Alternative data configurations for prompt evaluation or A/B testing.
- **`tests`** (`NodeTestGroup[]`, optional): Inline assertions and test criteria evaluated by the testing framework.
- **`disabled`** (`boolean`, optional): If true, node execution is bypassed during flow evaluation.
- **`isConditional`** (`boolean`, optional): When true, exposes the special `$if` boolean input port.
- **`customCode`** (`string`, optional): User-edited TypeScript source code implementing this node's logic, parameters, and metadata according to the Langflow editable-node-code pattern.

---

### 1.2 `NodeInputDefinition` & `NodeOutputDefinition`

Ports define the connection endpoints on the node:

```typescript
export interface NodeInputDefinition {
  id: PortId;
  title: string;
  dataType: string | readonly string[];
  required?: boolean;
  defaultValue?: unknown;
  description?: string;
  coerced?: boolean;
  data?: unknown;
}

export interface NodeOutputDefinition {
  id: PortId;
  title: string;
  dataType: string | readonly string[];
  defaultValue?: unknown;
  description?: string;
  data?: unknown;
}
```

#### Field Details:
- **`id`** (`PortId`, required): Identifier unique among ports of the same node (e.g., `'input'`, `'code'`, `'output'`).
- **`title`** (`string`, required): Label displayed alongside the port dot on the canvas.
- **`dataType`** (`string | string[]`, required): Type constraint (`'string'`, `'number'`, `'boolean'`, `'object'`, `'chat-message'`, `'any'`, etc.).
- **`required`** (`boolean`, optional): If true, execution blocks if this input does not receive a connection or value.
- **`defaultValue`** (`unknown`, optional): Fallback value used when the port is not wired.
- **`description`** (`string`, optional): Tooltip text explaining the port's role.
- **`coerced`** (`boolean`, optional): Whether incoming values are automatically converted into the target dataType.

---

### 1.3 `NodeConnection`
Wires between ports are defined by:

```typescript
export interface NodeConnection {
  outputNodeId: NodeId;
  outputId: PortId;
  inputNodeId: NodeId;
  inputId: PortId;
}
```
- **`outputNodeId`**: Upstream source node emitting data.
- **`outputId`**: Upstream port id.
- **`inputNodeId`**: Downstream target node receiving data.
- **`inputId`**: Downstream input port id.

---

### 1.4 How to Implement a New Node Type

To create a new node type, follow these 3 steps:

#### Step 1: Define the Data Interface and ChartNode Type
```typescript
import { ChartNode, NodeImpl, NodeDefinition, nodeDefinition } from '../contract/index.js';

export interface MyCustomNodeData {
  multiplier: number;
  prefixText: string;
}

export type MyCustomNode = ChartNode<'myCustom', MyCustomNodeData>;
```

#### Step 2: Implement the Node Class Extending `NodeImpl`
```typescript
import {
  NodeImpl,
  NodeInputDefinition,
  NodeOutputDefinition,
  Inputs,
  Outputs,
  InternalProcessContext,
} from '../contract/index.js';
import { nanoid } from 'nanoid';

export class MyCustomNodeImpl extends NodeImpl<MyCustomNode> {
  static create(): MyCustomNode {
    return {
      type: 'myCustom',
      id: nanoid(),
      title: 'My Custom Node',
      visualData: { x: 100, y: 100 },
      data: {
        multiplier: 2,
        prefixText: 'Result: ',
      },
    };
  }

  getInputDefinitions(): NodeInputDefinition[] {
    return [
      {
        id: 'value',
        title: 'Input Value',
        dataType: 'number',
        required: true,
        description: 'Number to multiply',
      },
    ];
  }

  getOutputDefinitions(): NodeOutputDefinition[] {
    return [
      {
        id: 'result',
        title: 'Formatted Output',
        dataType: 'string',
        description: 'Multiplied value formatted as text',
      },
    ];
  }

  async process(inputs: Inputs, context: InternalProcessContext): Promise<Outputs> {
    const val = Number(inputs.value ?? 0);
    const calculated = val * this.data.multiplier;
    return {
      result: `${this.data.prefixText}${calculated}`,
    };
  }
}
```

#### Step 3: Register the Node Definition
```typescript
import { nodeDefinition } from '../contract/index.js';

export const myCustomNode = nodeDefinition(
  MyCustomNodeImpl,
  'My Custom Node',
  'Data Manipulation',
  'Multiplies an input number and formats it as text.'
);

// In registry:
registry.register(myCustomNode);
```

---

### 1.5 Langflow Editable-Node-Code Pattern (`customCode`)

#### 1.5.1 Overview & Architecture
Adapted from Langflow's `custom_component/component.py` pattern, every node residing on the canvas—across all 109 node implementations—features a viewable and editable underlying code implementation. Rather than restricting code customization solely to explicit `CodeNode` instances, this pattern democratizes code-level modification for all node types:

1. **Universal Source View**: Clicking the **Code** button on any visual node opens a modal containing the complete, idiomatic TypeScript source implementation for that node.
2. **Non-Destructive Live Reflection**:
   - Modifying logic, initial parameters, or metadata directives (e.g. `@title <New Title>`) takes effect live on the canvas.
   - The node card updates its title, preview snippet, and internal configuration without modifying the node's unique ID (`node.id`), port IDs (`inputs`, `outputs`), or canvas coordinates.
   - **Crucially, existing wire connections remain completely intact without breakage.**
3. **Lossless YAML Persistence**:
   - The `customCode` field is serialized directly into the YAML graph representation during flow export.
   - When a flow is reloaded or imported, `customCode` is restored and reinstantiated into the visual node.

#### 1.5.2 Standard Generated Source Code Anatomy
```typescript
/**
 * @title Input Prompt Text
 * @type text
 * Sourced from TypeScript Node Contract (Langflow editable-node-code pattern)
 */

export const NodeDefinition = {
  type: "text",
  title: "Input Prompt Text",
  inputs: [],
  outputs: [
    {
      "id": "value",
      "title": "Text",
      "dataType": "string"
    }
  ],
  initialData: {
    "text": "Hello Rivet AI Canvas!"
  },

  async process(inputs: Record<string, unknown>, context: { nodeId: string }) {
    // Runtime execution hook
    const primaryInput = inputs["input"] ?? null;
    return {
      "value": primaryInput ?? "Hello Rivet AI Canvas!"
    };
  }
};

export default NodeDefinition;
```

---

### 1.6 Langflow Component Cross-Check & Coverage Audit

A comprehensive cross-check of Langflow's `flow_controls` and `input_output` component categories was conducted against our merged node repository to ensure zero unnecessary duplication and full architectural coverage.

#### 1.6.1 Flow Controls Category

| Langflow Component (`flow_controls`) | Rivet Merged Equivalent Node(s) | Category | Coverage Status & Functional Notes |
| :--- | :--- | :--- | :--- |
| `conditional_router.py` | `IfNode`, `IfElseNode`, `SwitchNode` | `logic` / `control` | **100% Covered**: Branches graph execution conditionally based on expressions or boolean conditions. |
| `data_conditional_router.py` | `FilterNode`, `MatchNode` | `logic` / `data` | **100% Covered**: Routes or filters structured objects based on predicate match. |
| `loop.py` | `LoopControllerNode`, `LoopUntilNode` | `control` | **100% Covered**: Implements bounded and condition-driven loop iterations with accumulator state. |
| `pass_message.py` | `PassthroughNode` | `control` | **100% Covered**: Forwards input data unmodified across graph barriers. |
| `human_input.py` | `UserInputNode` | `interaction` | **100% Covered**: Pauses flow execution to solicit interactive user input. |
| `sub_flow.py` / `run_flow.py` | `SubgraphNode` | `flow` | **100% Covered**: Invokes a nested sub-graph with explicit input/output port mappings. |
| `flow_tool.py` | `SubroutineNode`, `CallNode` | `flow` | **100% Covered**: Exposes encapsulated subgraphs as callable tools. |
| `listen.py` / `notify.py` | `EventNode`, `WaitEventNode` | `control` / `events` | **100% Covered**: Asynchronous event dispatch and subscription within graph execution. |

#### 1.6.2 Input / Output Category

| Langflow Component (`input_output`) | Rivet Merged Equivalent Node(s) | Category | Coverage Status & Functional Notes |
| :--- | :--- | :--- | :--- |
| `chat.py` / `text.py` | `GraphInputNode`, `UserInputNode`, `TextNode` | `io` / `text` | **100% Covered**: Feeds external textual prompt or chat parameters into the graph. |
| `chat_output.py` / `text_output.py` | `GraphOutputNode`, `TextNode` | `io` / `text` | **100% Covered**: Emits graph execution results and final chat responses to consumer. |
| `webhook.py` | HTTP Trigger via Debugger Bridge / API Handler | `network` | **100% Covered**: External ingress trigger routed to `GraphInputNode`. |

**Verdict: 100% Full Coverage.** Every capability present in Langflow's `flow_controls` and `input_output` components is comprehensively addressed by Rivet's core nodes. No duplicate node types were introduced.

---

## Section 2: Model Engine Architecture & Routing Specification

**Module:** `@ra1/backend/engine`  
**Base Architecture:** OmniRoute (`github.com/diegosouzapw/OmniRoute`, MIT)  
**Aggregator Integration:** OpenRouter (Zero-setup default upstream provider)  
**Governance Pattern:** LiteLLM-inspired Native TypeScript Implementation  

---

### 2.1 Executive Summary

The Model Engine provides unified LLM execution, adaptive multi-path routing, task-aware model selection, auto-fallback resilience, and enterprise governance for AI workflows. The engine seamlessly interfaces with the visual canvas and backend execution without modifying canvas UI code.

---

### 2.2 The 4-Path Routing Priority

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

#### Routing Hierarchy Details
1. **Path 1: Pooled Enterprise Direct Keys (`pooled-enterprise`)**: Checked first. Routes through corporate-tier direct provider API keys when configured.
2. **Path 2: Pooled Aggregator (`pooled-aggregator`)**: The default zero-setup path. Powered by OpenRouter, providing immediate catalog access without requiring individual developer API credentials.
3. **Path 3: User BYOK (`byok`)**: Bring-Your-Own-Key fallback. Activated only when our pooled quota is exhausted or unavailable for the requested model, utilizing credentials supplied by the user.
4. **Path 4: User BYOI (`byoi`)**: Bring-Your-Own-Infrastructure fallback. Dispatches requests to user-specified local endpoints (e.g. `http://localhost:11434` for Ollama) or private self-hosted vLLM/TGI instances.

---

### 2.3 Model Selection Modes

The engine supports three distinct model selection modes:

1. **Dropdown Mode (`dropdown`)**: The user explicitly designates a specific model (e.g., `anthropic/claude-3-5-sonnet`). The engine attempts execution on that model across the 4 routing paths, falling back to next-tier models only if the primary model fails across all paths.
2. **Search-in-Dropdown Mode (`search`)**: Allows keyword and fuzzy substring filtering across model IDs, provider tags, and functional capabilities (e.g. searching `"code"`, `"gemini"`, or `"multimodal"`).
3. **Auto Mode (`auto`) — Task-Aware Selection**: Dynamically inspects the prompt and message attachments via `classifyTask()`. Categorizes requirements into capabilities: `code`, `math`, `reasoning`, `creative`, `fast`, `multimodal`, and `tools`. Evaluates models against benchmark intelligence ratings, latency scores, and complexity alignment.

---

### 2.4 Priority Allow/Deny System

#### Allow-List: Priority Signal (Not a Hard Cap)
- An `allowList` is treated as a **priority recommendation**. Allowed models receive a significant scoring boost (`+30` points) in the selection algorithm.
- If a prompt has high complexity and the allow-list only contains low-tier economy models, **Auto mode can reach beyond the allow-list** to select a flagship reasoning model.

#### Deny-List: Hard Exclusion (Never Selected)
- A `denyList` is a **strict, non-negotiable exclusion**.
- Denied models are completely purged from the candidate pool (`score = -Infinity`).
- **A denied model is NEVER selected, under any circumstances, including as a fallback candidate.**
- Explicit dropdown requests for a denied model immediately reject with a descriptive policy error.

---

### 2.5 Configurable Notification Policies

| Policy | Behavior |
| :--- | :--- |
| **`always`** | Always emits an `auto_selected_outside_allowlist` notification warning explaining the capability justification. |
| **`cost-impacting`** | Emits a notification **only** if the selected model has a higher cost per token than the most expensive model in the allow-list. |
| **`never`** | Suppresses notifications entirely for silent autonomous execution. |

---

### 2.6 Auto-Fallback Chains

When a selected provider candidate fails:
1. The engine catches the failure and logs a resilience event.
2. The candidate is flagged and the circuit breaker trips for that model/route.
3. The engine automatically advances to the next highest-scoring candidate in `fallbackCandidates`.
4. The response flags `fallbackTriggered: true` and includes the complete `fallbackChain` sequence for auditing.

---

### 2.7 Multimodal & MCP/A2A Capabilities

- **Multimodal**: Native support for image attachments (`MultimodalAttachment`) with automatic filtering to models featuring the `multimodal` capability.
- **MCP / A2A Support**: Tool definitions (`ToolDefinition`) compatible with Anthropic/OpenAI function calling schemas and Model Context Protocol (MCP) server standards.

---

## Section 3: Governance Layer Architecture & Schema Specification

**Module:** `@ra1/backend/engine/governance`  
**Pattern Attribution:** Inspired by LiteLLM's virtual-key/budget conceptual pattern (`github.com/BerriAI/litellm`, MIT Core).  
**Implementation Origin:** **100% Native TypeScript Implementation Written From Scratch.** No code, libraries, or Python dependencies were ported or derived.

---

### 3.1 Overview & Purpose

The Governance Layer sits in front of the model routing and execution engine, enforcing multi-tenant isolation, enterprise budgeting, sliding-window rate limiting, and access control.

By utilizing **Virtual Keys**, downstream applications, team members, and automated canvas nodes interact with the model engine without ever exposing or handling real upstream provider credentials.

---

### 3.2 Virtual Key Architecture (`VirtualKeyManager`)

```typescript
export interface VirtualKey {
  /** Unique bearer token starting with 'vk-usr-' or 'vk-team-' */
  key: string;
  userId: string;
  teamId?: string;
  name: string;
  createdAt: number;
  expiresAt?: number;
  revoked?: boolean;
  rateLimitRPM?: number;
  rateLimitTPM?: number;
  maxSpendUSD?: number;
  allowedModels?: string[];
  deniedModels?: string[];
}
```

#### Security Benefits
- **Zero Credential Exposure**: Callers cannot inspect or extract underlying upstream provider keys.
- **Instant Revocation**: Any compromised virtual key can be revoked immediately via `revokeKey()` without rotating corporate accounts.
- **Granular Scoping**: Keys can be locked to specific budget thresholds and restricted to economy models.

---

### 3.3 Budget Management (`BudgetTracker`)

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

#### Enforcement Lifecycle
1. **Pre-Execution Check**: `checkBudget(entityId)` verifies `currentSpendUSD` has not met or exceeded `maxSpendUSD`.
2. **Automatic Period Reset**: Resets `currentSpendUSD` to zero when a new window commences.
3. **Post-Execution Accrual**: Exact execution cost is accrued to the key, user, and team balances.

---

### 3.4 Rate Limiting (`RateLimiter`)

- **RPM (Requests Per Minute)**: Limits the volume of HTTP/WS dispatches.
- **TPM (Tokens Per Minute)**: Limits total token throughput to prevent queue starvation.

```typescript
export interface RateLimitConfig {
  maxRPM: number;
  maxTPM: number;
}
```

---

### 3.5 Model Access Restrictions

- **Key-Level Model Permissions**: A virtual key can declare `allowedModels` and `deniedModels`.
- **Dynamic Merging**: Key-level permissions automatically merge with request-level allow/deny parameters.

---

### 3.6 Spend Tracking & Pooled Quota Audit (`UsageStore`)

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

#### Audit Queries
- `getTotalSpendUSD(filter)`: Aggregates spend across users, teams, or virtual keys.
- `getPooledSpendUSD()`: Aggregates total expenditure across the shared corporate quota.

---

## Section 4: ActivePieces Piece-Declaration Framework: Structural Reference Study

**Document Type:** Architectural Reference & Specification Study  
**Scope:** ActivePieces Core Piece Framework (`packages/pieces/framework` & `packages/core/piece-types`)  
**Licensing & Boundaries:** ActivePieces MIT Core only. Strictly excludes `packages/ee` (non-MIT/Enterprise). Zero connector imports. No canvas code modifications.

---

### 4.1 Executive Summary & Context

This reference study analyzes ActivePieces' core piece declaration pattern to serve as the design foundation for the connector layer (Phase 4). ActivePieces organizes integrations into modular, self-contained packages called **"pieces"**. Each piece encapsulates authentication requirements, input property declarations, and executable actions/triggers.

---

### 4.2 ActivePieces Framework Architecture

```
┌────────────────────────────────────────────────────────┐
│                        Piece                           │
│  (displayName, logoUrl, auth, actions, triggers)       │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
       ┌────────▼───────┐        ┌───────▼────────┐
       │     Action     │        │    Trigger     │
       │ (props, run)   │        │ (poll/webhook) │
       └────────┬───────┘        └───────┬────────┘
                │                        │
       ┌────────▼────────────────────────▼────────┐
       │             Property & Auth              │
       │ (Property.ShortText, PieceAuth.OAuth2)   │
       └──────────────────────────────────────────┘
```

---

### 4.3 The Piece Declaration Contract (`createPiece`)

```typescript
// Sourced from ActivePieces packages/pieces/framework/src/lib/piece.ts (MIT License)
export const createPiece = <PieceAuth extends PieceAuthProperty | PieceAuthProperty[] | undefined>(
  params: CreatePieceParams<PieceAuth>
): Piece<PieceAuth> => {
  return new Piece<PieceAuth>(
    params.displayName,
    params.logoUrl,
    params.authors ?? [],
    params.events,
    params.actions,
    params.triggers,
    params.categories ?? [],
    params.auth,
    params.minimumSupportedRelease,
    params.maximumSupportedRelease,
    params.description,
    params.deprecated,
  );
};
```

---

### 4.4 Authentication Declaration Model (`PieceAuth`)

| Auth Type | Factory Method | Target Use Case |
| :--- | :--- | :--- |
| **Secret Text** | `PieceAuth.SecretText()` | API keys, Bearer tokens |
| **OAuth2** | `PieceAuth.OAuth2()` | Provider OAuth authorization code flow |
| **Basic Auth** | `PieceAuth.BasicAuth()` | Username + Password credentials |
| **Custom Auth** | `PieceAuth.CustomAuth()` | Multi-field custom credential schemas |
| **OIDC** | `PieceAuth.OIDC()` | OpenID Connect identity provider |
| **None** | `PieceAuth.None()` | Unauthenticated APIs / Utilities |

---

### 4.5 Input Property Declaration Model (`Property.*`)

1. **Primitive Text Inputs**: `Property.ShortText`, `Property.LongText`, `Property.Number`, `Property.Checkbox`
2. **Structured & Dynamic Inputs**: `Property.StaticDropdown`, `Property.Dropdown`, `Property.MultiSelectDropdown`, `Property.Json`, `Property.Array`, `Property.Object`, `Property.DynamicProperties`

---

### 4.6 Action Declaration Contract (`createAction`)

```typescript
export const sendMessageAction = createAction({
  name: 'send_message',
  displayName: 'Send Channel Message',
  description: 'Post a message to a designated channel',
  props: {
    channel: Property.Dropdown({ displayName: 'Channel', required: true, refreshers: [], options: async ({ auth }) => ({ options: [] }) }),
    text: Property.LongText({ displayName: 'Message Text', required: true }),
  },
  async run(context) {
    const { auth, propsValue } = context;
    // Execute using resolved auth and evaluated inputs
  },
});
```

---

### 4.7 Comparative Analysis: ActivePieces vs. Rivet Node Contract

| Dimension | Rivet Node Contract (Our Foundation) | ActivePieces Piece Framework |
| :--- | :--- | :--- |
| **Execution Topology** | Fine-grained DAG with port-to-port wires | Step-by-step sequential or linear flow |
| **Input/Output Mechanism** | Named Ports (`PortDefinition`, `PortId`) | Property dictionary + JSON return payload |
| **Authentication** | Externalized to environment variables | First-class `PieceAuth` declarations |
| **Data Propagation** | Wire-based explicit port connections | Variable resolution `{{step_1.output.id}}` |
| **Code Modifiability** | Langflow editable-node-code pattern | Pre-compiled package actions |
| **Granularity** | Low-level primitives | High-level business actions |
| **Serialization** | Lossless YAML flow storage | JSON-based Flow Version model |

---

### 4.8 Design Blueprint for Phase 4 Connector Layer

When bridging ActivePieces piece patterns into our Rivet canvas, the following architectural mapping applies:

1. **Piece Action as a Rivet Node**: Each piece action (e.g. `slack.send_message`) maps to a custom Rivet node type: `type: "piece:slack:send_message"`. Action `props` map to input ports; return schema maps to output ports.
2. **Connection Injection Pattern**: Authentication is handled via a dedicated `ConnectionManager` bridge. Nodes reference a `connectionId: string`, and the runner injects resolved auth tokens into the execution context.
3. **Dynamic Dropdowns via Debugger Bridge**: ActivePieces' dynamic property dropdowns will utilize the websocket Debugger Bridge to resolve options in the editor.

---

### 4.9 License & IP Boundary Verification

- **ActivePieces Core**: Licensed under MIT (`packages/core`, `packages/pieces/framework`, `packages/server/api`).
- **Enterprise Restrictions (`packages/ee`)**: Strictly non-MIT (commercial/enterprise). **No code, dependencies, or schemas from `packages/ee` have been or will be imported.**
- **Connector Library Scope**: The community connector packages in `packages/pieces/community` are referenced as architectural patterns. Phase 4 introduces connectors via clean, contract-compliant TypeScript wrappers.

---

## Section 5: Merged Built-In Nodes Catalog & File Reconciliation

*Sourced from: `MERGED_NODES.md` (Phase 1, Steps 1–3)*

This section provides a comprehensive inventory of all **109 built-in node implementations** merged from Ironclad Rivet (`github.com/Ironclad/rivet` - MIT License), reconciles the file counts across `backend/nodes/`, and formally documents the scope status of each node group.

---

### 5.1 File Count & Inventory Reconciliation

A complete audit of `backend/nodes/` shows **118 total files** (117 files across 4 subdirectories + 1 master registry file). These files are classified into three distinct functional tiers:

1. **Node Implementations (109 files)**: Executable node definitions across three directories:
   - `backend/nodes/core/`: **84 files**
   - `backend/nodes/assistants/`: **15 files**
   - `backend/nodes/plugins/`: **10 files**
2. **Contract & Schema Interfaces (8 files)**: Located in `backend/nodes/contract/` — interface schemas, not node implementations.
3. **Master Catalog Registry (1 file)**: Located at `backend/nodes/allNodes.ts`.

$$\text{Total Files (118)} = 109\text{ Node Implementations} + 8\text{ Contract Interfaces} + 1\text{ Registry File}$$

---

### 5.2 Summary by Category

| Category | Node Count | Directory Path | Scope Classification |
|---|---|---|---|
| **1. Graph & Flow Control** | 14 | `backend/nodes/core/` | In Scope (Phase 1) |
| **2. Chat & Language Models** | 9 | `backend/nodes/core/` | In Scope (Phase 1) |
| **3. Data Manipulation** | 26 | `backend/nodes/core/` | In Scope (Phase 1) |
| **4. Files, Datasets & Vectors** | 13 | `backend/nodes/core/` | In Scope (Phase 1) |
| **5. OpenAI Assistants** | 15 | `backend/nodes/assistants/` | In Scope (Phase 1) |
| **6. Model Context Protocol (MCP)** | 3 | `backend/nodes/core/` | In Scope (Phase 1) |
| **7. Media & Audio** | 3 | `backend/nodes/core/` | In Scope (Phase 1) |
| **8. Utility & System** | 16 | `backend/nodes/core/` | In Scope (Phase 1) |
| **9. Integrated Plugins** | 10 | `backend/nodes/plugins/` | Unscoped Scope Addition |
| **Total Node Implementations** | **109** | | |
| *Contract Schemas & Interfaces* | *8* | `backend/nodes/contract/` | *Foundational* |
| *Master Node Registry* | *1* | `backend/nodes/allNodes.ts` | *Registry* |
| **Total Files in backend/nodes/** | **118** | | |

---

### 5.3 Complete Numbered Node Directory & Upstream Source Mapping

#### 1. Graph & Flow Control (14 Nodes) — `backend/nodes/core/`

| # | Node Name | Type Identifier | Implementation File |
|---|---|---|---|
| 1 | SubGraphNode | `subGraph` | `backend/nodes/core/SubGraphNode.ts` |
| 2 | GraphInputNode | `graphInput` | `backend/nodes/core/GraphInputNode.ts` |
| 3 | GraphOutputNode | `graphOutput` | `backend/nodes/core/GraphOutputNode.ts` |
| 4 | CallGraphNode | `callGraph` | `backend/nodes/core/CallGraphNode.ts` |
| 5 | ListGraphsNode | `listGraphs` | `backend/nodes/core/ListGraphsNode.ts` |
| 6 | GraphReferenceNode | `graphReference` | `backend/nodes/core/GraphReferenceNode.ts` |
| 7 | ReferencedGraphAliasNode | `referencedGraphAlias` | `backend/nodes/core/ReferencedGraphAliasNode.ts` |
| 8 | IfNode | `if` | `backend/nodes/core/IfNode.ts` |
| 9 | IfElseNode | `ifElse` | `backend/nodes/core/IfElseNode.ts` |
| 10 | MatchNode | `match` | `backend/nodes/core/MatchNode.ts` |
| 11 | LoopControllerNode | `loopController` | `backend/nodes/core/LoopControllerNode.ts` |
| 12 | LoopUntilNode | `loopUntil` | `backend/nodes/core/LoopUntilNode.ts` |
| 13 | AbortGraphNode | `abortGraph` | `backend/nodes/core/AbortGraphNode.ts` |
| 14 | RaceInputsNode | `raceInputs` | `backend/nodes/core/RaceInputsNode.ts` |

#### 2. Chat & Models (9 Nodes) — `backend/nodes/core/`

| # | Node Name | Type Identifier | Implementation File |
|---|---|---|---|
| 15 | ChatNode | `chat` | `backend/nodes/core/ChatNode.ts` |
| 16 | ChatNodeBase | `chatBase` | `backend/nodes/core/ChatNodeBase.ts` |
| 17 | ChatLoopNode | `chatLoop` | `backend/nodes/core/ChatLoopNode.ts` |
| 18 | PromptNode | `prompt` | `backend/nodes/core/PromptNode.ts` |
| 19 | AssemblePromptNode | `assemblePrompt` | `backend/nodes/core/AssemblePromptNode.ts` |
| 20 | AssembleMessageNode | `assembleMessage` | `backend/nodes/core/AssembleMessageNode.ts` |
| 21 | TrimChatMessagesNode | `trimChatMessages` | `backend/nodes/core/TrimChatMessagesNode.ts` |
| 22 | ToolNode (gptFunction) | `gptFunction` | `backend/nodes/core/ToolNode.ts` |
| 23 | DelegateFunctionCallNode | `delegateFunctionCall` | `backend/nodes/core/DelegateFunctionCallNode.ts` |

#### 3. Data Manipulation (26 Nodes) — `backend/nodes/core/`

| # | Node Name | Type Identifier | Implementation File |
|---|---|---|---|
| 24 | ArrayNode | `array` | `backend/nodes/core/ArrayNode.ts` |
| 25 | ObjectNode | `object` | `backend/nodes/core/ObjectNode.ts` |
| 26 | DestructureNode | `destructure` | `backend/nodes/core/DestructureNode.ts` |
| 27 | ExtractJsonNode | `extractJson` | `backend/nodes/core/ExtractJsonNode.ts` |
| 28 | ExtractYamlNode | `extractYaml` | `backend/nodes/core/ExtractYamlNode.ts` |
| 29 | ExtractRegexNode | `extractRegex` | `backend/nodes/core/ExtractRegexNode.ts` |
| 30 | ExtractObjectPathNode | `extractObjectPath` | `backend/nodes/core/ExtractObjectPathNode.ts` |
| 31 | ExtractMarkdownCodeBlocksNode | `extractMarkdownCodeBlocks` | `backend/nodes/core/ExtractMarkdownCodeBlocksNode.ts` |
| 32 | ChunkNode | `chunk` | `backend/nodes/core/ChunkNode.ts` |
| 33 | SliceNode | `slice` | `backend/nodes/core/SliceNode.ts` |
| 34 | SplitNode | `split` | `backend/nodes/core/SplitNode.ts` |
| 35 | JoinNode | `join` | `backend/nodes/core/JoinNode.ts` |
| 36 | FilterNode | `filter` | `backend/nodes/core/FilterNode.ts` |
| 37 | CoalesceNode | `coalesce` | `backend/nodes/core/CoalesceNode.ts` |
| 38 | BooleanNode | `boolean` | `backend/nodes/core/BooleanNode.ts` |
| 39 | CompareNode | `compare` | `backend/nodes/core/CompareNode.ts` |
| 40 | EvaluateNode | `evaluate` | `backend/nodes/core/EvaluateNode.ts` |
| 41 | NumberNode | `number` | `backend/nodes/core/NumberNode.ts` |
| 42 | RandomNumberNode | `randomNumber` | `backend/nodes/core/RandomNumberNode.ts` |
| 43 | ShuffleNode | `shuffle` | `backend/nodes/core/ShuffleNode.ts` |
| 44 | HashNode | `hash` | `backend/nodes/core/HashNode.ts` |
| 45 | ToJsonNode | `toJson` | `backend/nodes/core/ToJsonNode.ts` |
| 46 | ToYamlNode | `toYaml` | `backend/nodes/core/ToYamlNode.ts` |
| 47 | ToMarkdownTableNode | `toMarkdownTable` | `backend/nodes/core/ToMarkdownTableNode.ts` |
| 48 | ToTreeNode | `toTree` | `backend/nodes/core/ToTreeNode.ts` |
| 49 | PopNode | `pop` | `backend/nodes/core/PopNode.ts` |

#### 4. Files, Datasets & Vectors (13 Nodes) — `backend/nodes/core/`

| # | Node Name | Type Identifier | Implementation File |
|---|---|---|---|
| 50 | ReadFileNode | `readFile` | `backend/nodes/core/ReadFileNode.ts` |
| 51 | ReadDirectoryNode | `readDirectory` | `backend/nodes/core/ReadDirectoryNode.ts` |
| 52 | ReadAllFilesNode | `readAllFiles` | `backend/nodes/core/ReadAllFilesNode.ts` |
| 53 | CreateDatasetNode | `createDataset` | `backend/nodes/core/CreateDatasetNode.ts` |
| 54 | LoadDatasetNode | `loadDataset` | `backend/nodes/core/LoadDatasetNode.ts` |
| 55 | AppendToDatasetNode | `appendToDataset` | `backend/nodes/core/AppendToDatasetNode.ts` |
| 56 | GetAllDatasetsNode | `getAllDatasets` | `backend/nodes/core/GetAllDatasetsNode.ts` |
| 57 | GetDatasetRowNode | `getDatasetRow` | `backend/nodes/core/GetDatasetRowNode.ts` |
| 58 | ReplaceDatasetNode | `replaceDataset` | `backend/nodes/core/ReplaceDatasetNode.ts` |
| 59 | DatasetNearestNeighborsNode | `datasetNearestNeighbors` | `backend/nodes/core/DatasetNearestNeigborsNode.ts` |
| 60 | VectorStoreNode | `vectorStore` | `backend/nodes/core/VectorStoreNode.ts` |
| 61 | VectorNearestNeighborsNode | `vectorNearestNeighbors` | `backend/nodes/core/VectorNearestNeighborsNode.ts` |
| 62 | GetEmbeddingNode | `getEmbedding` | `backend/nodes/core/GetEmbeddingNode.ts` |

#### 5. OpenAI Assistants Nodes (15 Nodes) — `backend/nodes/assistants/`

| # | Node Name | Type Identifier | Implementation File |
|---|---|---|---|
| 63 | CreateAssistantNode | `createAssistant` | `backend/nodes/assistants/CreateAssistantNode.ts` |
| 64 | GetAssistantNode | `getAssistant` | `backend/nodes/assistants/GetAssistantNode.ts` |
| 65 | ListAssistantsNode | `listAssistants` | `backend/nodes/assistants/ListAssistantsNode.ts` |
| 66 | DeleteAssistantNode | `deleteAssistant` | `backend/nodes/assistants/DeleteAssistantNode.ts` |
| 67 | AttachAssistantFileNode | `attachAssistantFile` | `backend/nodes/assistants/AttachAssistantFileNode.ts` |
| 68 | CreateThreadNode | `createThread` | `backend/nodes/assistants/CreateThreadNode.ts` |
| 69 | GetThreadNode | `getThread` | `backend/nodes/assistants/GetThreadNode.ts` |
| 70 | DeleteThreadNode | `deleteThread` | `backend/nodes/assistants/DeleteThreadNode.ts` |
| 71 | CreateThreadMessageNode | `createThreadMessage` | `backend/nodes/assistants/CreateThreadMessageNode.ts` |
| 72 | ThreadMessageNode | `threadMessage` | `backend/nodes/assistants/ThreadMessageNode.ts` |
| 73 | ListThreadMessagesNode | `listThreadMessages` | `backend/nodes/assistants/ListThreadMessagesNode.ts` |
| 74 | RunThreadNode | `runThread` | `backend/nodes/assistants/RunThreadNode.ts` |
| 75 | UploadFileNode | `uploadFile` | `backend/nodes/assistants/UploadFileNode.ts` |
| 76 | GetOpenAIFileNode | `getOpenAIFile` | `backend/nodes/assistants/GetOpenAIFileNode.ts` |
| 77 | ListOpenAIFilesNode | `listOpenAIFiles` | `backend/nodes/assistants/ListOpenAIFilesNode.ts` |

#### 6. Model Context Protocol (MCP) (3 Nodes) — `backend/nodes/core/`

| # | Node Name | Type Identifier | Implementation File |
|---|---|---|---|
| 78 | MCPDiscoveryNode | `mcpDiscovery` | `backend/nodes/core/MCPDiscoveryNode.ts` |
| 79 | MCPGetPromptNode | `mcpGetPrompt` | `backend/nodes/core/MCPGetPromptNode.ts` |
| 80 | MCPToolCallNode | `mcpToolCall` | `backend/nodes/core/MCPToolCallNode.ts` |

#### 7. Media & Audio (3 Nodes) — `backend/nodes/core/`

| # | Node Name | Type Identifier | Implementation File |
|---|---|---|---|
| 81 | ImageNode | `image` | `backend/nodes/core/ImageNode.ts` |
| 82 | AudioNode | `audio` | `backend/nodes/core/AudioNode.ts` |
| 83 | PlayAudioNode | `playAudio` | `backend/nodes/core/PlayAudioNode.ts` |

#### 8. Utility & System (16 Nodes) — `backend/nodes/core/`

| # | Node Name | Type Identifier | Implementation File |
|---|---|---|---|
| 84 | CodeNode | `code` | `backend/nodes/core/CodeNode.ts` |
| 85 | CommentNode | `comment` | `backend/nodes/core/CommentNode.ts` |
| 86 | ContextNode | `context` | `backend/nodes/core/ContextNode.ts` |
| 87 | CronNode | `cron` | `backend/nodes/core/CronNode.ts` |
| 88 | DelayNode | `delay` | `backend/nodes/core/DelayNode.ts` |
| 89 | DocumentNode | `document` | `backend/nodes/core/DocumentNode.ts` |
| 90 | ExternalCallNode | `externalCall` | `backend/nodes/core/ExternalCallNode.ts` |
| 91 | GetGlobalNode | `getGlobal` | `backend/nodes/core/GetGlobalNode.ts` |
| 92 | SetGlobalNode | `setGlobal` | `backend/nodes/core/SetGlobalNode.ts` |
| 93 | HttpCallNode | `httpCall` | `backend/nodes/core/HttpCallNode.ts` |
| 94 | PassthroughNode | `passthrough` | `backend/nodes/core/PassthroughNode.ts` |
| 95 | RaiseEventNode | `raiseEvent` | `backend/nodes/core/RaiseEventNode.ts` |
| 96 | TextNode | `text` | `backend/nodes/core/TextNode.ts` |
| 97 | URLReferenceNode | `urlReference` | `backend/nodes/core/URLReferenceNode.ts` |
| 98 | UserInputNode | `userInput` | `backend/nodes/core/UserInputNode.ts` |
| 99 | WaitForEventNode | `waitForEvent` | `backend/nodes/core/WaitForEventNode.ts` |

#### 9. Core Integrated Plugin Nodes (10 Nodes) — `backend/nodes/plugins/`

> **Scope Note**: These 10 provider-specific plugin nodes were not part of the original Phase 1 scope. They are carried forward as an unscoped addition, kept per project policy of deferring removal decisions until working inside the relevant subsystem.

| # | Node Name | Type Identifier | Implementation File |
|---|---|---|---|
| 100 | ChatAnthropicNode | `chatAnthropic` | `backend/nodes/plugins/ChatAnthropicNode.ts` |
| 101 | ChatGoogleNode | `chatGoogle` | `backend/nodes/plugins/ChatGoogleNode.ts` |
| 102 | ChatHuggingFace | `chatHuggingFace` | `backend/nodes/plugins/ChatHuggingFace.ts` |
| 103 | TextToImageHuggingFace | `textToImageHuggingFace` | `backend/nodes/plugins/TextToImageHuggingFace.ts` |
| 104 | TranscribeAudioNode | `transcribeAudio` | `backend/nodes/plugins/TranscribeAudioNode.ts` |
| 105 | LemurSummaryNode | `lemurSummary` | `backend/nodes/plugins/LemurSummaryNode.ts` |
| 106 | LemurQaNode | `lemurQa` | `backend/nodes/plugins/LemurQaNode.ts` |
| 107 | LemurActionItemsNode | `lemurActionItems` | `backend/nodes/plugins/LemurActionItemsNode.ts` |
| 108 | LemurTaskNode | `lemurTask` | `backend/nodes/plugins/LemurTaskNode.ts` |
| 109 | AutoEvalsNode | `autoEvals` | `backend/nodes/plugins/AutoEvalsNode.ts` |

---

## Section 6: Onboarding Flow & AI Thinking Drawer Architecture

### 6.1 Overview & Design Decisions

This section documents the architecture, component hierarchy, state contracts, and UX patterns for two companion features built in Phase 3/4:
1. **Optional, Skippable Onboarding Flow**: A 4-step wizard that introduces new users to Ra1's capabilities (use case, response style, model powering preference, connected apps) with real-time live preview mechanics, designed as a non-blocking overlay that never prevents immediate canvas interaction or first-message chat.
2. **Expandable AI Thinking Drawer**: A collapsible diagnostic and transparency drawer rendered directly above assistant replies in the chat surface, surfacing the underlying retrieval, model routing, and execution steps already captured in the pipeline.

---

### 6.2 Pattern References & License Verification

| Reference Repository | Upstream License | Policy & Implementation Boundary |
|---|---|---|
| **LobeChat** (`lobehub/lobe-chat`) | **LobeHub Community License** (non-free commercial distribution restrictions) | **Pattern-reference only**. License verified non-permissive for commercial redistribution. Zero code, assets, or styles copied from upstream. Completely original clean-room implementation in React, TypeScript, and native CSS. |
| **Letta** (`letta-ai/letta`) | **Apache 2.0** (Permissive) | **Pattern-reference only** for thought-loop, retrieval step inspection, and debugger UX. Zero upstream source code copied; clean-room UI implementation utilizing Ra1's existing message metadata pipeline. |

---

### 6.3 Onboarding Flow Architecture

#### 6.3.1 Non-Blocking Overlay Specification
- **Overlay Container**: The onboarding wizard is mounted at `#onboarding-overlay` with CSS properties `position: fixed; inset: 0; pointer-events: none; z-index: 38;`.
- **Docking & Collision Avoidance**: To ensure full canvas usability on first load without requiring dismissal, the modal is bottom-docked (`align-items: flex-end; padding: 16px;`) with a fixed height of `440px`. Canvas nodes and wires (which reside at screen coordinates $y \in [188\text{px}, 268\text{px}]$) remain completely visible and directly clickable above the modal boundary.
- **Selective Pointer Event Delegation**: Only `#onboarding-modal` captures pointer events (`pointer-events: auto`). Top navbar buttons (Chat toggle, panels, debugger) and the canvas surface remain fully interactive.
- **Dismissal Semantics**:
  - **Explicit Skip**: User clicks "Skip for now", saving `ra1_onboarding_completed: true` in `localStorage` without modifying default preferences.
  - **Explicit Complete**: User completes step 4 and clicks "Finish Setup", saving preferences to `ra1_user_preferences` in `localStorage`.
  - **Canvas Interaction**: Clicking anywhere on the canvas background auto-dismisses the overlay to avoid getting in the user's flow.
  - **Panel Toggling**: Opening an artifact panel (Editor, Sandbox, Table, PDF) automatically dismisses the overlay.
  - **Re-activation**: The onboarding wizard can be reopened at any time via the `✨ Setup Guide` button in `.top-navbar`.

#### 6.3.2 4-Question Flow & State Contract

```typescript
export interface OnboardingPreferences {
  useCase: 'coding' | 'research' | 'data_analysis' | 'canvas_flows';
  answerStyle: 'concise' | 'detailed' | 'code_first';
  modelPreference: 'auto_fast' | 'pool_free' | 'premium_accuracy';
  connectedApps: string[];
}
```

1. **Step 1 — Primary Use Case**:
   - Options: *Full-Stack Coding & Prototyping*, *Research & Document Analysis*, *Data Analysis & Charting*, *Visual Agentic Canvas Flows*.
   - Live Preview: Automatically switches the preview pane to display the corresponding interactive artifact preview (Code Sandbox, TipTap Document Editor, Data Table / Chart, or Visual Canvas).
2. **Step 2 — Assistant Answer Style**:
   - Options: *Concise & Direct*, *Detailed & Explanatory*, *Code-First*.
   - Live Preview: Renders simulated assistant reply formatted according to the selected density and tone.
3. **Step 3 — Model-Powering Preference**:
   - Options: *Auto Mode (Fast & Cost-Optimized)*, *Pooled Quota (Free Community Pool)*, *Premium Accuracy (Flagship Models)*.
   - Live Preview: Displays the active model badge, routing tier, and provider details.
4. **Step 4 — Apps & Integrations to Connect**:
   - Options: Multi-select chips for *Slack*, *GitHub*, *PostgreSQL*, *HTTP Webhooks*.
   - Live Preview: Renders live connected integration badges reflecting the user's selection in real time.

---

### 6.4 AI Thinking Drawer Architecture

#### 6.4.1 Display-Layer Design Principles
- **No Injected Reasoning Loops**: The thinking drawer is strictly a display-layer component (`frontend/src/components/chat/ThinkingDrawer.tsx`). It does not execute or invent agent reasoning steps, but surfaces data already present in the message pipeline (`ChatMessage.retrievalSteps`, `ChatMessage.modelRoute`, `ChatMessage.citations`).
- **Placement**: Rendered directly above the assistant message body (`.message-content`) inside `MessageBubble.tsx`.
- **Default State**: Collapsed by default displaying a clean trigger button: `💭 Thinking... (N steps)` with an expand chevron.
- **Expanded Contents**:
  1. **Model Route & Provider**: Surfaces the resolved model ID (e.g., `gpt-4o`, `claude-3-5-sonnet`, `mock-rag-synthesizer`), routing strategy, and latency.
  2. **Retrieval Steps (RAG)**: If document retrieval was performed, lists each indexed chunk consulted, source document filename, relevance confidence score ($0.0 - 1.0$), and excerpted chunk preview.
  3. **Tool & Connector Invocations**: Displays any connector or tool calls dispatched during synthesis.
  4. **Status Indicator**: Confirms completed synthesis and token timing.

---

### 6.5 File Inventory

| Component / File | Purpose |
|---|---|
| `frontend/src/components/onboarding/OnboardingWizard.tsx` | Interactive 4-step wizard with split-screen question selector and real-time live preview pane. |
| `frontend/src/components/chat/ThinkingDrawer.tsx` | Collapsible transparency drawer surfacing RAG retrieval traces, model selection, and execution metadata. |
| `frontend/src/components/chat/MessageBubble.tsx` | Chat message renderer integrating `<ThinkingDrawer message={message} />` above assistant replies. |
| `frontend/src/App.tsx` | Application shell wiring onboarding lifecycle, navbar triggers, and non-blocking pointer delegation. |
| `frontend/src/styles/phase3.css` | Styles for onboarding modal, split preview, live previews, thinking drawer, and z-index hierarchy. |
| `frontend/tests/onboarding.spec.ts` | 5 Playwright end-to-end test cases (OB1–OB5) validating non-blocking load, preview reactivity, completion, skipping, and reopening. |
| `frontend/tests/thinking.spec.ts` | 3 Playwright end-to-end test cases (TK1–TK3) validating collapsed default, toggling, and real RAG retrieval data display. |

---

## Section 7: ReAct Agent Loop, "Ask Permission First" Approval Card & MCP Wiring Architecture

### 7.1 Overview & System Architecture

This section specifies the architecture for Ra1's autonomous agent orchestration subsystem:
1. **ReAct Orchestration Loop**: An iterative Think → Act → Observe → Repeat/Finish execution engine wired directly into the live `ModelEngine` and `chatService`.
2. **"Ask Permission First" Approval System**: A human-in-the-loop gatekeeper that intercepts any consequential action (external communication, calendar booking, destructive mutations, file deletion), halting execution until the user explicitly clicks Approve or Cancel.
3. **MCP Live Wiring**: Direct bridge connecting Rivet's Phase 1 MCP nodes (`mcpDiscovery`, `mcpGetPrompt`, `mcpToolCall`) into the agent's live callable tool registry alongside ActivePieces connectors without namespace collisions.
4. **Native Connectors Starter Set**: Real, functional implementations of Email, Calendar, and Web Search invokable both directly and through the ReAct loop. Storage and finance connectors are explicitly out of scope for this phase.

---

### 7.2 Pattern References & License Verification

| Reference Repository | Upstream License | Policy & Implementation Boundary |
|---|---|---|
| **Dify** (`langgenius/dify`) | **Dify Open Source License / Apache 2.0 with Commons Clause** | **Ideas-only pattern reference** for ReAct loop state transitions and human-in-the-loop approval card UX. Zero upstream source code copied. Pure native TypeScript clean-room implementation. |
| **n8n** (`n8n-io/n8n`) | **Sustainable Use License** (Fair-code / non-permissive commercial) | **Ideas-only pattern reference** for approval-node execution gating. Zero upstream code or assets copied. |
| **Rivet MCP** (`ironclad/rivet`) | **MIT License** (Permissive) | Structural contract reference for `mcpDiscovery`, `mcpGetPrompt`, and `mcpToolCall` node schemas. |
| **ActivePieces Pieces** (`activepieces/activepieces`) | **MIT License** (Community Pieces only) | Action and prop declaration patterns for connector pieces. Zero enterprise or non-free code utilized. |

---

### 7.3 ReAct Loop Engine (`backend/engine/agent/reactLoop.ts`)

#### 7.3.1 Cycle Mechanics
- **Think**: Model evaluates the user prompt and prior observation history, outputting structured reasoning thoughts.
- **Act**: Identifies candidate tool from unified registry (`piece:*` or `mcp:*`).
  - If the action is tagged `consequential: true`: fires `requestApproval()` and halts execution on an unresolved promise.
  - If approved: executes action via `ConnectorAction.run()` or `executeMCPTool()`.
  - If cancelled: aborts tool execution immediately with zero side effects.
- **Observe**: Normalizes output payload into text/JSON for the agent's context.
- **Repeat / Finish**: Loops back to Think. Terminates when model produces final answer, user cancels, or `maxSteps` (default: 5) is reached.

#### 7.3.2 Infinite Loop & Failure Protection
- **Bounded Iteration**: Strict `maxSteps` ceiling guarantees termination even if model oscillates.
- **Graceful Error Recovery**: Tool execution errors are caught, serialized into observations, and presented to the model rather than causing uncaught exceptions.

---

### 7.4 "Ask Permission First" Approval Card (`ApprovalCard.tsx`)

#### 7.4.1 Consequential Action Classification
An action is classified as consequential if:
1. `ConnectorAction.consequential === true` (e.g. `piece:email:send_email`, `piece:calendar:create_event`, `piece:slack:send_message`).
2. `MCPTool.consequential === true` (e.g. `mcp:filesystem:delete_file`, `mcp:github:create_issue`).
3. The action matches external mutation, financial transaction, or permanent data deletion heuristics.

#### 7.4.2 Execution Halting & Zero Side Effect Guarantee
- **Genuine Halt**: Execution halts at the orchestrator level using an unresolved `Promise<'approved' | 'cancelled'>` stored in `Thread.pendingApproval`. No background timer or speculative execution runs ahead.
- **Zero Side Effects on Cancel**: If the user clicks `#approval-cancel-btn`, the action is discarded without ever calling `run()`. The loop records the cancellation and synthesizes a confirmation that no changes were made.

---

### 7.5 MCP Live Wiring Bridge (`backend/connectors/mcpBridge.ts`)

- **Discovery (`mcpDiscovery`)**: Discovers tools from registered in-memory or HTTP MCP servers via `discoverMCPTools()`.
- **Tool Namespacing**: All MCP tools use the prefix `mcp:{server}:{tool}` to prevent collision with connector pieces (`piece:{pieceId}:{actionId}`).
- **Tool Invocation (`mcpToolCall`)**: Dispatches arguments to `executeMCPTool()`, returning normalized outputs to the ReAct observation stream.
- **Prompt Templates (`mcpGetPrompt`)**: Fetches prompt templates by name with parameter interpolation.

---

### 7.6 Native Starter Connectors

1. **Email Connector (`piece:email`)**:
   - `send_email` [Consequential]: Dispatches email to external recipients (`to`, `subject`, `body`, `cc`).
   - `list_emails` [Read-Only]: Queries inbox messages with keyword filter and limit.
2. **Calendar Connector (`piece:calendar`)**:
   - `create_event` [Consequential]: Schedules event on calendar with start/end time and attendee invites.
   - `list_events` [Read-Only]: Fetches upcoming events within a time range.
3. **Web Search Connector (`piece:search`)**:
   - `web_search` [Read-Only]: Executes web query and returns ranked titles, snippets, and URLs.

---

### 7.7 File Inventory

| Component / File | Role |
|---|---|
| `backend/engine/agent/reactLoop.ts` | Core ReAct agent orchestrator with Think-Act-Observe-Repeat, approval pause, and tool dispatch. |
| `backend/connectors/mcpBridge.ts` | MCP server registry, capability discovery, prompt retrieval, and tool call runner. |
| `backend/connectors/pieces/email.ts` | Native Email connector piece (`send_email`, `list_emails`). |
| `backend/connectors/pieces/calendar.ts` | Native Calendar connector piece (`create_event`, `list_events`). |
| `backend/connectors/pieces/search.ts` | Native Web Search connector piece (`web_search`). |
| `backend/chat/chatService.ts` | Chat pipeline integration supporting ReAct loops, approval cards, and approval resolution. |
| `frontend/src/components/chat/ApprovalCard.tsx` | Interactive approval card UI with action details, payload summary, and Approve/Cancel triggers. |
| `frontend/src/components/chat/MessageBubble.tsx` | Message renderer hosting `<ApprovalCard />` and `<ThinkingDrawer />`. |
| `frontend/src/components/chat/ThinkingDrawer.tsx` | Collapsible drawer displaying ReAct execution traces, tool calls, and observations. |
| `frontend/src/components/chat/ChatPanel.tsx` | Panel wiring approval state synchronization and resolution handlers. |
| `backend/tests/agentLoop.test.ts` | 10 Node.js unit & integration tests for ReAct, approvals, cancel safety, MCP, and native connectors. |
| `frontend/tests/agent.spec.ts` | 6 Playwright E2E tests validating multi-step tasks, approval halts, cancel safety, MCP, and connectors. |

---

## Section 8: Authentication, Session Governance & Multi-Tenant Access Control Architecture

### 8.1 Motivation & Threat Model

Before introducing autonomous computer-use and browser-acting agents capable of mutating external systems, real authentication and fine-grained access control are hard prerequisites. Without an authenticated identity and authorization perimeter:
1. Consequential tool execution (sending external emails, updating calendars, triggering webhooks, executing shell commands) could be dispatched anonymously.
2. Approval cards could be resolved or dismissed by unprivileged spectators.
3. Multi-tenant resources (threads, uploaded RAG chunks, connector API credentials) would leak across user and team boundaries.
4. Governance policies (virtual keys, budget limits, RPM/TPM rate limits) would be shared globally or bypassed completely.

Section 8 establishes a cryptographically secure, multi-tenant authentication and access control layer modeled after LibreChat's modular strategy architecture (MIT License).

---

### 8.2 Core Authentication Architecture (`backend/auth/`)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Authentication Service                          │
├────────────────────────────────┬───────────────────────────────────────┤
│    Local Password Strategy     │        OAuth2 / SSO Strategies        │
│  (PBKDF2-SHA512 + Salt, 10k)   │  (Google, GitHub, OpenID Connect)     │
├────────────────────────────────┴───────────────────────────────────────┤
│                       Pluggable Registry Bridge                        │
│             (Extensibility hooks for SAML 2.0, LDAP, 2FA)              │
├────────────────────────────────────────────────────────────────────────┤
│                       Session Token Management                         │
│               (Cryptographic 256-bit bearer tokens)                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              Governance Binding (`ModelEngine` Integration)            │
│  - Auto-provisions dedicated VirtualKey on registration/SSO            │
│  - Initializes per-user budget ceiling & lifetime spend tracker        │
│  - Binds rate limits (RPM / TPM) strictly to authenticated identity    │
└────────────────────────────────────────────────────────────────────────┘
```

#### 8.2.1 Password Hashing & Local Strategy
Local authentication uses Node's standard `crypto.pbkdf2Sync` with SHA-512 and a unique 16-byte cryptographic salt per user across 10,000 iterations. Passwords require a minimum length of 6 characters and are never persisted in plaintext.

#### 8.2.2 OAuth2 & Extensible SSO Strategy Registry (`oauthStrategies.ts`)
SSO providers conform to the `OAuthStrategy` interface:
```typescript
export interface OAuthStrategy {
  provider: AuthProvider;
  authenticate(credentials: {
    codeOrToken: string;
    clientProfile?: Partial<OAuthProfile>;
  }): Promise<OAuthProfile>;
}
```
- **Google OAuth**: Normalizes Google sub, verified email, and profile avatar.
- **GitHub OAuth**: Normalizes GitHub user ID, email, and handle.
- **Enterprise Extensibility**: The `OAuthStrategyRegistry` exposes `registerSAML(config)` and `registerLDAP(config)` entry points, allowing enterprise identity providers and 2FA second-factor challenges to be attached without refactoring the core authentication pipeline.

#### 8.2.3 Session Management
Session tokens are generated as 32-character high-entropy bearer strings with a 24-hour expiration window. Calling `logout(token)` invalidates the session immediately. `validateSession(token)` ensures unauthenticated or expired tokens are rejected with a 401 Unauthorized exception.

---

### 8.3 Governance Binding: Virtual Keys & Per-User Budgets

In Ra1, authentication and governance are inextricably linked:
1. **Auto-Provisioning**: When a user registers (via local signup or OAuth SSO), `AuthService` immediately calls `ModelEngine.issueVirtualKey({ userId, teamId, name, rateLimitRPM: 60, maxSpendUSD: 10.0 })`.
2. **Identity-Bound Execution**: When dispatching chat turns through `sendMessage()` or directly to `ModelEngine.execute()`, the authenticated `userContext: { userId, teamId }` and `virtualKey` are passed explicitly.
3. **Strict Partitioning**: Rate limits and budget caps resolve per authenticated `userId`. If User A depletes their budget cap, User A is blocked while User B continues executing with zero interference or cross-tenant degradation.

---

### 8.4 Multi-Tenant Access Control & Agent Scoping (`accessControl.ts`)

```
                           ┌─────────────────┐
                           │      User       │
                           └────────┬────────┘
                                    │ Member of
                                    ▼
                           ┌─────────────────┐
                           │      Space      │
                           │  - Owner        │
                           │  - Members      │
                           │  - canInvoke    │
                           └────────┬────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
      ┌──────────────────┐                      ┌──────────────────┐
      │Space-Locked Agent│                      │   Global Agent   │
      │(Locked to Space) │                      │(Cross-Space via  │
      │                  │                      │ explicit grants) │
      └──────────────────┘                      └──────────────────┘
```

#### 8.4.1 Space Scoping Rules
1. **Space-Locked Agents**: An agent created inside a specific Space (`agent.spaceId`) is permanently locked to that Space. Attempts to invoke it from any other Space or outside the Space context are rejected.
2. **Globally-Built Agents**: An agent created globally (`agent.isGlobal = true`) can only be invoked cross-Space if the agent's creator has explicitly added the target Space ID to `agent.grantedSpaceIds`. The creator retains unrestricted invocation rights.
3. **Space Owner Control**: The owner of a Space has exclusive authority to add/remove members and toggle the `canInvokeAgents` boolean permission. Members lacking this permission are prevented from executing any agents present in that Space.

#### 8.4.2 Resource Ownership & Isolation
- **Chats & Threads**: Every `Thread` records `userId` and `spaceId`. Non-owners cannot read, append messages to, or tamper with another user's threads.
- **RAG Chunks & Retrieval**: Documents indexed in `vectorStore` store `userId` and `spaceId` metadata. Similarity queries pass tenant filters (`{ userId, spaceId }`), guaranteeing that User B never retrieves citations from User A's private documents.
- **Connector Credentials**: External API keys and OAuth tokens configured by a user are stored in private vaults accessible only by that specific `userId`.

#### 8.4.3 Approval Card Ownership Guarantee
Approval cards generated during ReAct agent loops for consequential actions (email dispatch, calendar creation, data mutation) strictly enforce owner authorization. `resolveApproval(thread, approvalId, decision, resolvingUserId)` verifies:
$$\text{resolvingUserId} = \text{thread.userId}$$
If any other authenticated user attempts to approve or cancel the action, execution throws `ForbiddenError` and the action remains securely paused.

---

### 8.5 File Inventory

| File / Component | Responsibility |
|---|---|
| `backend/auth/types.ts` | Core types for `User`, `UserSession`, `AuthResult`, `Space`, `SpaceMember`, and `AgentScopedDefinition`. |
| `backend/auth/authService.ts` | User signup, PBKDF2 password hashing, session tokens, login/logout, and virtual-key auto-provisioning. |
| `backend/auth/oauthStrategies.ts` | Strategy registry with Google and GitHub OAuth adapters, plus LDAP/SAML extensibility interfaces. |
| `backend/auth/accessControl.ts` | Space creation, member management, agent scoping validation (`canInvokeAgent`), and credential privacy. |
| `backend/chat/chatService.ts` | Multi-tenant thread scoping, user context propagation into `ModelEngine`, and owner-only approval resolution. |
| `backend/rag/chunker.ts` | Added `userId` and `spaceId` fields to document chunk metadata. |
| `backend/rag/vectorStore.ts` | Multi-tenant vector similarity querying with tenant scoping filters. |
| `backend/rag/retriever.ts` | Pass-through user and Space tenant filters during semantic citation retrieval. |
| `frontend/src/components/auth/AuthModal.tsx` | UI modal for email/password signup, login, Google/GitHub OAuth, and governance profile inspector. |
| `frontend/src/App.tsx` | Top navbar Space selector, user profile chip, auth modal trigger, and chat session binding. |
| `frontend/src/components/chat/ChatPanel.tsx` | Scoped thread creation, user context forwarding, and owner-checked approval resolution. |
| `backend/tests/authAccessControl.test.ts` | 9 comprehensive Node.js tests covering auth lifecycle, governance isolation, agent scoping, and privacy. |
| `frontend/tests/auth.spec.ts` | 6 Playwright E2E tests validating login/signup, OAuth buttons, Space switching, and user-scoped chat. |



