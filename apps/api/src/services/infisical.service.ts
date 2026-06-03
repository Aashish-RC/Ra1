import { InfisicalClient } from '@infisical/sdk';

const SECRET_PREFIX = 'PROVIDER_KEY_';

let _client: InfisicalClient | null = null;

// Validation status map (transient — not persisted to Infisical)
const _validationStatus = new Map<string, boolean | null>();

function getConfig() {
  return {
    siteUrl: process.env.INFISICAL_URL || 'http://infisical:8080',
    serviceToken: process.env.INFISICAL_SERVICE_TOKEN || '',
    systemProjectId: process.env.INFISICAL_SYSTEM_PROJECT_ID || '',
    providersProjectId: process.env.INFISICAL_PROVIDERS_PROJECT_ID || '',
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
 * Initialize the Infisical SDK client using a service token.
 * If already initialized, returns the cached client.
 */
async function getClient(): Promise<InfisicalClient | null> {
  const cfg = getConfig();
  if (!cfg.serviceToken) {
    return null;
  }

  if (_client) {
    return _client;
  }

  try {
    _client = new InfisicalClient({
      siteUrl: cfg.siteUrl,
      accessToken: cfg.serviceToken,
    });
    return _client;
  } catch {
    _client = null;
    return null;
  }
}

/**
 * Get the project ID for a given scope.
 * Admin shared keys live in the providers project.
 * User BYOK keys also live in the providers project (with path prefix).
 * System secrets are read-only via bootstrap and not accessed through this service.
 */
function getProjectId(userId?: string): string {
  const cfg = getConfig();
  return cfg.providersProjectId;
}

/**
 * Get the Infisical secret path for a key.
 * - userId null → admin shared keys at path /shared/
 * - userId set   → user BYOK keys at path /users/{userId}/
 */
function getSecretPath(userId?: string): string {
  return userId ? `/users/${userId}/` : '/shared/';
}

/**
 * Store a key in Infisical.
 * userId = null     → admin shared key (path: /shared/)
 * userId = "abc123" → user BYOK key (path: /users/abc123/)
 */
export async function saveKey(
  providerId: string,
  providerName: string,
  rawKey: string,
  userId?: string
): Promise<StoredKeyMetadata> {
  const secretName = getSecretName(providerId);
  const cfg = getConfig();
  const client = await getClient();

  if (client) {
    const projectId = getProjectId(userId);
    const path = getSecretPath(userId);

    try {
      await client.createSecret({
        projectId,
        environment: cfg.environment,
        secretName,
        secretValue: rawKey,
        secretComment: providerName,
        path,
        type: 'shared',
      });
    } catch (createErr: any) {
      // If it already exists, update it
      if (createErr?.message?.includes('already exists') || createErr?.response?.status === 409) {
        await client.updateSecret({
          projectId,
          environment: cfg.environment,
          secretName,
          secretValue: rawKey,
          secretComment: providerName,
          path,
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

  throw new Error('Infisical client not initialized — cannot store key without INFISICAL_SERVICE_TOKEN');
}

/**
 * Resolve (fetch) a raw key from Infisical.
 * Checks user BYOK first (if userId provided), then falls back to admin shared key.
 */
export async function resolveKey(providerId: string, userId?: string): Promise<string | null> {
  const secretName = getSecretName(providerId);
  const cfg = getConfig();
  const client = await getClient();

  if (!client) {
    throw new Error('Infisical client not initialized — cannot resolve key without INFISICAL_SERVICE_TOKEN');
  }

  const projectId = getProjectId(userId);

  // If userId provided, check user BYOK first
  if (userId) {
    const userPath = getSecretPath(userId);
    try {
      const secret = await client.getSecret({
        secretName,
        projectId,
        environment: cfg.environment,
        path: userPath,
        type: 'shared',
      });
      if (secret?.secretValue) {
        return secret.secretValue;
      }
    } catch {
      // User key not found, fall back to admin shared key
    }
  }

  // Fall back to admin shared key
  const sharedPath = getSecretPath();
  try {
    const secret = await client.getSecret({
      secretName,
      projectId,
      environment: cfg.environment,
      path: sharedPath,
      type: 'shared',
    });
    return secret?.secretValue ?? null;
  } catch {
    return null;
  }
}

/**
 * List all stored keys with masked values.
 * userId = null  → list admin shared keys (path: /shared/)
 * userId = "abc" → list user BYOK keys (path: /users/abc/)
 */
export async function listKeys(userId?: string): Promise<StoredKeyMetadata[]> {
  const cfg = getConfig();
  const client = await getClient();

  if (!client) {
    throw new Error('Infisical client not initialized — cannot list keys without INFISICAL_SERVICE_TOKEN');
  }

  const projectId = getProjectId(userId);
  const path = getSecretPath(userId);

  try {
    const result = await client.listSecrets({
      projectId,
      environment: cfg.environment,
      path,
      recursive: false,
    });

    const secrets = Array.isArray(result) ? result : [];
    const providerKeys = secrets.filter((s: any) =>
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

/**
 * Delete a key from Infisical.
 * userId = null  → revoke admin shared key
 * userId = "abc" → revoke user BYOK key
 */
export async function revokeKey(providerId: string, userId?: string): Promise<boolean> {
  const secretName = getSecretName(providerId);
  const cfg = getConfig();
  const client = await getClient();
  const normalizedId = providerId.toLowerCase();

  if (!client) {
    throw new Error('Infisical client not initialized — cannot revoke key without INFISICAL_SERVICE_TOKEN');
  }

  const projectId = getProjectId(userId);
  const path = getSecretPath(userId);

  try {
    await client.deleteSecret({
      secretName,
      projectId,
      environment: cfg.environment,
      path,
      type: 'shared',
    });
    _validationStatus.delete(normalizedId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Update validation status (transient — stored in-memory only).
 */
export function setValidationStatus(providerId: string, isValid: boolean | null): void {
  _validationStatus.set(providerId.toLowerCase(), isValid);
}

/**
 * Get validation status.
 */
export function getValidationStatus(providerId: string): boolean | null {
  return _validationStatus.get(providerId.toLowerCase()) ?? null;
}