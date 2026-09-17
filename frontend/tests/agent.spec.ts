import { test, expect } from '@playwright/test';

test.describe('ReAct Agent Loop & Approval Card Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Set onboarding as completed so overlay does not obscure chat interactions
    await page.addInitScript(() => {
      localStorage.setItem('ra1_onboarding_completed', 'true');
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open chat panel
    const chatBtn = page.locator('#chat-panel-button');
    await chatBtn.click();
    await expect(page.locator('#chat-panel')).toBeVisible();
  });

  test('AG1. ReAct loop: completes multi-step task (search then email) with approval', async ({ page }) => {
    const textarea = page.locator('#chat-textarea');
    const sendBtn = page.locator('#chat-send-btn');

    // Send multi-step query requiring search and email
    await textarea.fill('Search the web for MCP and send an email to alex@example.com with the summary');
    await sendBtn.click();

    // 1. Consequential action halts execution and surfaces Approval Card
    const approvalCard = page.locator('.approval-card').first();
    await expect(approvalCard).toBeVisible({ timeout: 10000 });
    await expect(approvalCard).toContainText('Authorization Required');
    await expect(approvalCard).toContainText('Email: Send Email');
    await expect(approvalCard).toContainText('alex@example.com');

    // Verify approve and cancel buttons are visible
    const approveBtn = page.locator('#approval-approve-btn');
    const cancelBtn = page.locator('#approval-cancel-btn');
    await expect(approveBtn).toBeVisible();
    await expect(cancelBtn).toBeVisible();

    // 2. Click Approve to resume execution
    await approveBtn.click();

    // 3. Approval resolution updates to authorized
    await expect(page.locator('#approval-resolution-approved')).toBeVisible();

    // 4. Final assistant confirmation arrives
    const lastAssistant = page.locator('.message-bubble--assistant').last();
    await expect(lastAssistant).toBeVisible();
    await expect(lastAssistant).toContainText('alex@example.com');
  });

  test('AG2. "Ask Permission First" Approval Card genuinely halts execution until user responds', async ({ page }) => {
    const textarea = page.locator('#chat-textarea');
    const sendBtn = page.locator('#chat-send-btn');

    // Request consequential action
    await textarea.fill('Please send an email to director@board.org with the financial review');
    await sendBtn.click();

    // Approval card appears
    const approvalCard = page.locator('.approval-card').first();
    await expect(approvalCard).toBeVisible({ timeout: 10000 });
    await expect(approvalCard).toContainText('Authorization Required');

    // Verify execution is halted: no completion reply yet while approval is pending
    const statusPill = approvalCard.locator('.approval-status-pill--pending');
    await expect(statusPill).toHaveText('PENDING');

    // Wait 500ms to confirm loop genuinely halts and does not auto-resolve
    await page.waitForTimeout(500);
    await expect(statusPill).toBeVisible();
    await expect(page.locator('#approval-approve-btn')).toBeVisible();
  });

  test('AG3. Approval Card Cancel cleanly aborts action with ZERO side effects', async ({ page }) => {
    const textarea = page.locator('#chat-textarea');
    const sendBtn = page.locator('#chat-send-btn');

    // Request consequential action
    await textarea.fill('Send an email to competitor@market.com with trade secrets');
    await sendBtn.click();

    // Wait for approval card
    const approvalCard = page.locator('.approval-card').first();
    await expect(approvalCard).toBeVisible({ timeout: 10000 });

    // Click Cancel button
    const cancelBtn = page.locator('#approval-cancel-btn');
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    // Status updates to CANCELLED
    await expect(page.locator('#approval-resolution-cancelled')).toBeVisible();
    await expect(page.locator('.approval-status-pill--cancelled')).toBeVisible();

    // Final assistant reply reflects clean abortion with zero side effects
    const lastMsg = page.locator('.message-bubble--assistant').last();
    await expect(lastMsg).toContainText('cancelled');
    await expect(lastMsg).toContainText('Zero side effects');
  });

  test('AG4. Calendar connector: create_event surfaces approval and schedule confirms', async ({ page }) => {
    const textarea = page.locator('#chat-textarea');
    const sendBtn = page.locator('#chat-send-btn');

    await textarea.fill('Schedule a calendar meeting for Sprint Planning on 2026-09-18');
    await sendBtn.click();

    // Approval card for calendar event creation
    const approvalCard = page.locator('.approval-card').first();
    await expect(approvalCard).toBeVisible({ timeout: 10000 });
    await expect(approvalCard).toContainText('Calendar: Create Calendar Event');

    // Approve the event
    await page.locator('#approval-approve-btn').click();
    await expect(page.locator('#approval-resolution-approved')).toBeVisible();

    // Confirmation message arrives
    const lastMsg = page.locator('.message-bubble--assistant').last();
    await expect(lastMsg).toContainText('Sprint Planning');
  });

  test('AG5. MCP tool invocation mid-conversation (read_file) displays in Thinking drawer', async ({ page }) => {
    const textarea = page.locator('#chat-textarea');
    const sendBtn = page.locator('#chat-send-btn');

    // Query file via MCP
    await textarea.fill('Please read file src/index.ts using MCP');
    await sendBtn.click();

    // Assistant response arrives
    const assistantBubble = page.locator('.message-bubble--assistant').first();
    await expect(assistantBubble).toBeVisible({ timeout: 10000 });
    await expect(assistantBubble).toContainText('src/index.ts');

    // Expand Thinking drawer to inspect ReAct execution trace
    const toggleBtn = assistantBubble.locator('.thinking-drawer-toggle');
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    // Verify ReAct Execution Trace section appears with MCP tool call
    const traceSection = page.locator('.thinking-step--agent');
    await expect(traceSection).toBeVisible();
    await expect(traceSection).toContainText('ReAct Execution Trace');
    await expect(traceSection).toContainText('mcp:filesystem:read_file');
  });

  test('AG6. Native Web Search connector executes and returns results directly', async ({ page }) => {
    const textarea = page.locator('#chat-textarea');
    const sendBtn = page.locator('#chat-send-btn');

    // Search query
    await textarea.fill('Search the web for Model Context Protocol introduction');
    await sendBtn.click();

    // Assistant response arrives with search observation
    const assistantBubble = page.locator('.message-bubble--assistant').first();
    await expect(assistantBubble).toBeVisible({ timeout: 10000 });

    // Open thinking drawer and verify web_search action in ReAct trace
    const toggleBtn = assistantBubble.locator('.thinking-drawer-toggle');
    await toggleBtn.click();

    const traceSection = page.locator('.thinking-step--agent');
    await expect(traceSection).toBeVisible();
    await expect(traceSection).toContainText('piece:search:web_search');
  });
});
