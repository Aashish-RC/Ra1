import { VaultEntry } from '../store/vault.store'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function getAuthHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-user-id': 'dev-user',
  }
}

export interface StoredKeyMetadata {
  providerId: string
  providerName: string
  maskedValue: string
  lastUpdated: number
  isValid: boolean | null
}

function buildUrl(path: string): string {
  return `${API_BASE}/api/vault${path}`
}

export async function saveKeyToVault(
  providerId: string,
  providerName: string,
  rawKey: string
): Promise<VaultEntry> {
  const res = await fetch(buildUrl('/keys'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ providerId, providerName, rawKey }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to save key' }))
    throw new Error(err.error || 'Failed to save key')
  }
  return res.json()
}

export async function listVaultKeys(): Promise<VaultEntry[]> {
  const res = await fetch(buildUrl('/keys'), { headers: getAuthHeaders() })
  if (!res.ok) {
    throw new Error('Failed to list keys')
  }
  return res.json()
}

export async function resolveVaultKey(providerId: string): Promise<string | null> {
  const res = await fetch(buildUrl(`/keys/${providerId}/resolve`), { headers: getAuthHeaders() })
  if (!res.ok) {
    if (res.status === 404) return null
    throw new Error('Failed to resolve key')
  }
  const data = await res.json()
  return data.rawKey || null
}

export async function revokeVaultKey(providerId: string): Promise<void> {
  const res = await fetch(buildUrl(`/keys/${providerId}`), {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  if (!res.ok) {
    throw new Error('Failed to revoke key')
  }
}

export async function updateKeyStatus(
  providerId: string,
  isValid: boolean | null
): Promise<void> {
  const res = await fetch(buildUrl(`/keys/${providerId}/status`), {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ isValid }),
  })
  if (!res.ok) {
    throw new Error('Failed to update key status')
  }
}