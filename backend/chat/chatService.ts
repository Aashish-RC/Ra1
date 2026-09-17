/**
 * Chat Service — thin bridge between Chat UI and the Phase 2 ModelEngine.
 *
 * Maintains a per-session Thread (ordered EngineMessage history) and dispatches
 * every user turn through ModelEngine.execute(), returning the assistant reply.
 *
 * Real vs. Mock:
 *  - When OPENROUTER_API_KEY / AGGREGATOR_API_KEY is set → real pooled-aggregator route.
 *  - When no key is set → MockAdapter path (engine simulated mode), deterministic in tests.
 */

import { ModelEngine } from '../engine/index.js';
import type { EngineMessage, MultimodalAttachment } from '../engine/types.js';
import { nanoid } from 'nanoid';

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
  messages: ChatMessage[];
  model?: string; // explicit model override (dropdown)
}

// Singleton engine instance shared across all threads
const engine = new ModelEngine();

export function createThread(modelOverride?: string): Thread {
  return {
    id: `thread-${nanoid(8)}`,
    messages: [],
    model: modelOverride,
  };
}

/**
 * Send a user message and get an assistant reply.
 * Mutations the thread in place (appends both user and assistant messages).
 */
export async function sendMessage(
  thread: Thread,
  userContent: string,
  attachments?: MultimodalAttachment[],
  citations?: Citation[]
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

  // Build engine message history (EngineMessage[])
  const engineMessages: EngineMessage[] = thread.messages.map((m) => ({
    role: m.role,
    content: m.role === 'user' && citations && citations.length > 0
      ? buildRagContext(m.content, citations)
      : m.content,
    attachments: m.attachments,
  }));

  // Execute through model engine
  const response = await engine.execute({
    messages: engineMessages,
    selectionMode: thread.model ? 'dropdown' : 'auto',
    model: thread.model,
  });

  // Append assistant message to thread
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
