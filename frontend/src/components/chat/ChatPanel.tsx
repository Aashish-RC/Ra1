import React, { useState, useCallback, useRef } from 'react';
import { MessageList } from './MessageList.js';
import { MessageInput } from './MessageInput.js';
import { RagDocumentUpload } from './RagDocumentUpload.js';
import {
  createThread,
  sendMessage,
  resolveApproval,
  type ChatMessage,
  type Citation,
  type Thread,
} from '../../../../backend/chat/chatService.js';
import { retrieve } from '../../../../backend/rag/retriever.js';

// Model options matching the Phase 2 model catalog selection
const MODEL_OPTIONS = [
  { value: '', label: '🤖 Auto' },
  { value: 'anthropic/claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'openai/gpt-4o', label: 'GPT-4o' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'google/gemini-flash-1.5', label: 'Gemini Flash 1.5' },
  { value: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B' },
  { value: 'mistralai/mistral-large', label: 'Mistral Large' },
];

export interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPanel: (type: 'editor' | 'sandbox' | 'table' | 'pdf', payload?: unknown) => void;
  onCitationClick: (citation: Citation) => void;
}

/**
 * Main chat side-panel.
 * Wires MessageList + MessageInput + RagDocumentUpload into a cohesive chat surface.
 * Bridges to the Phase 2 ModelEngine via chatService.
 *
 * Reference: LibreChat panel layout (UI/UX reference only, no code copied).
 */
export const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  onClose,
  onOpenPanel,
  onCitationClick,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [showRagUpload, setShowRagUpload] = useState(false);
  const [indexedSources, setIndexedSources] = useState<string[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [ragError, setRagError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const threadRef = useRef<Thread | null>(null);

  // Lazy-init thread
  const getThread = useCallback(() => {
    if (!threadRef.current) {
      threadRef.current = createThread(selectedModel || undefined);
    }
    return threadRef.current;
  }, [selectedModel]);

  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const handleSend = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || isSending) return;
    setInputValue('');
    setIsSending(true);

    try {
      const thread = getThread();

      // Retrieve RAG context if documents are indexed
      const citations = indexedSources.length > 0 ? await retrieve(content) : [];

      const response = await sendMessage(
        thread,
        content,
        undefined,
        citations,
        () => {
          // Immediately sync thread so approval card renders while execution halts
          setMessages([...thread.messages]);
        }
      );

      // Sync thread messages to local state
      setMessages([...thread.messages]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: `❌ Error: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  }, [inputValue, isSending, getThread, indexedSources]);

  const handleResolveApproval = useCallback((approvalId: string, decision: 'approved' | 'cancelled') => {
    const thread = getThread();
    resolveApproval(thread, approvalId, decision);
    setMessages([...thread.messages]);
  }, [getThread]);

  const handleEdit = useCallback((message: ChatMessage) => {
    setInputValue(message.content);
  }, []);

  const handleRetry = useCallback(async (message: ChatMessage) => {
    if (isSending) return;
    // Find the user message preceding this assistant message
    const idx = messages.findIndex((m) => m.id === message.id);
    if (idx > 0) {
      const prevUser = messages.slice(0, idx).reverse().find((m) => m.role === 'user');
      if (prevUser) {
        setInputValue(prevUser.content);
      }
    }
  }, [messages, isSending]);

  const handleRate = useCallback((messageId: string, rating: 'up' | 'down') => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, rating } : m))
    );
  }, []);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => showNotification('Copied!'));
  }, [showNotification]);

  const handleClear = useCallback(() => {
    setMessages([]);
    threadRef.current = null;
  }, []);

  const handleModelChange = useCallback((model: string) => {
    setSelectedModel(model);
    threadRef.current = null; // Reset thread on model change
  }, []);

  const handleFileAttach = useCallback((file: File) => {
    // If it's a CSV, open the data table panel
    if (file.name.endsWith('.csv')) {
      file.text().then((csvText) => {
        onOpenPanel('table', { csvText, fileName: file.name });
      });
    } else {
      // Otherwise treat as a RAG document
      setShowRagUpload(true);
    }
  }, [onOpenPanel]);

  const handleFileIndexed = useCallback((sourceFile: string, chunkCount: number) => {
    setIndexedSources((prev) => [...new Set([...prev, sourceFile])]);
    showNotification(`✅ Indexed "${sourceFile}" (${chunkCount} chunks)`);
    setRagError(null);
  }, [showNotification]);

  if (!isOpen) return null;

  return (
    <div className="chat-panel" id="chat-panel" role="complementary" aria-label="AI Chat Panel">
      {/* Header */}
      <div className="chat-panel-header">
        <div className="chat-panel-title">
          <span className="chat-panel-icon">🤖</span>
          <span>Ra1 Assistant</span>
        </div>
        <div className="chat-panel-controls">
          {/* Model selector */}
          <select
            className="chat-model-selector"
            id="chat-model-selector"
            value={selectedModel}
            onChange={(e) => handleModelChange(e.target.value)}
            title="Select AI model"
          >
            {MODEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* RAG toggle */}
          <button
            className={`chat-header-btn ${showRagUpload ? 'chat-header-btn--active' : ''}`}
            id="chat-rag-toggle"
            title="Toggle document upload (RAG)"
            onClick={() => setShowRagUpload((v) => !v)}
          >
            📄
          </button>

          {/* Clear */}
          <button
            className="chat-header-btn"
            id="chat-clear-btn"
            title="Clear conversation"
            onClick={handleClear}
          >
            🗑️
          </button>

          {/* Close */}
          <button
            className="chat-header-btn chat-close-btn"
            id="chat-close-btn"
            title="Close chat panel"
            onClick={onClose}
            aria-label="Close chat"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Notification toast */}
      {notification && (
        <div className="chat-notification" role="status" aria-live="polite">
          {notification}
        </div>
      )}

      {/* RAG Upload */}
      {showRagUpload && (
        <RagDocumentUpload
          onFileIndexed={handleFileIndexed}
          onError={(msg) => setRagError(msg)}
          isIndexing={isIndexing}
          setIsIndexing={setIsIndexing}
          indexedSources={indexedSources}
        />
      )}
      {ragError && (
        <div className="rag-error" role="alert">{ragError}</div>
      )}

      {/* Message list */}
      <MessageList
        messages={messages}
        onCopy={handleCopy}
        onEdit={handleEdit}
        onRetry={handleRetry}
        onRate={handleRate}
        onCitationClick={onCitationClick}
        onOpenInEditor={(text) => onOpenPanel('editor', { content: text })}
        onOpenInSandbox={(code, lang) => onOpenPanel('sandbox', { code, language: lang })}
        onResolveApproval={handleResolveApproval}
        isSending={isSending}
      />

      {/* Input bar */}
      <MessageInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        onFileAttach={handleFileAttach}
        isSending={isSending}
      />
    </div>
  );
};
