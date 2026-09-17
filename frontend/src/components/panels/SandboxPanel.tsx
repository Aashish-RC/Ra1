import React, { useState } from 'react';
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole,
} from '@codesandbox/sandpack-react';

type SandpackTemplate = 'vanilla' | 'react' | 'vue' | 'node';

interface SandboxPanelProps {
  initialCode?: string;
  initialLanguage?: string;
}

const TEMPLATE_OPTIONS: Array<{ value: SandpackTemplate; label: string }> = [
  { value: 'vanilla', label: 'Vanilla JS/HTML' },
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'node', label: 'Node.js' },
];

function detectTemplate(language: string): SandpackTemplate {
  switch (language) {
    case 'jsx':
    case 'tsx':
    case 'react':
      return 'react';
    case 'vue':
      return 'vue';
    case 'node':
    case 'nodejs':
      return 'node';
    default:
      return 'vanilla';
  }
}

function buildFiles(
  template: SandpackTemplate,
  code: string
): Record<string, string> {
  if (template === 'vanilla') {
    return {
      '/index.html': code.includes('<html')
        ? code
        : `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Ra1 Sandbox</title>
</head>
<body>
<script type="module" src="/index.js"></script>
</body>
</html>`,
      '/index.js': code.includes('<html') ? '' : code,
    };
  }
  if (template === 'react') {
    return {
      '/App.jsx': code || `export default function App() { return <h1>Hello from Ra1!</h1>; }`,
    };
  }
  return {};
}

/**
 * Sandpack code/web sandbox panel.
 * License: Apache 2.0 (CodeSandbox Sandpack) — confirmed permissive.
 *
 * Pre-populates from AI message code blocks when "Open in Sandbox" is clicked.
 * Template selection: Vanilla, React, Vue, Node.
 * Resizable split: editor (left) + live preview (right) + console (bottom).
 */
export const SandboxPanel: React.FC<SandboxPanelProps> = ({
  initialCode = '',
  initialLanguage = 'js',
}) => {
  const [template, setTemplate] = useState<SandpackTemplate>(
    detectTemplate(initialLanguage)
  );

  const files = buildFiles(template, initialCode);

  return (
    <div className="sandbox-panel" id="sandbox-panel">
      {/* Template selector toolbar */}
      <div className="sandbox-toolbar" id="sandbox-toolbar">
        <span className="sandbox-label">Template:</span>
        {TEMPLATE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`sandbox-template-btn ${template === opt.value ? 'sandbox-template-btn--active' : ''}`}
            id={`sandbox-template-${opt.value}`}
            onClick={() => setTemplate(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Sandpack provider */}
      <SandpackProvider
        key={template} // remount when template changes
        template={template}
        files={Object.keys(files).length > 0 ? files : undefined}
        theme="dark"
      >
        <SandpackLayout>
          <div id="sandpack-code-editor" style={{ flex: 1, minWidth: 0 }}>
            <SandpackCodeEditor showLineNumbers showTabs />
          </div>
          <div id="sandpack-preview" style={{ flex: 1, minWidth: 0 }}>
            <SandpackPreview showOpenInCodeSandbox={false} />
          </div>
        </SandpackLayout>
        <div id="sandpack-console">
          <SandpackConsole />
        </div>
      </SandpackProvider>
    </div>
  );
};
