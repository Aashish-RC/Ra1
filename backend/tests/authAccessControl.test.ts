import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { authService } from '../auth/authService.js';
import { accessControl } from '../auth/accessControl.js';
import { strategyRegistry } from '../auth/oauthStrategies.js';
import { createThread, sendMessage, resolveApproval, engine } from '../chat/chatService.js';
import { vectorStore } from '../rag/vectorStore.js';
import { retrieve } from '../rag/retriever.js';
import { embedChunks } from '../rag/embedder.js';

describe('Authentication, Governance & Multi-Tenant Access Control Suite', () => {
  beforeEach(() => {
    authService.reset();
    accessControl.reset();
    vectorStore.clear();
  });

  // 1. Signup, login, logout end-to-end
  test('1. Core Auth: signup, login, and logout work end-to-end with session tokens', async () => {
    // Signup
    const authResult = await authService.signup({
      email: 'alice@example.com',
      password: 'password123',
      name: 'Alice Smith',
      teamId: 'team-alpha',
    });

    assert.ok(authResult.token, 'Expected session token on signup');
    assert.equal(authResult.user.email, 'alice@example.com');
    assert.equal(authResult.user.name, 'Alice Smith');
    assert.ok(authResult.virtualKey, 'Expected auto-provisioned virtual key');

    // Validate session
    const validated = authService.validateSession(authResult.token);
    assert.equal(validated.user.id, authResult.user.id);
    assert.equal(validated.user.email, 'alice@example.com');

    // Duplicate email rejected
    await assert.rejects(
      async () => {
        await authService.signup({
          email: 'alice@example.com',
          password: 'anotherpassword',
          name: 'Alice Imposter',
        });
      },
      /already exists/
    );

    // Logout
    const loggedOut = authService.logout(authResult.token);
    assert.equal(loggedOut, true);

    // After logout, token is invalidated
    assert.throws(
      () => authService.validateSession(authResult.token),
      /Unauthorized/
    );

    // Login with correct credentials
    const loginResult = await authService.login({
      email: 'alice@example.com',
      password: 'password123',
    });
    assert.ok(loginResult.token);
    assert.equal(loginResult.user.id, authResult.user.id);

    // Login with wrong password rejected
    await assert.rejects(
      async () => {
        await authService.login({
          email: 'alice@example.com',
          password: 'wrongpassword',
        });
      },
      /Invalid email or password/
    );
  });

  // 2. Unauthenticated request rejection
  test('2. Unauthenticated request: missing, invalid, or expired session tokens are rejected', () => {
    assert.throws(
      () => authService.validateSession(''),
      /Missing session token/
    );

    assert.throws(
      () => authService.validateSession('sess_nonexistent_token_12345'),
      /Invalid or expired session token/
    );
  });

  // 3. OAuth2 social/SSO login
  test('3. OAuth2 / SSO: Google and GitHub logins provision accounts and dedicated keys', async () => {
    const googleAuth = await authService.loginWithOAuth('google', 'google-auth-code-xyz', {
      email: 'dev@googlecorp.com',
      name: 'Google Engineer',
      avatarUrl: 'https://lh3.googleusercontent.com/avatar',
    });

    assert.ok(googleAuth.token);
    assert.equal(googleAuth.user.provider, 'google');
    assert.equal(googleAuth.user.email, 'dev@googlecorp.com');
    assert.ok(googleAuth.virtualKey, 'OAuth user must have an auto-provisioned virtual key');

    // Subsequent login with same Google account returns existing user
    const googleAuth2 = await authService.loginWithOAuth('google', 'google-auth-code-xyz', {
      email: 'dev@googlecorp.com',
      name: 'Google Engineer',
    });
    assert.equal(googleAuth2.user.id, googleAuth.user.id);

    // GitHub OAuth
    const githubAuth = await authService.loginWithOAuth('github', 'gho_secret_token_123', {
      email: 'octocat@github.com',
      name: 'The Octocat',
    });
    assert.ok(githubAuth.token);
    assert.equal(githubAuth.user.provider, 'github');
    assert.equal(githubAuth.user.email, 'octocat@github.com');
  });

  // 4. Per-user budget and rate-limit isolation
  test('4. Governance Isolation: Budget cap resolves per authenticated user, never shared globally', async () => {
    // User A with a tiny $0.0001 budget
    const userA = await authService.signup({
      email: 'usera@example.com',
      password: 'password123',
      name: 'User A',
      maxSpendUSD: 0.0001,
    });

    // User B with a generous $50.00 budget
    const userB = await authService.signup({
      email: 'userb@example.com',
      password: 'password123',
      name: 'User B',
      maxSpendUSD: 50.0,
    });

    // Artificially record spend on User A to exceed their budget
    engine.budgetTracker.recordSpend(userA.user.id, 0.0002);

    // User A's thread should be blocked due to budget exceeded
    const threadA = createThread('openai/gpt-4o-mini', userA.user.id);
    await assert.rejects(
      async () => {
        await sendMessage(threadA, 'Hello from User A', undefined, undefined, undefined, {
          userId: userA.user.id,
          virtualKey: userA.virtualKey,
        });
      },
      /Budget exceeded/
    );

    // User B's thread should execute normally with ZERO interference from User A
    const threadB = createThread('openai/gpt-4o-mini', userB.user.id);
    const replyB = await sendMessage(threadB, 'Hello from User B', undefined, undefined, undefined, {
      userId: userB.user.id,
      virtualKey: userB.virtualKey,
    });

    assert.ok(replyB.content, 'User B must successfully receive assistant response');
    assert.equal(threadB.messages.length, 2);
  });

  // 5. Space-locked agent boundaries
  test('5. Agent Scoping: Space-locked agent cannot be invoked outside its originating Space', () => {
    const ownerId = 'usr_alice';
    const space1 = accessControl.createSpace(ownerId, 'Finance Space');
    const space2 = accessControl.createSpace(ownerId, 'Engineering Space');

    const agent = accessControl.registerAgent({
      id: 'agent-ledger-auditor',
      name: 'Ledger Auditor',
      creatorId: ownerId,
      spaceId: space1.id, // Space-locked!
    });

    // Invocation inside originating space1 by owner -> Allowed
    const check1 = accessControl.canInvokeAgent(ownerId, agent.id, space1.id);
    assert.equal(check1.allowed, true);

    // Invocation outside originating space (in space2) -> Blocked
    const check2 = accessControl.canInvokeAgent(ownerId, agent.id, space2.id);
    assert.equal(check2.allowed, false);
    assert.match(check2.reason || '', /locked to Space/);

    // Invocation without specifying space -> Blocked
    const check3 = accessControl.canInvokeAgent(ownerId, agent.id);
    assert.equal(check3.allowed, false);
    assert.match(check3.reason || '', /locked to Space/);
  });

  // 6. Global agent Space grant lists
  test('6. Agent Scoping: Globally-built agent respects creator Space-grant list', () => {
    const creatorId = 'usr_alice';
    const memberId = 'usr_bob';

    const spaceA = accessControl.createSpace(creatorId, 'Design Space');
    const spaceB = accessControl.createSpace(creatorId, 'Marketing Space');

    // Add Bob to both spaces with agent invocation permission
    accessControl.addSpaceMember(spaceA.id, creatorId, memberId, 'member', true);
    accessControl.addSpaceMember(spaceB.id, creatorId, memberId, 'member', true);

    // Global agent granted ONLY to spaceA
    const globalAgent = accessControl.registerAgent({
      id: 'agent-brand-guide',
      name: 'Brand Guidelines Assistant',
      creatorId,
      isGlobal: true,
      grantedSpaceIds: [spaceA.id], // granted only to Space A
    });

    // Creator can always run it
    const creatorCheck = accessControl.canInvokeAgent(creatorId, globalAgent.id, spaceB.id);
    assert.equal(creatorCheck.allowed, true);

    // Bob invoking in granted Space A -> Allowed
    const bobSpaceACheck = accessControl.canInvokeAgent(memberId, globalAgent.id, spaceA.id);
    assert.equal(bobSpaceACheck.allowed, true);

    // Bob invoking in non-granted Space B -> Blocked
    const bobSpaceBCheck = accessControl.canInvokeAgent(memberId, globalAgent.id, spaceB.id);
    assert.equal(bobSpaceBCheck.allowed, false);
    assert.match(bobSpaceBCheck.reason || '', /not granted access/);
  });

  // 7. Space owner controls which members within that Space can invoke an agent
  test('7. Space Permissions: Space owner controls which members can invoke agents', () => {
    const ownerId = 'usr_space_boss';
    const developerId = 'usr_dev';
    const guestId = 'usr_guest';

    const space = accessControl.createSpace(ownerId, 'DevOps Space');

    // Developer has canInvokeAgents: true
    accessControl.addSpaceMember(space.id, ownerId, developerId, 'member', true);
    // Guest has canInvokeAgents: false
    accessControl.addSpaceMember(space.id, ownerId, guestId, 'viewer', false);

    const agent = accessControl.registerAgent({
      id: 'agent-deployer',
      name: 'Deployment Agent',
      creatorId: ownerId,
      spaceId: space.id,
    });

    // Owner can invoke
    assert.equal(accessControl.canInvokeAgent(ownerId, agent.id, space.id).allowed, true);

    // Developer can invoke
    assert.equal(accessControl.canInvokeAgent(developerId, agent.id, space.id).allowed, true);

    // Guest cannot invoke
    const guestCheck = accessControl.canInvokeAgent(guestId, agent.id, space.id);
    assert.equal(guestCheck.allowed, false);
    assert.match(guestCheck.reason || '', /does not have agent invocation permissions/);

    // Owner elevates Guest's permission
    accessControl.setMemberAgentInvocation(space.id, ownerId, guestId, true);
    assert.equal(accessControl.canInvokeAgent(guestId, agent.id, space.id).allowed, true);
  });

  // 8. Approval card can only be resolved by the owning user
  test('8. Approval Authorization: An approval card can ONLY be resolved by its owning user', async () => {
    const userA = 'usr_owner_alice';
    const userB = 'usr_intruder_bob';

    const thread = createThread('gemini-2.5-flash', userA);

    let approvalSurfaced = false;
    let approvalId = '';

    // Start a consequential turn that surfaces an approval card
    const turnPromise = sendMessage(
      thread,
      'Please send an email to boss@corp.com saying the project is shipped',
      undefined,
      undefined,
      (approval) => {
        approvalSurfaced = true;
        approvalId = approval.approvalId;
      },
      { userId: userA }
    );

    // Wait for the approval card to be registered in the thread
    await new Promise((r) => setTimeout(r, 50));
    assert.ok(approvalSurfaced, 'Consequential action must require approval');
    assert.ok(approvalId, 'Approval card must have an ID');

    // User B attempts to resolve User A's approval card -> REJECTED
    assert.throws(
      () => resolveApproval(thread, approvalId, 'approved', userB),
      /Forbidden: User "usr_intruder_bob" is not authorized/
    );

    // User A resolves their own approval card -> APPROVED & EXECUTES
    const resolved = resolveApproval(thread, approvalId, 'approved', userA);
    assert.equal(resolved, true);

    const finalMsg = await turnPromise;
    assert.ok(finalMsg.content);
  });

  // 9. Resource isolation: Chats, documents, and credentials scoped to owner
  test('9. Resource Privacy: User B cannot retrieve User A private documents or credentials', async () => {
    const userA = 'usr_alice';
    const userB = 'usr_bob';

    // 1. Connector Credentials
    accessControl.setConnectorCredential(userA, 'GITHUB_TOKEN', 'ghp_secret12345');

    // Alice can retrieve her credential
    const aliceCred = accessControl.getConnectorCredential(userA, 'GITHUB_TOKEN', userA);
    assert.equal(aliceCred, 'ghp_secret12345');

    // Bob cannot retrieve Alice's credential
    assert.throws(
      () => accessControl.getConnectorCredential(userA, 'GITHUB_TOKEN', userB),
      /Forbidden: User "usr_bob" cannot access credentials owned by "usr_alice"/
    );

    // 2. Document / Vector Store Isolation
    // Index a confidential document belonging to Alice
    const [aliceChunk] = await embedChunks([
      {
        id: 'chunk_alice_salary',
        text: 'Confidential: Alice salary is $250,000 and bonus is $50,000.',
        sourceFile: 'alice_compensation.pdf',
        charOffset: 0,
      },
    ]);
    aliceChunk.userId = userA;
    vectorStore.upsert([aliceChunk]);

    // Alice searches for salary -> Found
    const aliceResults = await retrieve('salary compensation bonus', 5, { userId: userA });
    assert.equal(aliceResults.length, 1);
    assert.equal(aliceResults[0].chunkId, 'chunk_alice_salary');

    // Bob searches for salary -> Isolated (Empty results)
    const bobResults = await retrieve('salary compensation bonus', 5, { userId: userB });
    assert.equal(bobResults.length, 0, "Bob must not retrieve Alice's private documents");
  });
});
