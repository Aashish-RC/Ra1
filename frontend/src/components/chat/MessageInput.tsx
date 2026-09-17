import React, { useRef, useCallback } from 'react';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onFileAttach?: (file: File) => void;
  isSending: boolean;
  disabled?: boolean;
}

/**
 * Chat input bar.
 * Features:
 * - Auto-resize textarea (1–6 rows)
 * - Paste handler for images/files → attachment preview
 * - Drag-drop zone
 * - 🎤 Mic placeholder button (non-functional, future speech API)
 * - 📎 CSV/file attach button
 * - Send on Ctrl+Enter or click
 *
 * Reference: LibreChat input bar UI/UX (reference only, no code copied).
 */
export const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChange,
  onSend,
  onFileAttach,
  isSending,
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 20;
    const maxHeight = lineHeight * 6;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (!disabled && !isSending && value.trim()) {
        onSend();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    const fileItem = items.find((item) => item.kind === 'file');
    if (fileItem) {
      const file = fileItem.getAsFile();
      if (file && onFileAttach) {
        onFileAttach(file);
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && onFileAttach) {
      onFileAttach(file);
    }
  };

  return (
    <div className="chat-input-bar" id="chat-input-bar">
      <div className="chat-input-actions-left">
        {/* CSV / file attach */}
        <button
          type="button"
          className="chat-input-action-btn"
          id="chat-file-attach-btn"
          title="Attach file (CSV, TXT, MD)"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isSending}
        >
          📎
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,.md,.markdown,.pdf"
          style={{ display: 'none' }}
          id="chat-file-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onFileAttach) onFileAttach(file);
            e.target.value = '';
          }}
        />

        {/* Mic placeholder */}
        <button
          type="button"
          className="chat-input-action-btn chat-input-action-btn--disabled"
          id="chat-mic-btn"
          title="Speech input — coming soon"
          disabled
          aria-label="Microphone input (not available)"
        >
          🎤
        </button>
      </div>

      <textarea
        ref={textareaRef}
        className="chat-textarea"
        id="chat-textarea"
        value={value}
        placeholder="Ask anything… (Ctrl+Enter to send)"
        rows={1}
        disabled={disabled || isSending}
        onChange={(e) => {
          onChange(e.target.value);
          autoResize();
        }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        aria-label="Chat message input"
      />

      <button
        type="button"
        className={`chat-send-btn ${isSending ? 'chat-send-btn--sending' : ''}`}
        id="chat-send-btn"
        onClick={() => {
          if (!disabled && !isSending && value.trim()) onSend();
        }}
        disabled={disabled || isSending || !value.trim()}
        title="Send message (Ctrl+Enter)"
        aria-label="Send message"
      >
        {isSending ? (
          <span className="chat-send-spinner" aria-label="Sending" />
        ) : (
          '↑'
        )}
      </button>
    </div>
  );
};
