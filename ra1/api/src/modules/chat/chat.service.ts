import { Pool } from 'pg';

export type Tier = 'T0' | 'T1' | 'T2' | 'T3';

const LITELLM_PROVIDER_PREFIX: Record<string, string> = {
  openai: 'openai/',
  anthropic: 'anthropic/',
  google: 'gemini/',
  gemini: 'gemini/',
  mistral: 'mistral/',
  cohere: 'cohere/',
  together: 'together_ai/',
  groq: 'groq/',
};

export interface ChatRequest {
  message: string;
  model?: string;
  tier?: Tier;
  userId?: string;
  accountType?: string;
  byokProvider?: string;
  requiredCapabilities?: string[];
}

export interface ChatResponse {
  response: string;
  model: string;
  tier: Tier;
  usage: { prompt_tokens?: number; completion_tokens?: number };
  byok: boolean;
  fallbackTriggered: boolean;
  fallbackFrom?: string;
}

export async function proxyChatRequest(
  pool: Pool,
  params: ChatRequest,
): Promise<ChatResponse> {
  const litellmUrl = process.env.LITELLM_URL || 'http://litellm:4000';
  const masterKey = process.env.LITELLM_MASTER_KEY || '';
  const requestedModel = params.model || 'gpt-4o-mini';
  const { message, userId, accountType, byokProvider, requiredCapabilities = [] } = params;
  const explicitTier = params.tier;

  if (!message) {
    throw new Error('message is required');
  }

  const startTime = Date.now();

  const { classifyTier } = await import('../../services/tier.service');
  const tier = classifyTier({
    message,
    tokenEstimate: Math.ceil(message.length / 4),
    explicitTier,
  });

  const providerForModel = Object.keys(LITELLM_PROVIDER_PREFIX).find(p =>
    requestedModel.startsWith(p) || requestedModel.includes(p)
  );

  const { resolveKey } = await import('../../services/infisical.service');

  const { getCachedScores } = await import('../../services/scoring.service');
  const scores = await getCachedScores(pool);

  const activeModels = await pool.query(
    `SELECT model_id, provider_id, capabilities FROM model_registry WHERE status = 'active'`
  );
  const activeMap = new Map(activeModels.rows.map((r: any) => [r.model_id, r]));

  let fallbackChain: string[];
  if (requestedModel) {
    const others = scores.filter((s: any) => s.modelId !== requestedModel).map((s: any) => s.modelId);
    fallbackChain = [requestedModel, ...others];
  } else {
    fallbackChain = scores.map((s: any) => s.modelId);
  }

  if (requiredCapabilities.length > 0) {
    fallbackChain = fallbackChain.filter((modelId: string) => {
      const m = activeMap.get(modelId);
      if (!m) return false;
      return requiredCapabilities.every((cap: string) => m.capabilities?.includes(cap));
    });
  }

  if (fallbackChain.length === 0) fallbackChain = [requestedModel || 'gpt-4o-mini'];

  let lastError = '';
  let usedModel = '';
  let finalFallbackFrom = '';
  let actualIsByok = false;

  for (let i = 0; i < fallbackChain.length; i++) {
    const model: string = fallbackChain[i]!;
    const isFallback = i > 0;
    if (isFallback && i > 0) finalFallbackFrom = fallbackChain[i - 1]!;

    const modelStartTime = Date.now();
    try {
      const modelProviderPrefix = Object.keys(LITELLM_PROVIDER_PREFIX).find(p =>
        model.startsWith(p) || model.includes(p)
      );
      const modelByokKey = modelProviderPrefix ? await resolveKey(modelProviderPrefix) : null;
      actualIsByok = !!modelByokKey;

      const response = await fetch(`${litellmUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${masterKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: message }] }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        const reqLatencyMs = Date.now() - modelStartTime;
        await pool.query(
          `INSERT INTO usage_log (model_id, provider_id, latency_ms, status, fallback_triggered, fallback_from, user_id)
           VALUES ($1, $2, $3, 'fail', $4, $5, $6)`,
          [model, model.split('/')[0] || 'unknown', reqLatencyMs, isFallback, finalFallbackFrom || null, userId || 'anonymous']
        ).catch(() => {});
        continue;
      }

      const data = await response.json() as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
      const latencyMs = Date.now() - startTime;
      usedModel = model;

      const usageData = data.usage || {};
      const inputTokens = usageData.prompt_tokens || Math.ceil(message.length / 4);
      const outputTokens = usageData.completion_tokens || 0;

      await pool.query(
        `INSERT INTO usage_log (model_id, provider_id, input_tokens, output_tokens, latency_ms, status, fallback_triggered, fallback_from, fallback_to, user_id, byok_used)
         VALUES ($1, $2, $3, $4, $5, 'success', $6, $7, $8, $9, $10)`,
        [
          model,
          model.split('/')[0] || 'unknown',
          inputTokens,
          outputTokens,
          latencyMs,
          isFallback,
          finalFallbackFrom || null,
          isFallback ? model : null,
          userId || 'anonymous',
          actualIsByok,
        ]
      ).catch(() => {});

      if (userId && accountType && !byokProvider) {
        const costUsd = (inputTokens + outputTokens) * 0.00001;
        const { writeUsageToBilling } = await import('../../services/billing.service');
        await writeUsageToBilling(pool, userId, accountType, inputTokens, outputTokens, costUsd).catch(() => {});
      }

      return {
        response: data.choices?.[0]?.message?.content || '',
        model: usedModel,
        tier,
        usage: data.usage || {},
        byok: actualIsByok,
        fallbackTriggered: isFallback,
        fallbackFrom: isFallback ? finalFallbackFrom : undefined,
      };
    } catch (err: any) {
      lastError = err.message;
      continue;
    }
  }

  throw new Error(`All models failed. Last error: ${lastError}`);
}