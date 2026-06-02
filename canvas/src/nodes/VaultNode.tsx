import { memo } from 'react'
import { NodeProps } from 'reactflow'
import { useVaultStore } from '../store/vault.store'

function VaultNodeExpanded() {
  const { entries, revokeKey, setExpanded } = useVaultStore()
  const list = Object.values(entries)

  return (
    <div style={{ width: 280, background: 'var(--bg-node)', border: '1px solid #f8961e', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: '0 0 0 1px #f8961e33, 0 8px 32px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}
      onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
        onClick={() => setExpanded(false)}>
        <div style={{ width: 30, height: 30, borderRadius: 7, background: '#f8961e22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🔐</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Credential Vault</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{list.length} key{list.length !== 1 ? 's' : ''} · in-memory + masked metadata</div>
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>▼</span>
      </div>

      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
        {list.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>
            No credentials stored yet. Add a provider and enter its API key.
          </div>
        ) : list.map(e => (
          <div key={e.providerId} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-base)', borderRadius: 6, padding: '7px 10px', border: '1px solid var(--border)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: e.isValid === null ? '#6b7280' : e.isValid ? '#22c55e' : '#ef4444', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{e.providerName}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {e.maskedValue} · {new Date(e.lastUpdated).toLocaleDateString()} · {e.isValid === null ? 'untested' : e.isValid ? 'valid' : 'invalid'}
              </div>
            </div>
            <button onClick={() => revokeKey(e.providerId)} style={{ fontSize: 10, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 3 }}>
              Revoke
            </button>
          </div>
        ))}
      </div>

      <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--bg-base)', fontSize: 10, color: 'var(--text-muted)' }}>
        Raw keys are never persisted. Only masked metadata is saved to localStorage.
      </div>
    </div>
  )
}

function VaultNodeCollapsed() {
  const { entries } = useVaultStore()
  const list = Object.values(entries)
  const hasInvalid = list.some(e => e.isValid === false)
  const allValid = list.length > 0 && list.every(e => e.isValid === true)
  const statusColor = hasInvalid ? '#ef4444' : allValid ? '#22c55e' : '#6b7280'

  return (
    <div style={{ width: 200, minHeight: 56, background: 'var(--bg-node)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px' }}>
      <div style={{ width: 30, height: 30, borderRadius: 7, background: '#f8961e22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, position: 'relative' }}>
        🔐
        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: statusColor, border: '2px solid var(--bg-node)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>Credential Vault</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{list.length === 0 ? 'No keys stored' : `${list.length} key${list.length !== 1 ? 's' : ''} stored`}</div>
      </div>
    </div>
  )
}

function VaultNode({ id: _id }: NodeProps) {
  const { expanded } = useVaultStore()
  return (
    <div style={{ cursor: 'pointer' }}>
      {expanded ? <VaultNodeExpanded /> : <VaultNodeCollapsed />}
    </div>
  )
}

export default memo(VaultNode)