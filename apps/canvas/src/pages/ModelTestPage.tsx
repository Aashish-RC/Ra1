import { useState, useEffect, useRef, useCallback } from 'react'
import './ModelTestPage.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// ─── Types ───────────────────────────────────────────────────────────────────
interface VaultEntry {
  providerId: string
  providerName: string
  maskedValue: string
  lastUpdated: number
  isValid: boolean | null
}

interface ModelScore {
  modelId: string
  providerId: string
  reliabilityScore: number
  latencyScore: number
  costScore: number
  compositeScore: number
  sampleSize: number
}

interface SnapshotModel {
  id: string
  name?: string
}

interface ModelOption {
  providerId: string
  providerName: string
  modelId: string
  label: string
}

interface ChatExchange {
  message: string
  response: string
  model: string
  tier: string
  byok: boolean
  fallbackTriggered: boolean
  fallbackFrom: string | null
  latency: number
  error: string | null
  errorType: string | null
}

interface CooldownEntry {
  until: number
  reason: string
  remaining_ms: number
}

const sFetch = async (url: string, opts?: RequestInit) => {
  const res = await fetch(url, opts)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error || body?.details || `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getSpeedLabel(score: ModelScore): string {
  if (score.latencyScore > 0.7) return 'fast'
  if (score.latencyScore > 0.4) return 'medium'
  return 'slow'
}

function getRemainingCooldown(cooldowns: Record<string, CooldownEntry>, modelId: string): number | null {
  const entry = cooldowns[modelId]
  if (!entry) return null
  const remaining = Math.ceil((entry.until - Date.now()) / 1000)
  return remaining > 0 ? remaining : null
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function ModelTestPage() {
  // Section 1 — Vault Status
  const [vaultEntries, setVaultEntries] = useState<VaultEntry[]>([])
  const [vaultLoading, setVaultLoading] = useState(true)
  const [vaultError, setVaultError] = useState<string | null>(null)
  const [testingProvider, setTestingProvider] = useState<string | null>(null)

  // Section 2 — Model Mode
  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const [pinnedModel, setPinnedModel] = useState<string | null>(null)
  const [autoModel, setAutoModel] = useState<string | null>(null)
  const [lastUsedModel, setLastUsedModel] = useState<string | null>(null)
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)

  // Section 3 — Test Chat
  const [chatInput, setChatInput] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatExchange[]>([])
  const [sending, setSending] = useState(false)
  const [_chatError, setChatError] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Section 4 — Fallback Activity
  const [scores, setScores] = useState<ModelScore[]>([])
  const [cooldowns, setCooldowns] = useState<Record<string, CooldownEntry>>({})
  const [scoresLoading, setScoresLoading] = useState(true)
  const [scoresError, setScoresError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  // ── Section 1: Load vault keys ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setVaultLoading(true)
    setVaultError(null)
    sFetch(`${API_BASE}/api/vault/keys`)
      .then(data => { if (!cancelled) setVaultEntries(Array.isArray(data) ? data : []) })
      .catch(err => { if (!cancelled) setVaultError(err.message) })
      .finally(() => { if (!cancelled) setVaultLoading(false) })
    return () => { cancelled = true }
  }, [])

  const testKey = useCallback(async (providerId: string) => {
    setTestingProvider(providerId)
    try {
      const data = await sFetch(`${API_BASE}/api/vault/keys/${providerId}/test`, { method: 'POST' })
      setVaultEntries(prev => prev.map(e =>
        e.providerId === providerId
          ? { ...e, isValid: data.valid ?? null }
          : e
      ))
    } catch (err: any) {
      setVaultEntries(prev => prev.map(e =>
        e.providerId === providerId
          ? { ...e, isValid: false }
          : e
      ))
    } finally {
      setTestingProvider(null)
    }
  }, [])

  // ── Section 2: Load available models ──────────────────────────────────────
  const loadModelOptions = useCallback(async () => {
    setModelsLoading(true)
    setModelsError(null)
    try {
      // Get connected providers from vault
      const vaultEntries: VaultEntry[] = await sFetch(`${API_BASE}/api/vault/keys`)
      const providerIds = vaultEntries.map(e => e.providerId)

      // Fetch snapshot for each provider, flatten results
      const results = await Promise.allSettled(
        providerIds.map(pid =>
          sFetch(`${API_BASE}/api/models/snapshot/${pid}`)
        )
      )

      const options: ModelOption[] = []
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const snapshot = result.value as { providerId: string; models: { id: string; name?: string }[] }
          for (const m of snapshot.models) {
            options.push({
              providerId: snapshot.providerId,
              providerName: snapshot.providerId,
              modelId: m.id,
              label: m.name || m.id,
            })
          }
        }
        // Gracefully skip failed providers (404, etc.)
      }

      setModelOptions(options)
    } catch (err: any) {
      setModelsError(err.message)
    } finally {
      setModelsLoading(false)
    }
  }, [])

  // ── Section 2: Auto-select model via scoring ──────────────────────────────
  const loadAutoModel = useCallback(async () => {
    try {
      const data = await sFetch(`${API_BASE}/api/scoring/scores`)
      const scores: ModelScore[] = data?.scores ?? []
      if (scores.length > 0) {
        const best = scores.reduce((a, b) =>
          a.compositeScore > b.compositeScore ? a : b
        )
        setAutoModel(best.modelId)
      } else {
        setAutoModel(null)
      }
    } catch {
      setAutoModel(null)
    }
  }, [])

  useEffect(() => {
    if (mode !== 'auto') return
    loadAutoModel()
    const interval = setInterval(loadAutoModel, 10_000)
    return () => clearInterval(interval)
  }, [mode, loadAutoModel])

  useEffect(() => {
    if (mode !== 'manual') return
    loadModelOptions()
  }, [mode, loadModelOptions])

  // ── Section 3: Chat ────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const msg = chatInput.trim()
    if (!msg) return
    setChatInput('')
    setChatError(null)
    setSending(true)

    const t0 = Date.now()
    const body: Record<string, unknown> = { message: msg }
    if (mode === 'manual' && pinnedModel) {
      body.model = pinnedModel
    }

    try {
      const data = await sFetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const exchange: ChatExchange = {
        message: msg,
        response: data.response || '',
        model: data.model || 'unknown',
        tier: data.tier || 'unknown',
        byok: !!data.byok,
        fallbackTriggered: !!data.fallbackTriggered,
        fallbackFrom: data.fallbackFrom || null,
        latency: Date.now() - t0,
        error: null,
        errorType: null,
      }
      setLastUsedModel(data.model || null)
      setChatHistory(prev => [...prev, exchange])
    } catch (err: any) {
      const exchange: ChatExchange = {
        message: msg,
        response: '',
        model: '—',
        tier: '—',
        byok: false,
        fallbackTriggered: false,
        fallbackFrom: null,
        latency: Date.now() - t0,
        error: err.message,
        errorType: err.message.includes('cooldown') ? 'all_cooldown' : 'general',
      }
      setChatHistory(prev => [...prev, exchange])
    } finally {
      setSending(false)
      loadCooldowns()
      loadScores()
    }
  }, [chatInput, mode, pinnedModel, loadCooldowns, loadScores, setLastUsedModel])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  // ── Section 4: Scores ──────────────────────────────────────────────────────
  const loadScores = useCallback(async () => {
    setScoresLoading(true)
    setScoresError(null)
    try {
      const data = await sFetch(`${API_BASE}/api/scoring/scores`)
      setScores(data?.scores ?? [])
    } catch (err: any) {
      setScoresError(err.message)
    } finally {
      setScoresLoading(false)
    }
  }, [])

  const loadCooldowns = useCallback(async () => {
    try {
      const data = await sFetch(`${API_BASE}/api/scoring/cooldowns`)
      setCooldowns(data || {})
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    loadScores()
    loadCooldowns()
    const interval = setInterval(loadCooldowns, 5_000)
    return () => clearInterval(interval)
  }, [loadScores, loadCooldowns])

  const triggerSync = useCallback(async () => {
    setSyncing(true)
    try {
      await sFetch(`${API_BASE}/api/models/sync/trigger`, { method: 'POST' })
      // Refresh after sync
      await loadScores()
    } catch (err: any) {
      setChatError(err.message)
    } finally {
      setSyncing(false)
    }
  }, [loadScores])

  // ── Helpers (render) ──────────────────────────────────────────────────────
  function getActiveModel(): string | null {
    if (lastUsedModel) return lastUsedModel
    if (mode === 'auto') return autoModel
    return pinnedModel
  }
  const activeModel = getActiveModel()

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="mtp-page">
      <div className="mtp-container">
        {/* Page title */}
        <div className="mtp-page-title">
          Model Engine Test
        </div>
        <div className="mtp-page-subtitle">
          Test vault keys, model selection, chat fallback, and scoring.
        </div>

        {/* ═══════ Section 1: Vault Status ═══════ */}
        <div className="mtp-section">
          <div className="mtp-section-header">
            <span>🔐</span> Vault Status
          </div>
          <div className="mtp-section-body">
            {vaultLoading ? (
              <div className="mtp-loading">Loading vault keys…</div>
            ) : vaultError ? (
              <div className="mtp-error-box">Failed to load vault keys: {vaultError}</div>
            ) : vaultEntries.length === 0 ? (
              <div className="mtp-empty-msg">
                No keys in vault. Add a provider key via the Canvas → Vault node.
              </div>
            ) : (
              <div className="mtp-flex-col-gap8">
                {vaultEntries.map(entry => (
                  <div key={entry.providerId} className="mtp-vault-row">
                    {/* Status dot */}
                    <div className={`mtp-status-dot ${
                      entry.isValid === true ? 'mtp-status-dot--valid' :
                      entry.isValid === false ? 'mtp-status-dot--invalid' : 'mtp-status-dot--untested'
                    }`} />
                    {/* Provider name */}
                    <span className="mtp-provider-name">
                      {entry.providerName}
                    </span>
                    {/* Masked key */}
                    <span className="mtp-masked-key">
                      {entry.maskedValue}
                    </span>
                    {/* Validity badge */}
                    <span className={`mtp-badge ${
                      entry.isValid === true ? 'mtp-badge--valid' :
                      entry.isValid === false ? 'mtp-badge--invalid' : 'mtp-badge--untested'
                    }`}>
                      {entry.isValid === true ? 'valid' :
                       entry.isValid === false ? 'invalid' : 'untested'}
                    </span>
                    {/* Test button */}
                    <button
                      onClick={() => testKey(entry.providerId)}
                      disabled={testingProvider === entry.providerId}
                      className="mtp-btn mtp-btn--secondary mtp-test-btn"
                    >
                      {testingProvider === entry.providerId ? 'Testing…' : 'Test'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ═══════ Section 2: Model Mode Selector ═══════ */}
        <div className="mtp-section">
          <div className="mtp-section-header">
            <span>🎯</span> Model Mode
          </div>
          <div className="mtp-section-body">
            {/* Toggle buttons */}
            <div className="mtp-flex-row-gap6">
              <button
                className={`mtp-toggle-btn ${mode === 'auto' ? 'mtp-toggle-btn--active' : 'mtp-toggle-btn--inactive'}`}
                onClick={() => { setMode('auto'); setPinnedModel(null) }}
              >
                Auto
              </button>
              <button
                className={`mtp-toggle-btn ${mode === 'manual' ? 'mtp-toggle-btn--active' : 'mtp-toggle-btn--inactive'}`}
                onClick={() => setMode('manual')}
              >
                Manual
              </button>
            </div>

            {/* Auto mode display */}
            {mode === 'auto' && (
              <div className="mtp-mt12">
                {modelsError ? (
                  <div className="mtp-text-warn">
                    ⚠ Auto-select unavailable: {modelsError}
                  </div>
                ) : autoModel ? (
                  <div className="mtp-flex-row--center">
                    <span className="mtp-text-muted">Auto-selected model:</span>
                    <span className="mtp-text-accent mtp-font-bold mtp-text-13">{autoModel}</span>
                    <span className="mtp-text-small">(refreshes every 10s)</span>
                  </div>
                ) : (
                  <div className="mtp-loading">Waiting for scores…</div>
                )}
              </div>
            )}

            {/* Manual mode display */}
            {mode === 'manual' && (
              <div className="mtp-mt12">
                {modelsLoading ? (
                  <div className="mtp-loading">Loading models from providers…</div>
                ) : modelsError ? (
                  <div className="mtp-text-warn mtp-mb8">
                    ⚠ {modelsError}
                  </div>
                ) : null}
                {modelOptions.length > 0 ? (
                  <select
                    className="mtp-select"
                    value={pinnedModel || ''}
                    onChange={e => setPinnedModel(e.target.value)}
                    aria-label="Select a model"
                  >
                    {modelOptions.map(opt => (
                      <option key={opt.modelId} value={opt.modelId}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  !modelsLoading && !modelsError && (
                    <div className="mtp-text-muted">
                      No models found. Add vault keys first or trigger a model sync.
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* ═══════ Section 3: Test Chat ═══════ */}
        <div className="mtp-section">
          <div className="mtp-section-header">
            <span>💬</span> Test Chat
          </div>
          <div className="mtp-section-body">
            {/* Input area */}
            <div className="mtp-flex-row">
              <input
                className="mtp-input"
                placeholder="Type a test message…"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }}}
                disabled={sending}
              />
              <button
                onClick={sendMessage}
                disabled={sending || !chatInput.trim()}
                className="mtp-btn mtp-btn--primary mtp-flex-shrink-0"
              >
                {sending ? '…' : 'Send'}
              </button>
            </div>

            {/* Active model indicator */}
            {mode === 'manual' && pinnedModel && (
              <div className="mtp-text-small mtp-mt6">
                Pinned model: <span className="mtp-text-accent mtp-font-semibold">{pinnedModel}</span>
              </div>
            )}

            {/* Chat history */}
            {chatHistory.length > 0 && (
              <div className="mtp-history-container">
                {chatHistory.map((ex, i) => (
                  <div key={i} className="mtp-exchange-card">
                    {/* User message */}
                    <div className="mtp-text-primary mtp-font-bold mtp-user-message">
                      You: {ex.message}
                    </div>
                    {/* Response or Error */}
                    {ex.error ? (
                      <div className={ex.errorType === 'all_cooldown' ? 'mtp-text-warn' : 'mtp-text-error'}>
                        {ex.errorType === 'all_cooldown'
                          ? '⚠ All models are cooling down — wait 30s and retry.'
                          : `✖ ${ex.error}`}
                      </div>
                    ) : (
                      <>
                        <div className="mtp-text-secondary mtp-response-text">
                          {ex.response}
                        </div>
                        {/* Metadata bar */}
                        <div className="mtp-meta-row">
                          <span className="mtp-meta-tag mtp-meta-tag--muted">
                            Model: {ex.model}
                          </span>
                          <span className="mtp-meta-tag mtp-meta-tag--muted">
                            Tier: {ex.tier}
                          </span>
                          <span className={`mtp-meta-tag ${ex.byok ? 'mtp-meta-tag--byok-yes' : 'mtp-meta-tag--byok-no'}`}>
                            BYOK: {ex.byok ? 'Yes' : 'No'}
                          </span>
                          <span className={`mtp-meta-tag ${ex.fallbackTriggered ? 'mtp-meta-tag--fallback-yes' : 'mtp-meta-tag--fallback-no'}`}>
                            Fallback: {ex.fallbackTriggered ? 'Yes' : 'No'}
                          </span>
                          {ex.fallbackTriggered && ex.fallbackFrom && (
                            <span className="mtp-meta-tag mtp-meta-tag--fallback-from">
                              From: {ex.fallbackFrom}
                            </span>
                          )}
                          <span className="mtp-meta-tag mtp-meta-tag--muted">
                            Latency: {ex.latency}ms
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* ═══════ Section 4: Fallback Activity ═══════ */}
        <div className="mtp-section">
          <div className="mtp-section-header">
            <span>📊</span> Fallback Activity
            <div className="mtp-flex-1" />
            <button
              onClick={triggerSync}
              disabled={syncing}
              className="mtp-btn mtp-btn--secondary mtp-btn--compact"
            >
              {syncing ? 'Syncing…' : 'Trigger Sync'}
            </button>
          </div>
          <div className="mtp-section-body">
            {scoresLoading ? (
              <div className="mtp-loading">Loading scores…</div>
            ) : scoresError ? (
              <div className="mtp-error-box">Failed to load scores: {scoresError}</div>
            ) : scores.length === 0 ? (
              <div className="mtp-empty-msg">No scoring data yet. Use the chat or wait for model usage.</div>
            ) : (
              <div className="mtp-overflow-auto">
                <table className="mtp-table">
                  <thead>
                    <tr>
                      <th className="mtp-th">Model</th>
                      <th className="mtp-th">Provider</th>
                      <th className="mtp-th">Score</th>
                      <th className="mtp-th">Speed</th>
                      <th className="mtp-th">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scores.map(score => {
                      const isActive = score.modelId === activeModel
                      const cdRemaining = getRemainingCooldown(cooldowns, score.modelId)
                      return (
                        <tr
                          key={score.modelId}
                          className={
                            isActive ? 'mtp-tr--active' :
                            cdRemaining !== null ? 'mtp-tr--cooldown' :
                            'mtp-tr--default'
                          }
                        >
                          <td className={`mtp-td ${isActive ? 'mtp-td--active' : 'mtp-td--default'}`}>
                            {score.modelId}
                          </td>
                          <td className="mtp-td">{score.providerId}</td>
                          <td className="mtp-td">
                            <span className={`mtp-score ${
                              score.compositeScore > 0.7 ? 'mtp-score--high' : score.compositeScore > 0.4 ? 'mtp-score--medium' : 'mtp-score--low'
                            }`}>
                              {score.compositeScore.toFixed(3)}
                            </span>
                          </td>
                          <td className="mtp-td">
                            <span className={`mtp-badge ${
                              getSpeedLabel(score) === 'fast' ? 'mtp-badge--fast' :
                              getSpeedLabel(score) === 'medium' ? 'mtp-badge--medium' : 'mtp-badge--slow'
                            }`}>
                              {getSpeedLabel(score)}
                            </span>
                          </td>
                          <td className="mtp-td">
                            {cdRemaining !== null ? (
                              <span className="mtp-td-status--cooldown">
                                ⏳ cooldown {cdRemaining}s
                              </span>
                            ) : isActive ? (
                              <span className="mtp-td-status--active">active</span>
                            ) : (
                              <span className="mtp-td-status--ready">ready</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}