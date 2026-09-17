import { test, expect } from '@playwright/test';

test.describe('Onboarding Wizard Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to simulate clean first-time load
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('OB1. Onboarding overlay appears on first load and can be dismissed without blocking chat', async ({ page }) => {
    const overlay = page.locator('#onboarding-overlay');
    const modal = page.locator('#onboarding-modal');

    // Onboarding appears on clean first load
    await expect(overlay).toBeVisible();
    await expect(modal).toBeVisible();
    await expect(page.locator('.onboarding-title')).toContainText('Welcome to');

    // Non-blocking overlay: chat panel button is directly actionable without dismissing modal first
    const chatBtn = page.locator('#chat-panel-button');
    await expect(chatBtn).toBeVisible();
    await chatBtn.click();

    // Chat panel opens without being blocked by onboarding overlay
    const chatPanel = page.locator('#chat-panel');
    await expect(chatPanel).toBeVisible();

    // Close chat panel
    await chatBtn.click();
    await expect(chatPanel).not.toBeVisible();

    // Dismiss onboarding via Skip button
    const skipBtn = page.locator('#onboarding-skip-btn');
    await expect(skipBtn).toBeVisible();
    await skipBtn.click();

    // Overlay is dismissed and completed flag is stored in localStorage
    await expect(modal).not.toBeVisible();
    const isCompleted = await page.evaluate(() => localStorage.getItem('ra1_onboarding_completed'));
    expect(isCompleted).toBe('true');
  });

  test('OB2. 4-question wizard updates live preview pane in real time', async ({ page }) => {
    await expect(page.locator('#onboarding-modal')).toBeVisible();

    // -------------------------------------------------------------
    // Question 1: Use Case selection updates workspace mockup
    // -------------------------------------------------------------
    // Default is 'coding' -> mini sandbox preview
    await expect(page.locator('#preview-active-tag')).toHaveText('CODING');
    await expect(page.locator('#preview-mini-sandbox')).toBeVisible();

    // Select 'writing' -> mini document editor preview
    await page.locator('#onboarding-usecase-writing').click();
    await expect(page.locator('#preview-active-tag')).toHaveText('WRITING');
    await expect(page.locator('#preview-mini-editor')).toBeVisible();
    await expect(page.locator('#preview-mini-sandbox')).not.toBeVisible();

    // Select 'data' -> mini data table preview
    await page.locator('#onboarding-usecase-data').click();
    await expect(page.locator('#preview-active-tag')).toHaveText('DATA');
    await expect(page.locator('#preview-mini-table')).toBeVisible();

    // Select 'general' -> mini canvas preview
    await page.locator('#onboarding-usecase-general').click();
    await expect(page.locator('#preview-active-tag')).toHaveText('GENERAL');
    await expect(page.locator('#preview-mini-canvas')).toBeVisible();

    // Re-select 'coding' and advance
    await page.locator('#onboarding-usecase-coding').click();
    await expect(page.locator('#preview-active-tag')).toHaveText('CODING');
    await page.locator('#onboarding-next-btn').click();

    // -------------------------------------------------------------
    // Question 2: Answer Style updates response preview
    // -------------------------------------------------------------
    await expect(page.locator('#onboarding-step-2')).toBeVisible();

    // Select 'concise'
    await page.locator('#onboarding-style-concise').click();
    await expect(page.locator('#preview-style-label')).toHaveText('concise');
    await expect(page.locator('#preview-sample-text')).toContainText('Optimal complexity');

    // Select 'detailed'
    await page.locator('#onboarding-style-detailed').click();
    await expect(page.locator('#preview-style-label')).toHaveText('detailed');
    await expect(page.locator('#preview-sample-text')).toContainText('balances memory overhead');

    // Select 'step_by_step'
    await page.locator('#onboarding-style-step_by_step').click();
    await expect(page.locator('#preview-style-label')).toHaveText('step_by_step');
    await expect(page.locator('#preview-sample-text')).toContainText('1. Initialize data pipeline');

    await page.locator('#onboarding-next-btn').click();

    // -------------------------------------------------------------
    // Question 3: Model-powering preference updates model badge
    // -------------------------------------------------------------
    await expect(page.locator('#onboarding-step-3')).toBeVisible();

    // Default is Auto routing
    await expect(page.locator('#preview-model-badge')).toHaveText('🤖 Auto');

    // Select Claude 3.5 Sonnet
    await page.locator('#onboarding-model-anthropic-claude-3-5-sonnet').click();
    await expect(page.locator('#preview-model-badge')).toHaveText('Claude 3.5 Sonnet');

    // Select GPT-4o
    await page.locator('#onboarding-model-openai-gpt-4o').click();
    await expect(page.locator('#preview-model-badge')).toHaveText('GPT-4o');

    // Return to Auto
    await page.locator('#onboarding-model-auto').click();
    await expect(page.locator('#preview-model-badge')).toHaveText('🤖 Auto');

    await page.locator('#onboarding-next-btn').click();

    // -------------------------------------------------------------
    // Question 4: Apps to connect updates integration chips
    // -------------------------------------------------------------
    await expect(page.locator('#onboarding-step-4')).toBeVisible();

    // Default integrations include RAG
    await expect(page.locator('#preview-app-chip-rag')).toBeVisible();

    // Toggle Slack ON
    await page.locator('#onboarding-app-slack').click();
    await expect(page.locator('#preview-app-chip-slack')).toBeVisible();

    // Toggle HTTP ON
    await page.locator('#onboarding-app-http').click();
    await expect(page.locator('#preview-app-chip-http')).toBeVisible();

    // Toggle Slack OFF
    await page.locator('#onboarding-app-slack').click();
    await expect(page.locator('#preview-app-chip-slack')).not.toBeVisible();
  });

  test('OB3. Completing onboarding persists preferences and leaves app fully usable', async ({ page }) => {
    await expect(page.locator('#onboarding-modal')).toBeVisible();

    // Step 1 -> Next
    await page.locator('#onboarding-usecase-coding').click();
    await page.locator('#onboarding-next-btn').click();

    // Step 2 -> Next
    await page.locator('#onboarding-style-concise').click();
    await page.locator('#onboarding-next-btn').click();

    // Step 3 -> Next
    await page.locator('#onboarding-model-anthropic-claude-3-5-sonnet').click();
    await page.locator('#onboarding-next-btn').click();

    // Step 4 -> Launch Workspace
    const finishBtn = page.locator('#onboarding-finish-btn');
    await expect(finishBtn).toHaveText('Launch Workspace ✨');
    await finishBtn.click();

    // Modal closes
    await expect(page.locator('#onboarding-modal')).not.toBeVisible();

    // Preferences stored in localStorage
    const storedPrefs = await page.evaluate(() => localStorage.getItem('ra1_user_preferences'));
    expect(storedPrefs).not.toBeNull();
    const parsed = JSON.parse(storedPrefs!);
    expect(parsed.useCase).toBe('coding');
    expect(parsed.answerStyle).toBe('concise');

    // Zero-block check: Open chat and send message
    await page.locator('#chat-panel-button').click();
    await expect(page.locator('#chat-panel')).toBeVisible();
    await page.locator('#chat-textarea').fill('Testing workspace after onboarding');
    await page.locator('#chat-send-btn').click();

    // Assistant response arrives with thought drawer
    const assistantMsg = page.locator('.message-bubble--assistant').first();
    await expect(assistantMsg).toBeVisible({ timeout: 10000 });
    await expect(assistantMsg.locator('.thinking-drawer')).toBeVisible();

    // Canvas palette is actionable
    const nodeCountBefore = await page.locator('.visual-node').count();
    await page.locator('#palette-item-chat').click();
    const nodeCountAfter = await page.locator('.visual-node').count();
    expect(nodeCountAfter).toBeGreaterThan(nodeCountBefore);
  });

  test('OB4. Skipping onboarding leaves all defaults in place and zero-config chat usable', async ({ page }) => {
    await expect(page.locator('#onboarding-modal')).toBeVisible();

    // Click Skip Setup
    await page.locator('#onboarding-skip-btn').click();
    await expect(page.locator('#onboarding-modal')).not.toBeVisible();

    // Chat works immediately with zero configuration
    await page.locator('#chat-panel-button').click();
    await page.locator('#chat-textarea').fill('Zero-config chat verification');
    await page.locator('#chat-send-btn').click();

    const assistantMsg = page.locator('.message-bubble--assistant').first();
    await expect(assistantMsg).toBeVisible({ timeout: 10000 });
    await expect(assistantMsg.locator('.message-content')).toBeVisible();
  });

  test('OB5. Re-opening setup guide via navbar button restores interactive wizard', async ({ page }) => {
    // Dismiss initially
    await page.locator('#onboarding-skip-btn').click();
    await expect(page.locator('#onboarding-modal')).not.toBeVisible();

    // Reopen via navbar button
    const openBtn = page.locator('#open-onboarding-btn');
    await expect(openBtn).toBeVisible();
    await openBtn.click();

    // Modal re-opens and can be interacted with
    await expect(page.locator('#onboarding-modal')).toBeVisible();
    await page.locator('#onboarding-usecase-writing').click();
    await expect(page.locator('#preview-mini-editor')).toBeVisible();

    // Close via close button (✕)
    await page.locator('#onboarding-close-btn').click();
    await expect(page.locator('#onboarding-modal')).not.toBeVisible();
  });
});
