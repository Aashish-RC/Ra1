import React from 'react';
import { Wire } from './Wire.js';

export interface WireConnectionItem {
  id: string;
  outputNodeId: string;
  outputId: string;
  inputNodeId: string;
  inputId: string;
}

export interface WireLayerProps {
  connections: WireConnectionItem[];
  nodePositions: Record<string, { x: number; y: number; width?: number }>;
  activeConnection: {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null;
  onRemoveConnection: (id: string) => void;
}

export const WireLayer: React.FC<WireLayerProps> = ({
  connections,
  nodePositions,
  activeConnection,
  onRemoveConnection,
}) => {
  return (
    <svg
      className="wire-svg-layer"
      id="wire-svg-layer"
      width="5000"
      height="5000"
      style={{ overflow: 'visible' }}
    >
      {connections.map((conn) => {
        const sourcePos = nodePositions[conn.outputNodeId];
        const targetPos = nodePositions[conn.inputNodeId];

        if (!sourcePos || !targetPos) return null;

        // Port offsets (source right, target left)
        const x1 = sourcePos.x + (sourcePos.width || 220);
        const y1 = sourcePos.y + 60;
        const x2 = targetPos.x;
        const y2 = targetPos.y + 60;

        return (
          <Wire
            key={conn.id}
            id={`wire-${conn.id}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            onRemove={() => onRemoveConnection(conn.id)}
          />
        );
      })}

      {activeConnection && (
        <Wire
          id="wire-in-progress"
          x1={activeConnection.startX}
          y1={activeConnection.startY}
          x2={activeConnection.currentX}
          y2={activeConnection.currentY}
          isInProgress={true}
        />
      )}
    </svg>
  );
};
