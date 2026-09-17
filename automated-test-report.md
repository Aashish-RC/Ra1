# Automated UI & Integration Test Suite Report — Phase 1–4 Complete (with Onboarding & AI Thinking Drawer)

**Project**: Rivet Canvas Foundation, OmniRoute Model Engine, Chat Surface, RAG Pipeline, Artifact Panels, Onboarding Wizard & AI Thinking Drawer  
**Test Framework**: Playwright (v1.48.0 / Chromium) & Node.js Built-In Test Runner (`tsx`)  
**Execution Environment**: Local Development / CI Profile (Windows / 4-Core)  
**Total Scenarios**: 57 (12 Canvas Foundation + 14 Model Engine + 23 Phase 3+4 Core + 5 Onboarding + 3 AI Thinking Drawer)  
**Passed**: 57 (100%)  
**Failed**: 0  
**Total Suite Duration**: ~1.3m (Playwright 43 tests: 1.3m, Model Engine 14 tests: 13.1ms)  

---

## 1. Test Framework Selection Rationale: Playwright vs. Selenium

For the visual node-canvas and web application testing suite, **Playwright** was chosen over Selenium for the following technical reasons:

1. **Lightweight Headless Footprint**: Playwright bundles a slim headless Chromium engine requiring no external Java Runtime Environment, separate webdriver daemons (`chromedriver`, `geckodriver`), or selenium grid infrastructure.
2. **Execution Velocity**: The entire 43-test Playwright UI suite completes in **1.3 minutes** in a single worker pass.
3. **Canvas & SVG Event Precision**: Playwright provides first-class synthetic pointer event simulation (`mouse.move`, `mouse.down`, `mouse.up`, `dragTo`) and auto-waiting assertions, eliminating timing flakiness common in Selenium when testing SVG bezier wires, canvas pan/zoom transformations, dynamic drag-and-drop, and floating overlays.
4. **Deterministic Visual & Functional Verification**: Eliminates live remote flakiness through deterministic fallback routing and isolated browser context execution.

---

## 2. Phase 1 Test Execution Summary: Canvas Foundation (12 Tests)

| # | Test Scenario | Status | Duration | Assertion Highlights |
|---|---|---|---|---|
| **1** | **Canvas loads without errors** | **PASS** | 1.6s | Verified `#canvas-viewport`, `#canvas-transform-layer`, header branding, and initial 2-node graph render. |
| **2** | **A node can be dragged onto the canvas** | **PASS** | 1.6s | Verified HTML5 `dragTo` from `#palette-item-chat` to canvas viewport, increasing canvas node count. |
| **3** | **Two nodes can be connected via a port-to-port wire** | **PASS** | 1.7s | Mouse down on source output port, move to target input port, mouse up. Verified SVG wire generation. |
| **4** | **A connection can be removed** | **PASS** | 1.3s | Clicked connection wire element. Verified wire deletion and DOM cleanup without obstruction. |
| **5** | **A node can be selected, moved, deleted** | **PASS** | 1.5s | Verified `.selected` class on click, coordinate delta after mouse drag, and removal upon delete action. |
| **6** | **Pan and zoom respond to input** | **PASS** | 1.6s | Tested zoom-in (115%), zoom-out (83%), zoom-reset (100%), and canvas mouse panning displacement. |
| **7** | **Opening a node reveals its editable code view** | **PASS** | 1.7s | Clicked `Code` button on CodeNode. Verified modal opened with editable script view, modified code, and persisted save. |
| **8** | **A flow saves and reloads as valid YAML** | **PASS** | 1.7s | Opened YAML modal, verified valid exported flow YAML, imported new YAML string, verified node reconstruction on canvas. |
| **9** | **The debugging-bridge panel opens without crashing** | **PASS** | 1.5s | Opened `#debugger-modal`, verified WebSocket URL input (`ws://localhost:21889`), status badge, and log viewport. |
| **10** | **Opening any node's code view shows editable source** | **PASS** | 1.6s | Tested on core `text` node (`#node-node-init-1`). Verified universal source generation: `@title Input Prompt Text`, `NodeDefinition`, `type: "text"`, and `async process`. |
| **11** | **Editing a node's code updates visual representation without breaking connections** | **PASS** | 1.5s | Edited `@title` and code logic. Verified live visual update on canvas (`Custom Text Processor`), updated preview snippet, and verified attached wire connection remained 100% intact. |
| **12** | **Editing a node's code preserves YAML export/import cycle** | **PASS** | 1.9s | Edited node code, verified `customCode:` serialized into YAML export, imported YAML back into canvas, verified full lossless restoration of node state and custom code. |

---

## 3. Phase 2: OmniRoute Model Engine & Governance Automated Test Suite (14 Tests)

**Test Runner**: Node.js Built-in Test Runner with `tsx` (`npm test` in `backend`)  
**Total Engine Scenarios**: 14  
**Status**: 14/14 PASS (100%)  
**Engine Execution Duration**: 13.1ms  

| # | Test Scenario | Done | Status | Duration | Assertion Highlights |
|---|---|:---:|:---:|:---:|---|
| **1** | A request routes through pooled quota by default with no user key configured | [x] Done | **PASS** | 2.9ms | Evaluated request with zero user keys. Successfully routed to `pooled-enterprise` via default pool without error. |
| **2** | A request falls back to BYOK when pooled quota is exhausted | [x] Done | **PASS** | 0.4ms | Set pooled provider status to `exhausted`. System automatically fell back to user-provided OpenAI BYOK key on `byok` path. |
| **3** | A request falls back to BYOI when configured and applicable | [x] Done | **PASS** | 0.3ms | Target model `llama-3.3-70b-instruct` unavailable in pooled enterprise/aggregator. Successfully routed to user's Ollama BYOI local endpoint. |
| **4** | Dropdown model selection works | [x] Done | **PASS** | 0.2ms | Explicit dropdown selection of `gpt-4o`. Directly resolved target model and provider `openai` without routing ambiguity. |
| **5** | Search-in-dropdown filters correctly | [x] Done | **PASS** | 0.3ms | Searched catalog query `"anthropic"` and `"claude"`. Accurately filtered matching models (`claude-3-5-sonnet`, `claude-3-5-haiku`) while excluding non-matching models. |
| **6** | Auto mode selects a model based on prompt content | [x] Done | **PASS** | 2.8ms | Analyzed complex code prompt (`Write a high-performance concurrent LRU cache`). Classified as `code`/`reasoning`, selected optimal code champion `claude-3-5-sonnet-20241022` with classification tags. |
| **7** | Auto mode respects allow-list as priority, not hard cap (selects outside list when justified) | [x] Done | **PASS** | 0.6ms | User configured allow-list restricted to `[gpt-4o-mini, claude-3-5-haiku]`. Prompt required frontier mathematical theorem proving. Auto mode recognized priority boost was outweighed by capability requirements and reached outside allow-list to select frontier model `claude-3-5-sonnet-20241022`. |
| **8** | A denied model is never selected, including as a fallback | [x] Done | **PASS** | 0.9ms | Denied `claude-3-5-sonnet-20241022` on code prompt. Auto mode culled Claude to `-Infinity` score and selected `gpt-4o`. When primary provider failed, fallback chain strictly excluded denied model. |
| **9** | Notification fires (or doesn't) correctly per the user's configured flagging preference | [x] Done | **PASS** | 0.8ms | Tested 3 policies when selecting outside allow-list: `always` -> notification generated; `never` -> zero notification; `cost-impacting` -> notification generated only when selected model cost exceeded allowed set max cost. |
| **10** | Virtual key issuance works per user | [x] Done | **PASS** | 0.6ms | Issued user key (`vk-usr-...`) and team key (`vk-team-...`). Verified internal metadata binding, rate/budget attachment, and complete credential isolation from upstream provider secrets. |
| **11** | Budget cap blocks further requests once exceeded | [x] Done | **PASS** | 0.6ms | Configured $0.005 budget cap. Executed request consuming $0.006. Subsequent request was blocked pre-execution with `BudgetExceededError`, protecting pooled funds. |
| **12** | Rate limit (RPM/TPM) is enforced | [x] Done | **PASS** | 0.4ms | Configured virtual key RPM limit of 2. Executed 2 requests within window. 3rd request was blocked pre-execution with `RateLimitExceededError` and retry-after header. |
| **13** | Aggregator path successfully completes a request end-to-end | [x] Done | **PASS** | 0.2ms | Mocked OpenRouter aggregator upstream. Request executed via `pooled-aggregator` path, returned normalized response, tracked token usage and cost calculation. |
| **14** | Auto-fallback chain triggers correctly on a simulated provider failure | [x] Done | **PASS** | 0.6ms | Simulated 500 error / timeout on primary provider `gpt-4o`. Router auto-fallback chain engaged, successfully falling back to secondary candidate `claude-3-5-sonnet-20241022` with fallback breadcrumbs recorded. |

---

## 4. Phase 3 & 4: Chat Surface, RAG Pipeline, Artifact Panels & Connectors (23 Tests)

| # | Spec Suite | Test Scenario | Status | Duration | Mock vs. Real Classification | Assertion Highlights |
|---|---|---|:---:|:---:|---|---|
| **C1** | `chat.spec.ts` | Chat panel opens and closes via button | **PASS** | 1.4s | **100% Real** | Clicked `#chat-panel-button`, asserted `#chat-panel` visibility, verified `#chat-model-selector` and `#chat-textarea`, toggled closed. |
| **C2** | `chat.spec.ts` | User sends a message -> assistant reply renders with markdown | **PASS** | 1.8s | **Real UI & Pipeline / Simulated Remote LLM** | Real user typing and send event; dispatched through real `chatService` + `ModelEngine`; simulated provider response from local aggregator fallback (`[OpenRouter Aggregator: ...]`); real Markdown + KaTeX rendering in DOM. |
| **C3** | `chat.spec.ts` | Retry button re-sends the preceding user message | **PASS** | 2.4s | **100% Real UI / Simulated Remote LLM** | Real hover over assistant message, clicked `.msg-action-btn:has-text("Retry")`, verified preceding prompt repopulates `#chat-textarea`. |
| **C4** | `chat.spec.ts` | Copy button copies message text to clipboard | **PASS** | 2.2s | **100% Real** | Real browser clipboard permission granted; clicked `Copy` button; verified `navigator.clipboard.readText()` matches prompt. |
| **C5** | `chat.spec.ts` | Edit button re-populates the input bar | **PASS** | 2.0s | **100% Real** | Clicked `Edit` on user message bubble; verified `#chat-textarea` synchronously populated with original message text. |
| **C6** | `chat.spec.ts` | Thumbs up/down rating records rating on message | **PASS** | 2.1s | **100% Real** | Hovered over assistant bubble; clicked thumbs-up button; verified `.msg-thumbs--active` CSS class applied. |
| **C7** | `chat.spec.ts` | File attach button accepts CSV/file | **PASS** | 1.4s | **100% Real** | Attached binary CSV file buffer via `setInputFiles`; verified file attachment triggers opening of the Data Table panel with `#panel-content-table`. |
| **C8** | `chat.spec.ts` | E2E: message dispatched through model engine with dropdown selection | **PASS** | 1.8s | **Real Pipeline / Simulated Remote LLM** | Selected `Claude 3.5 Sonnet` via `#chat-model-selector`; verified `ModelEngine` routes to requested model; verified assistant badge displays `claude-3-5-sonnet`. |
| **R1** | `rag.spec.ts` | Document upload -> indexed badge appears | **PASS** | 1.9s | **Real Chunking & Storage / Stubbed Vectors** | Uploaded `.txt` document; executed real `chunkText`; stubbed local cosine-fingerprint vector generation (no remote embedding API called); asserted `.rag-indexed-badge` in `#rag-indexed-list`. |
| **R2** | `rag.spec.ts` | User message with uploaded doc -> citation badges appear in response | **PASS** | 1.9s | **Real Retrieval / Stubbed Vectors / Simulated LLM** | Real cosine-similarity retrieval (`retriever.ts`); RAG context prepended to user prompt; assistant response rendered with inline citation badge `[1]` in `.citation-list`. |
| **R3** | `rag.spec.ts` | Clicking citation badge opens PDF viewer panel | **PASS** | 2.3s | **100% Real** | Clicked `.citation-badge`; verified state transition opens `#panel-content-pdf`; verified `#panel-tab-pdf` receives `.panel-tab--active`. |
| **P1** | `panels.spec.ts` | Document editor panel opens via navbar button with editor container | **PASS** | 1.4s | **100% Real** | Clicked `#open-editor-panel-btn`; asserted `#panel-content-editor` and `#tiptap-editor-content` mounted with rich toolbar. |
| **P2** | `panels.spec.ts` | TipTap editor accepts typing and toolbar formatting | **PASS** | 1.5s | **100% Real** | Typed into TipTap ProseMirror editable container; clicked `#toolbar-bold` and `#toolbar-h1`; verified text updates in editor DOM. |
| **P3** | `panels.spec.ts` | Export PDF triggers browser print dialog | **PASS** | 1.5s | **Real UI / Spied Print Handler** | Spied `window.print()` callback to verify handler dispatch in headless browser environment; clicked `#toolbar-export-pdf`; verified triggered status. |
| **P4** | `panels.spec.ts` | Export Word triggers .docx file generation | **PASS** | 1.8s | **100% Real** | Clicked `#toolbar-export-docx`; executed real `docx` library `Packer.toBlob`; verified `ra1-document.docx` download event emitted. |
| **P5** | `panels.spec.ts` | Sandbox panel opens with code editor and preview | **PASS** | 1.6s | **100% Real** | Clicked `#open-sandbox-panel-btn`; verified Sandpack Provider, `#sandpack-code-editor`, and `#sandpack-preview` render. |
| **P6** | `panels.spec.ts` | Sandbox panel switches templates (vanilla, react, vue, node) | **PASS** | 1.7s | **100% Real** | Clicked `#sandbox-template-react` and `#sandbox-template-vue`; verified active template state and button classes update. |
| **P7** | `panels.spec.ts` | Data table panel renders uploaded CSV | **PASS** | 1.4s | **100% Real** | Uploaded CSV via `#data-table-file-input`; parsed rows; verified table rendered with `.data-table-th` headers and `.data-table-td` cells. |
| **P8** | `panels.spec.ts` | Bar chart renders from table data via Chart.js | **PASS** | 1.4s | **100% Real** | Uploaded multi-column metrics CSV; instantiated real `Chart.js` canvas; switched chart type to Pie via `#chart-type-pie`. |
| **K1** | `connectors.spec.ts` | Connector category appears in node palette with >=3 entries | **PASS** | 1.3s | **100% Real** | Verified `Connectors` category in `#node-palette`; asserted Slack (`piece:slack:send_message`), HTTP (`piece:http:request`), and OpenAI (`piece:openai:chat_completion`) palette items. |
| **K2** | `connectors.spec.ts` | Adding piece:slack:send_message node onto canvas works | **PASS** | 1.3s | **100% Real** | Clicked Slack piece in palette; verified node created on canvas with ports and title `Slack: Send Channel Message`. |
| **K3** | `connectors.spec.ts` | Invoking piece:http:request connector executes action | **PASS** | 1.5s | **Real Connector Contract / Stubbed HTTP Remote** | Executed `httpPiece.actions[0].run()`; stubbed `globalThis.fetch` to return `{ success: true, message: 'pong' }` without making real external HTTP call; verified response normalization (status 200, headers, parsed body). |
| **K4** | `connectors.spec.ts` | Connector node code view shows generated TypeScript source | **PASS** | 1.5s | **100% Real** | Added HTTP connector node; clicked `Code` button; verified `#code-editor-modal` renders valid TypeScript source containing `@type piece:http:request`, `NodeDefinition`, and `async process`. |

---

## 5. Phase 4 Extension: Onboarding Wizard & AI Thinking Drawer (8 Tests)

**Test Framework**: Playwright (v1.48.0 / Chromium)  
**Total Extension Scenarios**: 8 (5 Onboarding + 3 AI Thinking Drawer)  
**Pass Rate**: 8/8 PASS (100%)  
**Extension Execution Duration**: ~15.0s  

| # | Spec Suite | Test Scenario | Status | Duration | Mock vs. Real Classification | Assertion Highlights |
|---|---|---|:---:|:---:|---|---|
| **OB1** | `onboarding.spec.ts` | Onboarding overlay appears on first load and can be dismissed without blocking chat | **PASS** | 1.5s | **100% Real** | Verified `#onboarding-overlay` and `#onboarding-modal` appear on clean launch; confirmed `#chat-panel-button` is immediately actionable without modal dismissal; toggled chat open/closed; clicked `#onboarding-skip-btn`; asserted modal dismisses and `ra1_onboarding_completed: true` in `localStorage`. |
| **OB2** | `onboarding.spec.ts` | 4-question wizard updates live preview pane in real time | **PASS** | 2.6s | **100% Real UI & Reactivity** | Evaluated all 4 steps: Q1 use case updates preview pane (Coding -> sandbox, Research -> doc editor, Data -> table, Canvas -> visual node canvas); Q2 response style switches response preview (Concise/Detailed/Code-First); Q3 model preference switches routing badge (Auto/Pooled/Premium); Q4 integration chips toggle multi-select tags in real time. |
| **OB3** | `onboarding.spec.ts` | Completing onboarding persists preferences and leaves app fully usable | **PASS** | 2.4s | **100% Real UI & LocalStorage** | Progressed through all 4 wizard steps, clicked `#onboarding-finish-btn`; asserted modal closes, `ra1_user_preferences` is saved in `localStorage` with chosen values; verified canvas remained fully interactive with nodes and palette. |
| **OB4** | `onboarding.spec.ts` | Skipping onboarding leaves all defaults in place and zero-config chat usable | **PASS** | 1.8s | **Real UI / Simulated Remote LLM** | Clicked `#onboarding-skip-btn` immediately; asserted `ra1_user_preferences` is null; opened chat panel, dispatched message `"Hello from zero-config"`; verified instant assistant reply with zero prior setup required. |
| **OB5** | `onboarding.spec.ts` | Re-opening setup guide via navbar button restores interactive wizard | **PASS** | 1.5s | **100% Real** | Verified `#open-onboarding-btn` (`✨ Setup Guide`) in top navbar restores the onboarding modal at Step 1 with full live-preview reactivity even after prior completion/dismissal. |
| **TK1** | `thinking.spec.ts` | Thinking drawer appears above assistant response and is collapsed by default | **PASS** | 1.7s | **Real UI / Simulated Remote LLM** | Dispatched chat query; verified assistant bubble renders `#thinking-drawer-[id]` directly above `.message-content`; asserted trigger button `#thinking-trigger-[id]` contains `"Thinking..."`; confirmed drawer content `#thinking-content-[id]` is collapsed by default. |
| **TK2** | `thinking.spec.ts` | Thinking drawer expands and collapses cleanly upon user toggle | **PASS** | 2.0s | **Real UI / Simulated Remote LLM** | Clicked `#thinking-trigger-[id]`; asserted `#thinking-content-[id]` transitions to visible with `.thinking-header-route` and `.thinking-trace-section`; clicked trigger a second time; asserted drawer collapses back to hidden state. |
| **TK3** | `thinking.spec.ts` | Thinking drawer reflects real retrieval data from a test message that used RAG | **PASS** | 2.2s | **Real Retrieval & Pipeline / Stubbed Vectors** | Uploaded RAG document (`architecture.txt`), asked query `"What is the retrieval architecture?"`; expanded thinking drawer; asserted real retrieval data displayed: consulted source document, excerpted text chunk (`"chunks are embedded via vector embeddings..."`), confidence relevance score, and model routing badge (`"mock-rag-synthesizer"`). |

---

## 6. Real vs. Mock Boundary Declarations

To maintain absolute architectural transparency, every subsystem's execution boundary is disclosed below:

1. **Onboarding Wizard Flow (`onboarding.spec.ts`, OB1–OB5)**:
   - **100% Real**: DOM mounting, React state transitions, dynamic preview swapping, `localStorage` read/write serialization, non-blocking click-through, and navbar re-opening run against the live browser DOM. No mocks or stubs are used.
2. **AI Thinking Drawer (`thinking.spec.ts`, TK1–TK3)**:
   - **Real UI & Pipeline**: Drawer toggle interactions, CSS transitions, metadata extraction, and rendering run against real DOM. For RAG-assisted queries, chunking, storage, and top-K cosine similarity retrieval are 100% real.
   - **Stubbed Vectors**: Document vector embeddings use the deterministic local cosine fingerprinting stub (`embedder.ts`) when remote OpenAI credentials are not provided.
3. **AI Model Engine Execution (`chat.spec.ts`, C2, C8)**:
   - **Real**: Multi-turn history, `chatService` dispatch, `ModelEngine.execute()` routing hierarchy, catalog resolution, Markdown parsing (`marked`), KaTeX rendering (`katex`), and DOM sanitization (`DOMPurify`).
   - **Simulated Remote LLM**: The external OpenRouter HTTP endpoint is not called over the internet; the ModelEngine router's zero-setup local aggregator path executes deterministically, returning standard completion tokens and model tags.
4. **ActivePieces Connector Actions (`connectors.spec.ts`, K3)**:
   - **Real**: Connector piece schema, action definitions, prop validation, context assembly, and output contract mapping.
   - **Stubbed HTTP Remote**: `globalThis.fetch` is stubbed to return a deterministic JSON payload (`{ success: true, message: 'pong' }`) to eliminate remote network dependencies.
5. **Document Export Dialogs (`panels.spec.ts`, P3, P4)**:
   - **Real**: TipTap ProseMirror schema, toolbar formatting commands, `docx` package serialization (`Packer.toBlob`), Blob download link creation and event firing.
   - **Spied Print Handler**: `window.print()` is intercepted via a spy callback to prevent blocking OS print modal dialogs in headless Chromium.

---

## 7. Full Verification Log & Commands

```bash
# 1. Run backend Model Engine regression suite (14 scenarios)
cd backend && npm test

# Output:
# ▶ Model Engine & Governance Layer (Scenarios 1-14)
#   ✔ 1. A request routes through pooled quota by default with no user key configured (2.8556ms)
#   ✔ 2. A request falls back to BYOK when pooled quota is exhausted (0.3927ms)
#   ✔ 3. A request falls back to BYOI when configured and applicable (0.3461ms)
#   ✔ 4. Dropdown model selection works (0.2445ms)
#   ✔ 5. Search-in-dropdown filters correctly (0.2669ms)
#   ✔ 6. Auto mode selects a model based on prompt content (2.7741ms)
#   ✔ 7. Auto mode respects allow-list as priority, not hard cap (0.5634ms)
#   ✔ 8. A denied model is never selected, including as a fallback (0.9167ms)
#   ✔ 9. Notification fires (or doesn't) correctly per user's configured flagging preference (0.7566ms)
#   ✔ 10. Virtual key issuance works per user (0.6274ms)
#   ✔ 11. Budget cap blocks further requests once exceeded (0.6364ms)
#   ✔ 12. Rate limit (RPM/TPM) is enforced (0.3809ms)
#   ✔ 13. Aggregator path successfully completes a request end-to-end (0.1571ms)
#   ✔ 14. Auto-fallback chain triggers correctly on a simulated provider failure (0.6062ms)
# ✔ Model Engine & Governance Layer (Scenarios 1-14) (13.0704ms)
# ℹ tests 14 | pass 14 | fail 0 | cancelled 0 | skipped 0 | todo 0 | duration_ms 707.15

# 2. Run full Playwright test suite (43 scenarios: 12 canvas + 8 chat + 4 connectors + 5 onboarding + 8 panels + 3 rag + 3 thinking)
cd frontend && npx playwright test

# Output:
# Running 43 tests using 1 worker
#   ok  1 [chromium] › tests\canvas.spec.ts:10:3 › 1. Canvas loads without errors (1.6s)
#   ok  2 [chromium] › tests\canvas.spec.ts:26:3 › 2. A node can be dragged onto the canvas (1.6s)
#   ok  3 [chromium] › tests\canvas.spec.ts:49:3 › 3. Two nodes can be connected via a port-to-port wire (1.7s)
#   ok  4 [chromium] › tests\canvas.spec.ts:84:3 › 4. A connection can be removed (1.3s)
#   ok  5 [chromium] › tests\canvas.spec.ts:97:3 › 5. A node can be selected, moved, deleted (1.5s)
#   ok  6 [chromium] › tests\canvas.spec.ts:127:3 › 6. Pan and zoom respond to input (1.6s)
#   ok  7 [chromium] › tests\canvas.spec.ts:164:3 › 7. Opening a node reveals its editable code view (1.7s)
#   ok  8 [chromium] › tests\canvas.spec.ts:195:3 › 8. A flow saves and reloads as valid YAML (1.7s)
#   ok  9 [chromium] › tests\canvas.spec.ts:244:3 › 9. The debugging-bridge panel opens without crashing (1.5s)
#   ok 10 [chromium] › tests\canvas.spec.ts:276:3 › 10. Opening any node's code view shows editable source (1.6s)
#   ok 11 [chromium] › tests\canvas.spec.ts:303:3 › 11. Editing node code updates visual card without breaking connections (1.5s)
#   ok 12 [chromium] › tests\canvas.spec.ts:353:3 › 12. Editing node code does not corrupt YAML export/import cycle (1.9s)
#   ok 13 [chromium] › tests\chat.spec.ts:9:3 › C1. Chat panel opens and closes via button (1.4s)
#   ok 14 [chromium] › tests\chat.spec.ts:31:3 › C2. User sends message -> assistant reply renders with markdown (1.8s)
#   ok 15 [chromium] › tests\chat.spec.ts:51:3 › C3. Retry button re-sends preceding user message (2.4s)
#   ok 16 [chromium] › tests\chat.spec.ts:72:3 › C4. Copy button copies message text to clipboard (2.2s)
#   ok 17 [chromium] › tests\chat.spec.ts:93:3 › C5. Edit button re-populates input bar (2.0s)
#   ok 18 [chromium] › tests\chat.spec.ts:112:3 › C6. Thumbs up/down rating records rating on message (2.1s)
#   ok 19 [chromium] › tests\chat.spec.ts:129:3 › C7. File attach button accepts CSV/file (1.4s)
#   ok 20 [chromium] › tests\chat.spec.ts:149:3 › C8. E2E: message dispatched through model engine with dropdown selection (1.8s)
#   ok 21 [chromium] › tests\connectors.spec.ts:9:3 › K1. Connector category appears in palette with >=3 entries (1.3s)
#   ok 22 [chromium] › tests\connectors.spec.ts:27:3 › K2. Adding piece:slack:send_message node onto canvas works (1.3s)
#   ok 23 [chromium] › tests\connectors.spec.ts:45:3 › K3. Invoking piece:http:request connector executes action (1.5s)
#   ok 24 [chromium] › tests\connectors.spec.ts:71:3 › K4. Connector node code view shows generated TypeScript source (1.5s)
#   ok 25 [chromium] › tests\onboarding.spec.ts:13:3 › OB1. Onboarding overlay appears on first load and can be dismissed without blocking chat (1.5s)
#   ok 26 [chromium] › tests\onboarding.spec.ts:46:3 › OB2. 4-question wizard updates live preview pane in real time (2.6s)
#   ok 27 [chromium] › tests\onboarding.spec.ts:142:3 › OB3. Completing onboarding persists preferences and leaves app fully usable (2.4s)
#   ok 28 [chromium] › tests\onboarding.spec.ts:190:3 › OB4. Skipping onboarding leaves all defaults in place and zero-config chat usable (1.8s)
#   ok 29 [chromium] › tests\onboarding.spec.ts:207:3 › OB5. Re-opening setup guide via navbar button restores interactive wizard (1.5s)
#   ok 30 [chromium] › tests\panels.spec.ts:9:3 › P1. Document editor panel opens via navbar button (1.4s)
#   ok 31 [chromium] › tests\panels.spec.ts:24:3 › P2. TipTap editor accepts typing and toolbar formatting (1.5s)
#   ok 32 [chromium] › tests\panels.spec.ts:46:3 › P3. Export PDF triggers browser print dialog (1.5s)
#   ok 33 [chromium] › tests\panels.spec.ts:65:3 › P4. Export Word triggers .docx file generation (1.8s)
#   ok 34 [chromium] › tests\panels.spec.ts:84:3 › P5. Sandbox panel opens with code editor and preview (1.6s)
#   ok 35 [chromium] › tests\panels.spec.ts:98:3 › P6. Sandbox panel switches templates (1.7s)
#   ok 36 [chromium] › tests\panels.spec.ts:115:3 › P7. Data table panel renders uploaded CSV (1.4s)
#   ok 37 [chromium] › tests\panels.spec.ts:141:3 › P8. Bar chart renders from table data via Chart.js (1.4s)
#   ok 38 [chromium] › tests\rag.spec.ts:9:3 › R1. Document upload -> indexed badge appears (1.9s)
#   ok 39 [chromium] › tests\rag.spec.ts:40:3 › R2. User message with uploaded doc -> citation badges appear in response (1.9s)
#   ok 40 [chromium] › tests\rag.spec.ts:74:3 › R3. Clicking citation badge opens PDF viewer panel (2.3s)
#   ok 41 [chromium] › tests\thinking.spec.ts:13:3 › TK1. Thinking drawer appears above assistant response and is collapsed by default (1.7s)
#   ok 42 [chromium] › tests\thinking.spec.ts:42:3 › TK2. Thinking drawer expands and collapses cleanly upon user toggle (2.0s)
#   ok 43 [chromium] › tests\thinking.spec.ts:70:3 › TK3. Thinking drawer reflects real retrieval data from a test message that used RAG (2.2s)
# 
# 43 passed (1.3m)
```
