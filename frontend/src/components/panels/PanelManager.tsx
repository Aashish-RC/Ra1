import React from 'react';

export type PanelType = 'none' | 'editor' | 'sandbox' | 'table' | 'pdf';

export interface PanelPayload {
  // Editor
  content?: string;
  // Sandbox
  code?: string;
  language?: string;
  // Table
  csvText?: string;
  fileName?: string;
  // PDF
  pdfFile?: File;
  jumpToPage?: number;
  jumpToText?: string;
}

interface PanelManagerProps {
  activePanel: PanelType;
  payload: PanelPayload;
  onPanelChange: (panel: PanelType) => void;
}

const PANEL_TABS: Array<{ id: PanelType; label: string; icon: string }> = [
  { id: 'editor', label: 'Editor', icon: '📝' },
  { id: 'sandbox', label: 'Sandbox', icon: '▶' },
  { id: 'table', label: 'Data', icon: '📊' },
  { id: 'pdf', label: 'PDF', icon: '📄' },
];

/**
 * Panel manager: tab bar + lazy-loaded panel content.
 * Only one panel is shown at a time in the right 520px slot.
 */
export const PanelManager: React.FC<PanelManagerProps & { children: React.ReactNode }> = ({
  activePanel,
  onPanelChange,
  children,
}) => {
  return (
    <div className="panel-manager" id="panel-manager">
      {/* Tab bar */}
      <div className="panel-tab-bar" role="tablist">
        {PANEL_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`panel-tab ${activePanel === tab.id ? 'panel-tab--active' : ''}`}
            id={`panel-tab-${tab.id}`}
            role="tab"
            aria-selected={activePanel === tab.id}
            aria-controls={`panel-content-${tab.id}`}
            onClick={() => onPanelChange(activePanel === tab.id ? 'none' : tab.id)}
            title={tab.label}
          >
            <span className="panel-tab-icon">{tab.icon}</span>
            <span className="panel-tab-label">{tab.label}</span>
          </button>
        ))}

        {activePanel !== 'none' && (
          <button
            className="panel-close-btn"
            id="panel-close-btn"
            title="Close panel"
            onClick={() => onPanelChange('none')}
          >
            ✕
          </button>
        )}
      </div>

      {/* Panel content slot */}
      {activePanel !== 'none' && (
        <div
          className="panel-content"
          id={`panel-content-${activePanel}`}
          role="tabpanel"
          aria-labelledby={`panel-tab-${activePanel}`}
        >
          {children}
        </div>
      )}
    </div>
  );
};
