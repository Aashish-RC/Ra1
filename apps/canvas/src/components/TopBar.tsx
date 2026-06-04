import './TopBar.css'

interface TopBarProps {
  page: 'canvas' | 'models' | 'model-test'
  onPageChange: (p: 'canvas' | 'models' | 'model-test') => void
}

export default function TopBar({ page, onPageChange }: TopBarProps) {
  return (
    <div className="topbar">
      <div className="topbar-logo-group">
        <div className="topbar-logo-icon">R</div>
        <span className="topbar-title">RA1</span>
        <span className="topbar-separator">·</span>
        <span className="topbar-subtitle">Chat Workspace</span>
      </div>

      {/* Page tabs */}
      <div className="topbar-tabs">
        {(['canvas', 'models', 'model-test'] as const).map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`topbar-tab${page === p ? ' topbar-tab--active' : ''}`}
          >
            {p === 'canvas' ? '⬡ Canvas' : p === 'models' ? '⊞ Models' : '⚙ Model Test'}
          </button>
        ))}
      </div>

      <div className="topbar-spacer" />

      <button onClick={() => window.location.reload()} className="topbar-reset-btn">
        Reset
      </button>
    </div>
  )
}
