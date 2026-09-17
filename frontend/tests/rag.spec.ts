import { test, expect } from '@playwright/test';

test.describe('RAG Pipeline Suite (Step 8)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('R1. Document upload -> indexed badge appears', async ({ page }) => {
    // Open chat panel
    await page.locator('#chat-panel-button').click();
    await expect(page.locator('#chat-panel')).toBeVisible();

    // Open RAG upload section
    const ragToggle = page.locator('#chat-rag-toggle');
    await expect(ragToggle).toBeVisible();
    await ragToggle.click();

    const dropZone = page.locator('#rag-drop-zone');
    await expect(dropZone).toBeVisible();

    // Upload sample text file
    const fileInput = page.locator('#rag-file-input');
    await fileInput.setInputFiles({
      name: 'annual_report.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(
        'Annual Report 2026: Revenue grew 40% year-over-year reaching $150M. Operating margins improved to 28% due to AI automation efficiency.'
      ),
    });

    // Verify indexed badge appears
    const indexedList = page.locator('#rag-indexed-list');
    await expect(indexedList).toBeVisible({ timeout: 5000 });
    const badge = indexedList.locator('.rag-indexed-badge').first();
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('annual_report.txt');
  });

  test('R2. User message with uploaded doc -> citation badges appear in response', async ({ page }) => {
    await page.locator('#chat-panel-button').click();
    await page.locator('#chat-rag-toggle').click();

    // Upload document
    const fileInput = page.locator('#rag-file-input');
    await fileInput.setInputFiles({
      name: 'financial_summary.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(
        'Q3 Summary: Total active enterprise customers reached 4,200. Net retention rate stood at 122%.'
      ),
    });

    await expect(page.locator('.rag-indexed-badge')).toBeVisible({ timeout: 5000 });

    // Ask question related to uploaded document
    const textarea = page.locator('#chat-textarea');
    await textarea.fill('What was the net retention rate in Q3?');
    await page.locator('#chat-send-btn').click();

    // Assistant response arrives
    const assistantBubble = page.locator('.message-bubble--assistant').first();
    await expect(assistantBubble).toBeVisible({ timeout: 10000 });

    // Citation badge list should be rendered below the assistant message
    const citationList = assistantBubble.locator('.citation-list');
    await expect(citationList).toBeVisible();

    const citationBadge = citationList.locator('.citation-badge').first();
    await expect(citationBadge).toBeVisible();
    await expect(citationBadge).toContainText('[1]');
  });

  test('R3. Clicking citation badge opens PDF viewer panel', async ({ page }) => {
    await page.locator('#chat-panel-button').click();
    await page.locator('#chat-rag-toggle').click();

    // Upload document
    const fileInput = page.locator('#rag-file-input');
    await fileInput.setInputFiles({
      name: 'research_paper.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(
        'Transformer models apply self-attention mechanisms to capture global dependencies between input tokens.'
      ),
    });

    await expect(page.locator('.rag-indexed-badge')).toBeVisible({ timeout: 5000 });

    // Ask question
    await page.locator('#chat-textarea').fill('Explain self-attention');
    await page.locator('#chat-send-btn').click();

    const assistantBubble = page.locator('.message-bubble--assistant').first();
    await expect(assistantBubble).toBeVisible({ timeout: 10000 });

    const citationBadge = assistantBubble.locator('.citation-badge').first();
    await expect(citationBadge).toBeVisible();

    // Click citation badge
    await citationBadge.click();

    // PDF viewer panel opens
    const pdfPanel = page.locator('#panel-content-pdf');
    await expect(pdfPanel).toBeVisible({ timeout: 5000 });

    // Tab for PDF is active in panel manager
    const pdfTab = page.locator('#panel-tab-pdf');
    await expect(pdfTab).toHaveClass(/panel-tab--active/);
  });
});
