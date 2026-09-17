import React, { useState, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { Canvas } from './components/Canvas.js';
import { NodePalette } from './components/NodePalette.js';
import { CodeEditorModal } from './components/CodeEditorModal.js';
import { DebuggerPanel } from './components/DebuggerPanel.js';
import { YamlModal } from './components/YamlModal.js';
import { ChatPanel } from './components/chat/ChatPanel.js';
import { PanelManager } from './components/panels/PanelManager.js';
import { DocumentEditorPanel } from './components/panels/DocumentEditorPanel.js';
import { SandboxPanel } from './components/panels/SandboxPanel.js';
import { DataTablePanel } from './components/panels/DataTablePanel.js';
import { PdfViewerPanel } from './components/panels/PdfViewerPanel.js';
import { NODES_BY_TYPE } from '../../backend/nodes/allNodes.js';
import type { VisualNodeData } from './components/VisualNode.js';
import type { WireConnectionItem } from './components/WireLayer.js';
import type { PanelType, PanelPayload } from './components/panels/PanelManager.js';
import type { Citation } from '../../backend/chat/chatService.js';

export const App: React.FC = () => {
  // Pre-seed canvas with 2 initial connected nodes demonstrating foundation
  const [nodes, setNodes] = useState<VisualNodeData[]>([
    {
      id: 'node-init-1',
      type: 'text',
      title: 'Input Prompt Text',
      visualData: { x: 120, y: 140, width: 240, zIndex: 1 },
      inputs: [],
      outputs: [{ id: 'value', title: 'Text', dataType: 'string' }],
      data: { text: 'Hello Rivet AI Canvas!' },
    },
    {
      id: 'node-init-2',
      type: 'code',
      title: 'Transform Code',
      visualData: { x: 480, y: 140, width: 260, zIndex: 2 },
      inputs: [{ id: 'input', title: 'Inputs', dataType: 'any' }],
      outputs: [{ id: 'output', title: 'Output', dataType: 'any' }],
      data: {
        code: '// JavaScript/TypeScript transformation\nexport default async function({ input }) {\n  return { output: input.toUpperCase() };\n}',
      },
    },
  ]);

  const [connections, setConnections] = useState<WireConnectionItem[]>([
    {
      id: 'conn-init-1',
      outputNodeId: 'node-init-1',
      outputId: 'value',
      inputNodeId: 'node-init-2',
      inputId: 'input',
    },
  ]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Modals state
  const [editingNode, setEditingNode] = useState<VisualNodeData | null>(null);
  const [isDebuggerOpen, setIsDebuggerOpen] = useState(false);
  const [isYamlOpen, setIsYamlOpen] = useState(false);

  // Chat panel state
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Artifact panel state
  const [activePanel, setActivePanel] = useState<PanelType>('none');
  const [panelPayload, setPanelPayload] = useState<PanelPayload>({});
  const [jumpCitation, setJumpCitation] = useState<Citation | undefined>(undefined);

  // Open a specific artifact panel with payload
  const handleOpenPanel = useCallback(
    (type: PanelType, payload?: unknown) => {
      setPanelPayload((payload as PanelPayload) ?? {});
      setActivePanel(type);
    },
    []
  );

  // Citation click: jump to PDF viewer at the cited page
  const handleCitationClick = useCallback((citation: Citation) => {
    setPanelPayload({});
    setJumpCitation(citation);
    setActivePanel('pdf');
  }, []);

  // Add node handler
  const handleAddNode = (type: string, canvasX?: number, canvasY?: number) => {
    const catalog = NODES_BY_TYPE[type];
    const newNodeId = `node-${nanoid(8)}`;

    const newNode: VisualNodeData = {
      id: newNodeId,
      type,
      title: catalog ? catalog.title : type,
      visualData: {
        x: canvasX !== undefined ? canvasX : 240 + Math.random() * 80,
        y: canvasY !== undefined ? canvasY : 180 + Math.random() * 80,
        width: 240,
        zIndex: nodes.length + 1,
      },
      inputs: catalog ? [...catalog.defaultInputs] : [{ id: 'in', title: 'In', dataType: 'any' }],
      outputs: catalog ? [...catalog.defaultOutputs] : [{ id: 'out', title: 'Out', dataType: 'any' }],
      data: catalog ? { ...catalog.defaultData } : {},
    };

    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNodeId);
  };

  // Move node handler
  const handleMoveNode = (id: string, deltaX: number, deltaY: number) => {
    setNodes((prev) =>
      prev.map((node) => {
        if (node.id !== id) return node;
        return {
          ...node,
          visualData: {
            ...node.visualData,
            x: Math.round(node.visualData.x + deltaX),
            y: Math.round(node.visualData.y + deltaY),
          },
        };
      })
    );
  };

  // Delete node handler
  const handleDeleteNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    // Remove attached wires
    setConnections((prev) =>
      prev.filter((c) => c.outputNodeId !== id && c.inputNodeId !== id)
    );
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
    }
  };

  // Connect ports handler
  const handleConnectPorts = (
    sourceNodeId: string,
    sourcePortId: string,
    targetNodeId: string,
    targetPortId: string
  ) => {
    // Avoid duplicates
    const exists = connections.some(
      (c) =>
        c.outputNodeId === sourceNodeId &&
        c.outputId === sourcePortId &&
        c.inputNodeId === targetNodeId &&
        c.inputId === targetPortId
    );
    if (exists) return;

    const newConn: WireConnectionItem = {
      id: `conn-${nanoid(8)}`,
      outputNodeId: sourceNodeId,
      outputId: sourcePortId,
      inputNodeId: targetNodeId,
      inputId: targetPortId,
    };

    setConnections((prev) => [...prev, newConn]);
  };

  // Remove connection handler
  const handleRemoveConnection = (connectionId: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== connectionId));
  };

  // Save updated node data from CodeEditorModal (Langflow editable-node-code pattern)
  const handleSaveNodeData = (
    nodeId: string,
    updatedData: Record<string, unknown>,
    customCode?: string,
    newTitle?: string
  ) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: updatedData,
              ...(customCode !== undefined ? { customCode } : {}),
              ...(newTitle && newTitle.trim() ? { title: newTitle.trim() } : {}),
            }
          : n
      )
    );
  };

  // Load imported graph from YAML
  const handleLoadGraph = (
    importedNodes: VisualNodeData[],
    importedConnections: WireConnectionItem[]
  ) => {
    setNodes(importedNodes);
    setConnections(importedConnections);
    setSelectedNodeId(null);
  };

  // Render the active artifact panel content
  const renderPanelContent = () => {
    switch (activePanel) {
      case 'editor':
        return <DocumentEditorPanel initialContent={panelPayload.content} />;
      case 'sandbox':
        return (
          <SandboxPanel
            initialCode={panelPayload.code}
            initialLanguage={panelPayload.language}
          />
        );
      case 'table':
        return (
          <DataTablePanel
            initialCsv={panelPayload.csvText}
            fileName={panelPayload.fileName}
          />
        );
      case 'pdf':
        return (
          <PdfViewerPanel
            initialFile={panelPayload.pdfFile}
            jumpToCitation={jumpCitation}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      {/* Top Navigation Bar */}
      <header className="top-navbar">
        <div className="brand-section">
          <div className="brand-logo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          <span className="brand-title">
            Rivet Canvas Studio <span className="brand-badge">Phase 3 + 4</span>
          </span>
        </div>

        <div className="navbar-actions">
          {/* Chat panel toggle */}
          <button
            type="button"
            className={`btn ${isChatOpen ? 'btn-active' : ''}`}
            id="chat-panel-button"
            onClick={() => setIsChatOpen((v) => !v)}
            title="Open / close AI Chat Panel"
          >
            <span>💬</span> Chat
          </button>

          {/* Artifact panels direct toggles */}
          <button
            type="button"
            className={`btn ${activePanel === 'editor' ? 'btn-active' : ''}`}
            id="open-editor-panel-btn"
            onClick={() => setActivePanel((p) => (p === 'editor' ? 'none' : 'editor'))}
            title="Open Document Editor"
          >
            <span>📝</span> Editor
          </button>
          <button
            type="button"
            className={`btn ${activePanel === 'sandbox' ? 'btn-active' : ''}`}
            id="open-sandbox-panel-btn"
            onClick={() => setActivePanel((p) => (p === 'sandbox' ? 'none' : 'sandbox'))}
            title="Open Code Sandbox"
          >
            <span>▶</span> Sandbox
          </button>
          <button
            type="button"
            className={`btn ${activePanel === 'table' ? 'btn-active' : ''}`}
            id="open-table-panel-btn"
            onClick={() => setActivePanel((p) => (p === 'table' ? 'none' : 'table'))}
            title="Open Data Table"
          >
            <span>📊</span> Data
          </button>
          <button
            type="button"
            className={`btn ${activePanel === 'pdf' ? 'btn-active' : ''}`}
            id="open-pdf-panel-btn"
            onClick={() => setActivePanel((p) => (p === 'pdf' ? 'none' : 'pdf'))}
            title="Open PDF Viewer"
          >
            <span>📄</span> PDF
          </button>

          <button
            type="button"
            className="btn"
            id="debug-panel-button"
            onClick={() => setIsDebuggerOpen(true)}
            title="Open Live Debugging Bridge Panel"
          >
            <span style={{ color: '#38bdf8' }}>⚡</span> Debugger Bridge
          </button>
          <button
            type="button"
            className="btn"
            id="yaml-flow-button"
            onClick={() => setIsYamlOpen(true)}
            title="Save / Reload YAML Flow"
          >
            <span style={{ color: '#a855f7' }}>📄</span> Flow Storage (YAML)
          </button>
          <button
            type="button"
            className="btn btn-danger"
            id="clear-canvas-button"
            onClick={() => {
              if (window.confirm('Clear all nodes and wires from canvas?')) {
                setNodes([]);
                setConnections([]);
                setSelectedNodeId(null);
              }
            }}
          >
            Clear
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="main-workspace">
        <NodePalette onAddNode={handleAddNode} />
        <Canvas
          nodes={nodes}
          connections={connections}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onMoveNode={handleMoveNode}
          onDeleteNode={handleDeleteNode}
          onAddNode={handleAddNode}
          onConnectPorts={handleConnectPorts}
          onRemoveConnection={handleRemoveConnection}
          onOpenCodeEditor={(n) => setEditingNode(n)}
        />

        {/* Artifact Panel (Editor / Sandbox / Data / PDF) */}
        {activePanel !== 'none' && (
          <PanelManager
            activePanel={activePanel}
            payload={panelPayload}
            onPanelChange={(panel) => {
              setActivePanel(panel);
              if (panel === 'none') setPanelPayload({});
            }}
          >
            {renderPanelContent()}
          </PanelManager>
        )}
      </div>

      {/* Chat Panel */}
      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onOpenPanel={handleOpenPanel}
        onCitationClick={handleCitationClick}
      />

      {/* Modals */}
      <CodeEditorModal
        node={editingNode}
        isOpen={Boolean(editingNode)}
        onClose={() => setEditingNode(null)}
        onSave={handleSaveNodeData}
      />

      <DebuggerPanel
        isOpen={isDebuggerOpen}
        onClose={() => setIsDebuggerOpen(false)}
      />

      <YamlModal
        isOpen={isYamlOpen}
        onClose={() => setIsYamlOpen(false)}
        nodes={nodes}
        connections={connections}
        onLoadGraph={handleLoadGraph}
      />
    </div>
  );
};

