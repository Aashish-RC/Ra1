# Ra1 - Rivet Canvas Foundation (Phase 1, Step 1)

Visual node-canvas foundation for AI workflow authoring, directly modeled on and sourced from [Ironclad Rivet](https://github.com/Ironclad/rivet) (MIT License).

---

## Overview

Ra1 provides a complete browser-based node canvas with:
- **Interactive Infinite Canvas**: Smooth pan/zoom, grid background, node selection, drag-to-move, and deletion.
- **Dynamic Port-to-Port Wiring**: Curved SVG cubic-bezier connection wires with auto-routing, click-to-delete, and input/output connection validation.
- **109 Merged Built-in Nodes**: All 109 core, OpenAI Assistants, and plugin nodes ported directly from Ironclad Rivet, organized in a searchable tray palette with drag-and-drop onto the canvas.
- **Editable Script/Code Modal**: In-place Monaco/textarea editor for Code and Prompt nodes.
- **Lossless YAML Flow Storage**: Export and import complete workflow graphs to clean YAML format.
- **Live-Debugging Bridge**: WebSocket bridge server connecting the frontend canvas with the backend runner.
- **Trivet Testing Framework**: Graph and test-case validation schemas ported from Rivet.
- **Automated UI Testing Suite**: 9/9 passing Playwright end-to-end scenarios.

---

## Directory Structure

```text
Ra1/
├── README.md                   # Repository overview and quick start guide
├── .gitignore                  # Git ignore rules
└── codebase/                   # Clean codebase implementation
    ├── README.md               # Detailed technical documentation and architecture
    ├── LICENSE                 # MIT License (retaining Ironclad Rivet copyright)
    ├── automated-test-report.md# Automated UI test suite results (Playwright, 9/9 passing)
    ├── manual-testing-guide.md # Human verification manual and step-by-step checklist
    ├── package.json            # Root workspace scripts
    ├── docs/
    │   ├── NODE_CONTRACT.md    # TypeScript node contract specification & custom node guide
    │   └── MERGED_NODES.md     # Full catalog of 109 merged nodes & upstream source file mapping
    ├── backend/
    │   ├── package.json        # Backend dependencies (ws, yaml, nanoid, tsx)
    │   ├── debugger/           # Live-debugging bridge server & CLI executor
    │   ├── storage/            # Lossless YAML graph serialization/deserialization
    │   ├── trivet/             # Trivet graph-testing framework
    │   └── nodes/              # All 109 node definitions and TypeScript contracts
    └── frontend/
        ├── package.json        # Frontend dependencies (React, Vite, Lucide, Playwright)
        ├── vite.config.ts
        ├── tsconfig.json
        ├── playwright.config.ts# Playwright automated test configuration
        ├── tests/              # 9-scenario Playwright UI test suite
        └── src/                # Canvas UI components, state management, and design system
```

---

## Quick Start Guide

### Prerequisites
- Node.js >= 18
- npm >= 9

### 1. Install Dependencies
```bash
# Frontend
cd codebase/frontend
npm install

# Backend
cd ../backend
npm install
```

### 2. Start the Frontend Studio
```bash
cd ../frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Start the Live-Debugging Bridge (Optional)
```bash
cd codebase/backend
npm run start:debugger
```
WebSocket server listens on `ws://localhost:21889`. Click **"Debugger Bridge"** in the canvas top bar to connect.

### 4. Run Automated UI Tests
```bash
cd codebase/frontend
npm run test:ui
```
Runs the full 9-scenario Playwright UI test suite headlessly.

---

## Documentation Links

- [Codebase Architecture & Details](codebase/README.md)
- [Node Contract Specification](codebase/docs/NODE_CONTRACT.md)
- [Merged Nodes Catalog (109 Nodes)](codebase/docs/MERGED_NODES.md)
- [Automated Test Suite Report](codebase/automated-test-report.md)
- [Manual Testing Guide & Checklist](codebase/manual-testing-guide.md)

---

## License
MIT License. Contains code derived from [Ironclad Rivet](https://github.com/Ironclad/rivet), Copyright (c) 2024 Ironclad, Inc.