import { InfisicalClient } from '@infisical/sdk';
import { config } from 'dotenv';

config();

let _client: InfisicalClient | null = null;
let _authenticated = false;

// In-memory fallback store when Infisical is unreachable
// DEVELOPMENT-ONLY: This is NOT a security control. Keys are stored as base64-encoded strings.
// For production, always use Infisical which provides proper encryption at rest.
// Key structure: providerId -> { encryptedKey, providerName, createdAt, lastTested, isValid }
interface KeyEntry {
  encryptedKey: string;
  providerName: string;
  createdAt: number;
  lastUpdated: number;
  isValid: boolean | null;
}
const _fallbackStore: Record<string, KeyEntry> = {};

// Validation status map (transient — not persisted to Infisical)
const _validationStatus = new Map<string, boolean | null>();

const SECRET_PREFIX = 'PROVIDER_KEY_';

function getConfig(): {
  siteUrl: string;
  clientId: string;
  clientSecret: string;
  projectId: string;
  environment: string;
} {
  return {
    siteUrl: process.env.INFISICAL_URL || 'http://infisical:8080',
    clientId: process.env.INFISICAL_CLIENT_ID || '',
    clientSecret: process.env.INFISICAL_CLIENT_SECRET || '',
    projectId: process.env.INFISICAL_PROJECT_ID || '',
    environment: process.env.INFISICAL_ENVIRONMENT || 'dev',
  };
}

function getSecretName(providerId: string): string {
  return `${SECRET_PREFIX}${providerId.toUpperCase()}`;
}

function maskKey(raw: string): string {
  if (raw.length <= 8) return '••••••••';
  return raw.slice(0, 4) + '••••' + raw.slice(-4);
}

export interface StoredKeyMetadata {
  providerId: string;
  providerName: string;
  maskedValue: string;
  lastUpdated: number;
  isValid: boolean | null;
}

/**
 * Initialize and authenticate the Infisical SDK client.
 * Returns null if Infisical is unreachable or credentials are missing.
 */
export async function getClient(): Promise<InfisicalClient | null> {
  const cfg = getConfig();
  if (!cfg.clientId || !cfg.clientSecret || !cfg.projectId) {
    return null;
  }

  if (_client && _authenticated) {
    return _client;
  }

  try {
    _client = new InfisicalClient({
      accessToken: cfg.clientSecret,
    } as any);

    _authenticated = true;
    return _client;
  } catch {
    // Infisical unreachable — will use fallback
    _client = null;
    _authenticated = false;
    return null;
  }
}

/**
 * Store a key in Infisical (or fallback if unreachable).
 */
export async function saveKey(
  providerId: string,
  providerName: string,
  rawKey: string
): Promise<StoredKeyMetadata> {
  const secretName = getSecretName(providerId);
  const cfg = getConfig();
  const client = await getClient();

  if (client) {
    try {
      // Try to create the secret first
      await (client as any).secrets().createSecret(secretName, {
        projectId: cfg.projectId,
        environment: cfg.environment,
        secretValue: rawKey,
        secretComment: providerName,
        type: 'shared',
      });
    } catch (createErr: any) {
      // If it already exists, update it
      if (createErr?.message?.includes('already exists') || createErr?.response?.status === 409) {
        await (client as any).secrets().updateSecret(secretName, {
          projectId: cfg.projectId,
          environment: cfg.environment,
          secretValue: rawKey,
          secretComment: providerName,
          type: 'shared',
        });
      } else {
        throw createErr;
      }
    }

    _validationStatus.set(providerId.toLowerCase(), null);

    return {
      providerId,
      providerName,
      maskedValue: maskKey(rawKey),
      lastUpdated: Date.now(),
      isValid: null,
    };
  }

  // --- Fallback: in-memory store ---
  const encryptedKey = Buffer.from(rawKey).toString('base64');
  const now = Date.now();
  const normalizedProviderId = providerId.toLowerCase();
  _fallbackStore[normalizedProviderId] = {
    encryptedKey,
    providerName,
    createdAt: now,
    lastUpdated: now,
    isValid: null,
  };

  return {
    providerId,
    providerName,
    maskedValue: maskKey(rawKey),
    lastUpdated: now,
    isValid: null,
  };
}

/**
 * Resolve (fetch) a raw key from Infisical.
 */
export async function resolveKey(providerId: string): Promise<string | null> {
  const secretName = getSecretName(providerId);
  const cfg = getConfig();
  const client = await getClient();

  if (client) {
    try {
      const secret = await (client as any).secrets().getSecret({
        secretName,
        projectId: cfg.projectId,
        environment: cfg.environment,
        type: 'shared',
      });
      return secret.secretValue ?? null;
    } catch {
      // Fall through to fallback store
    }
  }

  // Fallback
  const entry = _fallbackStore[providerId.toLowerCase()];
  if (!entry) return null;
  return Buffer.from(entry.encryptedKey, 'base64').toString('utf8');
}

/**
 * List all stored keys with masked values.
 */
export async function listKeys(): Promise<StoredKeyMetadata[]> {
  const cfg = getConfig();
  const client = await getClient();

  if (client) {
    try {
      const result = await (client as any).secrets().listSecrets({
        projectId: cfg.projectId,
        environment: cfg.environment,
        recursive: false,
      });

      const providerKeys = (result.secrets ?? []).filter((s: any) =>
        s.secretKey?.startsWith(SECRET_PREFIX)
      );

      return providerKeys.map((s: any) => {
        const providerId = (s.secretKey as string).replace(SECRET_PREFIX, '').toLowerCase();
        const rawValue = s.secretValue ?? '';
        return {
          providerId: providerId.toLowerCase(),
          providerName: s.secretComment || providerId,
          maskedValue: maskKey(rawValue),
          lastUpdated: s.updatedAt ? new Date(s.updatedAt).getTime() : Date.now(),
          isValid: _validationStatus.get(providerId.toLowerCase()) ?? null,
        };
      });
    } catch {
      return [];
    }
  }

  // Fallback
  return Object.entries(_fallbackStore).map(([pid, entry]) => {
    const rawKey = Buffer.from(entry.encryptedKey, 'base64').toString('utf8');
    return {
      providerId: pid,
      providerName: entry.providerName,
      maskedValue: maskKey(rawKey),
      lastUpdated: entry.lastUpdated,
      isValid: _validationStatus.get(pid) ?? entry.isValid,
    };
  });
}

/**
 * Delete a key from Infisical.
 */
export async function revokeKey(providerId: string): Promise<boolean> {
  const secretName = getSecretName(providerId);
  const cfg = getConfig();
  const client = await getClient();
  const normalizedId = providerId.toLowerCase();

  if (client) {
    try {
      await (client as any).secrets().deleteSecret(secretName, {
        projectId: cfg.projectId,
        environment: cfg.environment,
        type: 'shared',
      });
      _validationStatus.delete(normalizedId);
      return true;
    } catch {
      return false;
    }
  }

  // Fallback
  if (_fallbackStore[normalizedId]) {
    delete _fallbackStore[normalizedId];
    _validationStatus.delete(normalizedId);
    return true;
  }
  return false;
}

/**
 * Update validation status (transient — stored in-memory only).
 */
export function setValidationStatus(providerId: string, isValid: boolean | null): void {
  _validationStatus.set(providerId.toLowerCase(), isValid);
  const entry = _fallbackStore[providerId.toLowerCase()];
  if (entry) {
    entry.isValid = isValid;
    entry.lastUpdated = Date.now();
  }
}

/**
 * Get validation status.
 */
export function getValidationStatus(providerId: string): boolean | null {
  return _validationStatus.get(providerId.toLowerCase()) ?? null;
}