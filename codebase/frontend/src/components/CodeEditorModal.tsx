import React, { useState, useEffect } from 'react';
import type { VisualNodeData } from './VisualNode.js';

export interface CodeEditorModalProps {
  node: VisualNodeData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (nodeId: string, updatedData: Record<string, unknown>) => void;
}

export const CodeEditorModal: React.FC<CodeEditorModalProps> = ({
  node,
  isOpen,
  onClose,
  onSave,
}) => {
  const [content, setContent] = useState('');
  const [fieldKey, setFieldKey] = useState('code');

  useEffect(() => {
    if (!node) return;

    if (node.type === 'code') {
      setFieldKey('code');
      setContent(typeof node.data?.code === 'string' ? node.data.code : '// JavaScript/TypeScript code\nexport default async function({ input }) {\n  return { output: input };\n}');
    } else if (node.type === 'prompt') {
      setFieldKey('template');
      setContent(typeof node.data?.template === 'string' ? node.data.template : 'Write your prompt template here...');
    } else if (node.type === 'text') {
      setFieldKey('text');
      setContent(typeof node.data?.text === 'string' ? node.data.text : '');
    } else {
      setFieldKey('raw');
      setContent(JSON.stringify(node.data, null, 2));
    }
  }, [node]);

  if (!isOpen || !node) return null;

  const handleSave = () => {
    let updatedData = { ...node.data };
    if (fieldKey === 'raw') {
      try {
        updatedData = JSON.parse(content);
      } catch (err) {
        alert('Invalid JSON: ' + (err instanceof Error ? err.message : String(err)));
        return;
      }
    } else {
      updatedData[fieldKey] = content;
    }
    onSave(node.id, updatedData);
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
