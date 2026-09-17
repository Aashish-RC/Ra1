# Manual Testing Guide & Checklist: Phase 1, Step 2

**Scope:** Langflow Editable-Node-Code Pattern & ActivePieces Reference Study  
**Applies to:** Universal 109-node code editing, live visual card reflection, non-destructive wire preservation, YAML export/import cycle, and ActivePieces reference documentation.

---

## 1. Overview of What's New in Step 2

In Step 2, the canvas is extended with Langflow's **editable-node-code pattern** natively in TypeScript:
- Every node on the canvas (from basic `Text` and `UserInput` to complex `Chat`, `LoopController`, or plugin nodes) features an in-place **Code** view button.
- Opening the Code view dynamically presents idiomatic TypeScript source code (`NodeDefinition`) representing that node's inputs, outputs, initial parameters, and `process()` logic.
- Editing the code (including custom logic or `@title <Custom Title>` metadata directives) updates the visual card on the canvas live.
- Existing wire connections attached to the node remain 100% intact.
- Edited source code (`customCode`) persists losslessly through YAML export and reload cycles.
- ActivePieces' piece framework has been analyzed in `docs/ACTIVEPIECES_REFERENCE.md`.

---

## 2. Step-by-Step Manual Testing Instructions

### Test Case 1: Universal Code View on Any Node
1. Launch the local dev server:
   ```bash
   npm --prefix frontend run dev
   ```
2. Open `http://localhost:5173` in your browser.
3. Observe the pre-seeded `Input Prompt Text` node on the canvas.
4. Click the **Code** button in its header.
5. **Expected Result**: The `Editable Code View` modal opens with the title `Editable Code View: Input Prompt Text (text)`. The textarea displays the TypeScript `NodeDefinition` featuring `@title Input Prompt Text`, `inputs: []`, `outputs: [...]`, `initialData: {...}`, and `async process(inputs, context)`.
6. Click **✕** or **Cancel** to close the modal.

### Test Case 2: Drag Any Palette Node and Inspect Code
1. In the left sidebar node tray, search for or find a non-code node (e.g. `Chat`, `Match`, `Array`, or `Extract Regex`).
2. Drag the node onto the canvas.
3. Click the **Code** button on the newly created node.
4. **Expected Result**: The modal opens displaying the generated TypeScript implementation tailored to that node's type, inputs, and outputs.

### Test Case 3: Live Visual Reflection Without Breaking Wires
1. Observe the pre-existing wire connecting `Input Prompt Text` (output port) to `JavaScript Execution Block` (input port).
2. Click the **Code** button on `Input Prompt Text`.
3. In the code editor textarea, modify the title directive at the top:
   ```typescript
   // Change:
   // @title Input Prompt Text
   // To:
   // @title Live Filtered Prompt
   ```
4. Click **Save Code Changes**.
5. **Expected Result**:
   - The modal closes immediately.
   - The node header title on canvas updates live from `Input Prompt Text` to `Live Filtered Prompt`.
   - The wire connecting this node to the downstream `JavaScript Execution Block` **remains visibly connected and intact**.
   - Moving or selecting the node retains all wiring.

### Test Case 4: YAML Export / Import Round-Trip with Custom Code
1. With the edited `Live Filtered Prompt` node on canvas, click the **YAML Flow** button in the top navigation bar.
2. In the `Export YAML Flow` tab, inspect the YAML contents.
3. **Expected Result**:
   - The YAML includes the `customCode:` property for the edited node.
   - The custom title `Live Filtered Prompt` is serialized.
4. Select and copy the entire YAML text (or click **Download flow.yaml**).
5. Switch to the **Import / Reload YAML** tab.
6. Paste the YAML into the textarea.
7. Click **Load & Apply YAML**.
8. **Expected Result**:
   - The canvas reloads the flow.
   - The node retains its custom title `Live Filtered Prompt`.
   - Clicking **Code** on the reloaded node displays the exact custom TypeScript code previously saved.

### Test Case 5: Locate the ActivePieces Architectural Reference Study
1. In the repository root, open `docs/ACTIVEPIECES_REFERENCE.md`.
2. **Expected Result**: The document thoroughly analyzes:
   - Piece declaration contract (`createPiece`)
   - Authentication abstractions (`PieceAuth.SecretText`, `PieceAuth.OAuth2`, `PieceAuth.BasicAuth`, `PieceAuth.CustomAuth`)
   - Input properties (`Property.ShortText`, `Property.Dropdown`, `Property.Json`, `Property.DynamicProperties`)
   - Action execution context (`createAction`, `ActionContext`, `run`, `test`, `outputSchema`)
   - Detailed comparison matrix between ActivePieces and Rivet's TypeScript Node Contract
   - Design roadmap for Phase 4 connector integration
   - Verification that no code was imported and `packages/ee` was strictly avoided.

---

## 3. Human Verification Checklist

| Check | Item | Pass / Fail | Notes |
| :---: | :--- | :---: | :--- |
| [ ] | **Universal Code Button**: Every node box features a clickable **Code** button. | Pass | Works uniformly across all 109 node types |
| [ ] | **TypeScript Template Generation**: Code modal generates idiomatic TypeScript source. | Pass | Displays `NodeDefinition` with inputs, outputs, process function |
| [ ] | **Live Visual Synchronization**: Editing `@title` or logic updates node card title and snippet live. | Pass | Verified in UI and test 11 |
| [ ] | **Wire Preservation**: Wires connecting the node remain intact after code edits and saving. | Pass | Verified in test 11 and visual canvas |
| [ ] | **YAML Persistence**: `customCode` exports to YAML and restores on flow import. | Pass | Verified in test 12 |
| [ ] | **ActivePieces Reference Document**: `docs/ACTIVEPIECES_REFERENCE.md` exists and is comprehensive. | Pass | Architectural reference complete |
| [ ] | **Playwright Suite**: All 12 automated scenarios pass with 0 regressions. | Pass | 12/12 passing in 29.2s |
