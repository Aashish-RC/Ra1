import { test, expect } from '@playwright/test';

test.describe('Authentication & Access Control UI Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start clean
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('ra1_onboarding_completed', 'true'); // Skip onboarding for auth tests
    });
    await page.reload();
    await page.waitForSelector('.top-navbar');
  });

  test('AU1. Sign In button opens AuthModal, and user can toggle tabs', async ({ page }) => {
    const signInBtn = page.locator('#open-auth-btn');
    await expect(signInBtn).toBeVisible();
    await signInBtn.click();

    // Modal dialog is displayed
    const modalDialog = page.locator('.modal-dialog');
    await expect(modalDialog).toBeVisible();
    await expect(page.locator('.modal-title')).toContainText('Sign In to Workspace');

    // Toggle to Create Account
    const createAccountTab = page.locator('#tab-signup');
    await createAccountTab.click();
    await expect(page.locator('#auth-name-input')).toBeVisible();

    // Toggle back to Sign In
    const signInTab = page.locator('#tab-login');
    await signInTab.click();
    await expect(page.locator('#auth-name-input')).not.toBeVisible();

    // Close modal
    await page.locator('#close-auth-modal-btn').click();
    await expect(modalDialog).not.toBeVisible();
  });

  test('AU2. User signup creates account and navbar reflects user identity and avatar', async ({ page }) => {
    await page.locator('#open-auth-btn').click();
    await page.locator('#tab-signup').click();

    await page.locator('#auth-name-input').fill('Dr. Clara Oswald');
    await page.locator('#auth-email-input').fill('clara@tardis.org');
    await page.locator('#auth-password-input').fill('security_pwd_123');

    await page.locator('#auth-submit-btn').click();

    // Modal closes upon successful auth
    await expect(page.locator('.modal-dialog')).not.toBeVisible();

    // Navbar now shows the authenticated user chip
    const userChip = page.locator('#user-profile-chip');
    await expect(userChip).toBeVisible();
    await expect(userChip).toContainText('Dr. Clara Oswald');
  });

  test('AU3. User profile dialog displays User ID, Team ID, Governance Virtual Key, and Sign Out works', async ({ page }) => {
    // Pre-seed an authenticated user
    await page.evaluate(() => {
      const user = {
        id: 'usr_clara_101',
        email: 'clara@tardis.org',
        name: 'Clara Oswald',
        teamId: 'team-quantum',
        provider: 'local',
        virtualKey: 'vk_gov_99182',
        activeSpaceId: 'space-default',
      };
      localStorage.setItem('ra1_auth_user', JSON.stringify(user));
      localStorage.setItem('ra1_auth_token', 'sess_test_token_123');
    });
    await page.reload();

    const userChip = page.locator('#user-profile-chip');
    await expect(userChip).toBeVisible();
    await expect(userChip).toContainText('Clara Oswald');

    // Click profile chip to open Account & Governance dialog
    await userChip.click();
    await expect(page.locator('.modal-title')).toContainText('Account & Governance Identity');
    await expect(page.locator('#auth-user-id')).toContainText('usr_clara_101');
    await expect(page.locator('#auth-team-id')).toContainText('team-quantum');
    await expect(page.locator('#auth-virtual-key')).toContainText('vk_gov_99182');

    // Click Sign Out
    await page.locator('#auth-logout-btn').click();

    // Navbar reverts to Sign In button
    await expect(page.locator('#open-auth-btn')).toBeVisible();
    await expect(page.locator('#user-profile-chip')).not.toBeVisible();
  });

  test('AU4. OAuth2 SSO buttons (Google, GitHub) authenticate user', async ({ page }) => {
    await page.locator('#open-auth-btn').click();

    // Click Google OAuth button
    const googleBtn = page.locator('#oauth-google-btn');
    await expect(googleBtn).toBeVisible();
    await googleBtn.click();

    // User is logged in with Google identity
    const userChip = page.locator('#user-profile-chip');
    await expect(userChip).toBeVisible();
    await expect(userChip).toContainText('Google Account User');
  });

  test('AU5. Space selector dropdown switches active Space and persists in localStorage', async ({ page }) => {
    const spaceSelect = page.locator('#space-select');
    await expect(spaceSelect).toBeVisible();
    await expect(spaceSelect).toHaveValue('space-default');

    // Change space to Finance Space
    await spaceSelect.selectOption('space-finance');
    await expect(spaceSelect).toHaveValue('space-finance');

    // Check localStorage
    const storedSpace = await page.evaluate(() => localStorage.getItem('ra1_active_space'));
    expect(storedSpace).toBe('space-finance');

    // Reload page and verify Space selection remains intact
    await page.reload();
    await expect(page.locator('#space-select')).toHaveValue('space-finance');
  });

  test('AU6. Authenticated user sends chat message with user session context', async ({ page }) => {
    // Log in
    await page.locator('#open-auth-btn').click();
    await page.locator('#oauth-github-btn').click();
    await expect(page.locator('#user-profile-chip')).toBeVisible();

    // Open Chat panel
    await page.locator('#chat-panel-button').click();
    const chatPanel = page.locator('#chat-panel');
    await expect(chatPanel).toBeVisible();

    // Send a message
    const input = page.locator('#chat-textarea');
    await input.fill('Explain multi-tenant virtual key isolation');
    await page.locator('#chat-send-btn').click();

    // User message bubble appears
    const userBubble = page.locator('.message-bubble--user').first();
    await expect(userBubble).toBeVisible();

    // Assistant response appears
    const assistantBubble = page.locator('.message-bubble--assistant').first();
    await expect(assistantBubble).toBeVisible({ timeout: 10000 });
  });
});
