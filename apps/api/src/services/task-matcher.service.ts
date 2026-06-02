import type { Cap, ModelCapabilityEntry, TaskType, SpeedTier, FreeTierLimits } from "@ra1/types";
import { STATIC_REGISTRY } from "@ra1/types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type RegistryEntry = ModelCapabilityEntry;

export interface TaskRequest {
  task_type?: TaskType;
  required_caps?: Cap[];
  min_context?: number;
  free_only?: boolean;
  byok_only?: boolean;
  exclude_local?: boolean;
  exclude_providers?: string[];
  max_cost_per_1m?: number | null;
  prefer_fast?: boolean;
  user_prefs?: Record<string, number>;
}

export interface RankedModel {
  model_id: string;
  provider: string;
  display_name: string;
  score: number;
  capabilities: Cap[];
  context_window: number;
  input_price: number;
  output_price: number;
  speed: SpeedTier;
  free_tier: FreeTierLimits | null;
}

function computeTaskAffinity(entry: ModelCapabilityEntry, taskType: TaskType): number {
  const affinity = entry.task_affinity[taskType];
  if (affinity !== undefined) return affinity;
  // Default affinity based on general capability
  if (entry.capabilities.includes('chat' as Cap)) return 0.5;
  return 0.3;
}

const SPEED_BONUS: Record<SpeedTier, number> = {
  instant: 0.3,
  fast: 0.2,
  standard: 0.0,
  slow: -0.2,
};

export function matchModels(
  taskReq: TaskRequest,
  availableProviders: Record<string, boolean>
): RankedModel[] {
  const {
    task_type = 'general',
    required_caps = [],
    min_context = 0,
    free_only = false,
    byok_only = false,
    exclude_local = false,
    exclude_providers = [],
    max_cost_per_1m = null,
    prefer_fast = false,
    user_prefs = {},
  } = taskReq;

  const ranked: RankedModel[] = [];

  for (const [modelId, entry] of Object.entries<ModelCapabilityEntry>(STATIC_REGISTRY)) {
    // Filter by available providers
    if (!availableProviders[entry.provider]) continue;

    // Filter by required capabilities
    const hasAllCaps = required_caps.every(cap => entry.capabilities.includes(cap));
    if (!hasAllCaps) continue;

    // Filter by context window minimum
    if (entry.context_window < min_context) continue;

    // Filter free-only
    if (free_only && !entry.free_tier) continue;

    // Filter out local models if requested
    if (exclude_local && entry.provider === 'ollama') continue;

    // Filter excluded providers
    if (exclude_providers.includes(entry.provider)) continue;

    // Filter by max cost
    if (max_cost_per_1m !== null) {
      const avgCost = (entry.input_price + entry.output_price) / 2;
      if (avgCost > max_cost_per_1m) continue;
    }

    // Compute score
    let score = 0;

    // Task affinity score (0-1)
    score += computeTaskAffinity(entry, task_type) * 0.35;

    // Speed bonus
    score += SPEED_BONUS[entry.speed] * 0.15;

    // Cost efficiency: cheaper models score higher (inverse of avg price, normalized)
    const avgCost = (entry.input_price + entry.output_price) / 2;
    const costScore = Math.max(0, 1 - Math.log10(avgCost + 1) / 3);
    score += costScore * 0.2;

    // Free tier availability bonus
    if (entry.free_tier) score += 0.1;

    // Context window bonus (more is better, capped)
    const ctxScore = Math.min(1, Math.log2(entry.context_window) / 18);
    score += ctxScore * 0.1;

    // User preferences override (provider-level boost)
    const prefBonus = user_prefs[entry.provider] || 0;
    score += prefBonus * 0.1;

    // Speed preference bonus
    if (prefer_fast && (entry.speed === 'instant' || entry.speed === 'fast')) {
      score += 0.1;
    }

    ranked.push({
      model_id: modelId,
      provider: entry.provider,
      display_name: entry.display_name,
      score: Math.round(score * 1000) / 1000,
      capabilities: entry.capabilities,
      context_window: entry.context_window,
      input_price: entry.input_price,
      output_price: entry.output_price,
      speed: entry.speed,
      free_tier: entry.free_tier,
    });
  }

  // Sort by score descending
  ranked.sort((a, b) => b.score - a.score);

  return ranked;
}

export function canDoTask(
  taskReq: TaskRequest,
  availableProviders: Record<string, boolean>
): { possible: true; ranked: RankedModel[] } |
   { possible: false; reason: string; suggestion: string; cheapest_paid: RankedModel | null } {
  const ranked = matchModels(taskReq, availableProviders);

  if (ranked.length > 0) {
    return { possible: true, ranked };
  }

  // Try without strict filters to suggest alternatives
  const relaxedReq = { ...taskReq, required_caps: [], min_context: 0, free_only: false };
  const relaxed = matchModels(relaxedReq, availableProviders);

  const cheapestPaid = relaxed
    .filter(m => !m.free_tier)
    .sort((a, b) => (a.input_price + a.output_price) - (b.input_price + b.output_price))[0] || null;

  const reason = taskReq.free_only
    ? 'No free-tier models available for this task'
    : 'No models match the required capabilities';

  return {
    possible: false,
    reason,
    suggestion: 'Try relaxing capabilities or switching to a paid tier',
    cheapest_paid: cheapestPaid,
  };
}