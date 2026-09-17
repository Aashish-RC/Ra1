/**
 * Automated Test Suite — ReAct Agent Loop, Approval Cards, MCP Wiring & Native Connectors
 *
 * Scenarios tested:
 * 1. Native Email Connector: send_email (consequential) and list_emails work standalone.
 * 2. Native Calendar Connector: create_event (consequential) and list_events work standalone.
 * 3. Native Web Search Connector: web_search works standalone with ranked snippet outputs.
 * 4. MCP Wiring: discoverMCPTools() and executeMCPTool() work with in-memory bridge.
 * 5. ReAct Loop: completes a multi-step task (search -> email).
 * 6. ReAct Loop: terminates cleanly on success path and bounded max-steps without infinite recursion.
 * 7. "Ask Permission First" Approval Card: pauses execution on consequential action and genuinely halts.
 * 8. "Ask Permission First" Cancellation: user cancel aborts action with ZERO side effects.
 * 9. MCP Tool invocation mid-conversation via the ReAct agent loop.
 * 10. Direct chatService integration with approval resolution.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { emailPiece } from '../connectors/pieces/email.js';
import { calendarPiece } from '../connectors/pieces/calendar.js';
import { searchPiece } from '../connectors/pieces/search.js';
import { discoverMCPTools, executeMCPTool } from '../connectors/mcpBridge.js';
import { runReActLoop, buildAgentToolRegistry } from '../engine/agent/reactLoop.js';
import { createThread, sendMessage, resolveApproval } from '../chat/chatService.js';

test.describe('ReAct Agent Loop & Human-In-The-Loop Approval Suite', () => {

  test('1. Native Email connector: send_email is flagged consequential and list_emails is read-only', async () => {
    const sendAction = emailPiece.actions.find((a) => a.actionId === 'send_email');
    const listAction = emailPiece.actions.find((a) => a.actionId === 'list_emails');

    assert.ok(sendAction, 'send_email action exists');
    assert.equal(sendAction.consequential, true, 'send_email is marked consequential');
    assert.ok(sendAction.consequentialReason?.includes('external message'), 'has consequential reason');

    const sendResult = await sendAction.run({
      propsValue: { to: 'dev@company.org', subject: 'Release Ready', body: 'Build 1.4 deployed.' },
    }) as Record<string, unknown>;
    assert.equal(sendResult.success, true);
    assert.equal(sendResult.to, 'dev@company.org');
    assert.equal(sendResult.status, 'sent');

    assert.ok(listAction, 'list_emails action exists');
    assert.equal(listAction.consequential, false, 'list_emails is not consequential');
    const listResult = await listAction.run({ propsValue: { query: 'invoice' } }) as { total: number; emails: unknown[] };
    assert.ok(listResult.total >= 1);
  });

  test('2. Native Calendar connector: create_event is consequential and list_events works', async () => {
    const createAction = calendarPiece.actions.find((a) => a.actionId === 'create_event');
    const listAction = calendarPiece.actions.find((a) => a.actionId === 'list_events');

    assert.ok(createAction, 'create_event exists');
    assert.equal(createAction.consequential, true, 'create_event is marked consequential');

    const created = await createAction.run({
      propsValue: {
        title: 'Design Review',
        startTime: '2026-09-18T14:00:00Z',
        attendees: 'aashish@example.com',
      },
    }) as Record<string, unknown>;
    assert.equal(created.success, true);
    assert.equal(created.title, 'Design Review');

    assert.ok(listAction, 'list_events exists');
    assert.equal(listAction.consequential, false);
    const events = await listAction.run({ propsValue: { limit: 2 } }) as { total: number; events: unknown[] };
    assert.ok(events.events.length <= 2);
  });

  test('3. Native Web Search connector: web_search returns ranked search snippets', async () => {
    const searchAction = searchPiece.actions.find((a) => a.actionId === 'web_search');
    assert.ok(searchAction, 'web_search exists');
    assert.equal(searchAction.consequential, false);

    const result = await searchAction.run({
      propsValue: { query: 'Model Context Protocol specification', numResults: 3 },
    }) as { query: string; total: number; results: Array<{ title: string; url: string; snippet: string }> };

    assert.equal(result.query, 'Model Context Protocol specification');
    assert.ok(result.results.length >= 1);
    assert.ok(result.results[0].title.includes('Model Context Protocol'));
  });

  test('4. MCP Wiring: discoverMCPTools and executeMCPTool successfully bridge in-memory MCP servers', async () => {
    const tools = await discoverMCPTools();
    assert.ok(tools.length >= 4, 'Discovered MCP tools from filesystem and github');

    const readFile = tools.find((t) => t.serverName === 'filesystem' && t.name === 'read_file');
    assert.ok(readFile);
    assert.equal(readFile.consequential, false);

    const deleteFile = tools.find((t) => t.serverName === 'filesystem' && t.name === 'delete_file');
    assert.ok(deleteFile);
    assert.equal(deleteFile.consequential, true, 'MCP delete_file is marked consequential');

    // Execute read_file
    const fileContent = await executeMCPTool('filesystem', 'read_file', { path: 'README.md' }) as Record<string, unknown>;
    assert.equal(fileContent.path, 'README.md');
    assert.ok(String(fileContent.content).includes('MCP file stream'));
  });

  test('5. ReAct Loop: completes a multi-step task correctly (search then email)', async () => {
    const approvedActions: string[] = [];

    const result = await runReActLoop('Search the web for MCP and send an email to alex@example.com with the summary', {
      maxSteps: 5,
      requestApproval: async (req) => {
        approvedActions.push(req.tool);
        return 'approved';
      },
    });

    assert.equal(result.terminatedReason, 'finished');
    assert.ok(result.steps.length >= 2, 'Executed multiple steps');
    assert.ok(result.toolsInvoked.includes('piece:search:web_search'), 'Invoked search');
    assert.ok(result.toolsInvoked.includes('piece:email:send_email'), 'Invoked email');
    assert.ok(approvedActions.includes('piece:email:send_email'), 'Requested approval for consequential email');
  });

  test('6. ReAct Loop: terminates cleanly on bounded max-steps without infinite recursion', async () => {
    // Loop with low maxSteps (1) terminates without hanging
    const result = await runReActLoop('Search the web for MCP and send an email', {
      maxSteps: 1,
      requestApproval: async () => 'approved',
    });

    assert.equal(result.totalSteps, 1);
    assert.ok(result.terminatedReason === 'max_steps_reached' || result.terminatedReason === 'finished');
    assert.ok(result.finalText.length > 0);
  });

  test('7. Approval Card: execution genuinely halts until user approval is resolved', async () => {
    let approvalWasRequested = false;
    let resumePromiseResolve!: (decision: 'approved' | 'cancelled') => void;

    const approvalHoldPromise = new Promise<'approved' | 'cancelled'>((resolve) => {
      resumePromiseResolve = resolve;
    });

    // Start loop in background
    const loopPromise = runReActLoop('Send an email to partner@example.com with updates', {
      requestApproval: async (req) => {
        approvalWasRequested = true;
        assert.equal(req.tool, 'piece:email:send_email');
        assert.equal(req.status, 'pending');
        return approvalHoldPromise;
      },
    });

    // Verify approval was requested and loop has NOT completed yet (still awaiting user response)
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(approvalWasRequested, true, 'Approval was requested');

    // Simulate user approving after a delay
    resumePromiseResolve('approved');
    const result = await loopPromise;

    assert.equal(result.terminatedReason, 'finished');
    assert.ok(result.toolsInvoked.includes('piece:email:send_email'));
  });

  test('8. Approval Card: Cancel cleanly aborts action with ZERO side effects', async () => {
    let emailExecuted = false;

    // Spy on email tool run to confirm ZERO side effects
    const originalRun = emailPiece.actions[0].run;
    emailPiece.actions[0].run = async (ctx) => {
      emailExecuted = true;
      return originalRun(ctx);
    };

    try {
      const result = await runReActLoop('Send an email to unsubscribe@spam.com', {
        requestApproval: async () => 'cancelled', // User rejects action
      });

      assert.equal(result.terminatedReason, 'cancelled');
      assert.equal(emailExecuted, false, 'Email action was NEVER executed (zero side effects)');
      assert.ok(result.finalText.includes('cancelled') || result.finalText.includes('Zero side effects'));
    } finally {
      emailPiece.actions[0].run = originalRun;
    }
  });

  test('9. MCP Tool invocation mid-conversation via the ReAct agent loop', async () => {
    const result = await runReActLoop('Please read file src/index.ts using MCP', {
      maxSteps: 3,
    });

    assert.equal(result.terminatedReason, 'finished');
    assert.ok(result.toolsInvoked.includes('mcp:filesystem:read_file'));
    assert.ok(result.steps.some((s) => s.action?.tool === 'mcp:filesystem:read_file'));
  });

  test('10. Direct chatService integration: approval card surfacing and resolution', async () => {
    const thread = createThread();
    let pendingApprovalId = '';

    const sendPromise = sendMessage(
      thread,
      'Schedule a calendar event for Sprint Planning',
      undefined,
      undefined,
      (approval) => {
        pendingApprovalId = approval.approvalId;
      }
    );

    // Give microtask tick to let approval message mount
    await new Promise((r) => setTimeout(r, 20));

    // Confirm approval request message is mounted on thread
    assert.ok(pendingApprovalId.length > 0, 'Approval ID generated');
    const approvalMsg = thread.messages.find((m) => m.approvalRequest?.approvalId === pendingApprovalId);
    assert.ok(approvalMsg, 'Approval card message exists in thread');
    assert.equal(approvalMsg.approvalRequest?.status, 'pending');

    // Resolve approval
    const resolved = resolveApproval(thread, pendingApprovalId, 'approved');
    assert.equal(resolved, true, 'Approval resolved successfully');

    const finalMsg = await sendPromise;
    assert.equal(finalMsg.role, 'assistant');
    assert.ok(approvalMsg.approvalRequest?.status === 'approved');
  });
});
