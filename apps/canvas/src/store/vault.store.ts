import { create } from 'zustand'
import { saveKeyToVault, listVaultKeys, resolveVaultKey, revokeVaultKey, updateKeyStatus } from '../services/vault.service'
import { useCanvasStore } from './canvasStore'

const IS_DEV = import.meta.env.DEV;

export interface VaultEntry {
  providerId: string
  providerName: string
  maskedValue: string
  lastUpdated: number
  isValid: boolean | null   // null = untested
}

interface VaultState {
  entries: Record<string, VaultEntry>
  expanded: boolean
  isOnline: boolean           // whether the backend vault is reachable
  setExpanded: (v: boolean) => void
  saveKey: (providerId: string, providerName: string, rawKey: string) => Promise<void>
  revokeKey: (providerId: string) => Promise<void>
  setKeyValid: (providerId: string, isValid: boolean) => Promise<void>
  hasKey: (providerId: string) => boolean
  getEntry: (providerId: string) => VaultEntry | null
  refreshEntries: () => Promise<void>
  resolveKey: (providerId: string) => Promise<string | null>
  checkConnectivity: () => Promise<void>
}

const STORAGE_KEY = 'ra1-vault-v1'

// Fallback in-memory + localStorage when backend is unavailable
const _fallbackRaw: Record<string, string> = {}

function loadFallbackMeta(): Record<string, VaultEntry> {
  if (!IS_DEV) return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}
function saveFallbackMeta(entries: Record<string, VaultEntry>) {
  if (!IS_DEV) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)) } catch {}
}

export const useVaultStore = create<VaultState>((set, get) => ({
  entries: {},
  expanded: false,
  isOnline: false,

  setExpanded: (expanded) => set({ expanded }),

  saveKey: async (providerId, providerName, rawKey) => {
    // Try backend first
    try {
      const entry = await saveKeyToVault(providerId, providerName, rawKey)
      // Also keep a copy in _fallbackRaw for resolveKey fallback
      if (IS_DEV) _fallbackRaw[providerId.toLowerCase()] = rawKey
      const entries = { ...get().entries, [providerId]: entry }
      saveFallbackMeta(entries)
      set({ entries, isOnline: true })
    } catch {
      // Fallback to local-only
      if (IS_DEV) _fallbackRaw[providerId.toLowerCase()] = rawKey
      const entry: VaultEntry = { providerId, providerName, maskedValue: '••••••••', lastUpdated: Date.now(), isValid: null }
      const entries = { ...get().entries, [providerId]: entry }
      saveFallbackMeta(entries)
      set({ entries, isOnline: false })
    }
  },

  revokeKey: async (providerId) => {
    // Notify canvas store to remove vault-provider edge
    useCanvasStore.getState().onKeyRevoked(providerId)

    try {
      await revokeVaultKey(providerId)
      set({ isOnline: true })
    } catch {
      set({ isOnline: false })
    }
    // Always remove locally
    if (IS_DEV) {
      delete _fallbackRaw[providerId.toLowerCase()]
      const entries = { ...get().entries }
      delete entries[providerId]
      saveFallbackMeta(entries)
      set({ entries })
    }
  },

  setKeyValid: async (providerId, isValid) => {
    try {
      await updateKeyStatus(providerId, isValid)
      set({ isOnline: true })
    } catch {
      set({ isOnline: false })
    }
    if (IS_DEV) {
      const entries = { ...get().entries }
      if (entries[providerId]) {
        entries[providerId] = { ...entries[providerId], isValid }
        saveFallbackMeta(entries)
        set({ entries })
      }
    }
  },

  hasKey: (providerId) => providerId in get().entries,

  getEntry: (providerId) => get().entries[providerId] ?? null,

  refreshEntries: async () => {
    try {
      const keys = await listVaultKeys()
      const entries: Record<string, VaultEntry> = {}
      for (const key of keys) {
        entries[key.providerId] = key
        if (IS_DEV) {
          try {
            const rawKey = await resolveVaultKey(key.providerId)
            if (rawKey) _fallbackRaw[key.providerId.toLowerCase()] = rawKey
          } catch { /* non-fatal */ }
        }
      }
      saveFallbackMeta(entries)
      set({ entries, isOnline: true })
    } catch {
      const entries = loadFallbackMeta()
      set({ entries, isOnline: false })
    }
  },

  resolveKey: async (providerId) => {
    // Try backend first
    try {
      const rawKey = await resolveVaultKey(providerId)
      if (rawKey) return rawKey
    } catch {
      // Fall through to local fallback
    }
    if (!IS_DEV) throw new Error('Vault backend unavailable');
    return _fallbackRaw[providerId] ?? null
  },

  checkConnectivity: async () => {
    try {
      await listVaultKeys()
      set({ isOnline: true })
    } catch {
      const entries = loadFallbackMeta()
      set({ entries, isOnline: false })
    }
  },
}))

// Called by the engine at call-time — uses the store's async resolveKey
// Legacy synchronous version for backward compatibility
export function resolveKey(providerId: string): string | null {
  if (!IS_DEV) return null;
  return _fallbackRaw[providerId.toLowerCase()] ?? null
}
