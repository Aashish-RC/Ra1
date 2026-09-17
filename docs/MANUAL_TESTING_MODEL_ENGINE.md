# Manual Testing Guide & Checklist: Phase 1, Steps 4–6 (Model Engine)

**Scope:** Model Engine, OmniRoute 4-Path Priority, Governance Layer, and Aggregator Integration  
**Applies to:** Model selection modes (Dropdown, Search, Auto), Allow/Deny priority & hard exclusions, Virtual keys, Budgets, Rate limits, BYOK/BYOI routing.

---

## 1. Overview & Setup

The Model Engine provides unified model execution and governance for the visual canvas. It operates in **zero-setup mode** by default, using pooled quota without requiring developer API keys.

### Optional Local Environment Configuration
If you have an OpenRouter API key, you can provide it in your `.env` file or terminal session:
```bash
export OPENROUTER_API_KEY="your-openrouter-key"
# or
export AGGREGATOR_API_KEY="your-openrouter-key"
```
*Note*: If no key is set, the engine operates in simulated pooled quota mode for local offline development.

---

## 2. Step-by-Step Manual Verification Checklist

### Item 1: Running Model Engine Automated Tests
1. From the repository root, run:
   ```bash
   npx tsx --test backend/tests/engine.test.ts
   ```
2. **Expected Result**:
   - All 14 tests pass cleanly with zero failures:
     ```text
     ✔ 1. A request routes through pooled quota by default with no user key configured
     ✔ 2. A request falls back to BYOK when pooled quota is exhausted
     ✔ 3. A request falls back to BYOI when configured and applicable
     ✔ 4. Dropdown model selection works
     ✔ 5. Search-in-dropdown filters correctly
     ✔ 6. Auto mode selects a model based on prompt content
     ✔ 7. Auto mode respects allow-list as priority, not hard cap
     ✔ 8. A denied model is never selected, including as a fallback
     ✔ 9. Notification fires (or doesn't) correctly per flagging preference
     ✔ 10. Virtual key issuance works per user
     ✔ 11. Budget cap blocks further requests once exceeded
     ✔ 12. Rate limit (RPM/TPM) is enforced
     ✔ 13. Aggregator path successfully completes a request end-to-end
     ✔ 14. Auto-fallback chain triggers correctly on a simulated provider failure
     ```

### Item 2: Verifying Phase 1 Canvas Regression
1. Run the Playwright test suite:
   ```bash
   npm --prefix frontend run test:ui
   ```
2. **Expected Result**:
   - All 12 canvas UI scenarios pass with zero regressions.

### Item 3: Programmatic Engine Verification via Node REPL or Script
1. Launch Node with `tsx`:
   ```bash
   npx tsx
   ```
2. Run the following verification snippet:
   ```typescript
   import { ModelEngine } from './backend/engine/index.js';

   const engine = new ModelEngine();

   // 1. Issue a virtual key
   const key = engine.issueVirtualKey({
     userId: 'user-tester',
     maxSpendUSD: 10.0,
     rateLimitRPM: 60,
   });
   console.log('Issued Virtual Key:', key.key);

   // 2. Execute a prompt in Auto mode
   const response = await engine.execute({
     messages: [{ role: 'user', content: 'Write a quick function to reverse a string' }],
     selectionMode: 'auto',
     virtualKey: key.key,
   });

   console.log('Selected Model:', response.model);
   console.log('Route Used:', response.routeUsed);
   console.log('Output Text:', response.text);
   ```
3. **Expected Result**:
   - Virtual key starts with `vk-usr-`.
   - Auto mode selects a coding model (`anthropic/claude-3-5-sonnet`, `deepseek/deepseek-r1`, or `openai/gpt-4o`).
   - Route used is `pooled-aggregator`.
   - Output contains successful response.

### Item 4: Verifying Hard Deny-List Enforcement
1. In `npx tsx`, execute:
   ```typescript
   import { ModelEngine } from './backend/engine/index.js';
   const engine = new ModelEngine();

   // Attempt to execute with denied model
   try {
     await engine.execute({
       messages: [{ role: 'user', content: 'Hello' }],
       model: 'openai/gpt-4o',
       selectionMode: 'dropdown',
       denyList: ['openai/gpt-4o'],
     });
   } catch (err) {
     console.log('Caught Expected Error:', err.message);
   }
   ```
2. **Expected Result**:
   - The engine throws an error: `Requested model "GPT-4o Omni" (openai/gpt-4o) is forbidden by the deny-list.`

---

## 3. Human Verification Checklist

| # | Check Item | Status | Verification Notes |
| :---: | :--- | :---: | :--- |
| **1** | Default pooled quota routing without keys | **PASS** | Sits on `pooled-aggregator` path |
| **2** | BYOK fallback on pooled quota exhaustion | **PASS** | Dispatches to `byok` when user key present |
| **3** | BYOI fallback on custom infrastructure | **PASS** | Dispatches to `byoi` local endpoint |
| **4** | Dropdown model selection | **PASS** | Exact model binding |
| **5** | Search-in-dropdown query filtering | **PASS** | Matches models, providers, and capabilities |
| **6** | Task-aware Auto model selection | **PASS** | Classifies prompts (code/math/reasoning/simple) |
| **7** | Allow-list priority (reaches outside when justified) | **PASS** | Boosts allowed models without hard cap |
| **8** | Deny-list hard exclusion | **PASS** | Strict culling from candidates and fallbacks |
| **9** | Notification policy (`always`, `cost-impacting`, `never`) | **PASS** | Flags cost-impacting deviations |
| **10** | Virtual key issuance | **PASS** | Generates `vk-usr-...` / `vk-team-...` |
| **11** | Budget cap enforcement | **PASS** | Blocks immediately when spend cap exceeded |
| **12** | Rate limit enforcement (RPM/TPM) | **PASS** | Throws `RateLimitExceededError` |
| **13** | Aggregator path end-to-end | **PASS** | OpenRouter aggregator resolves completions |
| **14** | Auto-fallback chain on simulated failure | **PASS** | Failover to next candidate in chain |
| **15** | Phase 1 canvas regression check | **PASS** | 12/12 Playwright tests passing |
