import { ProviderModel, ModelCapability } from '../data/providers'
import { resolveKey } from '../store/vault.store'

/**
 * Metadata enrichment for known models.
 * Provider APIs rarely return context windows or pricing,
 * so we maintain a manual lookup that we can update periodically.
 * Models not found here get sensible defaults.
 */
const MODEL_METADATA: Record<string, Partial<ProviderModel>> = {
  // OpenAI
  'gpt-4o': { contextWindow: 128000, costPer1k: { input: 0.005, output: 0.015 }, capabilities: ['speed', 'code', 'vision', 'function-calling'] },
  'gpt-4o-mini': { contextWindow: 128000, costPer1k: { input: 0.00015, output: 0.0006 }, capabilities: ['speed', 'cost-efficient', 'function-calling'] },
  'gpt-4-turbo': { contextWindow: 128000, costPer1k: { input: 0.01, output: 0.03 }, capabilities: ['reasoning', 'vision', 'function-calling'] },
  'o1-preview': { contextWindow: 128000, costPer1k: { input: 0.015, output: 0.06 }, capabilities: ['reasoning', 'code'] },
  'o1-mini': { contextWindow: 128000, costPer1k: { input: 0.003, output: 0.012 }, capabilities: ['reasoning', 'code', 'cost-efficient'] },
  'gpt-4o-realtime-preview': { contextWindow: 128000, costPer1k: { input: 0.005, output: 0.02 }, capabilities: ['speed', 'multimodal'] },
  // Anthropic
  'claude-3-5-sonnet-20241022': { contextWindow: 200000, costPer1k: { input: 0.003, output: 0.015 }, capabilities: ['reasoning', 'code', 'vision', 'function-calling'] },
  'claude-3-5-haiku-20241022': { contextWindow: 200000, costPer1k: { input: 0.001, output: 0.005 }, capabilities: ['speed', 'cost-efficient', 'function-calling'] },
  'claude-3-opus-20240229': { contextWindow: 200000, costPer1k: { input: 0.015, output: 0.075 }, capabilities: ['reasoning', 'long-ctx'] },
  'claude-sonnet-4-20250514': { contextWindow: 200000, costPer1k: { input: 0.003, output: 0.015 }, capabilities: ['reasoning', 'code', 'vision', 'function-calling'] },
  // Google
  'gemini-2.0-flash': { contextWindow: 1000000, costPer1k: { input: 0.0001, output: 0.0004 }, capabilities: ['speed', 'vision', 'multimodal', 'long-ctx'] },
  'gemini-2.0-flash-lite': { contextWindow: 1000000, costPer1k: { input: 0.000075, output: 0.0003 }, capabilities: ['speed', 'cost-efficient'] },
  'gemini-1.5-pro': { contextWindow: 2000000, costPer1k: { input: 0.00125, output: 0.005 }, capabilities: ['reasoning', 'long-ctx', 'vision', 'multimodal'] },
  'gemini-1.5-flash': { contextWindow: 1000000, costPer1k: { input: 0.000075, output: 0.0003 }, capabilities: ['speed', 'cost-efficient', 'vision'] },
  'gemini-2.5-pro-exp-03-25': { contextWindow: 1000000, costPer1k: { input: 0.00125, output: 0.01 }, capabilities: ['reasoning', 'code', 'long-ctx', 'multimodal'] },
  // Mistral
  'mistral-large-latest': { contextWindow: 128000, costPer1k: { input: 0.002, output: 0.006 }, capabilities: ['reasoning', 'code', 'function-calling'] },
  'codestral-latest': { contextWindow: 32000, costPer1k: { input: 0.001, output: 0.003 }, capabilities: ['code', 'speed'] },
  'mistral-small-latest': { contextWindow: 128000, costPer1k: { input: 0.0002, output: 0.0006 }, capabilities: ['speed', 'cost-efficient'] },
  'mistral-embed': { contextWindow: 8192, costPer1k: { input: 0.0001, output: 0.0001 }, capabilities: ['cost-efficient'] },
  // Cohere
  'command-r-plus': { contextWindow: 128000, costPer1k: { input: 0.003, output: 0.015 }, capabilities: ['reasoning', 'code', 'function-calling'] },
  'command-r': { contextWindow: 128000, costPer1k: { input: 0.0005, output: 0.0015 }, capabilities: ['speed', 'cost-efficient'] },
  'command-r7-12-2024': { contextWindow: 128000, costPer1k: { input: 0.0005, output: 0.0015 }, capabilities: ['speed', 'cost-efficient'] },
  // Together AI
  'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo': { contextWindow: 128000, costPer1k: { input: 0.0009, output: 0.0009 }, capabilities: ['code', 'speed', 'reasoning'] },
  'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': { contextWindow: 128000, costPer1k: { input: 0.0002, output: 0.0002 }, capabilities: ['speed', 'cost-efficient'] },
  'mistralai/Mixtral-8x7B-Instruct-v0.1': { contextWindow: 32000, costPer1k: { input: 0.0006, output: 0.0006 }, capabilities: ['reasoning', 'code'] },
  // Groq
  'llama-3.1-70b-versatile': { contextWindow: 128000, costPer1k: { input: 0.00059, output: 0.00079 }, capabilities: ['speed', 'code', 'reasoning'] },
  'llama-3.1-8b-instant': { contextWindow: 128000, costPer1k: { input: 0.00005, output: 0.00008 }, capabilities: ['speed', 'cost-efficient'] },
  'gemma2-9b-it': { contextWindow: 8192, costPer1k: { input: 0.0002, output: 0.0002 }, capabilities: ['speed', 'cost-efficient'] },
  'mixtral-8x7b-32768': { contextWindow: 32768, costPer1k: { input: 0.0002, output: 0.0002 }, capabilities: ['reasoning', 'code'] },
  'llama-3.3-70b-versatile': { contextWindow: 128000, costPer1k: { input: 0.00059, output: 0.00079 }, capabilities: ['speed', 'code', 'reasoning'] },
  'deepseek-r1-distill-llama-70b': { contextWindow: 128000, costPer1k: { input: 0.00075, output: 0.00099 }, capabilities: ['reasoning', 'code'] },
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/**
 * Fetch currently available models from the provider's API
 * via our server-side proxy.
 */
export async function discoverProviderModels(
  providerId: string,
  baseUrl: string,
): Promise<Array<{ id: string; name: string }>> {
  const apiKey = resolveKey(providerId) || undefined

  const res = await fetch(`${API_BASE}/api/models/discover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerId, baseUrl, apiKey }),
    signal: AbortSignal.timeout(20000),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.models ?? []
}

/**
 * Merge a fresh list of model IDs from the provider into our existing models.
 *
 * Rules:
 * - Models that exist in both: keep existing metadata + enabled state
 * - New models (not in our list): add with enabled=false, mark newlyDiscovered
 * - Models no longer in provider's list: mark deprecated, disable
 * - Models already deprecated: stay deprecated
 */
export function mergeDiscoveredModels(
  existing: ProviderModel[],
  fresh: Array<{ id: string; name: string }>,
): { merged: ProviderModel[]; hasNew: boolean; hasNewDeprecated: boolean } {
  const existingMap = new Map(existing.map(m => [m.id, m]))

  let hasNew = false
  let hasNewDeprecated = false

  const merged: ProviderModel[] = []

  // Process everything from fresh list
  for (const freshModel of fresh) {
    const existingModel = existingMap.get(freshModel.id)
    if (existingModel) {
      // Existed before — carry over enabled state, clear newlyDiscovered
      merged.push({
        ...existingModel,
        name: freshModel.name || existingModel.name,
        newlyDiscovered: false,
        // If it was deprecated but is back, un-deprecate it
        deprecated: false,
        deprecatedAt: undefined,
        successor: undefined,
      })
      existingMap.delete(freshModel.id)
    } else {
      // Brand new model
      const meta = MODEL_METADATA[freshModel.id] || {}
      merged.push({
        id: freshModel.id,
        name: freshModel.name,
        contextWindow: meta.contextWindow ?? 4096,
        costPer1k: meta.costPer1k ?? { input: 0, output: 0 },
        capabilities: (meta.capabilities ?? []) as ModelCapability[],
        enabled: false,
        newlyDiscovered: true,
        discoveredAt: Date.now(),
      })
      hasNew = true
    }
  }

  // What's left in existingMap are models no longer in the provider's list
  for (const [_id, model] of existingMap) {
    if (!model.deprecated) {
      // Newly deprecated
      merged.push({
        ...model,
        enabled: false,
        deprecated: true,
        deprecatedAt: new Date().toISOString().split('T')[0],
      })
      hasNewDeprecated = true
    } else {
      // Already deprecated — keep as-is
      merged.push(model)
    }
  }

  return { merged, hasNew, hasNewDeprecated }
}