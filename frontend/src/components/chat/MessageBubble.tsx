import React, { useCallback, useMemo } from 'react';
import type { ChatMessage, Citation } from '../../../../backend/chat/chatService.js';
import { CitationBadge } from './CitationBadge.js';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import katex from 'katex';

function renderMarkdown(text: string): string {
  if (!text) return '';

  // Process KaTeX math before markdown: $$...$$ and $...$
  let processed = text
    .replace(/\$\$([^$]+)\$\$/gs, (_, math) => {
      try {
        return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
      } catch {
        return `$$${math}$$`;
      }
    })
    .replace(/\$([^$\n]+)\$/g, (_, math) => {
      try {
        return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
      } catch {
        return `$${math}$`;
      }
    });

  const rawHtml = marked.parse(processed, { async: false }) as string;
  const sanitized = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li',
      'blockquote', 'h1', 'h2', 'h3', 'h4', 'a', 'table', 'thead',
      'tbody', 'tr', 'th', 'td', 'hr', 'span', 'div', 'math',
      'semantics', 'mrow', 'mn', 'mi', 'mo', 'msup', 'mfrac',
      'msqrt', 'annotation', 'svg', 'path', 'g', 'defs', 'use',
    ],
    ALLOWED_ATTR: ['class', 'href', 'target', 'rel', 'style', 'd', 'viewBox', 'xmlns'],
  });

  return sanitized;
}

interface MessageBubbleProps {
  message: ChatMessage;
  onCopy: (text: string) => void;
  onEdit: (message: ChatMessage) => void;
  onRetry: (message: ChatMessage) => void;
  onRate: (messageId: string, rating: 'up' | 'down') => void;
  onCitationClick: (citation: Citation) => void;
  onOpenInEditor: (text: string) => void;
  onOpenInSandbox: (code: string, lang: string) => void;
}

/**
 * Individual chat message bubble with markdown/math rendering and action buttons.
 * Design reference: LibreChat message layout (UI/UX reference only, no code copied).
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onCopy,
  onEdit,
  onRetry,
  onRate,
  onCitationClick,
  onOpenInEditor,
  onOpenInSandbox,
}) => {
  const renderedHtml = useMemo(() => renderMarkdown(message.content), [message.content]);
  const [showActions, setShowActions] = React.useState(false);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isLong = message.content.length > 200;

  // Detect code blocks for sandbox opening
  const codeMatch = message.content.match(/```(\w+)?\n([\s\S]*?)```/);
  const hasCode = Boolean(codeMatch && codeMatch[2]);
  const codeLanguage = codeMatch?.[1] ?? 'js';
  const codeContent = codeMatch?.[2] ?? '';

  const handleCopy = useCallback(() => onCopy(message.content), [onCopy, message.content]);
  const handleEdit = useCallback(() => onEdit(message), [onEdit, message]);
  const handleRetry = useCallback(() => onRetry(message), [onRetry, message]);

  const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`message-bubble message-bubble--${message.role}`}
      id={`message-${message.id}`}
      data-message-id={message.id}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="message-role-badge">
        {isUser ? '👤' : isAssistant ? '🤖' : '⚙️'}
        <span className="message-role-label">
          {isUser ? 'You' : isAssistant ? (message.model?.split('/').pop() ?? 'Assistant') : 'System'}
        </span>
        <span className="message-timestamp">{timestamp}</span>
      </div>

      <div className="message-content">
        {renderedHtml ? (
          // eslint-disable-next-line react/no-danger
          <div
            className="message-markdown"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        ) : (
          <div className="message-plain">{message.content}</div>
        )}
      </div>

      {/* Citation badges */}
      {message.citations && message.citations.length > 0 && (
        <CitationBadge
          citations={message.citations}
          onCitationClick={onCitationClick}
        />
      )}

      {/* Message action buttons */}
      <div className={`message-actions ${showActions ? 'message-actions--visible' : ''}`}>
        <button
          className="msg-action-btn"
          id={`msg-copy-${message.id}`}
          title="Copy message"
          onClick={handleCopy}
        >
          📋 Copy
        </button>

        {isUser && (
          <button
            className="msg-action-btn"
            id={`msg-edit-${message.id}`}
            title="Edit and re-send"
            onClick={handleEdit}
          >
            ✏️ Edit
          </button>
        )}

        {isAssistant && (
          <button
            className="msg-action-btn"
            id={`msg-retry-${message.id}`}
            title="Retry this response"
            onClick={handleRetry}
          >
            🔄 Retry
          </button>
        )}

        {isAssistant && isLong && (
          <button
            className="msg-action-btn"
            id={`msg-editor-${message.id}`}
            title="Open in document editor"
            onClick={() => onOpenInEditor(message.content)}
          >
            📝 Editor
          </button>
        )}

        {isAssistant && hasCode && ['html', 'js', 'jsx', 'ts', 'tsx', 'javascript', 'typescript'].includes(codeLanguage) && (
          <button
            className="msg-action-btn"
            id={`msg-sandbox-${message.id}`}
            title="Open in code sandbox"
            onClick={() => onOpenInSandbox(codeContent, codeLanguage)}
          >
            ▶ Sandbox
          </button>
        )}

        {isAssistant && (
          <>
            <button
              className={`msg-action-btn msg-thumbs ${message.rating === 'up' ? 'msg-thumbs--active' : ''}`}
              id={`msg-thumbup-${message.id}`}
              title="Good response"
              onClick={() => onRate(message.id, 'up')}
            >
              👍
            </button>
            <button
              className={`msg-action-btn msg-thumbs ${message.rating === 'down' ? 'msg-thumbs--active' : ''}`}
              id={`msg-thumbdown-${message.id}`}
              title="Poor response"
              onClick={() => onRate(message.id, 'down')}
            >
              👎
            </button>
          </>
        )}
      </div>

      {message.routeUsed && (
        <div className="message-meta">
          via <span className="message-route">{message.routeUsed}</span>
        </div>
      )}
    </div>
  );
};
