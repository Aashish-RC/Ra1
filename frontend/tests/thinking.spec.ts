import { test, expect } from '@playwright/test';

test.describe('AI Thinking Drawer Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Dismiss onboarding so chat interactions are completely clear
    await page.addInitScript(() => {
      localStorage.setItem('ra1_onboarding_completed', 'true');
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('TK1. Thinking drawer appears above assistant response and is collapsed by default', async ({ page }) => {
    // Open chat panel
    await page.locator('#chat-panel-button').click();
    await expect(page.locator('#chat-panel')).toBeVisible();

    // Send a standard direct message
    const textarea = page.locator('#chat-textarea');
    await textarea.fill('Explain the difference between functional and imperative programming');
    await page.locator('#chat-send-btn').click();

    // Assistant response arrives
    const assistantMsg = page.locator('.message-bubble--assistant').first();
    await expect(assistantMsg).toBeVisible({ timeout: 10000 });

    // Thinking drawer element exists above .message-content
    const thinkingDrawer = assistantMsg.locator('.thinking-drawer');
    await expect(thinkingDrawer).toBeVisible();

    // Verify toggle button is labeled "Thinking..." and shows collapsed state
    const toggleBtn = thinkingDrawer.locator('.thinking-drawer-toggle');
    await expect(toggleBtn).toBeVisible();
    await expect(toggleBtn).toContainText('Thinking');
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

    // Drawer content is collapsed by default
    const content = thinkingDrawer.locator('.thinking-drawer-content');
    await expect(content).not.toBeVisible();
  });

  test('TK2. Thinking drawer expands and collapses cleanly upon user toggle', async ({ page }) => {
    await page.locator('#chat-panel-button').click();
    await page.locator('#chat-textarea').fill('Summarize graph theory concepts');
    await page.locator('#chat-send-btn').click();

    const assistantMsg = page.locator('.message-bubble--assistant').first();
    await expect(assistantMsg).toBeVisible({ timeout: 10000 });

    const thinkingDrawer = assistantMsg.locator('.thinking-drawer');
    const toggleBtn = thinkingDrawer.locator('.thinking-drawer-toggle');
    const content = thinkingDrawer.locator('.thinking-drawer-content');

    // Expand drawer
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    await expect(content).toBeVisible();

    // Verify displayed execution steps: Retrieval, Routing, Synthesis
    await expect(content.locator('.thinking-step-title').nth(0)).toHaveText('Knowledge Retrieval');
    await expect(content.locator('.thinking-step-title').nth(1)).toHaveText('Model Selection & Routing');
    await expect(content.locator('.thinking-step-title').nth(2)).toHaveText('Response Synthesis');

    // Collapse drawer
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(content).not.toBeVisible();
  });

  test('TK3. Thinking drawer reflects real retrieval data from a test message that used RAG', async ({ page }) => {
    await page.locator('#chat-panel-button').click();

    // Open RAG file ingestion drawer
    await page.locator('#chat-rag-toggle').click();
    const fileInput = page.locator('#rag-file-input');
    await fileInput.setInputFiles({
      name: 'system_spec.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(
        'System Specification: Rivet Engine supports up to 10,000 nodes per flow with sub-5ms execution latency across worker clusters.'
      ),
    });

    // Wait for document to be indexed
    await expect(page.locator('.rag-indexed-badge')).toBeVisible({ timeout: 5000 });

    // Query asking about the indexed document content
    const textarea = page.locator('#chat-textarea');
    await textarea.fill('What is the execution latency and node capacity of the Rivet Engine?');
    await page.locator('#chat-send-btn').click();

    // Wait for assistant response with citations
    const assistantMsg = page.locator('.message-bubble--assistant').first();
    await expect(assistantMsg).toBeVisible({ timeout: 10000 });
    await expect(assistantMsg.locator('.citation-badge').first()).toBeVisible({ timeout: 10000 });

    const thinkingDrawer = assistantMsg.locator('.thinking-drawer');
    const toggleBtn = thinkingDrawer.locator('.thinking-drawer-toggle');

    // Toggle button shows RAG badge
    await expect(toggleBtn.locator('.thinking-badge')).toContainText('RAG');

    // Expand drawer to inspect trace
    await toggleBtn.click();
    const content = thinkingDrawer.locator('.thinking-drawer-content');
    await expect(content).toBeVisible();

    // Verify Step 1: Knowledge Retrieval shows real source file and chunks
    const retrievalStep = content.locator('.thinking-step').first();
    await expect(retrievalStep).toContainText('Chunks Retrieved');
    await expect(retrievalStep).toContainText('system_spec.txt');
    await expect(retrievalStep).toContainText('sub-5ms execution latency');

    // Verify Step 2: Model Selection shows routing and quota approval
    const routingStep = content.locator('.thinking-step').nth(1);
    await expect(routingStep).toContainText('Model Selection & Routing');
    await expect(routingStep).toContainText('Quota Approved');
  });
});
