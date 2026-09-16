import React from 'react';

export interface PortProps {
  nodeId: string;
  portId: string;
  title: string;
  dataType: string;
  isInput: boolean;
  onStartConnect?: (nodeId: string, portId: string, isInput: boolean, startX: number, startY: number) => void;
  onEndConnect?: (nodeId: string, portId: string, isInput: boolean) => void;
}

const TYPE_COLORS: Record<string, string> = {
  string: '#10b981',
  number: '#3b82f6',
  boolean: '#f59e0b',
  'chat-message': '#8b5cf6',
  object: '#ec4899',
  array: '#06b6d4',
  image: '#f97316',
  audio: '#e11d48',
  document: '#6366f1',
  vector: '#14b8a6',
  any: '#a1a1aa',
};

export const Port: React.FC<PortProps> = ({
  nodeId,
  portId,
  title,
  dataType,
  isInput,
  onStartConnect,
  onEndConnect,
}) => {
  const color = TYPE_COLORS[dataType] || '#818cf8';

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    onStartConnect?.(nodeId, portId, isInput, startX, startY);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEndConnect?.(nodeId, portId, isInput);
  };

  return (
    <div
      className="port-row"
      data-node-id={nodeId}
      data-port-id={portId}
      data-is-input={isInput ? 'true' : 'false'}
    >
      {isInput && (
        <div
          id={`port-${nodeId}-${portId}`}
          className="port-handle"
          style={{ borderColor: color }}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          title={`${title} (${dataType})`}
        />
      )}
      <span className="port-label">{title}</span>
      {!isInput && (
        <div
          id={`port-${nodeId}-${portId}`}
          className="port-handle"
          style={{ borderColor: color }}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          title={`${title} (${dataType})`}
        />
      )}
    </div>
  );
};
