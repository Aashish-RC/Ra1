import { useState, useMemo } from 'react'
import { useModelStore } from '../store/model.store'
import { PROVIDER_REGISTRY, CAP_LABELS, ModelCapability, ProviderId } from '../data/providers'

const ALL_CAPABILITIES = Object.keys(CAP_LABELS) as ModelCapability[]

const SX = {
  page: { flex: 1, overflowY: 'auto', padding: 24 } as React.CSSProperties,
  container: { maxWidth: 900, margin: '0 auto' } as React.CSSProperties,
  header: { fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' } as React.CSSProperties,
  subheader: { fontSize: 12, color: 'var(--text-muted)', marginTop: 4 } as React.CSSProperties,
  filterBar: { display: 'flex', gap: 10, marginTop: 14, marginBottom: 18, flexWrap: 'wrap' as const, alignItems: 'center' } as React.CSSProperties,
  searchInput: { background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, padding: '7px 12px', fontFamily: 'var(--font)', outline: 'none', minWidth: 200, flex: 1 } as React.CSSProperties,
  select: { background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 11, padding: '7px 28px 7px 10px', fontFamily: 'var(--font)', outline: 'none', appearance: 'none' as const, cursor: 'pointer' } as React.CSSProperties,
  chip: (active: boolean, color?: string) => ({
    fontSize: 10, padding: '4px 10px', borderRadius: 12,
    background: active ? (color || 'var(--accent)') : 'var(--bg-surface)',
    color: active ? 'white' : 'var(--text-muted)',
    border: active ? 'none' : '1px solid var(--border)',
    cursor: 'pointer' as const,
    fontWeight: active ? 600 : 400,
    transition: 'all 0.15s',
  }),
  statRow: { display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-muted)', marginBottom: 16, flexWrap: 'wrap' as const } as React.CSSProperties,
}

export default function ModelsPage() {
  const { providers, toggleModel } = useModelStore()

  const [search, setSearch] = useState('')
  const [selectedCaps, setSelectedCaps] = useState<ModelCapability[]>([])
  const [providerFilter, setProviderFilter] = useState<string>('all')
  const [showDeprecated, setShowDeprecated] = useState(false)

  const toggleCap = (cap: ModelCapability) => {
    setSelectedCaps(prev =>
      prev.includes(cap) ? prev.filter(c => c !== cap) : [...prev, cap]
    )
  }

  // Collect all models across all providers with provider metadata
  const allModels = useMemo(() => {
    const list: Array<{
      providerId: string
      providerName: string
      providerIcon: string
      providerColor: string
      modelId: string
      model: typeof providers[string]['models'][number]
    }> = []

    for (const p of Object.values(providers)) {
      const def = PROVIDER_REGISTRY[p.providerId as ProviderId]
      if (!def) continue
      for (const m of p.models) {
        list.push({
          providerId: p.providerId,
          providerName: def.name,
          providerIcon: def.icon,
          providerColor: def.color,
          modelId: m.id,
          model: m,
        })
      }
    }

    return list
  }, [providers])

  const filteredModels = useMemo(() => {
    return allModels.filter(item => {
      // Deprecated filter
      if (!showDeprecated && item.model.deprecated) return false

      // Provider filter
      if (providerFilter !== 'all' && providerFilter !== item.providerId) return false

      // Search filter
      if (search) {
        const q = search.toLowerCase()
        const nameMatch = item.model.name.toLowerCase().includes(q)
        const idMatch = item.model.id.toLowerCase().includes(q)
        const providerMatch = item.providerName.toLowerCase().includes(q)
        if (!nameMatch && !idMatch && !providerMatch) return false
      }

      // Capability filter
      if (selectedCaps.length > 0) {
        const hasAll = selectedCaps.every(cap => item.model.capabilities.includes(cap))
        if (!hasAll) return false
      }

      return true
    })
  }, [allModels, search, selectedCaps, providerFilter, showDeprecated])

  // Group filtered results by provider
  const grouped = useMemo(() => {
    const map: Record<string, typeof filteredModels> = {}
    for (const item of filteredModels) {
      if (!map[item.providerId]) map[item.providerId] = []
      map[item.providerId].push(item)
    }
    return map
  }, [filteredModels])

  const totalModels = allModels.length
  const enabledModels = allModels.filter(m => m.model.enabled && !m.model.deprecated).length
  const shownModels = filteredModels.length

  const providerOptions = useMemo(() => {
    const ids = new Set(Object.values(providers).map(p => p.providerId))
    return Array.from(ids).map(id => ({ id, name: PROVIDER_REGISTRY[id as ProviderId]?.name || id }))
  }, [providers])

  if (Object.keys(providers).length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 32 }}>🧩</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>No providers placed yet</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Drag a provider from the sidebar onto the canvas first.</div>
      </div>
    )
  }

  return (
    <div style={SX.page}>
      <div style={SX.container}>
        {/* Header */}
        <div>
          <div style={SX.header}>Models</div>
          <div style={SX.subheader}>Browse, search, and enable models across all providers.</div>
        </div>

        {/* Stats */}
        <div style={{ ...SX.statRow, marginTop: 12 }}>
          <span>{totalModels} total models</span>
          <span>·</span>
          <span style={{ color: '#22c55e' }}>{enabledModels} enabled</span>
          <span>·</span>
          <span>{shownModels} shown</span>
        </div>

        {/* Filter Bar */}
        <div style={SX.filterBar}>
          <input
            style={SX.searchInput}
            placeholder="Search models by name, ID, or provider..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <select
            style={SX.select}
            value={providerFilter}
            onChange={e => setProviderFilter(e.target.value)}
          >
            <option value="all">All Providers</option>
            {providerOptions.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>

          {/* Show deprecated toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            <div
              onClick={() => setShowDeprecated(v => !v)}
              style={{ width: 32, height: 18, borderRadius: 9, background: showDeprecated ? '#6b7280' : 'var(--border-bright)', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}
            >
              <div style={{ position: 'absolute', top: 2, left: showDeprecated ? 16 : 2, width: 14, height: 14, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
            </div>
            Show deprecated
          </label>
        </div>

        {/* Capability chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {ALL_CAPABILITIES.map(cap => (
            <div
              key={cap}
              style={SX.chip(selectedCaps.includes(cap))}
              onClick={() => toggleCap(cap)}
            >
              {CAP_LABELS[cap]}
            </div>
          ))}
          {selectedCaps.length > 0 && (
            <button
              onClick={() => setSelectedCaps([])}
              style={{ fontSize: 10, padding: '4px 10px', borderRadius: 12, background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              Clear all
            </button>
          )}
        </div>

        {/* Results */}
        {shownModels === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, fontSize: 12, color: 'var(--text-muted)' }}>
            No models match your filters.
          </div>
        ) : (
          Object.entries(grouped).map(([providerId, items]) => {
            const def = PROVIDER_REGISTRY[providerId as ProviderId]
            if (!def) return null
            return (
              <div key={providerId} style={{ marginBottom: 20 }}>
                {/* Provider header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${def.color}44` }}>
                  <span style={{ fontSize: 16 }}>{def.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{def.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{items.filter(i => i.model.enabled).length}/{items.length} enabled</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {items.map(item => (
                    <div
                      key={item.modelId}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px', background: 'var(--bg-node)', borderRadius: 8,
                        border: `1px solid ${item.model.deprecated ? '#ef444433' : 'var(--border)'}`,
                        opacity: item.model.deprecated ? 0.7 : 1,
                      }}
                    >
                      {/* Toggle */}
                      <div
                        onClick={() => !item.model.deprecated && toggleModel(item.providerId, item.modelId)}
                        style={{
                          width: 36, height: 20, borderRadius: 10,
                          background: item.model.enabled ? def.color : 'var(--border-bright)',
                          cursor: item.model.deprecated ? 'not-allowed' : 'pointer',
                          position: 'relative', flexShrink: 0, transition: 'background 0.2s',
                        }}
                      >
                        <div style={{
                          position: 'absolute', top: 2,
                          left: item.model.enabled ? 18 : 2,
                          width: 16, height: 16, borderRadius: '50%',
                          background: 'white', transition: 'left 0.2s',
                        }} />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{item.model.name}</span>
                          {item.model.newlyDiscovered && (
                            <span style={{ fontSize: 9, background: '#22c55e22', color: '#22c55e', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>NEW</span>
                          )}
                          {item.model.deprecated && (
                            <span style={{ fontSize: 9, background: '#ef444422', color: '#ef4444', padding: '1px 5px', borderRadius: 3, fontWeight: 600 }}>DEPRECATED</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                          {item.model.capabilities.map(cap => (
                            <span key={cap} style={{ fontSize: 9, padding: '1px 6px', background: 'var(--bg-surface)', borderRadius: 3, color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                              {CAP_LABELS[cap]}
                            </span>
                          ))}
                          <span style={{ fontSize: 9, padding: '1px 6px', background: 'var(--bg-surface)', borderRadius: 3, color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                            {(item.model.contextWindow / 1000).toFixed(0)}K ctx
                          </span>
                        </div>
                      </div>

                      {/* Pricing */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>${item.model.costPer1k.input}/1k in</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>${item.model.costPer1k.output}/1k out</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}