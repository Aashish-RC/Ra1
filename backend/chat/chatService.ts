/**
 * Chat Service — thin bridge between Chat UI and the Phase 2 ModelEngine + Phase 4 ReAct Agent Loop.
 *
 * Maintains a per-session Thread (ordered EngineMessage history) and dispatches
 * turns through either:
 *  - Autonomous ReAct Agent Loop when tool/connector/MCP invocation is requested.
 *  - Standard ModelEngine.execute() for zero-config direct conversation & RAG.
 */

import { ModelEngine } from '../engine/index.js';
import type { EngineMessage, MultimodalAttachment } from '../engine/types.js';
import { nanoid } from 'nanoid';
import {
  runReActLoop,
  shouldEngageAgent,
  type ReActStep,
  type ApprovalRequest,
} from '../engine/agent/reactLoop.js';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: MultimodalAttachment[];
  citations?: Citation[];
  timestamp: number;
  model?: string;
  routeUsed?: string;
  rating?: 'up' | 'down' | null;
  approvalRequest?: ApprovalRequest;
  reactSteps?: ReActStep[];
  toolsInvoked?: string[];
}

export interface Citation {
  index: number;
  chunkId: string;
  sourceFile: string;
  pageNumber?: number;
  charOffset?: number;
  excerpt: string;
  score: number;
}

export interface Thread {
  id: string;
  userId?: string;
  spaceId?: string;
  messages: ChatMessage[];
  model?: string; // explicit model override (dropdown)
  pendingApproval?: {
    approvalId: string;
    resolve: (decision: 'approved' | 'cancelled') => void;
  } | null;
}

// Singleton engine instance shared across all threads
const engine = new ModelEngine();

export function createThread(modelOverride?: string, userId?: string, spaceId?: string): Thread {
  return {
    id: `thread-${nanoid(8)}`,
    userId,
    spaceId,
    messages: [],
    model: modelOverride,
    pendingApproval: null,
  };
}

/**
 * Resolve a pending approval card for consequential actions.
 * Enforces ownership: only the user who owns that conversation/session can resolve it.
 */
export function resolveApproval(
  thread: Thread,
  approvalId: string,
  decision: 'approved' | 'cancelled',
  resolvingUserId?: string
): boolean {
  // Access control check: an approval must only be resolvable by the owning user
  if (thread.userId && resolvingUserId && resolvingUserId !== thread.userId) {
    throw new Error(
      `Forbidden: User "${resolvingUserId}" is not authorized to resolve approvals on thread owned by "${thread.userId}"`
    );
  }

  if (thread.pendingApproval && thread.pendingApproval.approvalId === approvalId) {
    const resolver = thread.pendingApproval.resolve;
    thread.pendingApproval = null;

    // Update approval status on message in thread
    const msg = thread.messages.find((m) => m.approvalRequest?.approvalId === approvalId);
    if (msg && msg.approvalRequest) {
      msg.approvalRequest.status = decision;
      msg.approvalRequest.resolvedAt = Date.now();
    }

    resolver(decision);
    return true;
  }
  return false;
}

/**
 * Send a user message and get an assistant reply.
 * Mutates the thread in place (appends user, approval, and assistant messages).
 */
export async function sendMessage(
  thread: Thread,
  userContent: string,
  attachments?: MultimodalAttachment[],
  citations?: Citation[],
  onApprovalRequired?: (approval: ApprovalRequest) => void,
  userContext?: { userId?: string; teamId?: string; virtualKey?: string }
): Promise<ChatMessage> {
  // Append user message to thread
  const userMsg: ChatMessage = {
    id: `msg-${nanoid(8)}`,
    role: 'user',
    content: userContent,
    attachments,
    timestamp: Date.now(),
  };
  thread.messages.push(userMsg);

  const effectiveUserId = userContext?.userId || thread.userId;
  const effectiveTeamId = userContext?.teamId;
  const effectiveVirtualKey = userContext?.virtualKey;

  // 1. ReAct Agent Loop: Engage when task mentions tools, email, calendar, search, files, or multi-step execution
  if (shouldEngageAgent(userContent)) {
    const reactResult = await runReActLoop(userContent, {
      engine,
      selectedModel: thread.model,
      userId: effectiveUserId,
      spaceId: thread.spaceId,
      requestApproval: async (approval) => {
        approval.threadId = thread.id;

        // Surface the approval card directly in the message stream
        const approvalMsg: ChatMessage = {
          id: `msg-appr-${approval.approvalId}`,
          role: 'assistant',
          content: `Action requires authorization: ${approval.toolDisplayName}`,
          timestamp: Date.now(),
          approvalRequest: approval,
          model: thread.model || 'agent-react-orchestrator',
          routeUsed: 'pooled-aggregator',
        };
        thread.messages.push(approvalMsg);
        onApprovalRequired?.(approval);

        // Genuinely halt until user responds via Approve or Cancel
        return new Promise<'approved' | 'cancelled'>((resolve) => {
          thread.pendingApproval = {
            approvalId: approval.approvalId,
            resolve: (decision) => {
              approval.status = decision;
              approval.resolvedAt = Date.now();
              resolve(decision);
            },
          };
        });
      },
    });

    const assistantMsg: ChatMessage = {
      id: `msg-${nanoid(8)}`,
      role: 'assistant',
      content: reactResult.finalText,
      citations,
      timestamp: Date.now(),
      model: thread.model || 'agent-react-orchestrator',
      routeUsed: 'pooled-aggregator',
      rating: null,
      reactSteps: reactResult.steps,
      toolsInvoked: reactResult.toolsInvoked,
    };
    thread.messages.push(assistantMsg);
    return assistantMsg;
  }

  // 2. Direct ModelEngine execution (for standard zero-config chats & RAG citations)
  const engineMessages: EngineMessage[] = thread.messages.map((m) => ({
    role: m.role,
    content: m.role === 'user' && citations && citations.length > 0
      ? buildRagContext(m.content, citations)
      : m.content,
    attachments: m.attachments,
  }));

  const response = await engine.execute({
    messages: engineMessages,
    selectionMode: thread.model ? 'dropdown' : 'auto',
    model: thread.model,
    virtualKey: effectiveVirtualKey,
    userContext: effectiveUserId ? { userId: effectiveUserId, teamId: effectiveTeamId } : undefined,
  });

  const assistantMsg: ChatMessage = {
    id: `msg-${nanoid(8)}`,
    role: 'assistant',
    content: response.text,
    citations,
    timestamp: Date.now(),
    model: response.model,
    routeUsed: response.routeUsed,
    rating: null,
  };
  thread.messages.push(assistantMsg);

  return assistantMsg;
}

/**
 * Prepend RAG context to a user message so the assistant can cite sources.
 */
function buildRagContext(userContent: string, citations: Citation[]): string {
  if (!citations.length) return userContent;
  const contextBlock = citations
    .map(
      (c, i) =>
        `[Source ${i + 1}] ${c.sourceFile}${c.pageNumber ? ` p.${c.pageNumber}` : ''}:\n"${c.excerpt}"`
    )
    .join('\n\n');
  return `Relevant context:\n\n${contextBlock}\n\n---\n\nUser question: ${userContent}`;
}

export { engine };
export type { ReActStep, ApprovalRequest };
