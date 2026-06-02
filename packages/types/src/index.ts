// ============================================================
// RA1 Shared Types
// Merged from: @ra1/types (King) + packages/shared (10kant)
// ============================================================

// --- Capability Registry (from model-engine) ---
export * from './capability-registry';

// --- Core Entity Types ---

export interface User {
  id: string;
  userId: string;
  email?: string;
  name?: string;
  role?: 'admin' | 'user' | 'viewer';
  accountType?: 'free' | 'pro' | 'enterprise' | 'byok';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Credential {
  id: string;
  userId: string;
  keyName: string;
  provider?: string;
  status: 'active' | 'revoked' | 'expired';
  createdAt: Date;
  lastAccessedAt?: Date;
  expiresAt?: Date;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// --- Node Types (from 10kant shared) ---

export type NodeClassification = 'fixed' | 'configurable';

export type NodeStatus = 'inactive' | 'configured' | 'live' | 'error';

export interface BaseNode {
  id: string;
  type: string;
  classification: NodeClassification;
  status: NodeStatus;
  label: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BaseComponent extends BaseNode {
  parentNodeId: string | null;
  configSchema: Record<string, unknown>;
  configValues: Record<string, unknown>;
  isLive: boolean;
}

export type SpineNodeType =
  | 'model-hub'
  | 'memory-hub'
  | 'orchestrator'
  | 'connector-hub'
  | 'credential-vault';

export interface SpineNode extends BaseNode {
  classification: 'fixed';
  nodeType: SpineNodeType;
  position: { x: number; y: number };
}

export interface ChangelogEntry {
  id: number;
  changeType: 'added' | 'removed' | 'deprecated';
  modelId: string;
  modelName?: string;
  detail?: string;
  createdAt: string;
}

// --- Model Merge Types (from 10kant shared utils) ---

export interface ModelEntry {
  id: string;
  name: string;
  contextWindow?: number;
  costPer1k?: { input: number; output: number };
  capabilities?: string[];
  enabled?: boolean;
  deprecated?: boolean;
  deprecatedAt?: string;
  successor?: string;
  newlyDiscovered?: boolean;
  discoveredAt?: number;
}

export function mergeDiscoveredModels<T extends ModelEntry>(
  existing: T[],
  fresh: Array<{ id: string; name: string }>,
): { merged: T[]; hasNew: boolean; hasNewDeprecated: boolean } {
  const existingMap = new Map(existing.map(m => [m.id, m] as const));

  let hasNew = false;
  let hasNewDeprecated = false;

  const merged: T[] = [];

  for (const freshModel of fresh) {
    const existingModel = existingMap.get(freshModel.id);
    if (existingModel) {
      merged.push({
        ...existingModel,
        name: freshModel.name || existingModel.name,
        newlyDiscovered: false,
        deprecated: false,
        deprecatedAt: undefined,
        successor: undefined,
      } as T);
      existingMap.delete(freshModel.id);
    } else {
      merged.push({
        id: freshModel.id,
        name: freshModel.name,
        contextWindow: 4096,
        costPer1k: { input: 0, output: 0 },
        capabilities: [],
        enabled: false,
        newlyDiscovered: true,
        discoveredAt: Date.now(),
      } as unknown as T);
      hasNew = true;
    }
  }

  for (const [, model] of existingMap) {
    if (!model.deprecated) {
      merged.push({
        ...model,
        enabled: false,
        deprecated: true,
        deprecatedAt: new Date().toISOString().split('T')[0],
      } as T);
      hasNewDeprecated = true;
    } else {
      merged.push(model);
    }
  }

  return { merged, hasNew, hasNewDeprecated };
}

// --- Vault Types (from King) ---

export interface CredentialMetadata {
  id: string;
  key_name: string;
  provider?: string;
  status: string;
  created_at: Date;
  last_accessed_at?: Date;
}

// --- Billing Types (from 10kant) ---

export interface UsageLogEntry {
  id: string;
  modelId: string;
  providerId: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  status: 'success' | 'fail';
  fallbackTriggered: boolean;
  fallbackFrom?: string;
  fallbackTo?: string;
  userId?: string;
  byokUsed?: boolean;
  createdAt: Date;
}

// --- Model Registry Types (from 10kant models route) ---

export interface ModelRegistryEntry {
  modelId: string;
  providerId: string;
  name: string;
  contextWindow: number;
  costPer1kInput: number;
  costPer1kOutput: number;
  capabilities: string[];
  status: 'active' | 'deprecated';
  enabled: boolean;
  newlyDiscovered: boolean;
  discoveredAt?: number;
}

export interface ProviderEntry {
  providerId: string;
  name: string;
  baseUrl: string;
  changelogUrl?: string;
  icon?: string;
  color?: string;
}