import React, { useState, useEffect } from 'react';
import type { VisualNodeData } from './VisualNode.js';

export interface CodeEditorModalProps {
  node: VisualNodeData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    nodeId: string,
    updatedData: Record<string, unknown>,
    customCode?: string,
    newTitle?: string
  ) => void;
}

/**
 * Generates idiomatic TypeScript source code for any node, mirroring Langflow's
 * custom_component/component.py mechanism where every node has editable source code.
 */
export function generateNodeSourceCode(node: VisualNodeData): string {
  if (node.customCode && node.customCode.trim().length > 0) {
    return node.customCode;
  }

  // Pre-seeded code nodes
  if (node.type === 'code' && typeof node.data?.code === 'string') {
    return node.data.code;
  }

  const inputsJson = JSON.stringify(
    node.inputs.map((i) => ({ id: i.id, title: i.title, dataType: i.dataType })),
    null,
    2
  );
  const outputsJson = JSON.stringify(
    node.outputs.map((o) => ({ id: o.id, title: o.title, dataType: o.dataType })),
    null,
    2
  );
  const dataJson = JSON.stringify(node.data || {}, null, 2);

  return `/**
 * @title ${node.title}
 * @type ${node.type}
 * Sourced from TypeScript Node Contract (Langflow editable-node-code pattern)
 */

export const NodeDefinition = {
  type: "${node.type}",
  title: "${node.title}",
  inputs: ${inputsJson},
  outputs: ${outputsJson},
  initialData: ${dataJson},

  async process(inputs: Record<string, unknown>, context: { nodeId: string }) {
    // Runtime execution hook
    const primaryInput = inputs["${node.inputs[0]?.id || 'input'}"] ?? null;
    return {
      "${node.outputs[0]?.id || 'output'}": primaryInput ?? ${JSON.stringify(node.data?.text || node.data?.value || "processed")}
    };
  }
};

export default NodeDefinition;
`;
}

/**
 * Parses custom metadata annotations such as @title or property fields from edited code.
 */
function extractTitleFromCode(code: string, fallbackTitle: string): string {
  // 1. @title directive: // @title: My New Title or * @title My New Title
  const directiveMatch = code.match(/@title[:\s]+([^\n\r*]+)/i);
  if (directiveMatch && directiveMatch[1].trim()) {
    return directiveMatch[1].trim();
  }
  // 2. title property: title: "My New Title" or title: 'My New Title'
  const propMatch = code.match(/title\s*:\s*["']([^"']+)["']/i);
  if (propMatch && propMatch[1].trim()) {
    return propMatch[1].trim();
  }
  return fallbackTitle;
}

export const CodeEditorModal: React.FC<CodeEditorModalProps> = ({
  node,
  isOpen,
  onClose,
  onSave,
}) => {
  const [content, setContent] = useState('');

  useEffect(() => {
    if (!node) return;
    setContent(generateNodeSourceCode(node));
  }, [node]);

  if (!isOpen || !node) return null;

  const handleSave = () => {
    const updatedData = { ...node.data };

    // Sync node-specific payload fields if relevant
    if (node.type === 'code') {
      updatedData.code = content;
    } else if (node.type === 'prompt') {
      updatedData.template = content;
    } else if (node.type === 'text') {
      updatedData.text = content;
    }

    // Extract any modified title directive
    const detectedTitle = extractTitleFromCode(content, node.title);

    onSave(node.id, updatedData, content, detectedTitle);
    onClose();
  };

  return (
    <div className="modal-overlay" id="code-editor-modal" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            Editable Code View: <strong>{node.title}</strong> ({node.type})
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} id="code-editor-close">
            ✕
          </button>
        </div>

        <div className="modal-content">
          <div style={{ marginBottom: 8, fontSize: '0.8rem', color: '#94a3b8' }}>
            Langflow Editable-Node-Code Pattern: Modify this node's TypeScript source or update <code>@title</code> to update the node box live without breaking wire connections.
          </div>
          <textarea
            id="code-editor-textarea"
            className="code-editor-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            autoFocus={true}
          />
        </div>

        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose} id="code-editor-cancel">
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} id="code-editor-save">
            Save Code Changes
          </button>
        </div>
      </div>
    </div>
  );
};
