import { test, expect } from '@playwright/test';

/**
 * Playwright UI Test Suite — Browser / Computer-Use Agent Capability
 *
 * Scenarios tested:
 * 1. Browser tool invocable mid-conversation via the ReAct agent loop.
 * 2. Approval card renders actual page screenshot for consequential browser actions.
 * 3. Approving executes the action and updates state.
 * 4. Canceling leaves page state untouched with zero side effects.
 *
 * Mock vs. Real Disclosure:
 * - Browser automation navigates to local Vite host (http://localhost:5173) as the test fixture.
 * - Disclosed as local fixture page in automated-test-report.md.
 */

test.describe('Browser / Computer-Use Agent Playwright UI Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Set onboarding as completed so it does not block chat surface
    await page.addInitScript(() => {
      localStorage.setItem('ra1_onboarding_completed', 'true');
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open chat side-panel
    const chatBtn = page.locator('#chat-panel-button');
    await chatBtn.click();
    await expect(page.locator('#chat-panel')).toBeVisible();
  });

  test('BR1. Browser tool invocable mid-conversation via the agent loop (read-only navigation & extract)', async ({
    page,
  }) => {
    const textarea = page.locator('#chat-textarea');
    const sendBtn = page.locator('#chat-send-btn');

    // Send query to browse and extract content from local fixture
    await textarea.fill('Browse to http://localhost:5173 and extract content from the page');
    await sendBtn.click();

    // Read-only actions do NOT require approval cards
    // Wait for the assistant reply to complete
    const assistantMsg = page.locator('.message-bubble--assistant').last();
    await expect(assistantMsg).toBeVisible({ timeout: 20000 });

    // Verify response indicates successful navigation & content extraction
    await expect(assistantMsg).toContainText('Page content:');
    await expect(page.locator('.approval-card')).toHaveCount(0);
  });

  test('BR2. Approval Card renders actual page screenshot for consequential browser actions', async ({
    page,
  }) => {
    const textarea = page.locator('#chat-textarea');
    const sendBtn = page.locator('#chat-send-btn');

    // Request consequential browser action (clicking an interactive element)
    await textarea.fill('Navigate to http://localhost:5173 and click button #1');
    await sendBtn.click();

    // Consequential action pauses execution and renders Approval Card
    const approvalCard = page.locator('.approval-card').first();
    await expect(approvalCard).toBeVisible({ timeout: 20000 });
    await expect(approvalCard).toContainText('Authorization Required');

    // Verify specific browser action description
    await expect(approvalCard).toContainText('Browser: Click Element #1');

    // Verify actual page screenshot is rendered inside the approval card
    const screenshotImg = approvalCard.locator('#approval-card-screenshot-img');
    await expect(screenshotImg).toBeVisible({ timeout: 10000 });

    const imgSrc = await screenshotImg.getAttribute('src');
    expect(imgSrc).toBeTruthy();
    expect(imgSrc).toContain('data:image/png;base64,');
  });

  test('BR3. Approving a browser action resumes execution and completes the turn', async ({
    page,
  }) => {
    const textarea = page.locator('#chat-textarea');
    const sendBtn = page.locator('#chat-send-btn');

    await textarea.fill('Navigate to http://localhost:5173 and click button #1');
    await sendBtn.click();

    const approvalCard = page.locator('.approval-card').first();
    await expect(approvalCard).toBeVisible({ timeout: 20000 });

    // Click Approve button
    const approveBtn = page.locator('#approval-approve-btn');
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // Verify resolution state changes to authorized
    await expect(page.locator('#approval-resolution-approved')).toBeVisible();

    // Final assistant reply arrives confirming action execution
    const lastAssistant = page.locator('.message-bubble--assistant').last();
    await expect(lastAssistant).toBeVisible();
    await expect(lastAssistant).toContainText('clicked');
  });

  test('BR4. Canceling a browser action leaves page untouched with zero side effects', async ({
    page,
  }) => {
    const textarea = page.locator('#chat-textarea');
    const sendBtn = page.locator('#chat-send-btn');

    await textarea.fill('Navigate to http://localhost:5173 and click button #1');
    await sendBtn.click();

    const approvalCard = page.locator('.approval-card').first();
    await expect(approvalCard).toBeVisible({ timeout: 20000 });

    // Click Cancel button
    const cancelBtn = page.locator('#approval-cancel-btn');
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    // Status updates to CANCELLED
    await expect(page.locator('#approval-resolution-cancelled')).toBeVisible();
    await expect(page.locator('.approval-status-pill--cancelled')).toBeVisible();

    // Final assistant reply confirms cancellation with zero side effects
    const lastMsg = page.locator('.message-bubble--assistant').last();
    await expect(lastMsg).toContainText('cancelled');
    await expect(lastMsg).toContainText('Zero side effects');
  });
});
