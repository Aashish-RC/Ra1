import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { NodeProps, Handle, Position } from 'reactflow'
import { useModelStore } from '../store/model.store'
import { useVaultStore } from '../store/vault.store'
import { PROVIDER_REGISTRY } from '../data/providers'
import './ModelNode.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/** Convert a hex color to an rgba string with given alpha (0..1). */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function StatusDot({ status }: { status: string }) {
  const dotClass =
    status === 'healthy' ? 'mn-status-dot mn-status-dot--healthy' :
    status === 'degraded' ? 'mn-status-dot mn-status-dot--degraded' :
    status === 'error' ? 'mn-status-dot mn-status-dot--error' :
    'mn-status-dot mn-status-dot--unknown'
  return <div className={dotClass} />
}

function OverviewTab() {
  const { providers, syncModels } = useModelStore()
  const { entries: vaultEntries } = useVaultStore()
  const list = Object.values(providers)

  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  if (cardRefs.current.length !== list.length) {
    cardRefs.current = list.map(() => null)
  }

  useEffect(() => {
    list.forEach((p, i) => {
      const el = cardRefs.current[i]
      if (!el) return
      const def = PROVIDER_REGISTRY[p.providerId]
      const color = def.color
      const statusColor =
        p.status === 'healthy' ? '#22c55e' :
        p.status === 'error'   ? '#ef4444' :
        p.status === 'degraded'? '#f59e0b' : '#6b7280'
      el.style.setProperty('--mn-provider-color', color)
      el.style.setProperty('--mn-status-color', statusColor)
      el.style.setProperty('--mn-provider-border', hexToRgba(color, 0.2))
      el.style.setProperty('--mn-provider-header-bg', hexToRgba(color, 0.05))
      el.style.setProperty('--mn-provider-tag-bg', hexToRgba(color, 0.1))
      el.style.setProperty('--mn-provider-tag-border', hexToRgba(color, 0.2))
      if (p.status === 'healthy') {
        el.style.setProperty('--mn-healthy', statusColor)
      } else {
        el.style.removeProperty('--mn-healthy')
      }
      const header = el.querySelector('.mn-provider-card-header') as HTMLElement | null
      if (header) {
        const enabledModels = p.models.filter(m => m.enabled && !m.deprecated)
        header.style.borderBottom = enabledModels.length > 0 ? '1px solid var(--border)' : 'none'
      }
    })
  }, [list])

  if (list.length === 0) {
    return (
      <div className="mn-overview-empty">
        <div className="mn-overview-empty-icon">🧩</div>
        <div className="mn-overview-empty-title">No providers linked</div>
        <div className="mn-overview-empty-desc">Drag a provider from the sidebar onto the canvas to get started.</div>
      </div>
    )
  }

  return (
    <div className="mn-overview-content">
      <div className="mn-stats-bar">
        <div className="mn-stat-cell">
          <div className="mn-stat-value mn-stat-value--providers">{list.length}</div>
          <div className="mn-stat-label">Providers</div>
        </div>
        <div className="mn-stat-divider" />
        <div className="mn-stat-cell">
          <div className="mn-stat-value mn-stat-value--active">
            {list.reduce((s, p) => s + p.models.filter(m => m.enabled && !m.deprecated).length, 0)}
          </div>
          <div className="mn-stat-label">Active Models</div>
        </div>
        <div className="mn-stat-divider" />
        <div className="mn-stat-cell">
          <div className="mn-stat-value mn-stat-value--deprecated">
            {list.reduce((s, p) => s + p.models.filter(m => m.deprecated).length, 0)}
          </div>
          <div className="mn-stat-label">Deprecated</div>
        </div>
      </div>

      {list.map((p, idx) => {
        const def = PROVIDER_REGISTRY[p.providerId]
        const enabledModels = p.models.filter(m => m.enabled && !m.deprecated)
        const hasKey = def.requiresKey ? !!vaultEntries[p.providerId] : true
        const keyValid = vaultEntries[p.providerId]?.isValid

        return (
          <div key={p.id} ref={el => { cardRefs.current[idx] = el }} className="mn-provider-card">
            <div className="mn-provider-card-header">
              <div className="mn-provider-card-icon-wrap">
                <span className="mn-provider-card-icon">{def.icon}</span>
                <div className="mn-provider-card-status-dot" />
              </div>
              <div className="mn-provider-card-info">
                <div className="mn-provider-card-name">{def.name}</div>
                <div className="mn-provider-card-meta">
                  {hasKey ? (
                    <span className={
                      keyValid === true ? 'mn-provider-card-key-text--valid' :
                      keyValid === false ? 'mn-provider-card-key-text--invalid' :
                      'mn-provider-card-key-text--untested'
                    }>
                      {keyValid === true ? '🔑 Key valid' : keyValid === false ? '🔑 Key invalid' : '🔑 Key untested'}
                    </span>
                  ) : (
                    <span className="mn-provider-card-key-text--nokey">⚠ No key</span>
                  )}
                  <span className="mn-provider-card-meta-sep">·</span>
                  <span>{enabledModels.length} model{enabledModels.length !== 1 ? 's' : ''} active</span>
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); syncModels(p.id) }}
                title="Sync models"
                className="mn-sync-btn"
              >⟳</button>
            </div>

            {enabledModels.length > 0 && (
              <div className="mn-model-tags">
                {enabledModels.slice(0, 6).map(m => (
                  <span key={m.id} className="mn-model-tag" title={m.name}>
                    {m.name}
                  </span>
                ))}
                {enabledModels.length > 6 && (
                  <span className="mn-model-tag-more">
                    +{enabledModels.length - 6} more
                  </span>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function DeprecationsTab() {
  const { providers } = useModelStore()
  const deprecated = Object.values(providers).flatMap(p =>
    p.models.filter(m => m.deprecated).map(m => ({ ...m, providerName: PROVIDER_REGISTRY[p.providerId].name }))
  )

  if (deprecated.length === 0) {
    return <div className="mn-deprecations-empty">No deprecated models in your active providers.</div>
  }

  return (
    <div className="mn-deprecations-content">
      {deprecated.map(m => (
        <div key={m.id} className="mn-deprecation-card">
          <div className="mn-deprecation-row">
            <span className="mn-deprecation-name">{m.name}</span>
            <span className="mn-deprecation-badge">DEPRECATED</span>
          </div>
          <div className="mn-deprecation-detail">
            {m.providerName} · Retires {m.deprecatedAt}
            {m.successor && <span className="mn-deprecation-successor">→ use {m.successor}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function UpdatesTab() {
  const {
    pendingChanges, hasChanges, lastChecked,
    applyChanges,
  } = useModelStore()
  const [applying, setApplying] = useState<Set<string>>(new Set())
  const [syncing, setSyncing] = useState(false)

  const providerIds = Object.keys(pendingChanges)
  const multipleProviders = providerIds.length > 1

  const handleApply = useCallback(async (ids: string[]) => {
    setApplying(prev => new Set([...prev, ...ids]))
    await applyChanges(ids)
    setApplying(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.delete(id))
      return next
    })
  }, [applyChanges])

  const handleSyncNow = useCallback(async () => {
    setSyncing(true)
    try {
      await fetch(`${API_BASE}/api/models/sync/trigger`, { method: 'POST' })
    } catch { /* ignore */ }
    setSyncing(false)
  }, [])

  const minutesAgo = lastChecked ? Math.floor((Date.now() - lastChecked) / 60000) : null

  if (!hasChanges || providerIds.length === 0) {
    return (
      <div className="mn-updates-empty">
        <div className="mn-updates-empty-icon">✓</div>
        <div className="mn-updates-empty-text">
          All models up to date
          {minutesAgo !== null && <span> · Last checked {minutesAgo < 1 ? 'just now' : `${minutesAgo}m ago`}</span>}
        </div>
        <button
          onClick={handleSyncNow}
          disabled={syncing}
          className={`mn-sync-now-btn ${syncing ? 'mn-sync-now-btn--syncing' : 'mn-sync-now-btn--ready'}`}
        >
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>
    )
  }

  return (
    <div className="mn-updates-content">
      {multipleProviders && (
        <button
          onClick={() => handleApply(providerIds)}
          disabled={applying.size > 0}
          className="mn-apply-all-btn"
        >
          {applying.size > 0 ? 'Applying...' : `Apply All (${providerIds.length} providers)`}
        </button>
      )}

      {providerIds.map(pid => {
        const changes = pendingChanges[pid] || []
        const def = PROVIDER_REGISTRY[pid as keyof typeof PROVIDER_REGISTRY]
        const providerName = def?.name || pid
        const providerIcon = def?.icon || '📡'
        const isApplying = applying.has(pid)

        const added = changes.filter(c => c.changeType === 'added')
        const removed = changes.filter(c => c.changeType === 'removed')
        const deprecatedEntries = changes.filter(c => c.changeType === 'deprecated')

        return (
          <div key={pid} className="mn-updates-provider-card">
            <div className="mn-updates-provider-header">
              <span className="mn-updates-provider-icon">{providerIcon}</span>
              <span className="mn-updates-provider-name">{providerName}</span>
              <button
                onClick={() => handleApply([pid])}
                disabled={isApplying}
                className={`mn-updates-apply-btn ${isApplying ? 'mn-updates-apply-btn--applying' : 'mn-updates-apply-btn--ready'}`}
              >
                {isApplying ? '...' : 'Apply'}
              </button>
            </div>

            <div className="mn-updates-list">
              {added.map(c => (
                <div key={`a-${c.modelId}`} className="mn-update-row">
                  <span className="mn-update-icon--added">🟢</span>
                  <span className="mn-update-name--added">{c.modelName || c.modelId}</span>
                  <span className="mn-update-detail">added</span>
                </div>
              ))}
              {removed.map(c => (
                <div key={`r-${c.modelId}`} className="mn-update-row">
                  <span className="mn-update-icon--removed">🔴</span>
                  <span className="mn-update-name--removed">{c.modelName || c.modelId}</span>
                  <span className="mn-update-detail">removed</span>
                </div>
              ))}
              {deprecatedEntries.map(c => (
                <div key={`d-${c.modelId}`} className="mn-update-row">
                  <span className="mn-update-icon--deprecated">🟡</span>
                  <span className="mn-update-name--deprecated">{c.modelName || c.modelId}</span>
                  {c.detail && <span className="mn-update-detail">· {c.detail}</span>}
                </div>
              ))}
              {changes.length === 0 && (
                <div className="mn-update-row mn-update-row--empty">No pending changes</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ModelNodeCollapsed() {
  const { providers, hasNewDiscoveries, hasNewDeprecations, hasChanges } = useModelStore()
  const { entries: vaultEntries } = useVaultStore()
  const list = Object.values(providers)
  const statuses = list.map(p => p.status)
  const overallStatus = statuses.includes('error') ? 'error' : statuses.includes('degraded') ? 'degraded' : statuses.every(s => s === 'healthy') && statuses.length > 0 ? 'healthy' : 'unknown'
  const statusColor = overallStatus === 'healthy' ? '#22c55e' : overallStatus === 'degraded' ? '#f59e0b' : overallStatus === 'error' ? '#ef4444' : '#6b7280'

  const totalEnabled = list.reduce((s, p) => s + p.models.filter(m => m.enabled && !m.deprecated).length, 0)

  const hasKeyIssue = list.some(p => {
    const def = PROVIDER_REGISTRY[p.providerId]
    if (!def.requiresKey) return false
    const entry = vaultEntries[p.providerId]
    return entry?.isValid === false
  })

  const hasPending = hasChanges || hasNewDiscoveries || hasNewDeprecations

  const dotRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = dotRef.current
    if (el) {
      el.style.setProperty('--mn-dot-color', statusColor)
    }
  }, [statusColor])

  return (
    <div className={`mn-collapsed ${hasPending ? 'mn-collapsed--pending' : ''}`}>
      <Handle type="target" position={Position.Left} id="vault-link-left" className="mn-handle-left" />
      <div className="mn-collapsed-icon-wrap">
        🧠
        <div ref={dotRef} className="mn-collapsed-status-dot" />
        {hasPending && <div className="mn-collapsed-pending-dot" />}
      </div>
      <div className="mn-collapsed-text">
        <div className="mn-collapsed-title">Model</div>
        <div className="mn-collapsed-provider-icons">
          {list.slice(0, 4).map(p => (
            <span key={p.id} className="mn-collapsed-provider-icon" title={PROVIDER_REGISTRY[p.providerId].name}>{PROVIDER_REGISTRY[p.providerId].icon}</span>
          ))}
          {list.length === 0 && <span className="mn-collapsed-empty">No providers</span>}
          {list.length > 4 && <span className="mn-collapsed-more">+{list.length - 4}</span>}
        </div>
        <div className="mn-collapsed-meta">
          {totalEnabled > 0 && <span>{totalEnabled} models active</span>}
          {hasKeyIssue && <span className="mn-collapsed-meta-issue">· key issue</span>}
        </div>
        {hasPending && (
          <div className="mn-collapsed-badges">
            {hasChanges && (
              <span className="mn-collapsed-badge mn-collapsed-badge--updates">Updates</span>
            )}
            {hasNewDiscoveries && !hasChanges && (
              <span className="mn-collapsed-badge mn-collapsed-badge--new">New models</span>
            )}
            {hasNewDeprecations && !hasChanges && (
              <span className="mn-collapsed-badge mn-collapsed-badge--depr">Deprecations</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ModelNodeExpanded() {
  const { providers, activeTab, setActiveTab, setModelExpanded } = useModelStore()
  const providerCount = Object.keys(providers).length
  const totalModels = Object.values(providers).reduce((s, p) => s + p.models.filter(m => m.enabled).length, 0)
  const statuses = Object.values(providers).map(p => p.status)
  const overallStatus = statuses.includes('error') ? 'error' : statuses.includes('degraded') ? 'degraded' : statuses.every(s => s === 'healthy') && statuses.length > 0 ? 'healthy' : 'unknown'

  return (
    <div className="mn-expanded" onClick={e => e.stopPropagation()}>
      <Handle type="target" position={Position.Left} id="vault-link-left" className="mn-handle-left" />
      <div className="mn-expanded-header" onClick={() => setModelExpanded(false)}>
        <div className="mn-expanded-header-icon">🧠</div>
        <div className="mn-expanded-header-text">
          <div className="mn-expanded-header-title">Model</div>
          <div className="mn-expanded-header-subtitle">{providerCount} provider{providerCount !== 1 ? 's' : ''} · {totalModels} model{totalModels !== 1 ? 's' : ''} enabled</div>
        </div>
        <StatusDot status={overallStatus} />
        <span className="mn-expanded-header-collapse">▼</span>
      </div>
      <div className="mn-tab-bar">
        {(['overview', 'deprecations', 'updates'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`mn-tab-btn ${activeTab === tab ? 'mn-tab-btn--active' : 'mn-tab-btn--inactive'}`}>
            {tab}
          </button>
        ))}
      </div>
      <div className="mn-expanded-body">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'deprecations' && <DeprecationsTab />}
        {activeTab === 'updates' && <UpdatesTab />}
      </div>
    </div>
  )
}

function ModelNode({ id: _id }: NodeProps) {
  const { modelExpanded } = useModelStore()
  return (
    <div className="mn-root">
      {modelExpanded ? <ModelNodeExpanded /> : <ModelNodeCollapsed />}
    </div>
  )
}

export default memo(ModelNode)