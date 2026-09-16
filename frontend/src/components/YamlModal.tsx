import React, { useState, useEffect } from 'react';
import yaml from 'yaml';
import type { VisualNodeData } from './VisualNode.js';
import type { WireConnectionItem } from './WireLayer.js';

export interface YamlModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: VisualNodeData[];
  connections: WireConnectionItem[];
  onLoadGraph: (nodes: VisualNodeData[], connections: WireConnectionItem[]) => void;
}

export const YamlModal: React.FC<YamlModalProps> = ({
  isOpen,
  onClose,
  nodes,
  connections,
  onLoadGraph,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [yamlContent, setYamlContent] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'export') {
      const flowData = {
        metadata: {
          id: 'flow-graph-1',
          name: 'Rivet Canvas Flow',
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
        },
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          visualData: n.visualData,
          data: n.data,
        })),
        connections: connections.map((c) => ({
          outputNodeId: c.outputNodeId,
          outputId: c.outputId,
          inputNodeId: c.inputNodeId,
          inputId: c.inputId,
        })),
      };
      setYamlContent(yaml.stringify(flowData, { indent: 2 }));
    }
  }, [isOpen, activeTab, nodes, connections]);

  if (!isOpen) return null;

  const handleImport = () => {
    try {
      setErrorMessage(null);
      const parsed = yaml.parse(yamlContent);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('YAML document is empty or invalid.');
      }

      const importedNodes: VisualNodeData[] = (parsed.nodes || []).map((n: any) => ({
        id: n.id || String(Date.now()),
        type: n.type || 'text',
        title: n.title || n.type,
        visualData: n.visualData || { x: 100, y: 100 },
        inputs: n.inputs || [{ id: 'input', title: 'Input', dataType: 'any' }],
        outputs: n.outputs || [{ id: 'output', title: 'Output', dataType: 'any' }],
        data: n.data || {},
      }));

      const importedConnections: WireConnectionItem[] = (parsed.connections || []).map((c: any, idx: number) => ({
        id: `conn-${idx}-${Date.now()}`,
        outputNodeId: c.outputNodeId,
        outputId: c.outputId,
        inputNodeId: c.inputNodeId,
        inputId: c.inputId,
      }));

      onLoadGraph(importedNodes, importedConnections);
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDownload = () => {
    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flow.yaml';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" id="yaml-modal" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={`btn ${activeTab === 'export' ? 'btn-primary' : ''}`}
              id="yaml-tab-export"
              onClick={() => setActiveTab('export')}
            >
              Export YAML Flow
            </button>
            <button
              type="button"
              className={`btn ${activeTab === 'import' ? 'btn-primary' : ''}`}
              id="yaml-tab-import"
              onClick={() => {
                setActiveTab('import');
                setYamlContent('');
                setErrorMessage(null);
              }}
            >
              Import / Reload YAML
            </button>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} id="yaml-modal-close">
            ✕
          </button>
        </div>

        <div className="modal-content">
          {errorMessage && (
            <div style={{ padding: '8px 12px', background: 'rgba(244,63,94,0.15)', color: '#fca5a5', borderRadius: 6, marginBottom: 12, fontSize: 12 }}>
              {errorMessage}
            </div>
          )}

          <textarea
            id="yaml-textarea"
            className="code-editor-textarea"
            style={{ height: 320 }}
            value={yamlContent}
            onChange={(e) => setYamlContent(e.target.value)}
            placeholder={activeTab === 'import' ? 'Paste valid flow YAML here...' : ''}
            readOnly={activeTab === 'export'}
          />
        </div>

        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          {activeTab === 'export' ? (
            <button type="button" className="btn btn-primary" id="yaml-download-btn" onClick={handleDownload}>
              Download flow.yaml
            </button>
          ) : (
            <button type="button" className="btn btn-primary" id="yaml-apply-import-btn" onClick={handleImport}>
              Load & Apply YAML
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
