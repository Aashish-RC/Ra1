import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';

const lowlight = createLowlight(common);

interface DocumentEditorPanelProps {
  initialContent?: string;
}

/**
 * TipTap-based rich text document editor side panel.
 * Pre-populates from an AI assistant message when "Open in Editor" is clicked.
 * Supports: Bold, Italic, Headings 1-3, Bullet/Ordered List, Code Block, HR.
 * Export: PDF (browser print) and Word (.docx via the `docx` library).
 *
 * TipTap license: MIT
 * docx license: MIT
 */
export const DocumentEditorPanel: React.FC<DocumentEditorPanelProps> = ({
  initialContent = '',
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: initialContent
      ? `<p>${initialContent.replace(/\n/g, '</p><p>')}</p>`
      : '<p>Start typing your document…</p>',
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content',
        id: 'tiptap-editor-content',
        'aria-label': 'Document editor',
      },
    },
  });

  const handleExportPdf = useCallback(() => {
    window.print();
  }, []);

  const handleExportDocx = useCallback(async () => {
    if (!editor) return;
    try {
      const { Document, Packer, Paragraph, TextRun } = await import('docx');
      const text = editor.getText();
      const paragraphs = text.split('\n').map(
        (line) =>
          new Paragraph({
            children: [new TextRun(line)],
          })
      );
      const doc = new Document({ sections: [{ children: paragraphs }] });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ra1-document.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('DOCX export failed:', err);
    }
  }, [editor]);

  return (
    <div className="document-editor-panel" id="document-editor-panel">
      {/* Toolbar */}
      <div className="editor-toolbar" id="editor-toolbar" role="toolbar" aria-label="Text formatting">
        <button
          className={`toolbar-btn ${editor?.isActive('bold') ? 'toolbar-btn--active' : ''}`}
          id="toolbar-bold"
          title="Bold (Ctrl+B)"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </button>
        <button
          className={`toolbar-btn ${editor?.isActive('italic') ? 'toolbar-btn--active' : ''}`}
          id="toolbar-italic"
          title="Italic (Ctrl+I)"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </button>
        <div className="toolbar-divider" />
        {[1, 2, 3].map((level) => (
          <button
            key={level}
            className={`toolbar-btn ${editor?.isActive('heading', { level }) ? 'toolbar-btn--active' : ''}`}
            id={`toolbar-h${level}`}
            title={`Heading ${level}`}
            onClick={() =>
              editor
                ?.chain()
                .focus()
                .toggleHeading({ level: level as 1 | 2 | 3 })
                .run()
            }
          >
            H{level}
          </button>
        ))}
        <div className="toolbar-divider" />
        <button
          className={`toolbar-btn ${editor?.isActive('bulletList') ? 'toolbar-btn--active' : ''}`}
          id="toolbar-bullet-list"
          title="Bullet list"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          •‍
        </button>
        <button
          className={`toolbar-btn ${editor?.isActive('orderedList') ? 'toolbar-btn--active' : ''}`}
          id="toolbar-ordered-list"
          title="Numbered list"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          1.
        </button>
        <button
          className={`toolbar-btn ${editor?.isActive('codeBlock') ? 'toolbar-btn--active' : ''}`}
          id="toolbar-code-block"
          title="Code block"
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
        >
          {'</>'}
        </button>
        <button
          className="toolbar-btn"
          id="toolbar-hr"
          title="Horizontal rule"
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        >
          —
        </button>
        <div className="toolbar-spacer" />
        {/* Export buttons */}
        <button
          className="toolbar-btn toolbar-btn--export"
          id="toolbar-export-pdf"
          title="Export as PDF (print)"
          onClick={handleExportPdf}
        >
          📄 PDF
        </button>
        <button
          className="toolbar-btn toolbar-btn--export"
          id="toolbar-export-docx"
          title="Export as Word document"
          onClick={handleExportDocx}
        >
          📝 Word
        </button>
      </div>

      {/* Editor content area */}
      <div className="editor-content-area">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
