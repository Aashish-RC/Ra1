import { STATIC_REGISTRY } from "@ra1/types";
import type { TaskType } from "@ra1/types";

interface QuotaState {
  tokensUsed: number;
  requestsUsed: number;
  limits: { rpm: number; tpm: number; rpd: number };
  resetsAt: number;
}

// In-memory quota tracker (per model, future: DB-backed)
const _quotas = new Map<string, QuotaState>();

function getOrCreateQuota(modelId: string): QuotaState | null {
  const entry = STATIC_REGISTRY[modelId];
  if (!entry?.free_tier) return null;

  let quota = _quotas.get(modelId);
  if (!quota) {
    quota = {
      tokensUsed: 0,
      requestsUsed: 0,
      limits: entry.free_tier,
      resetsAt: Date.now() + 24 * 60 * 60 * 1000, // reset in 24h
    };
    _quotas.set(modelId, quota);
  }

  // Check if reset is due
  if (Date.now() >= quota.resetsAt) {
    quota.tokensUsed = 0;
    quota.requestsUsed = 0;
    quota.resetsAt = Date.now() + 24 * 60 * 60 * 1000;
  }

  return quota;
}

export function checkQuota(modelId: string, estimatedTokens?: number):
  { available: true } | { available: false; reason: string; resets_in_ms: number } {
  const quota = getOrCreateQuota(modelId);
  if (!quota) {
    return { available: true }; // no free tier limits means always available
  }

  // Check RPM
  if (quota.requestsUsed >= quota.limits.rpm) {
    return {
      available: false,
      reason: `RPM limit reached (${quota.limits.rpm}/${quota.limits.rpm})`,
      resets_in_ms: Math.max(0, quota.resetsAt - Date.now()),
    };
  }

  // Check TPM (estimated)
  if (estimatedTokens && (quota.tokensUsed + estimatedTokens) > quota.limits.tpm) {
    return {
      available: false,
      reason: `TPM limit would be exceeded (${quota.tokensUsed + estimatedTokens} > ${quota.limits.tpm})`,
      resets_in_ms: Math.max(0, quota.resetsAt - Date.now()),
    };
  }

  // Check RPD
  if (quota.requestsUsed >= quota.limits.rpd) {
    return {
      available: false,
      reason: `RPD limit reached (${quota.limits.rpd}/${quota.limits.rpd})`,
      resets_in_ms: Math.max(0, quota.resetsAt - Date.now()),
    };
  }

  return { available: true };
}

export function recordUsage(modelId: string, tokensUsed: number): void {
  const quota = _quotas.get(modelId);
  if (!quota) return;
  quota.tokensUsed += tokensUsed;
  quota.requestsUsed += 1;
}

export function getBestFreeModel(taskType: TaskType, estimatedTokens?: number):
  { available: true; model_id: string; display_name: string } |
  { available: false; reason: string; resets_in_ms: number | null } {
  // Find all free-tier models
  const entries = Object.entries(STATIC_REGISTRY);
  const freeModels = entries
    .filter(([_, e]: [string, typeof STATIC_REGISTRY[string]]) => e.free_tier !== null)
    .sort((a: [string, typeof STATIC_REGISTRY[string]], b: [string, typeof STATIC_REGISTRY[string]]) => {
      // Prefer models with task affinity for this task type
      const aAff = a[1].task_affinity[taskType] ?? 0;
      const bAff = b[1].task_affinity[taskType] ?? 0;
      return bAff - aAff;
    });

  for (const [modelId, entry] of freeModels) {
    const q = checkQuota(modelId, estimatedTokens);
    if (q.available) {
      return { available: true, model_id: modelId, display_name: entry.display_name };
    }
  }

  // All free models exhausted: find the one that resets soonest
  let soonestReset: number | null = null;
  let soonestReason = '';
  for (const [modelId] of freeModels) {
    const q = _quotas.get(modelId);
    if (q) {
      const remaining = q.resetsAt - Date.now();
      if (soonestReset === null || remaining < soonestReset) {
        soonestReset = remaining;
        soonestReason = 'All free models exhausted';
      }
    }
  }

  return {
    available: false,
    reason: soonestReason || 'No free-tier models available',
    resets_in_ms: soonestReset,
  };
}

export function getQuotaStatus(): Record<string, object> {
  const result: Record<string, object> = {};
  for (const [modelId, quota] of _quotas.entries()) {
    result[modelId] = {
      tokens_used: quota.tokensUsed,
      requests_used: quota.requestsUsed,
      rpd_limit: quota.limits.rpd,
      rpm_limit: quota.limits.rpm,
      tpm_limit: quota.limits.tpm,
      resets_in_ms: Math.max(0, quota.resetsAt - Date.now()),
    };
  }
  return result;
}