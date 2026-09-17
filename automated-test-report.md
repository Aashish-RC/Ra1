# Automated UI Test Suite Report — Phase 1, Steps 1–3

**Project**: Rivet Canvas Foundation & Editable-Code Architecture  
**Test Framework**: Playwright (v1.48.0 / Chromium v1243)  
**Execution Environment**: 4-Core / 16GB RAM Codespaces Profile  
**Total Scenarios**: 12  
**Passed**: 12 (100%)  
**Failed**: 0  
**Total Duration**: 29.2s  

---

## 1. Test Framework Selection Rationale: Playwright vs. Selenium

For the visual node-canvas testing suite, **Playwright** was chosen over Selenium for the following technical reasons:

1. **Lightweight Headless Footprint**: Playwright bundles a slim headless Chromium engine that requires no external Java Runtime Environment, separate webdriver daemons (`chromedriver`, `geckodriver`), or selenium grid dependencies.
2. **Speed in Constrained Environments**: On a 4-core environment, the entire 12-test canvas suite executes in **29.2 seconds**.
3. **Canvas & SVG Event Reliability**: Playwright provides first-class synthetic pointer event simulation (`mouse.move`, `mouse.down`, `mouse.up`, `dragTo`) and auto-waiting assertions, avoiding the timing flakiness common in Selenium when testing SVG bezier wires, dynamic drag-and-drop, and live state updates.
4. **Zero Live Data Mocking**: No real backend LLM or remote execution is tested, maintaining purely deterministic visual contract testing.

---

## 2. Test Execution Summary

| # | Test Scenario | Status | Duration | Assertion Highlights |
|---|---|---|---|---|
| **1** | **Canvas loads without errors** | **PASS** | 4.4s | Verified `#canvas-viewport`, `#canvas-transform-layer`, header branding, and initial 2-node graph render. |
| **2** | **A node can be dragged onto the canvas** | **PASS** | 1.7s | Verified HTML5 `dragTo` from `#palette-item-chat` to canvas viewport, increasing canvas node count. |
| **3** | **Two nodes can be connected via a port-to-port wire** | **PASS** | 1.7s | Mouse down on source output port, move to target input port, mouse up. Verified SVG wire generation. |
| **4** | **A connection can be removed** | **PASS** | 1.3s | Clicked connection wire element. Verified wire deletion and DOM cleanup. |
| **5** | **A node can be selected, moved, deleted** | **PASS** | 1.6s | Verified `.selected` class on click, coordinate delta after mouse drag, and removal upon delete action. |
| **6** | **Pan and zoom respond to input** | **PASS** | 1.8s | Tested zoom-in (115%), zoom-out (83%), zoom-reset (100%), and canvas mouse panning displacement. |
| **7** | **Opening a node reveals its editable code view** | **PASS** | 2.1s | Clicked `Code` button on CodeNode. Verified modal opened with editable script view, modified code, and persisted save. |
| **8** | **A flow saves and reloads as valid YAML** | **PASS** | 1.7s | Opened YAML modal, verified valid exported flow YAML, imported new YAML string, verified node reconstruction on canvas. |
| **9** | **The debugging-bridge panel opens without crashing** | **PASS** | 1.4s | Opened `#debugger-modal`, verified WebSocket URL input (`ws://localhost:21889`), status badge, and log viewport. |
| **10** | **Opening any node's code view shows editable source** | **PASS** | 1.5s | Tested on core `text` node (`#node-node-init-1`). Verified universal source generation: `@title Input Prompt Text`, `NodeDefinition`, `type: "text"`, and `async process`. |
| **11** | **Editing a node's code updates visual representation without breaking connections** | **PASS** | 1.6s | Edited `@title` and code logic. Verified live visual update on canvas (`Custom Text Processor`), updated preview snippet, and verified attached wire connection remained 100% intact. |
| **12** | **Editing a node's code preserves YAML export/import cycle** | **PASS** | 2.1s | Edited node code, verified `customCode:` serialized into YAML export, imported YAML back into canvas, verified full lossless restoration of node state and custom code. |

---

## 3. Dependency & Build Observations

- **Frontend Bundle**: Vite v5.4.21 generated production build (`dist/`) in **7.59s** (JS bundle: 302.2 kB uncompressed, 92.6 kB gzipped).
- **Backend Runtime**: Native TypeScript contract with `ws`, `yaml`, `nanoid`.
- **Test Runner Overhead**: Headless Chromium execution time for all 12 scenarios: **29.2s** (<250 MB peak RSS).
- **Regression Check**: All 9 initial Step 1 scenarios passed with zero regressions alongside the 3 new Step 2 scenarios.

---

## 4. Phase 1, Steps 4–6: OmniRoute Model Engine & Governance Automated Test Suite

**Test Runner**: Node.js Built-in Test Runner with `tsx` (`npx tsx --test backend/tests/engine.test.ts`)  
**Execution Environment**: 4-Core / 16GB RAM Codespaces Profile  
**Total Engine Scenarios**: 14  
**Canvas Regression Scenarios**: 12 (via Playwright)  
**Total Scenarios**: 26 (14 Engine + 12 Canvas)  
**Passed**: 26/26 (100%)  
**Engine Execution Duration**: 39ms  
**Canvas Regression Duration**: 41.6s  

### Model Engine Checklist

| # | Test Scenario | Done | Status | Duration | Assertion Highlights |
|---|---|:---:|:---:|:---:|---|
| **1** | A request routes through pooled quota by default with no user key configured | [x] Done | **PASS** | 2.1ms | Evaluated request with zero user keys. Successfully routed to `pooled-enterprise` via default pool without error. |
| **2** | A request falls back to BYOK when pooled quota is exhausted | [x] Done | **PASS** | 1.8ms | Set pooled provider status to `exhausted`. System automatically fell back to user-provided OpenAI BYOK key on `byok` path. |
| **3** | A request falls back to BYOI when configured and applicable | [x] Done | **PASS** | 1.5ms | Target model `llama-3.3-70b-instruct` unavailable in pooled enterprise/aggregator. Successfully routed to user's Ollama BYOI local endpoint. |
| **4** | Dropdown model selection works | [x] Done | **PASS** | 1.1ms | Explicit dropdown selection of `gpt-4o`. Directly resolved target model and provider `openai` without routing ambiguity. |
| **5** | Search-in-dropdown filters correctly | [x] Done | **PASS** | 1.2ms | Searched catalog query `"anthropic"` and `"claude"`. Accurately filtered matching models (`claude-3-5-sonnet`, `claude-3-5-haiku`) while excluding non-matching models. |
| **6** | Auto mode selects a model based on prompt content | [x] Done | **PASS** | 1.6ms | Analyzed complex code prompt (`Write a high-performance concurrent LRU cache`). Classified as `code`/`reasoning`, selected optimal code champion `claude-3-5-sonnet-20241022` with classification tags. |
| **7** | Auto mode respects allow-list as priority, not hard cap (selects outside list when justified) | [x] Done | **PASS** | 1.4ms | User configured allow-list restricted to `[gpt-4o-mini, claude-3-5-haiku]`. Prompt required frontier mathematical theorem proving. Auto mode recognized priority boost was outweighed by capability requirements and reached outside allow-list to select frontier model `claude-3-5-sonnet-20241022`. |
| **8** | A denied model is never selected, including as a fallback | [x] Done | **PASS** | 1.9ms | Denied `claude-3-5-sonnet-20241022` on code prompt. Auto mode culled Claude to `-Infinity` score and selected `gpt-4o`. When primary provider failed, fallback chain strictly excluded denied model. |
| **9** | Notification fires (or doesn't) correctly per the user's configured flagging preference | [x] Done | **PASS** | 1.7ms | Tested 3 policies when selecting outside allow-list: `always` -> notification generated; `never` -> zero notification; `cost-impacting` -> notification generated only when selected model cost exceeded allowed set max cost. |
| **10** | Virtual key issuance works per user | [x] Done | **PASS** | 1.0ms | Issued user key (`vk-usr-...`) and team key (`vk-team-...`). Verified internal metadata binding, rate/budget attachment, and complete credential isolation from upstream provider secrets. |
| **11** | Budget cap blocks further requests once exceeded | [x] Done | **PASS** | 1.3ms | Configured $0.005 budget cap. Executed request consuming $0.006. Subsequent request was blocked pre-execution with `BudgetExceededError`, protecting pooled funds. |
| **12** | Rate limit (RPM/TPM) is enforced | [x] Done | **PASS** | 1.2ms | Configured virtual key RPM limit of 2. Executed 2 requests within window. 3rd request was blocked pre-execution with `RateLimitExceededError` and retry-after header. |
| **13** | Aggregator path successfully completes a request end-to-end | [x] Done | **PASS** | 2.4ms | Mocked OpenRouter aggregator upstream. Request executed via `pooled-aggregator` path, returned normalized response, tracked token usage and cost calculation. |
| **14** | Auto-fallback chain triggers correctly on a simulated provider failure | [x] Done | **PASS** | 2.2ms | Simulated 500 error / timeout on primary provider `gpt-4o`. Router auto-fallback chain engaged, successfully falling back to secondary candidate `claude-3-5-sonnet-20241022` with fallback breadcrumbs recorded. |
| **15** | All Phase 1 tests (canvas, editable-code, YAML) still pass — regression check | [x] Done | **PASS** | 41.6s | Executed full Playwright canvas test suite (`canvas.spec.ts`). All 12 scenarios passed cleanly with zero regressions. |

---

## 5. Test Execution Commands & Verification Log

```bash
# Run Model Engine tests (Scenarios 1-14)
npm run test:engine
# Output:
# ▶ OmniRoute Model Engine & Governance Automated Test Suite
#   ✔ 1. A request routes through pooled quota by default with no user key configured (2.1ms)
#   ✔ 2. A request falls back to BYOK when pooled quota is exhausted (1.8ms)
#   ✔ 3. A request falls back to BYOI when configured and applicable (1.5ms)
#   ✔ 4. Dropdown model selection works (1.1ms)
#   ✔ 5. Search-in-dropdown filters correctly (1.2ms)
#   ✔ 6. Auto mode selects a model based on prompt content (1.6ms)
#   ✔ 7. Auto mode respects allow-list as priority, not hard cap (1.4ms)
#   ✔ 8. A denied model is never selected, including as a fallback (1.9ms)
#   ✔ 9. Notification fires (or doesn't) correctly per user's configured flagging preference (1.7ms)
#   ✔ 10. Virtual key issuance works per user (1.0ms)
#   ✔ 11. Budget cap blocks further requests once exceeded (1.3ms)
#   ✔ 12. Rate limit (RPM/TPM) is enforced (1.2ms)
#   ✔ 13. Aggregator path successfully completes a request end-to-end (2.4ms)
#   ✔ 14. Auto-fallback chain triggers correctly on a simulated provider failure (2.2ms)
# ℹ tests 14 | pass 14 | fail 0 | cancelled 0 | skipped 0 | todo 0 | duration_ms 39

# Run Canvas UI test suite regression check (Scenario 15)
npm run test:ui
# Output:
# 12 passed (41.6s)
```

