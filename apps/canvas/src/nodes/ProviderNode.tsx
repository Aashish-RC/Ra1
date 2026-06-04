import { memo, useState, useCallback } from 'react'
import { NodeProps, Handle, Position } from 'reactflow'
import { useModelStore } from '../store/model.store'
import { useVaultStore } from '../store/vault.store'
import { useCanvasStore } from '../store/canvasStore'
import { PROVIDER_REGISTRY, ProviderId, CAP_LABELS } from '../data/providers'
import './ProviderNode.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function ModelRow({
  model,
  onToggle,
}: {
  model: { id: string; name: string; enabled: boolean; deprecated?: boolean; newlyDiscovered?: boolean; capabilities: string[] }
  onToggle: (id: string) => void
}) {
  const disabled = !!model.deprecated
  const isDisabled = disabled ? ' pn-toggle--disabled' : ''
  const toggleClass = `pn-toggle ${model.enabled ? 'pn-toggle--on' : 'pn-toggle--off'}${isDisabled}`
  const knobClass = `pn-knob ${model.enabled ? 'pn-knob--on' : 'pn-knob--off'}`
  const rowClass = `pn-model-row${disabled ? ' pn-model-row--disabled' : ''}${model.newlyDiscovered ? ' pn-model-row--highlight' : ''}`

  return (
    <div
      className={rowClass}
      data-highlight={model.newlyDiscovered ? 'true' : undefined}
    >
      {model.enabled ? (
        <div
          className={toggleClass}
          onClick={() => !disabled && onToggle(model.id)}
          role="switch"
          aria-checked="true"
          aria-label={`Toggle ${model.name}`}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!disabled) onToggle(model.id) } }}
        >
          <div className={knobClass} />
        </div>
      ) : (
        <div
          className={toggleClass}
          onClick={() => !disabled && onToggle(model.id)}
          role="switch"
          aria-checked="false"
          aria-label={`Toggle ${model.name}`}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!disabled) onToggle(model.id) } }}
        >
          <div className={knobClass} />
        </div>
      )}
      <div className="pn-flex-fill">
        <div className="pn-flex-row">
          <span className="pn-model-row-name">{model.name}</span>
          {model.newlyDiscovered && (
            <span className="pn-model-row-badge-new">NEW</span>
          )}
          {model.deprecated && (
            <span className="pn-model-row-badge-depr">DEPR</span>
          )}
        </div>
        <div className="pn-flex-gap">
          {model.capabilities.slice(0, 3).map(cap => (
            <span key={cap} className="pn-model-row-cap">
              {CAP_LABELS[cap as keyof typeof CAP_LABELS] || cap}
            </span>
          ))}
          {model.capabilities.length > 3 && (
            <span className="pn-model-row-cap-more">+{model.capabilities.length - 3}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function ProviderNodeExpanded({ nodeId, providerId }: { nodeId: string; providerId: ProviderId }) {
  const def = PROVIDER_REGISTRY[providerId]
  const { providers, setTemperature, toggleModel, syncModels, syncStatus, syncError, lastSyncedAt } = useModelStore()
  const { saveKey, hasKey, getEntry, setKeyValid } = useVaultStore()
  const { removeProviderNode } = useCanvasStore()

  const provider = providers[nodeId]
  if (!provider) return null

  const [editKey, setEditKey] = useState('')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [allowImageUploads, setAllowImageUploads] = useState(false)
  const [keySaved, setKeySaved] = useState(false)

  const keyEntry = getEntry(providerId)
  const keyStored = hasKey(providerId)

  const handleSaveKey = async () => {
    if (!editKey.trim()) return
    await saveKey(providerId, def.name, editKey.trim())
    setEditKey('')
    setShowKeyInput(false)
    useCanvasStore.getState().onKeyStored(providerId)
    setKeySaved(true)
    setTimeout(() => setKeySaved(false), 2000)
    setTimeout(() => handleTestConnection(), 300)
  }

  const handleTestConnection = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/vault/keys/${providerId}/test`, {
        method: 'POST',
        headers: { 'x-user-id': 'dev-user' },
      });
      const data = await res.json();
      await setKeyValid(providerId, data.valid === true);
    } catch {
      await setKeyValid(providerId, false);
    }
  }

  const enabledModels = provider.models.filter(m => m.enabled && !m.deprecated)
  const hasVision = provider.models.some(m => m.enabled && m.capabilities.includes('vision'))
  const isSyncing = syncStatus[nodeId] === 'syncing'
  const syncErr = syncError[nodeId]

  const handleSync = useCallback(() => {
    syncModels(nodeId)
  }, [nodeId, syncModels])

  const handleToggle = useCallback((modelId: string) => {
    toggleModel(nodeId, modelId)
  }, [nodeId, toggleModel])

  const lastSync = lastSyncedAt[providerId]
  const hoursAgo = lastSync ? Math.floor((Date.now() - lastSync) / 3600000) : null
  const isLive = hoursAgo !== null && hoursAgo < 6

  return (
    <div
      className="pn-expanded"
      data-provider={providerId}
      onClick={e => e.stopPropagation()}
    >
      <div className="pn-expanded-header">
        {keySaved && (
          <div className="pn-expanded-header-bar">
            🔑 Key stored in Vault
          </div>
        )}
        <div className="pn-expanded-header-row">
          <span className="pn-expanded-header-icon">{def.icon}</span>
          <span className="pn-expanded-header-name">{def.name}</span>
          <button
            onClick={() => removeProviderNode(nodeId)}
            className="pn-expanded-header-close"
            title="Remove provider"
            aria-label="Remove provider"
          >✕</button>
        </div>
        <div className="pn-expanded-header-inputs-wrap">
          <span className="pn-expanded-header-inputs-text">Inputs</span>
        </div>
      </div>

      <div className="pn-expanded-body">
        {def.requiresKey && (
          <>
            <label className="pn-label" htmlFor="provider-api-key-input">Connect Credential <span className="pn-required-star">*</span></label>
            {!keyStored && !showKeyInput ? (
              <button
                onClick={() => setShowKeyInput(true)}
                className="pn-add-key-btn"
                aria-label="Add API Key"
              >
                + Add API Key
              </button>
            ) : showKeyInput ? (
              <div className="pn-key-input-row">
                <input
                  id="provider-api-key-input"
                  type="password"
                  value={editKey}
                  onChange={e => setEditKey(e.target.value)}
                  placeholder="Paste API key..."
                  className="pn-input"
                  autoFocus
                />
                <button onClick={handleSaveKey} className="pn-key-save-btn" aria-label="Save key">Save</button>
                <button
                  onClick={() => { setShowKeyInput(false); setEditKey('') }}
                  className="pn-key-cancel-btn"
                  aria-label="Cancel key input"
                >✕</button>
              </div>
            ) : (
              <div className="pn-key-stored-row">
                <div className="pn-key-masked">
                  {keyEntry?.maskedValue} <span className="pn-key-status-icon" data-key-valid={keyEntry?.isValid === true ? 'true' : keyEntry?.isValid === false ? 'false' : 'unknown'}>{keyEntry?.isValid === true ? '✓' : keyEntry?.isValid === false ? '✗' : '?'}</span>
                </div>
                <button onClick={handleTestConnection} className="pn-key-action-btn" aria-label="Test connection">Test</button>
                <button onClick={() => { setShowKeyInput(true) }} className="pn-key-action-btn" aria-label="Rotate key">Rotate</button>
              </div>
            )}
            {keyStored && !showKeyInput && (
              <div className="pn-key-status-row">
                <span
                  className="pn-key-status-dot"
                  data-key-status={keyEntry?.isValid === null ? 'unknown' : keyEntry?.isValid ? 'valid' : 'invalid'}
                />
                {keyEntry?.providerName} · {keyEntry?.isValid === null ? 'untested' : keyEntry?.isValid ? 'valid' : 'invalid'}
                {keyEntry && <span>· {new Date(keyEntry.lastUpdated).toLocaleDateString()}</span>}
              </div>
            )}
          </>
        )}

        <label className="pn-label">Models <span className="pn-required-star">*</span></label>

        <div className="pn-sync-row">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`pn-tiny-btn${isSyncing ? ' pn-sync-btn--syncing' : ''}`}
            aria-label={isSyncing ? 'Syncing models' : 'Sync models'}
          >
            {isSyncing ? '⟳ Syncing...' : '⟳ Sync Models'}
          </button>
          {syncErr && (
            <span className="pn-sync-error" title={syncErr}>Sync failed</span>
          )}
          {!syncErr && provider.models.length > 0 && (
            <span className="pn-sync-info">
              {enabledModels.length} active · {provider.models.filter(m => m.deprecated).length} deprecated · {provider.models.filter(m => m.newlyDiscovered).length} new
            </span>
          )}
        </div>

        <div className="pn-model-list">
          {provider.models.length === 0 ? (
            <div className="pn-model-list-empty">
              No models yet. Click Sync Models.
            </div>
          ) : (
            provider.models.map(m => (
              <ModelRow key={m.id} model={m} onToggle={handleToggle} />
            ))
          )}
        </div>

        <label className="pn-label" htmlFor="temperature-input">Temperature</label>
        <input
          id="temperature-input"
          type="number"
          min={0} max={2} step={0.1}
          value={provider.temperature}
          onChange={e => setTemperature(nodeId, parseFloat(e.target.value))}
          className="pn-input"
          aria-label="Temperature"
        />

        {hasVision && (
          <div className="pn-temp-row">
            <span className="pn-temp-label">Allow Image Uploads</span>
            {allowImageUploads ? (
              <div
                className="pn-toggle pn-toggle--on"
                onClick={() => setAllowImageUploads(false)}
                role="switch"
                aria-checked="true"
                aria-label="Allow Image Uploads"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAllowImageUploads(false) } }}
              >
                <div className="pn-knob pn-knob--on" />
              </div>
            ) : (
              <div
                className="pn-toggle pn-toggle--off"
                onClick={() => setAllowImageUploads(true)}
                role="switch"
                aria-checked="false"
                aria-label="Allow Image Uploads"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAllowImageUploads(true) } }}
              >
                <div className="pn-knob pn-knob--off" />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="pn-footer">
        {isLive ? (
          <>
            <div className="pn-footer-status-dot pn-footer-status-dot--live" />
            <span className="pn-footer-status-live">Live</span>
          </>
        ) : lastSync ? (
          <>
            <div className="pn-footer-status-dot pn-footer-status-dot--stale" />
            <span className="pn-footer-status-muted">Last synced {hoursAgo}h ago</span>
          </>
        ) : (
          <>
            <div className="pn-footer-status-dot pn-footer-status-dot--never" />
            <span className="pn-footer-status-muted">Never synced</span>
          </>
        )}
        <div className="pn-footer-spacer" />
        <button
          onClick={async () => {
            try { await fetch(`${API_BASE}/api/models/sync/trigger`, { method: 'POST' }) }
            catch { /* ignore */ }
          }}
          className="pn-sync-now-btn"
          aria-label="Sync now"
        >
          Sync Now
        </button>
      </div>
    </div>
  )
}

function ProviderNodeCollapsed({ nodeId, providerId }: { nodeId: string; providerId: ProviderId }) {
  const def = PROVIDER_REGISTRY[providerId]
  const { providers, pendingChanges } = useModelStore()
  const provider = providers[nodeId]
  const newCount = provider?.models.filter(m => m.newlyDiscovered).length ?? 0
  const depCount = provider?.models.filter(m => m.deprecated).length ?? 0
  const pendingCount = pendingChanges[providerId]?.length ?? 0

  return (
    <div
      className="pn-collapsed"
      data-provider={providerId}
      data-pending={pendingCount > 0 ? 'true' : undefined}
      data-status={provider?.status ?? 'unknown'}
    >
      <Handle type="source" position={Position.Right} id="key-out" style={{ top: '50%' }} />
      <div className="pn-collapsed-icon-wrap">
        {def.icon}
        <div className="pn-collapsed-status-dot" />
        {pendingCount > 0 && (
          <div className="pn-collapsed-pending-dot" />
        )}
      </div>
      <div className="pn-collapsed-text-wrap">
        <div className="pn-collapsed-name">{def.name}</div>
        <div className="pn-collapsed-sub">
          {provider ? `${provider.models.filter(m => m.enabled).length} enabled` : 'loading...'}
        </div>
        {(pendingCount > 0 || newCount > 0 || depCount > 0) && (
          <div className="pn-collapsed-badges">
            {pendingCount > 0 && <span className="pn-collapsed-badge pn-collapsed-badge--pending">{pendingCount} pending</span>}
            {newCount > 0 && <span className="pn-collapsed-badge pn-collapsed-badge--new">{newCount} new</span>}
            {depCount > 0 && <span className="pn-collapsed-badge pn-collapsed-badge--depr">{depCount} dep.</span>}
          </div>
        )}
      </div>
    </div>
  )
}

function ProviderNode({ id, data }: NodeProps<{ nodeId: string; providerId: ProviderId }>) {
  const { expandedIds } = useCanvasStore()
  const isExpanded = expandedIds.has(id)

  return (
    <div className="pn-root">
      {isExpanded
        ? <ProviderNodeExpanded nodeId={data.nodeId} providerId={data.providerId} />
        : <ProviderNodeCollapsed nodeId={data.nodeId} providerId={data.providerId} />
      }
    </div>
  )
}

export default memo(ProviderNode)