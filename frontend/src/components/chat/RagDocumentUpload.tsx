import React, { useRef, useCallback } from 'react';

interface RagDocumentUploadProps {
  onFileIndexed: (sourceFile: string, chunkCount: number) => void;
  onError: (message: string) => void;
  isIndexing: boolean;
  setIsIndexing: (v: boolean) => void;
  indexedSources: string[];
}

/**
 * Drag-drop / file-picker for RAG document upload in the chat panel.
 * Reads the file client-side and calls the backend ingestText endpoint.
 * Reference: AnythingLLM workspace ingestion pattern (reference only).
 */
export const RagDocumentUpload: React.FC<RagDocumentUploadProps> = ({
  onFileIndexed,
  onError,
  isIndexing,
  setIsIndexing,
  indexedSources,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (isIndexing) return;

      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      const supported = ['txt', 'md', 'markdown'];
      if (!supported.includes(ext)) {
        // PDF and DOCX require server-side extraction; for browser we accept text only
        onError(`For browser uploads, use .txt or .md files. PDF/DOCX requires server-side processing.`);
        return;
      }

      setIsIndexing(true);
      try {
        const text = await file.text();

        // Call the backend-style ingestion via a browser-compatible stub
        // In a real server setup this would be a fetch('/api/rag/ingest') call
        const { ingestText } = await import('../../../../backend/rag/documentIngestion.js');
        const result = await ingestText(text, file.name);
        onFileIndexed(result.sourceFile, result.chunkCount);
      } catch (err) {
        onError(`Indexing failed: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsIndexing(false);
      }
    },
    [isIndexing, setIsIndexing, onFileIndexed, onError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="rag-upload-section">
      <div
        className={`rag-drop-zone ${isIndexing ? 'rag-drop-zone--indexing' : ''}`}
        id="rag-drop-zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !isIndexing && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload document for RAG indexing"
      >
        <span className="rag-drop-icon">{isIndexing ? '⏳' : '📄'}</span>
        <span className="rag-drop-text">
          {isIndexing ? 'Indexing…' : 'Drop .txt/.md here or click to browse'}
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.markdown"
          style={{ display: 'none' }}
          id="rag-file-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
      </div>

      {indexedSources.length > 0 && (
        <div className="rag-indexed-list" id="rag-indexed-list">
          <span className="rag-indexed-label">Indexed documents:</span>
          {indexedSources.map((src) => (
            <span key={src} className="rag-indexed-badge" title={src}>
              ✅ {src.length > 24 ? `${src.slice(0, 22)}…` : src}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
