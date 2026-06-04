import { memo, useEffect, useState, useRef } from 'react'
import { NodeProps, Handle, Position } from 'reactflow'
import { useVaultStore } from '../store/vault.store'
import { useCanvasStore } from '../store/canvasStore'
import './VaultNode.css'

function VaultNodeExpanded() {
  const { entries, revokeKey, setExpanded } = useVaultStore()
  const list = Object.values(entries)

  return (
    <div
      className="vn-expanded"
      onClick={e => e.stopPropagation()}
    >
      <Handle type="target" position={Position.Left} id="vault-in" className="vn-handle-left" />
      <Handle type="source" position={Position.Right} id="model-vault-right" className="vn-handle-right" />
      <div className="vn-expanded-header" onClick={() => setExpanded(false)}>
        <div className="vn-expanded-header-icon">🔐</div>
        <div className="vn-expanded-header-text">
          <div className="vn-expanded-header-title">Credential Vault</div>
          <div className="vn-expanded-header-subtitle">{list.length} key{list.length !== 1 ? 's' : ''} · in-memory + masked metadata</div>
        </div>
        <span className="vn-expanded-header-collapse">▼</span>
      </div>

      <div className="vn-expanded-body">
        {list.length === 0 ? (
          <div className="vn-empty-state">
            No credentials stored yet. Add a provider and enter its API key.
          </div>
        ) : list.map(e => (
          <div key={e.providerId} className="vn-key-row">
            <div className={`vn-key-status-dot vn-key-status-dot--${e.isValid === null ? 'unknown' : e.isValid ? 'valid' : 'invalid'}`} />
            <div className="vn-key-info">
              <div className="vn-key-provider">{e.providerName}</div>
              <div className="vn-key-meta">
                {e.maskedValue} · {new Date(e.lastUpdated).toLocaleDateString()} · {e.isValid === null ? 'untested' : e.isValid ? 'valid' : 'invalid'}
              </div>
            </div>
            <button onClick={() => revokeKey(e.providerId)} className="vn-key-revoke-btn">
              Revoke
            </button>
          </div>
        ))}
      </div>

      <div className="vn-footer">
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

  const dotRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = dotRef.current
    if (el) {
      el.style.setProperty('--vn-status-color', statusColor)
    }
  }, [statusColor])

  return (
    <div className="vn-collapsed">
      <Handle type="target" position={Position.Left} id="vault-in" className="vn-handle-left" />
      <Handle type="source" position={Position.Right} id="model-vault-right" className="vn-handle-right" />
      <div className="vn-collapsed-icon-wrap">
        🔐
        <div ref={dotRef} className="vn-collapsed-status-dot" />
      </div>
      <div className="vn-collapsed-text-wrap">
        <div className="vn-collapsed-title">Credential Vault</div>
        <div className="vn-collapsed-sub">{list.length === 0 ? 'No keys stored' : `${list.length} key${list.length !== 1 ? 's' : ''} stored`}</div>
      </div>
    </div>
  )
}

function VaultNode({ id: _id }: NodeProps) {
  const { expanded } = useVaultStore()
  const { animatingKeyIngress, setKeyDropAnimationComplete } = useCanvasStore()
  const [flash, setFlash] = useState(false)

  // Handle flash animation when key ingress completes
  useEffect(() => {
    if (!animatingKeyIngress) return

    // The animation is active; after the animation duration, clear state and flash
    const timer = setTimeout(() => {
      setFlash(true)
      setKeyDropAnimationComplete()
      // Remove flash after 400ms
      setTimeout(() => setFlash(false), 400)
    }, 600)
    return () => clearTimeout(timer)
  }, [animatingKeyIngress, setKeyDropAnimationComplete])

  const flashClass = flash ? ' vault-node--flash' : ''

  return (
    <div className={'vn-root' + flashClass}>
      {expanded ? <VaultNodeExpanded /> : <VaultNodeCollapsed />}
    </div>
  )
}

export default memo(VaultNode)