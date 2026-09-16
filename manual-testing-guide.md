# Manual Testing Guide & Instruction Manual — Phase 1, Step 1

This document provides complete instructions for setting up, running, and manually testing the Rivet Canvas Foundation from a fresh clone in GitHub Codespaces or a local developer machine.

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

### Item 9: Editable Code View
- **Action**:
  - Click the **"Code"** button on the `Transform Code` node (or double-click the node).
- **Visual**:
  - A modal dialog titled **"Editable Code View: Transform Code (code)"** opens.
  - The code editor displays the JavaScript/TypeScript function with line spacing and monospace font.
  - Edit the code (e.g. change `input.toUpperCase()` to `input.toLowerCase()`).
  - Click **"Save Code Changes"**.
  - Re-open the code view.
- **Pass Criteria**: The modal opens cleanly, edits are saved, and the updated code persists on re-opening.

### Item 10: YAML Flow Storage (Save & Reload)
- **Action**:
  1. Click the **"Flow Storage (YAML)"** button in the top navbar.
  2. Inspect the **"Export YAML Flow"** tab.
  3. Click **"Download flow.yaml"**.
  4. Switch to the **"Import / Reload YAML"** tab.
  5. Paste a custom YAML structure or modify the exported YAML.
  6. Click **"Load & Apply YAML"**.
- **Visual**:
  - The exported tab shows formatted, syntax-valid YAML with `metadata`, `nodes`, and `connections`.
  - The browser downloads `flow.yaml`.
  - Applying valid imported YAML reconstructs the entire canvas with the new nodes and wires.
- **Pass Criteria**: YAML exports and reloads cleanly without errors.

### Item 11: Live-Debugging Bridge Panel
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

## 3. Known Limitations (Phase 1, Step 1 Scope)

The following behaviors are **by design** for Phase 1 Step 1 and should not be treated as bugs:

1. **No Live LLM Backend Execution**: The canvas visual foundation does not invoke external OpenAI/Anthropic API keys during this step. Live AI graph processing will be wired in subsequent backend execution phases.
2. **Read-Only Mock Debugger Stream**: If the debugger bridge backend is not started in a separate terminal, attempting to connect will log a connection error in the panel; this is expected behavior when the WebSocket server is offline.
3. **Pure DOM Canvas Rendering**: Rendering is optimized using React + SVG bezier paths. Ultra-massive graphs (1,000+ simultaneous nodes) will receive WebGL/Canvas2D virtualization in later performance tuning phases.
