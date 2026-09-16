import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VisualNode, type VisualNodeData } from './VisualNode.js';
import { WireLayer, type WireConnectionItem } from './WireLayer.js';
import { NODES_BY_TYPE } from '../../../backend/nodes/allNodes.js';

export interface CanvasProps {
  nodes: VisualNodeData[];
  connections: WireConnectionItem[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onMoveNode: (id: string, deltaX: number, deltaY: number) => void;
  onDeleteNode: (id: string) => void;
  onAddNode: (type: string, clientX?: number, clientY?: number) => void;
  onConnectPorts: (sourceNodeId: string, sourcePortId: string, targetNodeId: string, targetPortId: string) => void;
  onRemoveConnection: (id: string) => void;
  onOpenCodeEditor: (node: VisualNodeData) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  nodes,
  connections,
  selectedNodeId,
  onSelectNode,
  onMoveNode,
  onDeleteNode,
  onAddNode,
  onConnectPorts,
  onRemoveConnection,
  onOpenCodeEditor,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  const viewportRef = useRef<HTMLDivElement>(null);

  // Active wire in-progress state
  const [connectingWire, setConnectingWire] = useState<{
    sourceNodeId: string;
    sourcePortId: string;
    isInput: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Pan canvas on drag background
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Middle click always pans
    if (e.button === 1) {
      onSelectNode(null);
      setIsPanning(true);
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    // Only pan on primary left mouse button
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;

    // Do NOT pan if interacting with a node, port, control buttons, or interactive wire
    if (
      target.closest('.visual-node') ||
      target.closest('.port-handle') ||
      target.closest('.canvas-controls') ||
      target.closest('.canvas-info-bar') ||
      target.closest('.wire-group') ||
      target.closest('button') ||
      target.closest('input')
    ) {
      return;
    }

    onSelectNode(null);
    setIsPanning(true);
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  // Window-level mouse listeners for smooth, uninterrupted panning
  useEffect(() => {
    if (!isPanning) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      setPan({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      });
    };

    const handleWindowMouseUp = () => {
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isPanning]);

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (connectingWire && viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      const currentX = (e.clientX - rect.left - pan.x) / zoom;
      const currentY = (e.clientY - rect.top - pan.y) / zoom;
      setConnectingWire((prev) => (prev ? { ...prev, currentX, currentY } : null));
    }
  };

  const handleCanvasMouseUp = () => {
    if (connectingWire) {
      setConnectingWire(null);
    }
  };

  // Zoom via wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.25), 2.5));
  };

  // Keyboard shortcut listener: Delete or Backspace deletes selected node
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        onDeleteNode(selectedNodeId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, onDeleteNode]);

  // Drag-and-drop from NodePalette onto Canvas
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData('text/plain');
    if (!nodeType) return;

    if (viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left - pan.x) / zoom;
      const canvasY = (e.clientY - rect.top - pan.y) / zoom;
      onAddNode(nodeType, canvasX, canvasY);
    } else {
      onAddNode(nodeType);
    }
  };

  // Wiring callbacks
  const handleStartConnect = (
    nodeId: string,
    portId: string,
    isInput: boolean,
    screenStartX: number,
    screenStartY: number
  ) => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const startX = (screenStartX - rect.left - pan.x) / zoom;
    const startY = (screenStartY - rect.top - pan.y) / zoom;

    setConnectingWire({
      sourceNodeId: nodeId,
      sourcePortId: portId,
      isInput,
      startX,
      startY,
      currentX: startX,
      currentY: startY,
    });
  };

  const handleEndConnect = (targetNodeId: string, targetPortId: string, isInput: boolean) => {
    if (!connectingWire) return;

    if (connectingWire.sourceNodeId === targetNodeId) {
      setConnectingWire(null);
      return;
    }

    // Connect from output to input or vice-versa
    if (!connectingWire.isInput && isInput) {
      onConnectPorts(
        connectingWire.sourceNodeId,
        connectingWire.sourcePortId,
        targetNodeId,
        targetPortId
      );
    } else if (connectingWire.isInput && !isInput) {
      onConnectPorts(
        targetNodeId,
        targetPortId,
        connectingWire.sourceNodeId,
        connectingWire.sourcePortId
      );
    }

    setConnectingWire(null);
  };

  // Node position index for WireLayer
  const nodePositions = React.useMemo(() => {
    const pos: Record<string, { x: number; y: number; width?: number }> = {};
    for (const node of nodes) {
      pos[node.id] = {
        x: node.visualData.x,
        y: node.visualData.y,
        width: node.visualData.width || 230,
      };
    }
    return pos;
  }, [nodes]);

  return (
    <div
      ref={viewportRef}
      id="canvas-viewport"
      className={`canvas-viewport ${isPanning ? 'panning' : ''}`}
      style={{
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
      }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        id="canvas-transform-layer"
        className="canvas-transform-layer"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        <WireLayer
          connections={connections}
          nodePositions={nodePositions}
          activeConnection={connectingWire}
          onRemoveConnection={onRemoveConnection}
        />

        {nodes.map((node) => (
          <VisualNode
            key={node.id}
            node={node}
            isSelected={node.id === selectedNodeId}
            onSelect={(id) => onSelectNode(id)}
            onMove={(id, dx, dy) => onMoveNode(id, dx / zoom, dy / zoom)}
            onDelete={onDeleteNode}
            onOpenCodeEditor={onOpenCodeEditor}
            onStartConnect={handleStartConnect}
            onEndConnect={handleEndConnect}
          />
        ))}
      </div>

      {/* Floating Canvas Controls */}
      <div className="canvas-controls" id="canvas-controls">
        <button
          type="button"
          id="zoom-out-btn"
          title="Zoom Out"
          onClick={() => setZoom((z) => Math.max(z * 0.85, 0.25))}
        >
          -
        </button>
        <span className="zoom-level-text" id="zoom-level-indicator">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          id="zoom-in-btn"
          title="Zoom In"
          onClick={() => setZoom((z) => Math.min(z * 1.15, 2.5))}
        >
          +
        </button>
        <button
          type="button"
          id="zoom-reset-btn"
          title="Reset View"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          ⟲
        </button>
      </div>

      {/* Canvas Status Info */}
      <div className="canvas-info-bar">
        <div className="info-item">
          <span>Nodes:</span> <strong id="canvas-node-count">{nodes.length}</strong>
        </div>
        <div className="info-item">
          <span>Wires:</span> <strong id="canvas-wire-count">{connections.length}</strong>
        </div>
        <div className="info-item">
          <span>Pan:</span> <span id="canvas-pan-coords">{Math.round(pan.x)}, {Math.round(pan.y)}</span>
        </div>
      </div>
    </div>
  );
};
