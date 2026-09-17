import React from 'react';

export interface WireProps {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isSelected?: boolean;
  isInProgress?: boolean;
  onRemove?: () => void;
}

export const Wire: React.FC<WireProps> = ({
  id,
  x1,
  y1,
  x2,
  y2,
  isInProgress = false,
  onRemove,
}) => {
  const dx = Math.max(Math.abs(x2 - x1) * 0.5, 40);
  const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

  return (
    <g className="wire-group" id={id}>
      {/* Invisible wider hit area for easy mouse clicking/selection */}
      <path
        id={`wire-hit-${id}`}
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth="24"
        style={{ pointerEvents: isInProgress ? 'none' : 'auto', cursor: isInProgress ? 'default' : 'pointer' }}
        onClick={(e) => {
          if (isInProgress) return;
          e.stopPropagation();
          onRemove?.();
        }}
      />
      {/* Visible styled wire path */}
      <path
        className={`wire-path ${isInProgress ? 'in-progress' : ''}`}
        d={path}
        style={{ pointerEvents: isInProgress ? 'none' : 'auto' }}
        onClick={(e) => {
          if (isInProgress) return;
          e.stopPropagation();
          onRemove?.();
        }}
      >
        <title>Click to remove connection</title>
      </path>
    </g>
  );
};
