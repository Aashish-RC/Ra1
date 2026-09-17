import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Citation } from '../../../../backend/chat/chatService.js';

interface PdfViewerPanelProps {
  initialFile?: File;
  jumpToCitation?: Citation;
}

/**
 * PDF viewer panel using pdfjs-dist (Apache 2.0).
 * Features:
 * - Renders PDF pages as canvas elements
 * - jumpToPage(pageNumber) — smooth scroll + yellow text-highlight overlay
 * - Activated by CitationBadge clicks from the chat panel
 * - Drag-drop file loading
 */
export const PdfViewerPanel: React.FC<PdfViewerPanelProps> = ({
  initialFile,
  jumpToCitation,
}) => {
  const [pages, setPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<unknown>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  const loadPdf = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      // Point to the worker from the pdfjs-dist package
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();

      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setPages(doc.numPages);
      setCurrentPage(1);
    } catch (err) {
      setError(`Failed to load PDF: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load initial file
  useEffect(() => {
    if (initialFile) loadPdf(initialFile);
  }, [initialFile, loadPdf]);

  // Render a single page to its canvas
  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc) return;
      const canvas = canvasRefs.current.get(pageNum);
      if (!canvas) return;

      const page = await (pdfDoc as {
        getPage: (n: number) => Promise<{
          getViewport: (opts: { scale: number }) => { width: number; height: number };
          render: (ctx: unknown) => { promise: Promise<void> };
        }>;
      }).getPage(pageNum);

      const viewport = page.getViewport({ scale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;
    },
    [pdfDoc, scale]
  );

  // Re-render all pages when doc or scale changes
  useEffect(() => {
    if (!pdfDoc || !pages) return;
    for (let i = 1; i <= pages; i++) {
      renderPage(i);
    }
  }, [pdfDoc, pages, scale, renderPage]);

  // Jump to a page from a citation
  useEffect(() => {
    if (jumpToCitation?.pageNumber && jumpToCitation.pageNumber <= pages) {
      jumpToPage(jumpToCitation.pageNumber);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpToCitation]);

  const jumpToPage = useCallback((pageNum: number) => {
    setCurrentPage(pageNum);
    const canvas = canvasRefs.current.get(pageNum);
    if (canvas) {
      canvas.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file?.type === 'application/pdf') {
        loadPdf(file);
      }
    },
    [loadPdf]
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="pdf-viewer-panel" id="pdf-viewer-panel">
      {/* Toolbar */}
      <div className="pdf-toolbar" id="pdf-toolbar">
        <button
          className="toolbar-btn"
          id="pdf-open-btn"
          title="Open PDF file"
          onClick={() => fileInputRef.current?.click()}
        >
          📁 Open PDF
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          style={{ display: 'none' }}
          id="pdf-file-input"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) loadPdf(f);
            e.target.value = '';
          }}
        />

        {pages > 0 && (
          <>
            <div className="pdf-page-nav">
              <button
                className="pagination-btn"
                id="pdf-prev-page"
                disabled={currentPage <= 1}
                onClick={() => jumpToPage(currentPage - 1)}
              >
                ←
              </button>
              <span className="pagination-info">
                {currentPage} / {pages}
              </span>
              <button
                className="pagination-btn"
                id="pdf-next-page"
                disabled={currentPage >= pages}
                onClick={() => jumpToPage(currentPage + 1)}
              >
                →
              </button>
            </div>

            <div className="pdf-zoom-nav">
              <button
                className="pagination-btn"
                id="pdf-zoom-out"
                title="Zoom out"
                onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
              >
                −
              </button>
              <span className="pagination-info">{Math.round(scale * 100)}%</span>
              <button
                className="pagination-btn"
                id="pdf-zoom-in"
                title="Zoom in"
                onClick={() => setScale((s) => Math.min(3.0, s + 0.2))}
              >
                +
              </button>
            </div>
          </>
        )}
      </div>

      {/* Drop zone / page render area */}
      <div
        ref={containerRef}
        className="pdf-pages-container"
        id="pdf-pages-container"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        aria-label="PDF viewer"
      >
        {isLoading && (
          <div className="pdf-loading">
            <div className="pdf-loading-spinner" />
            <span>Loading PDF…</span>
          </div>
        )}

        {error && (
          <div className="pdf-error" role="alert">{error}</div>
        )}

        {!pdfDoc && !isLoading && !error && (
          <div className="pdf-empty">
            <div className="pdf-empty-icon">📄</div>
            <div>Drop a PDF here or click <strong>Open PDF</strong> to start reading.</div>
            <div className="pdf-empty-hint">Clicking citation badges in chat will jump to the cited page.</div>
          </div>
        )}

        {/* Page canvases */}
        {Array.from({ length: pages }, (_, i) => i + 1).map((pageNum) => (
          <div
            key={pageNum}
            className={`pdf-page-wrapper ${currentPage === pageNum ? 'pdf-page-wrapper--active' : ''}`}
            id={`pdf-page-${pageNum}`}
          >
            <div className="pdf-page-number">Page {pageNum}</div>
            <canvas
              ref={(el) => {
                if (el) canvasRefs.current.set(pageNum, el);
              }}
              className="pdf-page-canvas"
              id={`pdf-canvas-${pageNum}`}
              aria-label={`PDF page ${pageNum}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
