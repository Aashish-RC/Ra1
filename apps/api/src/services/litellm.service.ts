import { config } from 'dotenv';

config();

const LITELLM_URL = process.env.LITELLM_URL || 'http://litellm:4000';
const LITELLM_MASTER_KEY = process.env.LITELLM_MASTER_KEY || '';

interface LiteLLMModel {
  model_name: string;
  litellm_params: {
    model: string;
    api_key?: string;
    api_base?: string;
  };
  model_info?: Record<string, unknown>;
}

interface LiteLLMModelInfoResponse {
  data: LiteLLMModel[];
}

/**
 * Fetch all models currently registered in LiteLLM.
 */
export async function getLiteLLMModels(): Promise<LiteLLMModel[]> {
  const response = await fetch(`${LITELLM_URL}/model/info`, {
    headers: {
      Authorization: `Bearer ${LITELLM_MASTER_KEY}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`LiteLLM /model/info returned ${response.status}`);
  }

  const body = (await response.json()) as LiteLLMModelInfoResponse;
  return body.data ?? [];
}

/**
 * Update a model's API key in LiteLLM's runtime config.
 * Calls POST /model/update to set the new api_key for the given model.
 */
export async function updateLiteLLMModelKey(
  modelName: string,
  model: string,
  apiKey: string,
  apiBase?: string
): Promise<void> {
  const litellmParams: Record<string, string> = {
    model,
    api_key: apiKey,
  };
  if (apiBase) {
    litellmParams.api_base = apiBase;
  }

  const response = await fetch(`${LITELLM_URL}/model/update`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LITELLM_MASTER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_name: modelName,
      litellm_params: litellmParams,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`LiteLLM /model/update returned ${response.status} for model ${modelName}`);
  }
}

/**
 * Update all LiteLLM models that belong to a given provider with a new API key.
 * Provider matching is done by checking if litellm_params.model starts with `${providerId}/`.
 */
export async function updateModelsForProvider(
  providerId: string,
  apiKey: string
): Promise<{ updated: number; failed: number }> {
  let models: LiteLLMModel[];
  try {
    models = await getLiteLLMModels();
  } catch {
    // LiteLLM unreachable — nothing to update
    return { updated: 0, failed: 0 };
  }

  const prefix = `${providerId}/`;
  const matching = models.filter(
    (m) => m.litellm_params?.model?.startsWith(prefix)
  );

  let updated = 0;
  let failed = 0;

  for (const model of matching) {
    try {
      await updateLiteLLMModelKey(
        model.model_name,
        model.litellm_params.model,
        apiKey,
        model.litellm_params.api_base
      );
      updated++;
    } catch {
      failed++;
    }
  }

  return { updated, failed };
}

/**
 * Get a LiteLLM-compatible providerId prefix from the providerId.
 * Maps common names to LiteLLM's expected prefixes.
 */
export function getLiteLLMProviderPrefix(providerId: string): string {
  const prefixMap: Record<string, string> = {
    openai: 'openai/',
    anthropic: 'anthropic/',
    google: 'gemini/',
    gemini: 'gemini/',
    mistral: 'mistral/',
    cohere: 'cohere/',
    together: 'together_ai/',
    groq: 'groq/',
  };
  return prefixMap[providerId] || `${providerId}/`;
}