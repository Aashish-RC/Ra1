/**
 * Automated Test Suite — Browser / Computer-Use Agent Controller
 *
 * Scenarios tested:
 * 1. User & Space Isolation: Sessions are strictly scoped to userId:spaceId (no cross-tenant leakage).
 * 2. DOM-to-Action-Space Extraction: browser-use pattern extracts numbered, addressable interactive elements.
 * 3. Read-Only Actions: navigate, extract, screenshot, and scroll are non-consequential and require no approval.
 * 4. Hard-Deny Safety Perimeter: type() into password/payment/personal-ID fields is blocked outright with ZERO DOM typing.
 * 5. State-Changing Actions: Form submissions and mutative clicks trigger approval requests with actual page screenshots.
 * 6. Approval Cancel: Guarantees zero DOM side effects (verified via Playwright action spy).
 * 7. Wall-Clock Timeout: Stuck sessions terminate when wall-clock threshold is exceeded.
 * 8. Max-Steps Bound: Sessions cannot run beyond their hard step limit even if outer loop logic continues.
 * 9. ReAct Loop Integration: Autonomous Think -> Act -> Observe execution invoking browser tools.
 * 10. Mock-vs-Real Disclosure: Local HTTP fixture server standard for deterministic verification.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  browserSessionManager,
  executeBrowserAction,
  extractActionSpace,
  classifySensitiveField,
  classifyStateChanging,
  HardDenyError,
  BrowserSessionTimeoutError,
  BrowserMaxStepsError,
  browserPiece,
} from '../connectors/pieces/browser.js';
import { runReActLoop, buildAgentToolRegistry } from '../engine/agent/reactLoop.js';

// Local HTTP fixture server
let server: http.Server;
let serverPort = 0;
let fixtureBaseUrl = '';

const FIXTURE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Ra1 Browser Test Fixture</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <h1>Test Store & Portal</h1>
  <p id="description">Welcome to the automated test portal.</p>
  <a href="#about" id="nav-link">About Us</a>

  <form id="profile-form" action="/submitted" method="POST">
    <div>
      <label for="username">Username:</label>
      <input type="text" id="username" name="username" placeholder="Enter username" />
    </div>

    <div>
      <label for="notes">Notes:</label>
      <textarea id="notes" name="notes" placeholder="Order instructions"></textarea>
    </div>

    <div>
      <label for="pwd">Password (Sensitive):</label>
      <input type="password" id="pwd" name="password" placeholder="Secret password" />
    </div>

    <div>
      <label for="card">Credit Card (Sensitive):</label>
      <input type="text" id="card" name="card_number" placeholder="4111 2222 3333 4444" />
    </div>

    <div>
      <label for="cvv">CVV (Sensitive):</label>
      <input type="text" id="cvv" name="security_code" placeholder="123" />
    </div>

    <div>
      <label for="ssn">SSN (Sensitive):</label>
      <input type="text" id="ssn" name="national_id" placeholder="000-00-0000" />
    </div>

    <button type="submit" id="submit-btn">Submit Order</button>
  </form>

  <div class="hidden" id="invisible-element">
    <button>You cannot see me</button>
  </div>
</body>
</html>
`;

test.before(async () => {
  server = http.createServer((req, res) => {
    if (req.url === '/submitted') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Order Submitted Successfully</h1>');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(FIXTURE_HTML);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      serverPort = addr.port;
      fixtureBaseUrl = `http://127.0.0.1:${serverPort}`;
      resolve();
    });
  });
});

test.after(async () => {
  await browserSessionManager.closeAll();
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test.describe('Browser / Computer-Use Agent Controller Test Suite', () => {

  test('1. Session Scoping: Sessions are strictly partitioned by userId and spaceId', async () => {
    const user1Session = await browserSessionManager.getOrCreateSession('user-alice', 'space-marketing');
    const user2Session = await browserSessionManager.getOrCreateSession('user-bob', 'space-engineering');
    const user1OtherSpace = await browserSessionManager.getOrCreateSession('user-alice', 'space-finance');

    assert.ok(user1Session.sessionId);
    assert.ok(user2Session.sessionId);
    assert.ok(user1OtherSpace.sessionId);

    // Sessions must have distinct IDs and contexts
    assert.notEqual(user1Session.sessionId, user2Session.sessionId);
    assert.notEqual(user1Session.sessionId, user1OtherSpace.sessionId);
    assert.notEqual(user1Session.context, user2Session.context);

    // Closing user1's session leaves user2 intact
    await browserSessionManager.closeSession('user-alice', 'space-marketing');
    assert.equal(browserSessionManager.getSession('user-alice', 'space-marketing'), undefined);
    assert.ok(browserSessionManager.getSession('user-bob', 'space-engineering'));
  });

  test('2. DOM-to-Action-Space: Extracts structured numbered elements per the browser-use pattern', async () => {
    const session = await browserSessionManager.getOrCreateSession('test-user', 'test-space');
    await session.page.goto(fixtureBaseUrl, { waitUntil: 'load' });

    const actionSpace = await extractActionSpace(session.page);
    assert.ok(actionSpace.title.includes('Ra1 Browser Test Fixture'));
    assert.ok(actionSpace.elements.length >= 6, 'Extracted interactive elements');

    // Numbered elements start at 1
    assert.equal(actionSpace.elements[0].id, 1);

    // Invisible elements are excluded from LLM addressable action space
    const hiddenFound = actionSpace.elements.find((el) => el.text.includes('You cannot see me'));
    assert.equal(hiddenFound, undefined, 'Hidden element was correctly filtered out');

    // Sensitive field classification
    const pwdEl = actionSpace.elements.find((el) => el.name === 'password');
    assert.ok(pwdEl, 'Password field detected');
    assert.equal(pwdEl.isSensitive, true, 'Password element marked sensitive');

    const cardEl = actionSpace.elements.find((el) => el.name === 'card_number');
    assert.ok(cardEl, 'Card number field detected');
    assert.equal(cardEl.isSensitive, true, 'Card element marked sensitive');

    const ssnEl = actionSpace.elements.find((el) => el.name === 'national_id');
    assert.ok(ssnEl, 'SSN/National ID field detected');
    assert.equal(ssnEl.isSensitive, true, 'SSN element marked sensitive');

    // Non-sensitive element
    const userEl = actionSpace.elements.find((el) => el.name === 'username');
    assert.ok(userEl, 'Username field detected');
    assert.equal(userEl.isSensitive, false, 'Username element is not sensitive');

    // State changing button
    const submitBtn = actionSpace.elements.find((el) => el.role === 'button');
    assert.ok(submitBtn, 'Submit button detected');
    assert.equal(submitBtn.isStateChanging, true, 'Submit button marked state-changing');
  });

  test('3. Read-Only Actions: navigate, extract, screenshot, and scroll execute with zero approval required', async () => {
    let approvalRequested = false;

    // Execute navigate
    const navResult = await executeBrowserAction(
      'test-reader',
      'space-read',
      'navigate',
      { url: fixtureBaseUrl },
      {
        requestApproval: async () => {
          approvalRequested = true;
          return 'approved';
        },
      }
    );
    assert.equal(navResult.success, true);
    assert.equal(approvalRequested, false, 'Navigate must NOT request approval');

    // Execute extract
    const extractResult = await executeBrowserAction(
      'test-reader',
      'space-read',
      'extract',
      { selector: '#description' },
      {
        requestApproval: async () => {
          approvalRequested = true;
          return 'approved';
        },
      }
    );
    assert.equal(extractResult.success, true);
    assert.ok(String(extractResult.result).includes('automated test portal'));
    assert.equal(approvalRequested, false, 'Extract must NOT request approval');

    // Execute screenshot
    const shotResult = await executeBrowserAction(
      'test-reader',
      'space-read',
      'screenshot',
      {},
      {
        requestApproval: async () => {
          approvalRequested = true;
          return 'approved';
        },
      }
    );
    assert.equal(shotResult.success, true);
    assert.ok(String(shotResult.result).startsWith('data:image/png;base64,'));
    assert.equal(approvalRequested, false, 'Screenshot must NOT request approval');

    // Execute scroll
    const scrollResult = await executeBrowserAction(
      'test-reader',
      'space-read',
      'scroll',
      { direction: 'down' },
      {
        requestApproval: async () => {
          approvalRequested = true;
          return 'approved';
        },
      }
    );
    assert.equal(scrollResult.success, true);
    assert.equal(approvalRequested, false, 'Scroll must NOT request approval');
  });

  test('4. Hard-Deny Safety Perimeter: type() into sensitive fields is blocked outright with ZERO DOM typing', async () => {
    const session = await browserSessionManager.getOrCreateSession('security-test', 'space-sec');
    await session.page.goto(fixtureBaseUrl, { waitUntil: 'load' });
    const actionSpace = await extractActionSpace(session.page);
    session.lastActionSpace = actionSpace;

    // Find password element
    const pwdEl = actionSpace.elements.find((el) => el.name === 'password');
    assert.ok(pwdEl);

    // Attempt to type into sensitive field
    let threwHardDeny = false;
    try {
      await executeBrowserAction('security-test', 'space-sec', 'type', {
        elementId: pwdEl.id,
        text: 'SuperSecret123!',
      });
    } catch (err: any) {
      if (err instanceof HardDenyError || err.message.includes('HardDenyError')) {
        threwHardDeny = true;
      }
    }

    assert.equal(threwHardDeny, true, 'HardDenyError was thrown');

    // Verify ZERO DOM typing occurred: field value remains completely empty
    const actualFieldValue = await session.page.$eval('#pwd', (el: HTMLInputElement) => el.value);
    assert.equal(actualFieldValue, '', 'Password field in DOM has zero typed characters (zero DOM interaction)');

    // Find credit card element
    const cardEl = actionSpace.elements.find((el) => el.name === 'card_number');
    assert.ok(cardEl);

    let threwCardDeny = false;
    try {
      await executeBrowserAction('security-test', 'space-sec', 'type', {
        elementId: cardEl.id,
        text: '4111222233334444',
      });
    } catch (err: any) {
      if (err instanceof HardDenyError || err.message.includes('HardDenyError')) {
        threwCardDeny = true;
      }
    }

    assert.equal(threwCardDeny, true, 'Card HardDenyError was thrown');
    const cardVal = await session.page.$eval('#card', (el: HTMLInputElement) => el.value);
    assert.equal(cardVal, '', 'Card field in DOM has zero typed characters');
  });

  test('5. State-Changing Actions: Mutative clicks/types produce approval cards with actual page screenshot', async () => {
    const session = await browserSessionManager.getOrCreateSession('approval-user', 'space-appr');
    await session.page.goto(fixtureBaseUrl, { waitUntil: 'load' });
    const actionSpace = await extractActionSpace(session.page);
    session.lastActionSpace = actionSpace;

    const usernameEl = actionSpace.elements.find((el) => el.name === 'username');
    assert.ok(usernameEl);

    let capturedApproval: any = null;

    // Type into regular input
    const typeResult = await executeBrowserAction(
      'approval-user',
      'space-appr',
      'type',
      { elementId: usernameEl.id, text: 'alice_wonder' },
      {
        requestApproval: async (req) => {
          capturedApproval = req;
          return 'approved';
        },
      }
    );

    assert.equal(typeResult.success, true);
    assert.ok(capturedApproval, 'Approval request was dispatched');
    assert.ok(capturedApproval.screenshotBase64.startsWith('data:image/png;base64,'), 'Screenshot attached to approval');
    assert.ok(capturedApproval.actionDescription.includes('alice_wonder'), 'Action description specifies typed text');

    // DOM was updated after approval
    const typedVal = await session.page.$eval('#username', (el: HTMLInputElement) => el.value);
    assert.equal(typedVal, 'alice_wonder');
  });

  test('6. Approval Cancel: Rejection produces ZERO browser side effects (Playwright action spy standard)', async () => {
    const session = await browserSessionManager.getOrCreateSession('cancel-user', 'space-cancel');
    await session.page.goto(fixtureBaseUrl, { waitUntil: 'load' });
    const actionSpace = await extractActionSpace(session.page);
    session.lastActionSpace = actionSpace;

    const submitBtn = actionSpace.elements.find((el) => el.role === 'button');
    assert.ok(submitBtn);

    // Spy on Playwright page.click
    let pageClickCalled = false;
    const originalClick = session.page.click.bind(session.page);
    session.page.click = async (...args: any[]) => {
      pageClickCalled = true;
      return originalClick(...args);
    };

    const cancelResult = await executeBrowserAction(
      'cancel-user',
      'space-cancel',
      'click',
      { elementId: submitBtn.id },
      {
        requestApproval: async () => 'cancelled', // User rejects action
      }
    );

    assert.equal(cancelResult.success, false);
    assert.ok(cancelResult.result.includes('cancelled by user'));
    assert.equal(pageClickCalled, false, 'page.click was NEVER called when user cancelled (zero side effects)');

    // Page URL did NOT change to /submitted
    assert.equal(session.page.url(), fixtureBaseUrl + '/');
  });

  test('7. Wall-Clock Timeout: Bounded session terminates when wall-clock threshold is exceeded', async () => {
    // Create session with very short timeout (50ms)
    const session = await browserSessionManager.getOrCreateSession('timeout-user', 'space-time', {
      wallClockTimeoutMs: 50,
    });

    // Wait for timeout to elapse
    await new Promise((r) => setTimeout(r, 80));

    let threwTimeout = false;
    try {
      browserSessionManager.assertSessionHealthy(session);
    } catch (err: any) {
      if (err instanceof BrowserSessionTimeoutError || err.message.includes('BrowserSessionTimeoutError')) {
        threwTimeout = true;
      }
    }

    assert.equal(threwTimeout, true, 'BrowserSessionTimeoutError thrown after exceeding wall-clock timeout');
  });

  test('8. Max-Steps Bound: Sessions cannot run beyond hard max-steps limit', async () => {
    const session = await browserSessionManager.getOrCreateSession('steps-user', 'space-steps', {
      maxSteps: 2,
    });
    session.page = {
      screenshot: async () => Buffer.from('mock-png'),
      goto: async () => {},
      url: () => fixtureBaseUrl,
      title: async () => 'Test',
      evaluate: async () => [],
    };
    session.lastActionSpace = {
      url: fixtureBaseUrl,
      title: 'Test',
      elements: [],
      formattedSummary: '',
    };

    // Execute step 1 & 2
    session.stepsTaken = 2;

    let threwMaxSteps = false;
    try {
      browserSessionManager.assertSessionHealthy(session);
    } catch (err: any) {
      if (err instanceof BrowserMaxStepsError || err.message.includes('BrowserMaxStepsError')) {
        threwMaxSteps = true;
      }
    }

    assert.equal(threwMaxSteps, true, 'BrowserMaxStepsError thrown after reaching max allowable steps');
  });

  test('9. ReAct Loop Integration: Autonomous Think -> Act -> Observe execution with browser piece', async () => {
    const result = await runReActLoop(`Navigate to ${fixtureBaseUrl} and extract content`, {
      userId: 'react-user',
      spaceId: 'react-space',
      maxSteps: 3,
    });

    assert.equal(result.terminatedReason, 'finished');
    assert.ok(result.toolsInvoked.includes('piece:browser:navigate'), 'Invoked browser navigate tool');
    assert.ok(result.toolsInvoked.includes('piece:browser:extract'), 'Invoked browser extract tool');
    assert.ok(result.finalText.includes('Test Store') || result.finalText.includes('automated test portal'));
  });

  test('10. ReAct Loop: Consequential click requests approval with screenshot and completes upon approval', async () => {
    let approvalTriggered = false;
    let screenshotPresent = false;

    const result = await runReActLoop(`Navigate to ${fixtureBaseUrl} and click button #1`, {
      userId: 'react-approver',
      spaceId: 'react-space',
      maxSteps: 3,
      requestApproval: async (req) => {
        approvalTriggered = true;
        if (req.screenshotUrl?.startsWith('data:image/png;base64,')) {
          screenshotPresent = true;
        }
        return 'approved';
      },
    });

    assert.equal(approvalTriggered, true, 'Approval was requested for consequential click');
    assert.equal(screenshotPresent, true, 'Actual page screenshot was attached to approval card');
    assert.equal(result.terminatedReason, 'finished');
  });
});
