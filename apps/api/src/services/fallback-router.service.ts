import type { Cap, SpeedTier, FreeTierLimits } from "@ra1/types";
import type { RankedModel } from "./task-matcher.service";

export interface FallbackResult<T> {
  response: T | null;
  model_used: string | null;
  fallback_triggered: boolean;
  fallback_from: string | null;
  switches: Array<{ from: string; to: string | null; reason: string; at: number }>;
  error: { type: string; message: string } | null;
}

// Cooldown tracking: modelId -> { until timestamp, reason }
const _cooldowns = new Map<string, { until: number; reason: string }>();

const COOLDOWN_MS = 30_000; // 30 seconds default cooldown

type ErrorClass = 'rate_limited' | 'timeout' | 'auth_error' | 'server_error' | 'network_error' | 'unknown';

function classifyError(err: unknown): ErrorClass {
  const msg = String(err).toLowerCase();
  if (msg.includes('429') || msg.includes('rate') || msg.includes('too many')) return 'rate_limited';
  if (msg.includes('timeout') || msg.includes('abort') || msg.includes('timed out')) return 'timeout';
  if (msg.includes('401') || msg.includes('403') || msg.includes('auth') || msg.includes('unauthorized')) return 'auth_error';
  if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('server error')) return 'server_error';
  if (msg.includes('econnrefused') || msg.includes('enotfound') || msg.includes('fetch failed') || msg.includes('network')) return 'network_error';
  return 'unknown';
}

function getCooldownDuration(errorClass: ErrorClass): number {
  switch (errorClass) {
    case 'rate_limited': return 60_000; // 1 min
    case 'timeout': return 10_000;      // 10 sec
    case 'auth_error': return 300_000;  // 5 min
    case 'server_error': return 30_000; // 30 sec
    case 'network_error': return 15_000; // 15 sec
    default: return COOLDOWN_MS;
  }
}

export async function executeWithFallback<T>(
  rankedModels: RankedModel[],
  executeFn: (modelId: string) => Promise<T>,
  opts?: { maxRetries?: number },
): Promise<FallbackResult<T>> {
  const maxRetries = opts?.maxRetries ?? rankedModels.length;
  const switches: Array<{ from: string; to: string | null; reason: string; at: number }> = [];
  let lastError: { type: string; message: string } | null = null;
  let fallbackFrom: string | null = null;
  let attempts = 0;
  let currentIndex = 0;

  const now = Date.now();
  // Filter out cooldowned models and build a fresh list
  const availableModels = rankedModels.filter(m => {
    const cooldown = _cooldowns.get(m.model_id);
    if (!cooldown) return true;
    if (now >= cooldown.until) {
      _cooldowns.delete(m.model_id);
      return true;
    }
    return false;
  });

  if (availableModels.length === 0) {
    return {
      response: null,
      model_used: null,
      fallback_triggered: false,
      fallback_from: null,
      switches: [],
      error: { type: 'all_cooldown', message: 'All models are in cooldown' },
    };
  }

  for (let i = currentIndex; i < rankedModels.length && attempts < maxRetries; i++) {
    const model = rankedModels[i];
    if (!model) continue;

    // Double-check cooldown (in case it changed)
    const cooldown = _cooldowns.get(model.model_id);
    if (cooldown && Date.now() < cooldown.until) continue;

    attempts++;
    try {
      const result = await executeFn(model.model_id);
      return {
        response: result,
        model_used: model.model_id,
        fallback_triggered: switches.length > 0,
        fallback_from: switches.length > 0 ? switches[0]!.from : null,
        switches,
        error: null,
      };
    } catch (err: any) {
      const errClass = classifyError(err);
      const errMsg = err?.message || String(err);
      lastError = { type: errClass, message: errMsg };

      // Apply cooldown
      const duration = getCooldownDuration(errClass);
      _cooldowns.set(model.model_id, { until: Date.now() + duration, reason: `${errClass}: ${errMsg}` });

      // Record the switch
      const nextModel = i + 1 < rankedModels.length ? rankedModels[i + 1]?.model_id ?? null : null;
      switches.push({
        from: model.model_id,
        to: nextModel,
        reason: errClass,
        at: Date.now(),
      });

      if (i === 0) {
        fallbackFrom = model.model_id;
      }
    }
  }

  return {
    response: null,
    model_used: null,
    fallback_triggered: switches.length > 0,
    fallback_from: fallbackFrom,
    switches,
    error: lastError ?? { type: 'exhausted', message: 'All models exhausted' },
  };
}

export function getCooldowns(): Record<string, { until: number; reason: string; remaining_ms: number }> {
  const now = Date.now();
  const result: Record<string, { until: number; reason: string; remaining_ms: number }> = {};
  for (const [modelId, cd] of _cooldowns.entries()) {
    result[modelId] = {
      until: cd.until,
      reason: cd.reason,
      remaining_ms: Math.max(0, cd.until - now),
    };
  }
  return result;
}