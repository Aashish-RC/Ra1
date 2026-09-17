import { test, expect } from '@playwright/test';

test.describe('Chat Surface & ModelEngine Suite (Step 7)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('C1. Chat panel opens and closes via button', async ({ page }) => {
    const chatBtn = page.locator('#chat-panel-button');
    await expect(chatBtn).toBeVisible();

    // Chat panel is initially closed
    await expect(page.locator('#chat-panel')).not.toBeVisible();

    // Open chat panel
    await chatBtn.click();
    const chatPanel = page.locator('#chat-panel');
    await expect(chatPanel).toBeVisible();

    // Verify header, model selector, input bar
    await expect(page.locator('#chat-model-selector')).toBeVisible();
    await expect(page.locator('#chat-textarea')).toBeVisible();
    await expect(page.locator('#chat-send-btn')).toBeVisible();

    // Close chat panel via toggle button
    await chatBtn.click();
    await expect(chatPanel).not.toBeVisible();
  });

  test('C2. User sends a message -> assistant reply renders with markdown', async ({ page }) => {
    await page.locator('#chat-panel-button').click();
    const textarea = page.locator('#chat-textarea');
    const sendBtn = page.locator('#chat-send-btn');

    // Type markdown query
    await textarea.fill('Explain **quantum computing** with a formula');
    await sendBtn.click();

    // User message bubble appears
    const userBubble = page.locator('.message-bubble--user').first();
    await expect(userBubble).toBeVisible();
    await expect(userBubble).toContainText('quantum computing');

    // Assistant response arrives from ModelEngine MockAdapter
    const assistantBubble = page.locator('.message-bubble--assistant').first();
    await expect(assistantBubble).toBeVisible({ timeout: 10000 });
    await expect(assistantBubble).toContainText('OpenRouter Aggregator');
  });

  test('C3. Retry button re-sends the preceding user message', async ({ page }) => {
    await page.locator('#chat-panel-button').click();
    const textarea = page.locator('#chat-textarea');
    const sendBtn = page.locator('#chat-send-btn');

    await textarea.fill('Test retry question');
    await sendBtn.click();

    const assistantBubble = page.locator('.message-bubble--assistant').first();
    await expect(assistantBubble).toBeVisible({ timeout: 10000 });

    // Hover over assistant message to reveal actions
    await assistantBubble.hover();
    const retryBtn = assistantBubble.locator('.msg-action-btn:has-text("Retry")');
    await expect(retryBtn).toBeVisible();
    await retryBtn.click();

    // Verify textarea gets repopulated with previous question
    await expect(textarea).toHaveValue('Test retry question');
  });

  test('C4. Copy button copies message text to clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('#chat-panel-button').click();
    const textarea = page.locator('#chat-textarea');

    await textarea.fill('Clipboard test prompt');
    await page.locator('#chat-send-btn').click();

    const userBubble = page.locator('.message-bubble--user').first();
    await expect(userBubble).toBeVisible();

    await userBubble.hover();
    const copyBtn = userBubble.locator('.msg-action-btn:has-text("Copy")');
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();

    // Verify clipboard content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe('Clipboard test prompt');
  });

  test('C5. Edit button re-populates the input bar', async ({ page }) => {
    await page.locator('#chat-panel-button').click();
    const textarea = page.locator('#chat-textarea');

    await textarea.fill('Original prompt before edit');
    await page.locator('#chat-send-btn').click();

    const userBubble = page.locator('.message-bubble--user').first();
    await expect(userBubble).toBeVisible();

    await userBubble.hover();
    const editBtn = userBubble.locator('.msg-action-btn:has-text("Edit")');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Input bar should now contain the original text for re-editing
    await expect(textarea).toHaveValue('Original prompt before edit');
  });

  test('C6. Thumbs up/down rating records rating on message', async ({ page }) => {
    await page.locator('#chat-panel-button').click();
    await page.locator('#chat-textarea').fill('Give me a response to rate');
    await page.locator('#chat-send-btn').click();

    const assistantBubble = page.locator('.message-bubble--assistant').first();
    await expect(assistantBubble).toBeVisible({ timeout: 10000 });

    await assistantBubble.hover();
    const thumbUp = assistantBubble.locator('.msg-thumbs').first();
    await expect(thumbUp).toBeVisible();
    await thumbUp.click();

    // Verify active rating class
    await expect(thumbUp).toHaveClass(/msg-thumbs--active/);
  });

  test('C7. File attach button accepts CSV/file', async ({ page }) => {
    await page.locator('#chat-panel-button').click();

    // Locate file input
    const fileInput = page.locator('#chat-file-input');
    await expect(fileInput).toBeAttached();

    // Attach sample file via setInputFiles
    await fileInput.setInputFiles({
      name: 'sample.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('id,name,value\n1,Alpha,100\n2,Beta,200'),
    });

    // Verify Data Table panel opens because CSV was attached
    const dataTablePanel = page.locator('#panel-content-table');
    await expect(dataTablePanel).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.data-table')).toBeVisible();
  });

  test('C8. E2E: message dispatched through model engine with dropdown selection', async ({ page }) => {
    await page.locator('#chat-panel-button').click();

    // Change model selector
    const modelSelector = page.locator('#chat-model-selector');
    await modelSelector.selectOption({ label: 'Claude 3.5 Sonnet' });

    // Send question
    await page.locator('#chat-textarea').fill('Calculate 42 * 2');
    await page.locator('#chat-send-btn').click();

    const assistantBubble = page.locator('.message-bubble--assistant').first();
    await expect(assistantBubble).toBeVisible({ timeout: 10000 });

    // Role label or model indicator shows the selected model
    const roleLabel = assistantBubble.locator('.message-role-label');
    await expect(roleLabel).toContainText('claude-3-5-sonnet');
  });
});
