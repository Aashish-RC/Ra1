import { test, expect } from '@playwright/test';

test.describe('ActivePieces Connectors Suite (Step 12)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('K1. Connector category appears in node palette with >=3 entries', async ({ page }) => {
    const palette = page.locator('#node-palette');
    await expect(palette).toBeVisible();

    // Verify Connectors category header exists
    const connectorCatHeader = page.locator('.category-header:has-text("Connectors")');
    await expect(connectorCatHeader).toBeVisible();

    // Verify Slack, HTTP, and OpenAI pieces appear
    const slackItem = page.locator('[id="palette-item-piece:slack:send_message"]');
    const httpItem = page.locator('[id="palette-item-piece:http:request"]');
    const openaiItem = page.locator('[id="palette-item-piece:openai:chat_completion"]');

    await expect(slackItem).toBeVisible();
    await expect(httpItem).toBeVisible();
    await expect(openaiItem).toBeVisible();
  });

  test('K2. Adding piece:slack:send_message node onto canvas works', async ({ page }) => {
    const initialCount = await page.locator('.visual-node').count();

    const slackItem = page.locator('[id="palette-item-piece:slack:send_message"]');
    await expect(slackItem).toBeVisible();

    // Click to add to canvas
    await slackItem.click();

    // Verify node count increased
    await expect(page.locator('.visual-node')).toHaveCount(initialCount + 1);

    // Verify node card renders on canvas
    const slackNode = page.locator('.visual-node[data-node-type="piece:slack:send_message"]');
    await expect(slackNode).toBeVisible();
    await expect(slackNode.locator('.node-title')).toContainText('Slack');
  });

  test('K3. Invoking piece:http:request connector executes action', async () => {
    const { httpPiece } = await import('../../backend/connectors/pieces/http.js');
    const action = httpPiece.actions.find((a) => a.actionId === 'request');
    expect(action).toBeDefined();

    // Stub fetch to simulate response without making external network call
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ success: true, message: 'pong' }), {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
        });

      const res = (await action!.run({
        propsValue: { url: 'https://api.example.com/ping', method: 'GET' },
      })) as any;

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, message: 'pong' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('K4. Connector node code view shows generated TypeScript source', async ({ page }) => {
    // Add HTTP connector to canvas
    const httpItem = page.locator('[id="palette-item-piece:http:request"]');
    await httpItem.click();

    const httpNode = page.locator('.visual-node[data-node-type="piece:http:request"]');
    await expect(httpNode).toBeVisible();

    // Open code editor for this connector node
    const codeBtn = httpNode.locator('.edit-code-btn');
    await expect(codeBtn).toBeVisible();
    await codeBtn.click();

    const modal = page.locator('#code-editor-modal');
    await expect(modal).toBeVisible();

    const textarea = page.locator('#code-editor-textarea');
    await expect(textarea).toBeVisible();

    const code = await textarea.inputValue();
    expect(code).toContain('@type piece:http:request');
    expect(code).toContain('export const NodeDefinition');
    expect(code).toContain('async process');

    // Close modal
    await page.locator('#code-editor-close').click();
    await expect(modal).not.toBeVisible();
  });
});
