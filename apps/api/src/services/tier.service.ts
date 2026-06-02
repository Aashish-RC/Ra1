export type Tier = 'T0' | 'T1' | 'T2' | 'T3';

export const TIER_DEFAULTS: Record<Tier, string[]> = {
  T0: ['llama-3.1-8b-instant', 'gpt-4o-mini', 'claude-haiku-4-5-20251001'],
  T1: ['gpt-4o-mini', 'claude-haiku-4-5-20251001', 'mistral-small-latest'],
  T2: ['gpt-4o', 'claude-sonnet-4-6', 'mistral-large-latest'],
  T3: ['claude-opus-4-6', 'o1-preview', 'gpt-4-turbo'],
};

export interface TierClassificationInput {
  message: string;
  tokenEstimate?: number;
  explicitTier?: Tier;
}

export function classifyTier(input: TierClassificationInput): Tier {
  if (input.explicitTier) return input.explicitTier;

  const tokens = input.tokenEstimate || Math.ceil(input.message.length / 4);
  const msg = input.message.toLowerCase();

  if (
    tokens > 8000 ||
    (msg.includes('analyze') && msg.includes('comprehensive')) ||
    msg.includes('research') ||
    msg.includes('explain in detail')
  ) return 'T3';

  if (
    tokens > 2000 ||
    msg.includes('write code') || msg.includes('implement') ||
    msg.includes('debug') || msg.includes('step by step') ||
    msg.includes('compare') || msg.includes('summarize')
  ) return 'T2';

  if (tokens > 500 || msg.length > 200) return 'T1';

  return 'T0';
}

export function getTierModels(tier: Tier, userPreferredModel?: string): string[] {
  if (userPreferredModel) return [userPreferredModel, ...TIER_DEFAULTS[tier]];
  return TIER_DEFAULTS[tier];
}