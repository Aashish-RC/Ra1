import React, { useRef } from 'react';
import { Port } from './Port.js';

export interface VisualNodeData {
  id: string;
  type: string;
  title: string;
  visualData: {
    x: number;
    y: number;
    width?: number;
    zIndex?: number;
  };
  inputs: Array<{ id: string; title: string; dataType: string }>;
  outputs: Array<{ id: string; title: string; dataType: string }>;
  data: Record<string, unknown>;
  customCode?: string;
}

export interface VisualNodeProps {
  node: VisualNodeData;
  isSelected: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onMove: (id: string, deltaX: number, deltaY: number) => void;
  onDelete: (id: string) => void;
  onOpenCodeEditor: (node: VisualNodeData) => void;
  onStartConnect: (nodeId: string, portId: string, isInput: boolean, startX: number, startY: number) => void;
  onEndConnect: (nodeId: string, portId: string, isInput: boolean) => void;
}

export const VisualNode: React.FC<VisualNodeProps> = ({
  node,
  isSelected,
  onSelect,
  onMove,
  onDelete,
  onOpenCodeEditor,
  onStartConnect,
  onEndConnect,
}) => {
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.id, e);
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };

    const handleMouseMove = (moveEv: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = moveEv.clientX - dragStart.current.x;
      const dy = moveEv.clientY - dragStart.current.y;
      dragStart.current = { x: moveEv.clientX, y: moveEv.clientY };
      onMove(node.id, dx, dy);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenCodeEditor(node);
  };

  // Preview snippet (incorporates Langflow editable customCode when customized)
  const snippet =
    typeof node.customCode === 'string' && node.customCode.trim().length > 0
      ? (node.customCode.split('\n').find((l) => {
          const t = l.trim();
          return t.length > 0 && !t.startsWith('//') && !t.startsWith('/*') && !t.startsWith('*') && !t.startsWith('import');
        })?.trim() || 'Custom Node Implementation')
      : typeof node.data?.code === 'string'
      ? node.data.code.split('\n')[0]
      : typeof node.data?.template === 'string'
      ? node.data.template
      : typeof node.data?.text === 'string'
      ? node.data.text
      : typeof node.data?.model === 'string'
      ? `Model: ${node.data.model}`
      : null;

  return (
    <div
      id={`node-${node.id}`}
      className={`visual-node ${isSelected ? 'selected' : ''}`}
      style={{
        transform: `translate3d(${node.visualData.x}px, ${node.visualData.y}px, 0)`,
        width: node.visualData.width || 230,
        zIndex: node.visualData.zIndex || 1,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      data-node-id={node.id}
      data-node-type={node.type}
    >
      <div className="node-header">
        <div className="node-title-group">
          <div className="node-type-indicator" />
          <span className="node-title" title={node.title}>
            {node.title}
          </span>
        </div>
        <div className="node-actions">
          <button
            type="button"
            className="node-action-btn edit-code-btn"
            id={`edit-node-${node.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpenCodeEditor(node);
            }}
            title="Open editable code view"
          >
            Code
          </button>
          <button
            type="button"
            className="node-action-btn delete"
            id={`delete-node-${node.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            title="Delete node"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="node-body">
        <div className="node-ports-container">
          <div className="ports-column inputs">
            {node.inputs.map((inp) => (
              <Port
                key={inp.id}
                nodeId={node.id}
                portId={inp.id}
                title={inp.title}
                dataType={inp.dataType}
                isInput={true}
                onStartConnect={onStartConnect}
                onEndConnect={onEndConnect}
              />
            ))}
          </div>
          <div className="ports-column outputs">
            {node.outputs.map((out) => (
              <Port
                key={out.id}
                nodeId={node.id}
                portId={out.id}
                title={out.title}
                dataType={out.dataType}
                isInput={false}
                onStartConnect={onStartConnect}
                onEndConnect={onEndConnect}
              />
            ))}
          </div>
        </div>

        {snippet && <div className="node-preview-box">{snippet}</div>}
      </div>
    </div>
  );
};
