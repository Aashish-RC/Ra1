# Rivet Canvas Foundation & OmniRoute Model Engine (Phase 1, Steps 1–6)

Visual node-canvas foundation and intelligent model engine for AI workflow authoring, combining:
- **[Ironclad Rivet](https://github.com/Ironclad/rivet)** (MIT) — Visual node canvas, 109 merged nodes, and port-based DAG contracts.
- **[Langflow](https://github.com/langflow-ai/langflow)** (MIT) — Editable-node-code mechanism across all nodes.
- **[ActivePieces](https://github.com/activepieces/activepieces)** (MIT Core) — Architectural reference study for the Phase 4 connector layer.
- **[OmniRoute](https://github.com/diegosouzapw/OmniRoute)** (MIT) — 4-path priority routing, task-aware Auto model selection, allow/deny rules, and auto-fallback chains.
- **[LiteLLM](https://github.com/BerriAI/litellm)** (MIT Conceptual Pattern) — Native TypeScript governance layer with virtual keys, budgets, rate limits, and spend tracking.
- **[OpenRouter](https://openrouter.ai)** — Default zero-setup upstream provider behind pooled quota.

---

## 1. Overview

Ra1 provides a complete browser-based visual node canvas and model engine with:
- **Interactive Infinite Canvas**: Smooth pan/zoom, grid background, node selection, drag-to-move, and deletion.
- **Dynamic Port-to-Port Wiring**: Curved SVG cubic-bezier connection wires with auto-routing, click-to-delete, and input/output connection validation.
- **109 Merged Built-in Nodes**: All 109 core, OpenAI Assistants, and plugin nodes ported directly from Ironclad Rivet, organized in a searchable tray palette with drag-and-drop onto the canvas.
- **Langflow Editable-Node-Code Pattern**: In-place editable TypeScript source view across **all 109 nodes**. Changes to code or `@title` directives synchronize live to the visual node box without mutating node IDs or breaking existing wire connections.
- **OmniRoute 4-Path Priority Routing**:
  1. `pooled-enterprise`: Direct corporate enterprise accounts (checked first).
  2. `pooled-aggregator`: OpenRouter aggregator (default zero-setup path for all users).
  3. `byok`: User Bring-Your-Own-Key fallback when pooled quota is exhausted.
  4. `byoi`: User Bring-Your-Own-Infrastructure (local Ollama / vLLM / custom endpoint).
- **3 Model Selection Modes**:
  - `dropdown`: Direct explicit model binding.
  - `search`: Instant keyword search across model catalog, providers, and capabilities.
  - `auto`: Task-aware selection classifying prompts (`code`, `math`, `reasoning`, `creative`, `fast`, `multimodal`, `tools`).
- **Priority Allow-List & Hard Deny-List**:
  - Allow-list serves as a priority recommendation (Auto can reach outside when justified by complex task requirements).
  - Deny-list is a **hard exclusion**: denied models are never selected, even as a fallback.
- **Configurable Flagging Policies**: User-configurable notification behavior (`always`, `cost-impacting`, `never`) when Auto selects outside the allow-list.
- **Native TypeScript Governance Layer**:
  - Scoped Virtual Keys (`vk-usr-...`, `vk-team-...`). Callers never touch real provider credentials.
  - Budget caps with automatic reset periods (`daily`, `monthly`, `lifetime`).
  - Sliding-window rate limiting enforcing RPM and TPM.
  - Spend tracking and pooled-quota audit logging.
- **Lossless YAML Flow Storage**: Export and import complete workflow graphs to clean YAML format.
- **Automated Test Suite**: 14/14 Model Engine tests + 12/12 Canvas UI tests (100% passing).

---

## 2. Directory Structure

```text
├── README.md                   # Setup, architecture, and run instructions
├── LICENSE                     # MIT License
├── .gitignore                  # Git ignore rules
├── package.json                # Root workspace scripts (npm test, npm run test:engine, npm run test:ui)
├── automated-test-report.md    # Automated test reports (14 engine + 12 UI scenarios passing)
├── manual-testing-guide.md     # Comprehensive human verification checklist & manual
├── docs/
│   ├── MODEL_ENGINE.md         # OmniRoute 4-path routing, Auto mode, and allow/deny specification
│   ├── GOVERNANCE_LAYER.md     # Virtual keys, budgets, rate limits schema & LiteLLM pattern notes
│   ├── MANUAL_TESTING_MODEL_ENGINE.md # Model engine verification guide
│   ├── NODE_CONTRACT.md        # TypeScript contract guide, customCode lifecycle & Langflow audit
│   ├── MERGED_NODES.md         # Full catalog of all 109 merged nodes & source file origins
│   ├── ACTIVEPIECES_REFERENCE.md # ActivePieces piece-declaration structural reference study
│   └── MANUAL_TESTING_STEP2.md # Step 2 manual verification checklist
├── backend/
│   ├── package.json            # Backend dependencies (ws, yaml, nanoid, tsx)
│   ├── engine/                 # OmniRoute Model Engine & Governance Layer
│   │   ├── types.ts            # Model definitions, execution requests/responses, governance contracts
│   │   ├── catalog.ts          # Comprehensive multi-provider model catalog
│   │   ├── index.ts            # Unified ModelEngine facade
│   │   ├── routing/            # OmniRouter, Selector (dropdown/search/auto), TaskClassifier
│   │   ├── governance/         # VirtualKeyManager, BudgetTracker, RateLimiter, UsageStore
│   │   └── providers/          # OpenRouterAggregator, EnterpriseDirect, BYOK, BYOI, Mock
│   ├── tests/
│   │   └── engine.test.ts      # 14-scenario automated test suite for routing, selection, governance
│   ├── debugger/               # Live-debugging bridge server & CLI executor
│       │   ├── NodeImpl.ts     # Abstract NodeImpl lifecycle class
│       │   ├── NodeRegistration.ts
│       │   └── DataValue.ts    # Runtime typed data representations
│       ├── allNodes.ts         # Master registry containing all 109 merged nodes
│       ├── core/               # 84 built-in core node definitions from Rivet
│       ├── assistants/         # 15 OpenAI Assistants nodes from Rivet
│       └── plugins/            # 10 integrated plugin nodes (Claude, Gemini, Hugging Face, etc.)
└── frontend/
    ├── package.json            # Frontend Vite + React + Playwright setup
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html              # Modern dark typography & SEO tags
    ├── playwright.config.ts    # Automated test runner config
    ├── tests/
    │   └── canvas.spec.ts      # 9-scenario Playwright UI test suite
    └── src/
        ├── App.tsx             # Main canvas application
        ├── main.tsx
        ├── styles/
        │   └── index.css       # Rivet dark theme design system & CSS tokens
        └── components/
            ├── Canvas.tsx      # Pan/zoom viewport & drop target
            ├── VisualNode.tsx  # Node card, ports, selection, and drag-to-move
            ├── Port.tsx        # Port dots with type-specific color coding
            ├── Wire.tsx        # SVG cubic bezier connection curve
            ├── WireLayer.tsx   # Wires overlay renderer
            ├── NodePalette.tsx # Searchable 109-node sidebar tray
            ├── CodeEditorModal.tsx # Editable script view for code/prompt nodes
            ├── DebuggerPanel.tsx   # Live-debugging bridge connection panel
            └── YamlModal.tsx   # YAML export, import, and flow reloading dialog
```

---

## 3. How to Run Locally

### Prerequisites
- Node.js >= 18 (tested on Node.js v24)
- npm >= 9

### Step 1: Install Dependencies
```bash
# Install root dependencies
npm install

# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

### Step 2: Environment Configuration (Local Dev / Optional Live Mode)
By default, the automated test suite uses mock provider adapters for zero-cost, instant deterministic execution. To point to live upstream providers:
```bash
# In backend/.env or your terminal environment:
OPENROUTER_API_KEY="sk-or-v1-your-openrouter-key"  # Default zero-setup pooled aggregator
ENTERPRISE_OPENAI_API_KEY="sk-proj-..."            # Optional direct enterprise OpenAI account
ENTERPRISE_ANTHROPIC_API_KEY="sk-ant-..."          # Optional direct enterprise Anthropic account
```

### Step 3: Start the Frontend Canvas Studio
```bash
# From repository root:
npm run dev

# Or directly in frontend:
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Step 4 (Optional): Start the Live-Debugging Bridge Server
In a separate terminal:
```bash
# From repository root:
npm run start:debugger

# Or directly in backend:
cd backend
npm run start:debugger
```
The server will start listening on `ws://localhost:21889`. Click **"Debugger Bridge"** in the top navigation bar of the canvas to connect.

### Step 5: Run Automated Tests
```bash
# Run all automated tests (Model Engine + Canvas UI):
npm test

# Run Model Engine tests only (14 scenarios, ~40ms):
npm run test:engine

# Run Canvas UI tests only (12 scenarios Playwright, ~40s):
npm run test:ui
```

---

## 4. Upstream Source & Reference Mapping

The following modules in this codebase directly reference and adapt open-source architectures:

| Component | Repository Path | Source / Reference | Description |
|---|---|---|---|
| Node Contract | `backend/nodes/contract/` | [Ironclad Rivet](https://github.com/Ironclad/rivet) | `NodeBase.ts`, `NodeDefinition.ts`, `NodeImpl.ts` |
| Built-in Core Nodes | `backend/nodes/core/` | [Ironclad Rivet](https://github.com/Ironclad/rivet) | `packages/core/src/model/nodes/*.ts` (84 nodes) |
| OpenAI Assistants Nodes | `backend/nodes/assistants/` | [Ironclad Rivet](https://github.com/Ironclad/rivet) | `packages/core/src/plugins/openai/nodes/*.ts` (15 nodes) |
| Integrated Plugin Nodes | `backend/nodes/plugins/` | [Ironclad Rivet](https://github.com/Ironclad/rivet) | Anthropic, Google, Hugging Face plugin nodes (10 nodes) |
| Debugger Bridge | `backend/debugger/` | [Ironclad Rivet](https://github.com/Ironclad/rivet) | `packages/app-executor/bin/executor.mts` & `debugger.ts` |
| Graph-Testing Framework | `backend/trivet/` | [Ironclad Rivet](https://github.com/Ironclad/rivet) | `packages/trivet/src/*` |
| Canvas UI | `frontend/src/components/` | [Ironclad Rivet](https://github.com/Ironclad/rivet) | React-based visual node canvas, SVG wires, and modals |
| Flow Serialization | `backend/storage/yamlStorage.ts` | [Ironclad Rivet](https://github.com/Ironclad/rivet) | Adapted from `Project.ts` into clean YAML export/import |
| Editable Node Code | `frontend/src/components/CodeEditorModal.tsx` | [Langflow](https://github.com/langflow-ai/langflow) | In-place editable source pattern (`custom_component`) |
| Model Engine Routing | `backend/engine/routing/` | [OmniRoute](https://github.com/diegosouzapw/OmniRoute) | 4-path routing priority, task-aware selection, auto-fallback |
| Governance Layer | `backend/engine/governance/` | [LiteLLM](https://github.com/BerriAI/litellm) (pattern only) | Native TypeScript virtual keys, budgets, rate limits, spend tracking |
| Aggregator Provider | `backend/engine/providers/openRouterAggregator.ts` | [OpenRouter](https://openrouter.ai) | Default zero-setup upstream aggregator behind pooled quota |

---

## 5. Documentation Links

- **[Model Engine Architecture](docs/MODEL_ENGINE.md)** — OmniRoute 4-path routing, Auto mode, and allow/deny specification
- **[Governance Layer Schema](docs/GOVERNANCE_LAYER.md)** — Virtual keys, budgets, rate limits schema & LiteLLM pattern notes
- **[Model Engine Manual Testing Guide](docs/MANUAL_TESTING_MODEL_ENGINE.md)** — Human verification instructions & test procedures
- **[Node Contract Specification](docs/NODE_CONTRACT.md)** — TypeScript node contract & customCode lifecycle
- **[Merged Nodes Catalog (109 Nodes)](docs/MERGED_NODES.md)** — Catalog of all 109 merged nodes & source origins
- **[ActivePieces Reference Study](docs/ACTIVEPIECES_REFERENCE.md)** — Piece-declaration structural study
- **[Automated Test Report](automated-test-report.md)** — Full report of all 26 automated tests (14 engine + 12 UI)
- **[Manual Testing Master Guide](manual-testing-guide.md)** — End-to-end verification manual for human testers

---

## 6. License
MIT License. Contains code and concepts derived from:
- [Ironclad Rivet](https://github.com/Ironclad/rivet), Copyright (c) 2024 Ironclad, Inc. (MIT)
- [OmniRoute](https://github.com/diegosouzapw/OmniRoute), Copyright (c) 2024 Diego Souza (MIT)
- [Langflow](https://github.com/langflow-ai/langflow), Copyright (c) 2024 Logspace, Inc. (MIT)
- [LiteLLM](https://github.com/BerriAI/litellm), Copyright (c) 2024 BerriAI (MIT - conceptual reference only, implemented natively from scratch in TypeScript)