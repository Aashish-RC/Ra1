import { useState } from 'react'
import { useModelStore } from '../store/model.store'
import { PROVIDER_REGISTRY, ProviderId } from '../data/providers'

const PROVIDER_ORDER: ProviderId[] = ['openai', 'anthropic', 'google', 'mistral', 'cohere', 'together', 'groq']

export default function Sidebar() {
  const [search, setSearch] = useState('')
  const { isPlaced } = useModelStore()

  const filtered = PROVIDER_ORDER.filter(id => {
    const def = PROVIDER_REGISTRY[id]
    return def.name.toLowerCase().includes(search.toLowerCase()) ||
      def.description.toLowerCase().includes(search.toLowerCase())
  })

  const handleDragStart = (e: React.DragEvent, providerId: ProviderId) => {
    e.dataTransfer.setData('application/ra1-provider', providerId)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div style={{ width: 220, background: 'var(--bg-surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Marketplace</div>
        <input
          style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 11, padding: '6px 10px', fontFamily: 'var(--font)', outline: 'none' }}
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {/* Category header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 4px 8px' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6c63ff' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Model Providers</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map(id => {
            const def = PROVIDER_REGISTRY[id]
            const placed = isPlaced(id)
            return (
              <div
                key={id}
                draggable={!placed}
                onDragStart={placed ? undefined : e => handleDragStart(e, id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 7,
                  background: placed ? 'var(--bg-base)' : 'var(--bg-node)',
                  border: `1px solid ${placed ? 'var(--border)' : def.color + '44'}`,
                  borderLeft: `3px solid ${placed ? 'var(--border)' : def.color}`,
                  cursor: placed ? 'not-allowed' : 'grab',
                  opacity: placed ? 0.45 : 1,
                  transition: 'opacity 0.15s',
                  userSelect: 'none',
                }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{def.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{def.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{def.description}</div>
                </div>
                {placed && <span style={{ fontSize: 9, color: 'var(--text-muted)', flexShrink: 0 }}>placed</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}