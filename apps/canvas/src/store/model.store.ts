import { create } from 'zustand'
import { ProviderId, ProviderModel, PROVIDER_REGISTRY } from '../data/providers'
import { discoverProviderModels, mergeDiscoveredModels } from '../services/model-discovery'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface ChangelogEntry {
  id: number
  changeType: 'added' | 'removed' | 'deprecated'
  modelId: string
  modelName?: string
  detail?: string
  createdAt: string
}

export interface PlacedProvider {
  id: string                        // unique canvas node ID e.g. 'provider-openai'
  providerId: ProviderId
  baseUrl: string
  timeout: number
  temperature: number
  status: 'healthy' | 'degraded' | 'error' | 'unknown'
  models: ProviderModel[]           // copy of registry models, user can toggle enabled
  placedAt: number
}

interface ModelStore {
  // Model node
  modelExpanded: boolean
  setModelExpanded: (v: boolean) => void

  // Placed providers (keyed by canvas node id)
  providers: Record<string, PlacedProvider>
  placeProvider: (providerId: ProviderId) => PlacedProvider
  removeProvider: (nodeId: string) => void
  isPlaced: (providerId: ProviderId) => boolean

  // Provider config
  setBaseUrl: (nodeId: string, url: string) => void
  setTimeout: (nodeId: string, timeout: number) => void
  setTemperature: (nodeId: string, temp: number) => void
  setStatus: (nodeId: string, status: PlacedProvider['status']) => void

  // Model enable/disable
  toggleModel: (nodeId: string, modelId: string) => void

  // Model discovery
  syncModels: (nodeId: string) => Promise<{ hasNew: boolean; hasNewDeprecated: boolean }>
  syncStatus: Record<string, 'idle' | 'syncing' | 'error'>
  syncError: Record<string, string>

  // Notification flags (aggregated across all providers)
  hasNewDiscoveries: boolean
  hasNewDeprecations: boolean
  clearNotifications: () => void

  // Dashboard tab in Model node
  activeTab: 'overview' | 'deprecations' | 'updates'
  setActiveTab: (tab: 'overview' | 'deprecations' | 'updates') => void

  // Changelog sync (auto model change detection)
  pendingChanges: Record<string, ChangelogEntry[]>  // keyed by providerId
  hasChanges: boolean
  lastChecked: number  // unix timestamp
  lastSyncedAt: Record<string, number>  // per provider, when models were last applied

  setPendingChanges: (data: { hasChanges: boolean; changes: Record<string, ChangelogEntry[]>; lastChecked: string }) => void
  applyChanges: (providerIds: string[]) => Promise<void>  // calls POST /changelog/apply, then merges snapshots into provider models

  // Key edit open state (survives re-renders)
  keyEditOpen: Record<string, boolean>
  setKeyEditOpen: (nodeId: string, open: boolean) => void
}

export const useModelStore = create<ModelStore>((set, get) => ({
  modelExpanded: false,
  setModelExpanded: (modelExpanded) => set({ modelExpanded }),

  providers: {},
  syncStatus: {},
  syncError: {},
  hasNewDiscoveries: false,
  hasNewDeprecations: false,

  pendingChanges: {},
  hasChanges: false,
  lastChecked: 0,
  lastSyncedAt: {},

  keyEditOpen: {},
  setKeyEditOpen: (nodeId, open) =>
    set(s => ({ keyEditOpen: { ...s.keyEditOpen, [nodeId]: open } })),

  placeProvider: (providerId) => {
    const def = PROVIDER_REGISTRY[providerId]
    const nodeId = `provider-${providerId}`
    const placed: PlacedProvider = {
      id: nodeId,
      providerId,
      baseUrl: def.defaultBaseUrl,
      timeout: 30000,
      temperature: 0.7,
      status: 'unknown',
      models: def.models.map(m => ({ ...m })),
      placedAt: Date.now(),
    }
    set(s => ({ providers: { ...s.providers, [nodeId]: placed } }))
    // Auto-trigger discovery on placement
    setTimeout(() => get().syncModels(nodeId), 500)
    return placed
  },

  removeProvider: (nodeId) => set(s => {
    const next = { ...s.providers }
    delete next[nodeId]
    const syncStatus = { ...s.syncStatus }
    delete syncStatus[nodeId]
    const syncError = { ...s.syncError }
    delete syncError[nodeId]
    return { providers: next, syncStatus, syncError }
  }),

  isPlaced: (providerId) =>
    Object.values(get().providers).some(p => p.providerId === providerId),

  setBaseUrl: (nodeId, baseUrl) => set(s => ({
    providers: { ...s.providers, [nodeId]: { ...s.providers[nodeId], baseUrl } }
  })),
  setTimeout: (nodeId, timeout) => set(s => ({
    providers: { ...s.providers, [nodeId]: { ...s.providers[nodeId], timeout } }
  })),
  setTemperature: (nodeId, temperature) => set(s => ({
    providers: { ...s.providers, [nodeId]: { ...s.providers[nodeId], temperature } }
  })),
  setStatus: (nodeId, status) => set(s => ({
    providers: { ...s.providers, [nodeId]: { ...s.providers[nodeId], status } }
  })),

  toggleModel: (nodeId, modelId) => set(s => {
    const provider = s.providers[nodeId]
    if (!provider) return s
    return {
      providers: {
        ...s.providers,
        [nodeId]: {
          ...provider,
          models: provider.models.map(m =>
            m.id === modelId ? { ...m, enabled: !m.enabled } : m
          ),
        },
      },
    }
  }),

  syncModels: async (nodeId) => {
    const provider = get().providers[nodeId]
    if (!provider) {
      return { hasNew: false, hasNewDeprecated: false }
    }

    set(s => ({
      syncStatus: { ...s.syncStatus, [nodeId]: 'syncing' },
      syncError: { ...s.syncError, [nodeId]: '' },
    }))

    try {
      const fresh = await discoverProviderModels(provider.providerId, provider.baseUrl)
      const { merged, hasNew, hasNewDeprecated } = mergeDiscoveredModels(provider.models, fresh)

      set(s => ({
        providers: {
          ...s.providers,
          [nodeId]: {
            ...s.providers[nodeId],
            models: merged,
            status: 'healthy' as const,
          },
        },
        syncStatus: { ...s.syncStatus, [nodeId]: 'idle' },
        hasNewDiscoveries: s.hasNewDiscoveries || hasNew,
        hasNewDeprecations: s.hasNewDeprecations || hasNewDeprecated,
      }))

      return { hasNew, hasNewDeprecated }
    } catch (err: any) {
      set(s => ({
        syncStatus: { ...s.syncStatus, [nodeId]: 'error' },
        syncError: { ...s.syncError, [nodeId]: err.message },
      }))
      return { hasNew: false, hasNewDeprecated: false }
    }
  },

  clearNotifications: () => set({
    hasNewDiscoveries: false,
    hasNewDeprecations: false,
  }),

  activeTab: 'overview',
  setActiveTab: (activeTab) => set({ activeTab }),

  // ─── Changelog Sync ──────────────────────────────────────────────────────

  setPendingChanges: (data) => set({
    pendingChanges: data.changes,
    hasChanges: data.hasChanges,
    lastChecked: new Date(data.lastChecked).getTime(),
  }),

  applyChanges: async (providerIds) => {
    try {
      const res = await fetch(`${API_BASE}/api/models/changelog/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerIds }),
      })
      if (!res.ok) return

      const data = await res.json() as { snapshots: Record<string, Array<{ id: string; name: string }>> }
      const snapshots = data.snapshots

      // Merge snapshots into our placed providers
      set(s => {
        const updatedProviders = { ...s.providers }
        const updatedLastSyncedAt = { ...s.lastSyncedAt }

        for (const [providerId, models] of Object.entries(snapshots)) {
          const nodeId = `provider-${providerId}`
          const existing = updatedProviders[nodeId]
          if (!existing) continue

          const { merged } = mergeDiscoveredModels(existing.models, models as any)
          updatedProviders[nodeId] = {
            ...existing,
            models: merged,
            status: 'healthy' as const,
          }
          updatedLastSyncedAt[providerId] = Date.now()
        }

        // Mark changes as seen for these providers
        const pendingChanges = { ...s.pendingChanges }
        for (const pid of providerIds) {
          delete pendingChanges[pid]
        }

        return {
          providers: updatedProviders,
          lastSyncedAt: updatedLastSyncedAt,
          pendingChanges,
          hasChanges: Object.keys(pendingChanges).length > 0,
        }
      })
    } catch {
      // Silently fail
    }
  },
}))