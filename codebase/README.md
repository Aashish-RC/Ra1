# Rivet Canvas Foundation (Phase 1, Step 1)

Visual node-canvas foundation for AI workflow authoring, directly modeled on and sourced from [Ironclad Rivet](https://github.com/Ironclad/rivet) (MIT License).

---

## 1. Directory Structure

```text
codebase/
├── README.md                   # This file — setup, architecture, and run instructions
├── LICENSE                     # MIT License (retaining Ironclad Rivet copyright notice)
├── automated-test-report.md    # Automated UI test results (Playwright, 9/9 passing)
├── manual-testing-guide.md     # Step-by-step human verification checklist & manual
├── docs/
│   ├── NODE_CONTRACT.md        # Comprehensive TypeScript contract guide & custom node tutorial
│   └── MERGED_NODES.md         # Full catalog of all 109 merged nodes & source file origins
├── backend/
│   ├── package.json            # Backend workspace dependencies (ws, yaml, nanoid)
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

## 2. How to Run Locally

### Prerequisites
- Node.js >= 18 (tested on Node.js v24)
- npm >= 9

### Step 1: Install Dependencies
```bash
# Frontend
cd codebase/frontend
npm install

# Backend
cd ../backend
npm install
```

### Step 2: Start the Frontend Canvas Studio
```bash
cd ../frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Step 3 (Optional): Start the Live-Debugging Bridge Server
In a separate terminal:
```bash
cd codebase/backend
npm run start:debugger
```
The server will start listening on `ws://localhost:21889`. Click **"Debugger Bridge"** in the top navigation bar of the canvas to connect.

### Step 4: Run Automated UI Tests
```bash
cd codebase/frontend
npm run test:ui
```
Runs the full 9-scenario Playwright UI test suite headlessly. All 9 tests pass in ~18 seconds.

---

## 3. Rivet Source Reference Mapping

The following modules in this codebase directly reference and adapt Ironclad Rivet's core packages:

| Component | Codebase Path | Rivet Upstream Reference |
|---|---|---|
| Node Contract | `codebase/backend/nodes/contract/` | `packages/core/src/model/NodeBase.ts`, `NodeDefinition.ts`, `NodeImpl.ts` |
| Built-in Core Nodes | `codebase/backend/nodes/core/` | `packages/core/src/model/nodes/*.ts` |
| OpenAI Assistants Nodes | `codebase/backend/nodes/assistants/` | `packages/core/src/plugins/openai/nodes/*.ts` |
| Integrated Plugin Nodes | `codebase/backend/nodes/plugins/` | `packages/core/src/plugins/{anthropic,google,huggingface,assemblyAi,autoevals}` |
| Debugger Bridge | `codebase/backend/debugger/` | `packages/app-executor/bin/executor.mts` & `packages/node/src/debugger.ts` |
| Graph-Testing Framework | `codebase/backend/trivet/` | `packages/trivet/src/*` |
| Canvas UI | `codebase/frontend/src/components/` | `packages/app/src/components/{NodeCanvas,VisualNode,Wire,DebuggerConnectPanel}` |
| Flow Serialization | `codebase/backend/storage/yamlStorage.ts` | `packages/core/src/model/Project.ts` (adapted to YAML) |

---

## 4. Documentation Links

- [Automated Test Report](file:///codebase/automated-test-report.md)
- [Manual Testing Guide](file:///codebase/manual-testing-guide.md)
- [Node Contract Specification](file:///codebase/docs/NODE_CONTRACT.md)
- [Merged Nodes Catalog](file:///codebase/docs/MERGED_NODES.md)
