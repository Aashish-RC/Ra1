interface TopBarProps {
  page: 'canvas' | 'models'
  onPageChange: (p: 'canvas' | 'models') => void
}

export default function TopBar({ page, onPageChange }: TopBarProps) {
  return (
    <div style={{ height: 52, background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #6c63ff, #f72585)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'white' }}>R</div>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>RA1</span>
        <span style={{ color: 'var(--border-bright)', fontSize: 14 }}>·</span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Chat Workspace</span>
      </div>

      {/* Page tabs */}
      <div style={{ display: 'flex', gap: 2, marginLeft: 16, background: 'var(--bg-base)', borderRadius: 7, padding: 3 }}>
        {(['canvas', 'models'] as const).map(p => (
          <button key={p} onClick={() => onPageChange(p)} style={{ padding: '4px 14px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: page === p ? 'var(--bg-surface)' : 'transparent', color: page === p ? 'var(--text-primary)' : 'var(--text-muted)', transition: 'all 0.15s', textTransform: 'capitalize' }}>
            {p === 'canvas' ? '⬡ Canvas' : '⊞ Models'}
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <button onClick={() => window.location.reload()} style={{ height: 32, padding: '0 14px', borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>
        Reset
      </button>
    </div>
  )
}