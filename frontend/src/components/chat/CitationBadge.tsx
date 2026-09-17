import React from 'react';
import type { Citation } from '../../../../backend/chat/chatService.js';

interface CitationBadgeProps {
  citations: Citation[];
  onCitationClick: (citation: Citation) => void;
}

/**
 * Renders inline [1] [2] citation badges in chat messages.
 * Clicking a badge triggers the PDF viewer to jump to that source location.
 */
export const CitationBadge: React.FC<CitationBadgeProps> = ({ citations, onCitationClick }) => {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="citation-list" role="list" aria-label="Source citations">
      <span className="citation-label">Sources:</span>
      {citations.map((c) => (
        <button
          key={c.chunkId}
          className="citation-badge"
          id={`citation-badge-${c.chunkId}`}
          title={`${c.sourceFile}${c.pageNumber ? `, page ${c.pageNumber}` : ''}: "${c.excerpt}"`}
          onClick={() => onCitationClick(c)}
          role="listitem"
        >
          [{c.index}]
        </button>
      ))}
    </div>
  );
};

/**
 * Inline citation marker rendered within message text.
 * Used when markdown content already contains [n] references.
 */
export const InlineCitation: React.FC<{
  index: number;
  onCitationClick: () => void;
}> = ({ index, onCitationClick }) => (
  <button
    className="citation-badge citation-inline"
    onClick={onCitationClick}
    title={`Jump to source ${index}`}
  >
    [{index}]
  </button>
);
