# Rivet Canvas Foundation & Editable-Code Architecture (Phase 1, Steps 1–3)

Visual node-canvas foundation for AI workflow authoring, directly modeled on and sourced from [Ironclad Rivet](https://github.com/Ironclad/rivet) (MIT License), extended with [Langflow](https://github.com/langflow-ai/langflow)'s editable-node-code pattern (MIT) and referencing [ActivePieces](https://github.com/activepieces/activepieces) piece-declaration architecture (MIT core).

---

## 1. Overview

Ra1 provides a complete browser-based visual node canvas with:
- **Interactive Infinite Canvas**: Smooth pan/zoom, grid background, node selection, drag-to-move, and deletion.
- **Dynamic Port-to-Port Wiring**: Curved SVG cubic-bezier connection wires with auto-routing, click-to-delete, and input/output connection validation.
- **109 Merged Built-in Nodes**: All 109 core, OpenAI Assistants, and plugin nodes ported directly from Ironclad Rivet, organized in a searchable tray palette with drag-and-drop onto the canvas.
- **Langflow Editable-Node-Code Pattern**: In-place editable TypeScript source view across **all 109 nodes** (not just code nodes). Changes to code or `@title` directives synchronize live to the visual node box without mutating node IDs or breaking existing wire connections.
- **Lossless YAML Flow Storage**: Export and import complete workflow graphs to clean YAML format, preserving `customCode` and node configurations losslessly.
- **Live-Debugging Bridge**: WebSocket bridge server connecting the frontend canvas with the backend runner.
- **Trivet Testing Framework**: Graph and test-case validation schemas ported from Rivet.
- **ActivePieces Reference Study**: Architectural analysis of ActivePieces' piece framework (`createPiece`, `PieceAuth`, `Property.*`, `createAction`) in `docs/ACTIVEPIECES_REFERENCE.md` serving as the design blueprint for the Phase 4 connector layer.
- **Automated UI Testing Suite**: 12/12 passing Playwright end-to-end scenarios covering visual canvas operations, editable source code, live visual reflection, wire preservation, and YAML roundtripping.

---

## 2. Directory Structure

```text
├── README.md                   # Setup, architecture, and run instructions
├── LICENSE                     # MIT License (retaining Ironclad Rivet copyright notice)
├── .gitignore                  # Git ignore rules
├── package.json                # Root workspace scripts
├── automated-test-report.md    # Automated UI test results (Playwright, 12/12 passing)
├── manual-testing-guide.md     # Step-by-step human verification checklist & manual
├── docs/
│   ├── NODE_CONTRACT.md        # TypeScript contract guide, customCode lifecycle & Langflow audit
│   ├── MERGED_NODES.md         # Full catalog of all 109 merged nodes & source file origins
│   ├── ACTIVEPIECES_REFERENCE.md # ActivePieces piece-declaration structural reference study
│   └── MANUAL_TESTING_STEP2.md # Step 2 manual verification checklist & instruction manual
├── backend/
│   ├── package.json            # Backend workspace dependencies (ws, yaml, nanoid, tsx)
│   ├── debugger/               # Live-debugging bridge server & CLI executor
│   │   ├── debuggerServer.ts   # WebSocket server handling UI debugger connections
│   │   └── executor.ts         # Standalone runner for the live-debugging bridge
│   ├── trivet/                 # Graph-testing framework (ported from packages/trivet)
│   │   ├── api.ts              # Trivet test runner (runTrivet)
│   │   ├── trivetTypes.ts      # Test suite, test case, and results schemas
│   │   ├── validateTestCaseFormat.ts
│   │   └── validateValidationGraphFormat.ts
│   ├── storage/
│   │   └── yamlStorage.ts      # Lossless YAML graph/project serialization & deserialization
│   └── nodes/
│       ├── contract/           # Core TypeScript node contracts
│       │   ├── NodeBase.ts     # NodeBase, ChartNode, PortDefinition, VisualData
│       │   ├── PortDefinition.ts
│       │   ├── NodeConnection.ts
│       │   ├── NodeDefinition.ts
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
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

### Step 2: Start the Frontend Canvas Studio
```bash
# From repository root:
npm run dev

# Or directly in frontend:
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Step 3 (Optional): Start the Live-Debugging Bridge Server
In a separate terminal:
```bash
# From repository root:
npm run start:debugger

# Or directly in backend:
cd backend
npm run start:debugger
```
The server will start listening on `ws://localhost:21889`. Click **"Debugger Bridge"** in the top navigation bar of the canvas to connect.

### Step 4: Run Automated UI Tests
```bash
# From repository root:
npm run test:ui

# Or directly in frontend:
cd frontend
npm run test:ui
```
Runs the full 9-scenario Playwright UI test suite headlessly. All 9 tests pass in ~18 seconds.

---

## 4. Rivet Source Reference Mapping

The following modules in this codebase directly reference and adapt Ironclad Rivet's core packages:

| Component | Repository Path | Rivet Upstream Reference |
|---|---|---|
| Node Contract | `backend/nodes/contract/` | `packages/core/src/model/NodeBase.ts`, `NodeDefinition.ts`, `NodeImpl.ts` |
| Built-in Core Nodes | `backend/nodes/core/` | `packages/core/src/model/nodes/*.ts` |
| OpenAI Assistants Nodes | `backend/nodes/assistants/` | `packages/core/src/plugins/openai/nodes/*.ts` |
| Integrated Plugin Nodes | `backend/nodes/plugins/` | `packages/core/src/plugins/{anthropic,google,huggingface,assemblyAi,autoevals}` |
| Debugger Bridge | `backend/debugger/` | `packages/app-executor/bin/executor.mts` & `packages/node/src/debugger.ts` |
| Graph-Testing Framework | `backend/trivet/` | `packages/trivet/src/*` |
| Canvas UI | `frontend/src/components/` | `packages/app/src/components/{NodeCanvas,VisualNode,Wire,DebuggerConnectPanel}` |
| Flow Serialization | `backend/storage/yamlStorage.ts` | `packages/core/src/model/Project.ts` (adapted to YAML) |

---

## 5. Documentation Links

- [Node Contract Specification](docs/NODE_CONTRACT.md)
- [Merged Nodes Catalog (109 Nodes)](docs/MERGED_NODES.md)
- [Automated Test Report](automated-test-report.md)
- [Manual Testing Guide](manual-testing-guide.md)

---

## 6. License
MIT License. Contains code derived from [Ironclad Rivet](https://github.com/Ironclad/rivet), Copyright (c) 2024 Ironclad, Inc.