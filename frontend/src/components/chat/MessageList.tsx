import React, { useEffect, useRef } from 'react';
import type { ChatMessage, Citation } from '../../../../backend/chat/chatService.js';
import { MessageBubble } from './MessageBubble.js';

interface MessageListProps {
  messages: ChatMessage[];
  onCopy: (text: string) => void;
  onEdit: (message: ChatMessage) => void;
  onRetry: (message: ChatMessage) => void;
  onRate: (messageId: string, rating: 'up' | 'down') => void;
  onCitationClick: (citation: Citation) => void;
  onOpenInEditor: (text: string) => void;
  onOpenInSandbox: (code: string, lang: string) => void;
  onResolveApproval?: (approvalId: string, decision: 'approved' | 'cancelled') => void;
  isSending: boolean;
}

/**
 * Scrollable message list — auto-scrolls to the latest message.
 * Design reference: LibreChat message list layout (reference only, no code copied).
 */
export const MessageList: React.FC<MessageListProps> = ({
  messages,
  onCopy,
  onEdit,
  onRetry,
  onRate,
  onCitationClick,
  onOpenInEditor,
  onOpenInSandbox,
  onResolveApproval,
  isSending,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isSending]);

  return (
    <div className="message-list" id="message-list" role="log" aria-live="polite" aria-label="Chat messages">
      {messages.length === 0 && (
        <div className="message-list-empty">
          <div className="message-list-empty-icon">🤖</div>
          <div className="message-list-empty-title">Ra1 Assistant</div>
          <div className="message-list-empty-subtitle">
            Ask anything. Upload docs for context. Try code, math, or analysis.
          </div>
          <div className="message-list-suggestions">
            <button
              className="suggestion-chip"
              onClick={() => {
                /* placeholder — parent wires up */
              }}
            >
              💡 Explain quantum entanglement
            </button>
            <button className="suggestion-chip">
              🧮 Solve: ∫₀¹ x² dx
            </button>
            <button className="suggestion-chip">
              🐍 Write a Python quicksort
            </button>
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          onCopy={onCopy}
          onEdit={onEdit}
          onRetry={onRetry}
          onRate={onRate}
          onCitationClick={onCitationClick}
          onOpenInEditor={onOpenInEditor}
          onOpenInSandbox={onOpenInSandbox}
          onResolveApproval={onResolveApproval}
        />
      ))}

      {/* Typing indicator */}
      {isSending && (
        <div className="message-bubble message-bubble--assistant message-typing" id="message-typing-indicator">
          <div className="message-role-badge">
            <span>🤖</span>
            <span className="message-role-label">Assistant</span>
          </div>
          <div className="typing-dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
