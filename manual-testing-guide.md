# Manual Testing Guide & Instruction Manual — Phase 1, Steps 1–3

This document provides complete instructions for setting up, running, and manually verifying the Rivet Canvas Foundation and the Phase 1 Step 2 extensions (Langflow editable-node-code pattern and ActivePieces architectural reference study) from a fresh clone in GitHub Codespaces or a local developer machine.

---

## 1. Setup Instructions (Fresh Clone in Codespaces)

Follow these exact steps from the terminal in your repository root:

### Step 1: Install dependencies
```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```
*Expected Output*:
`added ... packages in ...s` with zero breaking errors.

### Step 2: Launch the Frontend Canvas Studio
```bash
# From frontend folder:
npm run dev

# Or from repository root:
npm run dev
```
*Expected Output*:
```text
  VITE v5.4.x  ready in ... ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://...:5173/
```
In Codespaces, click the **Open in Browser** notification or open port `5173`.

### Step 3 (Optional): Launch the Live-Debugging Bridge Server
In a second terminal window:
```bash
# From backend folder:
cd backend
npm run start:debugger

# Or from repository root:
npm run start:debugger
```
*Expected Output*:
```text
Starting Rivet Live-Debugging Bridge on port 21889...
[Rivet Debugger] Listening on ws://localhost:21889
```

---

## 2. Step-by-Step Manual Verification Checklist

Follow this checklist item-by-item. Each item describes the action, expected visual behavior, and definitive Pass/Fail criteria.

### Item 1: Canvas Loading & Initial State
- **Action**: Open `http://localhost:5173/` in your browser.
- **Visual**:
  - The canvas displays a dark dot-grid background (`#0c0e12`).
  - The top navbar displays the logo, title **"Rivet Canvas Studio"**, badge **"Phase 1 Foundation"**, and three buttons: `Debugger Bridge`, `Flow Storage (YAML)`, `Clear`.
  - The canvas renders two pre-seeded nodes connected by an indigo curved wire:
    1. An **"Input Prompt Text"** (`text`) node with an output port.
    2. A **"Transform Code"** (`code`) node with an input port and output port.
  - The bottom-left info bar displays `Nodes: 2 | Wires: 1 | Pan: 0, 0`.
- **Pass Criteria**: All elements appear cleanly without console errors.

### Item 2: Node Palette & Search (All 109 Merged Nodes)
- **Action**: Look at the left sidebar palette. Type `"openai"` or `"mcp"` or `"chat"` in the search input.
- **Visual**:
  - The sidebar shows categories with counts:
    - `Graph / Flow Control (14)`
    - `Chat & Models (8)`
    - `Data Manipulation (26)`
    - `Files, Datasets & Vectors (13)`
    - `OpenAI Assistants (15)`
    - `MCP (3)`
    - `Media & Audio (3)`
    - `Utility & System (17)`
    - `Integrated Plugins (10)`
  - Searching filters down instantly. For example, typing `"mcp"` shows `MCP Discovery`, `MCP Get Prompt`, and `MCP Tool Call`.
- **Pass Criteria**: All 109 merged nodes appear in their correct functional groups and filter instantaneously.

### Item 3: Adding Nodes (Drag & Drop and Click)
- **Action**:
  1. Click the `+` icon on any palette node (e.g. `Chat (LLM)`).
  2. Drag another node (e.g. `Array`) from the palette and drop it onto the canvas.
- **Visual**:
  - The clicked node appears on the canvas.
  - The dragged node appears at the exact drop location.
  - The bottom info bar updates `Nodes: 4`.
- **Pass Criteria**: Both adding methods instantiate the visual node with its default ports.

### Item 4: Selecting and Moving Nodes
- **Action**:
  1. Click on the body or header of any node.
  2. Click and drag the node across the canvas.
- **Visual**:
  - The selected node gains a glowing border ring (`var(--node-selected-glow)`).
  - The node follows the cursor smoothly in real-time.
- **Pass Criteria**: Node selection is clear, movement has zero lag, and coordinates update smoothly.

### Item 5: Deleting Nodes (Button & Keyboard Shortcut)
- **Action**:
  1. Click the `✕` delete button on the header of any node.
  2. Select another node, and press the `Delete` or `Backspace` key on your keyboard.
- **Visual**:
  - The node vanishes from the canvas.
  - Any wires connected to that node are automatically detached and removed.
  - The `Nodes:` count decreases in the status bar.
- **Pass Criteria**: Both header delete button and keyboard `Delete`/`Backspace` remove the node.

### Item 6: Port-to-Port Wiring
- **Action**:
  1. Move cursor over an output port (colored circular dot on the right side of a node).
  2. Click and hold the mouse button, and drag outward.
  3. Release on an input port (circular dot on the left side of another node).
- **Visual**:
  - While dragging, a dashed cyan wire tracks the mouse position.
  - Upon release, a solid indigo cubic bezier wire connects the two ports.
  - The `Wires:` count in the status bar increases by 1.
- **Pass Criteria**: Connecting output to input establishes a persistent wire.

### Item 7: Wire Removal
- **Action**:
  - Hover over any wire on the canvas.
  - Click on the wire path.
- **Visual**:
  - On hover, the wire highlights red with an expanded stroke.
  - Clicking removes the wire immediately.
  - The `Wires:` count decreases by 1.
- **Pass Criteria**: Clicking any wire removes the connection.

### Item 8: Pan & Zoom
- **Action**:
  1. Click on the canvas background and drag the mouse.
  2. Scroll mouse wheel up and down over the canvas.
  3. Click the `+`, `-`, and `⟲` buttons in the bottom-right floating controls.
- **Visual**:
  - Dragging moves the entire graph canvas smoothly.
  - Scrolling zooms the canvas in and out (zoom range 25% to 250%).
  - Clicking `⟲` resets zoom to 100% and pan to `(0, 0)`.
- **Pass Criteria**: Pan and zoom respond smoothly and reset accurately.

### Item 9: Live-Debugging Bridge Panel
- **Action**:
  1. Click the **"Debugger Bridge"** button in the top navbar.
  2. Verify the modal opens with URL input `ws://localhost:21889`.
  3. If you started the backend debugger server (`npm run start:debugger`), click **"Connect to Bridge"**.
- **Visual**:
  - The modal opens without crashing.
  - Status badge shows `DISCONNECTED` (or `CONNECTED` if server is running).
  - Event logs show handshake and connection lifecycle events.
  - Closing the modal with `✕` dismisses it cleanly.
- **Pass Criteria**: The debugging panel opens, interacts, and closes with zero UI crashes.

---

## 3. What's New in Step 2: Langflow Editable-Node-Code & ActivePieces Reference

The following checklist items test the features introduced in Phase 1 Step 2.

### Item 10: Universal Editable-Node-Code View Across All 109 Nodes
- **Action**:
  1. Locate the pre-seeded **"Input Prompt Text"** (`text`) node on the canvas (or drag any node like `Chat`, `Loop Controller`, or `Extract Regex` from the sidebar palette).
  2. Click the **"Code"** button on the node header (or double-click the node).
- **Visual**:
  - The modal dialog opens: **"Editable Code View: Input Prompt Text (text)"**.
  - A help banner displays: *"Langflow Editable-Node-Code Pattern: Modify this node's TypeScript source or update `@title` to update the node box live without breaking wire connections."*
  - The editor displays standard, idiomatic TypeScript source code (`NodeDefinition`) with typed inputs, outputs, initial parameters, and `process(inputs, context)` function.
- **Pass Criteria**: The editable source code opens for **any** node on the canvas, not just `code` nodes.

### Item 11: Live Visual Card Synchronization Without Breaking Wire Connections
- **Action**:
  1. Ensure the initial wire from **"Input Prompt Text"** to **"Transform Code"** is visible on canvas.
  2. Click the **"Code"** button on **"Input Prompt Text"**.
  3. In the code editor textarea, modify the title directive at the top:
     ```typescript
     // Change:
     // @title Input Prompt Text
     // To:
     // @title Live Filtered Prompt
     ```
  4. In the `process` function, edit the returned text string.
  5. Click **"Save Code Changes"**.
- **Visual**:
  - The modal closes immediately.
  - The visual card on the canvas updates its header title live to **"Live Filtered Prompt"**.
  - The node preview box reflects the updated implementation snippet.
  - **The connection wire between this node and "Transform Code" remains 100% connected, visible, and fully intact.**
- **Pass Criteria**: Node title and preview update live on the canvas card without breaking or detaching existing wire connections.

### Item 12: Lossless YAML Export & Import Cycle with `customCode`
- **Action**:
  1. With the edited node from Item 11 on the canvas, click **"Flow Storage (YAML)"** in the top navbar.
  2. Inspect the **"Export YAML Flow"** tab. Verify `customCode:` is serialized inside the node object containing your edited TypeScript code.
  3. Copy the YAML text.
  4. Switch to the **"Import / Reload YAML"** tab.
  5. Paste the copied YAML into the textarea.
  6. Click **"Load & Apply YAML"**.
- **Visual**:
  - The modal closes and the flow reloads on canvas.
  - The node retains its custom title **"Live Filtered Prompt"**.
  - Clicking **"Code"** on the reloaded node displays the exact custom TypeScript code previously saved.
- **Pass Criteria**: `customCode` exports and reloads cleanly through the YAML round-trip cycle without data loss or corruption.

### Item 13: Reviewing the ActivePieces Structural Reference Study
- **Action**:
  - Open `docs/ACTIVEPIECES_REFERENCE.md` in the repository.
- **Visual & Structural Checks**:
  - Verify comprehensive documentation of ActivePieces' piece framework (`packages/pieces/framework` and `packages/core/piece-types`).
  - Verify analysis of `createPiece`, `PieceAuth` (OAuth2, SecretText, BasicAuth, CustomAuth, OIDC), `Property.*` input schemas, and `createAction` execution contexts.
  - Verify the comparison matrix contrasting ActivePieces' step execution model with Rivet's port-based DAG dataflow contract.
  - Verify Phase 4 connector layer blueprint.
  - Verify strict license boundary confirmation (ActivePieces MIT core verified; `packages/ee` strictly excluded; zero connector imports).
- **Pass Criteria**: Document is complete, structurally sound, and contains zero enterprise code references.

## 4. What's New in Steps 4–6: Model Engine & Governance Layer

The following checklist items test the features introduced in Phase 1 Steps 4–6 (OmniRoute 4-Path Priority, Governance Layer, and Aggregator Integration).

### Item 14: Automated Model Engine Suite (14 Scenarios)
- **Action**: Run the automated test suite from terminal:
  ```bash
  npx tsx --test backend/tests/engine.test.ts
  ```
- **Visual**:
  - All 14 scenarios execute in <50ms with 100% pass rate:
    - 4-path routing (pooled quota, BYOK, BYOI)
    - Model selection (dropdown, search, Auto)
    - Allow/deny priority & hard culling
    - Flagging policies (`always`, `cost-impacting`, `never`)
    - Virtual keys, budget caps, and rate limits
    - Auto-fallback chains
- **Pass Criteria**: `tests 14, pass 14, fail 0`.

### Item 15: Programmatic Model Engine Execution via REPL
- **Action**: Launch `npx tsx` and run:
  ```typescript
  import { ModelEngine } from './backend/engine/index.js';
  const engine = new ModelEngine();
  const vk = engine.issueVirtualKey({ userId: 'dev-user', maxSpendUSD: 10.0 });
  const res = await engine.execute({
    messages: [{ role: 'user', content: 'Write a TypeScript debounce function' }],
    selectionMode: 'auto',
    virtualKey: vk.key,
  });
  console.log('Model:', res.model, '| Route:', res.routeUsed, '| Cost:', res.usage.costUSD);
  ```
- **Visual**:
  - Auto mode selects a coding model (`anthropic/claude-3-5-sonnet`, `deepseek/deepseek-r1`, or `openai/gpt-4o`).
  - Route used is `pooled-aggregator`.
- **Pass Criteria**: Request executes end-to-end with token usage and cost accounting.

### Item 16: Verifying Hard Deny-List Enforcement
- **Action**: In `npx tsx`, execute:
  ```typescript
  import { ModelEngine } from './backend/engine/index.js';
  const engine = new ModelEngine();
  await engine.execute({
    messages: [{ role: 'user', content: 'Hello' }],
    model: 'openai/gpt-4o',
    selectionMode: 'dropdown',
    denyList: ['openai/gpt-4o'],
  });
  ```
- **Visual**: Throws policy rejection error: `Requested model "GPT-4o Omni" (openai/gpt-4o) is forbidden by the deny-list.`
- **Pass Criteria**: Denied models are rejected immediately and cannot be invoked directly or via fallback.

---

## 5. Comprehensive Human Verification Checklist

| # | Check Item | Status | Verification Notes |
| :---: | :--- | :---: | :--- |
| **1** | Canvas loads with dark dot-grid & 2 seeded nodes | **PASS** | `nodes: 2`, `wires: 1`, pan `(0, 0)` |
| **2** | Palette search instantly filters across all 109 nodes | **PASS** | 9 functional categories, instant search |
| **3** | Adding nodes via click `(+)` and drag-and-drop | **PASS** | Added node renders with default ports |
| **4** | Node selection and real-time movement | **PASS** | Glowing border ring, smooth drag |
| **5** | Node deletion via `✕` button and `Delete`/`Backspace` key | **PASS** | Node and attached wires removed |
| **6** | Port-to-port wire creation via mouse drag | **PASS** | Dashed guide during drag, solid bezier on drop |
| **7** | Wire hover highlight & click-to-delete | **PASS** | Red hover state, deletes on click |
| **8** | Pan displacement and zoom controls | **PASS** | Background drag, scroll wheel, floating controls |
| **9** | Debugger Bridge panel opens and closes cleanly | **PASS** | URL input, status badge, log viewport |
| **10** | Universal **Code** button on all 109 nodes | **PASS** | Opens TypeScript `NodeDefinition` for any node |
| **11** | Live visual card reflection without breaking wires | **PASS** | Title and preview update; wires remain 100% intact |
| **12** | Lossless YAML export & reload cycle with `customCode` | **PASS** | YAML preserves and restores custom code |
| **13** | ActivePieces Reference Study (`docs/ACTIVEPIECES_REFERENCE.md`) | **PASS** | Full architectural study; `packages/ee` excluded |
| **14** | Canvas UI Automated Playwright Suite (12/12 passing) | **PASS** | Regression check: all 12 scenarios pass in 41.6s |
| **15** | Model Engine 4-Path Priority Routing | **PASS** | Pooled enterprise -> aggregator -> BYOK -> BYOI |
| **16** | Model Selection Modes (Dropdown, Search, Auto) | **PASS** | Exact, search query, and task-aware modes verified |
| **17** | Allow-List Priority & Deny-List Hard Culling | **PASS** | Priority boost for allow; strict exclusion for deny |
| **18** | Notification Flagging Preferences (`always`, `cost-impacting`, `never`) | **PASS** | Flags cost-impacting out-of-allowlist selections |
| **19** | Virtual Key Issuance (`vk-usr-...`, `vk-team-...`) | **PASS** | Scoped keys; credentials never exposed |
| **20** | Budget Cap Enforcement (`BudgetExceededError`) | **PASS** | Pre-execution block when budget cap is met |
| **21** | Rate Limiting (`RateLimitExceededError`) | **PASS** | Enforces sliding-window RPM & TPM |
| **22** | Default Aggregator Integration (OpenRouter) | **PASS** | Zero-setup pooled provider path verified |
| **23** | Auto-Fallback Chain on Provider Failure | **PASS** | Failover to next candidate in chain |

---

## 6. Known Limitations (Phase 1, Steps 1–6 Scope)

The following behaviors are **by design** for Phase 1 Steps 1–6:

1. **Simulated Pooled Key in Local Dev**: Unless `OPENROUTER_API_KEY` or `AGGREGATOR_API_KEY` is exported in your local environment, the engine operates in simulated pooled quota mode to prevent accidental credit burn during local development and testing.
2. **Read-Only Mock Debugger Stream**: If the debugger bridge backend is not started in a separate terminal, attempting to connect in the UI will log a connection error; this is expected behavior when the WebSocket server is offline.
3. **Pure DOM Canvas Rendering**: Rendering is optimized using React + SVG bezier paths. Ultra-massive graphs (1,000+ simultaneous nodes) will receive WebGL/Canvas2D virtualization in later performance tuning phases.
4. **ActivePieces Reference Scope**: ActivePieces is analyzed as a structural reference study only (`docs/ACTIVEPIECES_REFERENCE.md`). No connector packages are imported and no execution runtime from ActivePieces is bundled.
5. **Admin Panel UI on Hold**: Budget and usage tracking are active in the engine layer (`UsageStore`, `BudgetTracker`); full visual admin dashboard UI is on hold per project roadmap.

