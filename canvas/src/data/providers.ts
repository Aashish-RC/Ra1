export type ProviderId =
  | 'openai' | 'anthropic' | 'google' | 'mistral'
  | 'cohere' | 'together' | 'groq'

export type ModelCapability =
  | 'code' | 'reasoning' | 'vision' | 'speed' | 'long-ctx' | 'cost-efficient' | 'multimodal' | 'function-calling'

export interface ProviderModel {
  id: string
  name: string
  contextWindow: number
  costPer1k: { input: number; output: number }
  capabilities: ModelCapability[]
  enabled: boolean          // user can toggle on Models page
  deprecated?: boolean
  deprecatedAt?: string
  successor?: string
  newlyDiscovered?: boolean // set true on first discovery, cleared after user sees it
  discoveredAt?: number     // unix timestamp when first seen
}

export interface ProviderDef {
  id: ProviderId
  name: string
  description: string
  icon: string
  color: string
  defaultBaseUrl: string
  requiresKey: boolean
  models: ProviderModel[]
}

export const PROVIDER_REGISTRY: Record<ProviderId, ProviderDef> = {
  openai: {
    id: 'openai', name: 'OpenAI', description: 'GPT-4o, GPT-4 Turbo and reasoning models',
    icon: '🤖', color: '#10a37f', defaultBaseUrl: 'https://api.openai.com/v1', requiresKey: true,
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, costPer1k: { input: 0.005, output: 0.015 }, capabilities: ['speed', 'code', 'vision', 'function-calling'], enabled: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000, costPer1k: { input: 0.00015, output: 0.0006 }, capabilities: ['speed', 'cost-efficient', 'function-calling'], enabled: true },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000, costPer1k: { input: 0.01, output: 0.03 }, capabilities: ['reasoning', 'vision', 'function-calling'], enabled: true },
      { id: 'o1-preview', name: 'o1 Preview', contextWindow: 128000, costPer1k: { input: 0.015, output: 0.06 }, capabilities: ['reasoning', 'code'], enabled: false },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextWindow: 16385, costPer1k: { input: 0.0005, output: 0.0015 }, capabilities: ['speed', 'cost-efficient'], enabled: false, deprecated: true, deprecatedAt: '2025-12-31', successor: 'gpt-4o-mini' },
    ],
  },
  anthropic: {
    id: 'anthropic', name: 'Anthropic', description: 'Claude 3.5, Claude 3 models',
    icon: '🟣', color: '#d4a843', defaultBaseUrl: 'https://api.anthropic.com/v1', requiresKey: true,
    models: [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', contextWindow: 200000, costPer1k: { input: 0.003, output: 0.015 }, capabilities: ['reasoning', 'code', 'vision', 'function-calling'], enabled: true },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', contextWindow: 200000, costPer1k: { input: 0.001, output: 0.005 }, capabilities: ['speed', 'cost-efficient', 'function-calling'], enabled: true },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', contextWindow: 200000, costPer1k: { input: 0.003, output: 0.015 }, capabilities: ['reasoning', 'code', 'vision', 'function-calling'], enabled: false, deprecated: true, successor: 'claude-sonnet-4-6' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', contextWindow: 200000, costPer1k: { input: 0.001, output: 0.005 }, capabilities: ['speed', 'cost-efficient', 'function-calling'], enabled: false, deprecated: true, successor: 'claude-haiku-4-5-20251001' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', contextWindow: 200000, costPer1k: { input: 0.015, output: 0.075 }, capabilities: ['reasoning', 'long-ctx'], enabled: false },
      { id: 'claude-2.1', name: 'Claude 2.1', contextWindow: 200000, costPer1k: { input: 0.008, output: 0.024 }, capabilities: ['reasoning'], enabled: false, deprecated: true, deprecatedAt: '2025-10-31', successor: 'claude-3-5-sonnet-20241022' },
    ],
  },
  google: {
    id: 'google', name: 'Google', description: 'Gemini 2.0, 1.5 Pro and Flash models',
    icon: '🔵', color: '#4285f4', defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1', requiresKey: true,
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', contextWindow: 1000000, costPer1k: { input: 0.0001, output: 0.0004 }, capabilities: ['speed', 'vision', 'multimodal', 'long-ctx'], enabled: true },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', contextWindow: 2000000, costPer1k: { input: 0.00125, output: 0.005 }, capabilities: ['reasoning', 'long-ctx', 'vision', 'multimodal'], enabled: true },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', contextWindow: 1000000, costPer1k: { input: 0.000075, output: 0.0003 }, capabilities: ['speed', 'cost-efficient', 'vision'], enabled: false },
    ],
  },
  mistral: {
    id: 'mistral', name: 'Mistral', description: 'Mistral Large, Codestral and open models',
    icon: '🔥', color: '#ff7000', defaultBaseUrl: 'https://api.mistral.ai/v1', requiresKey: true,
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large', contextWindow: 128000, costPer1k: { input: 0.002, output: 0.006 }, capabilities: ['reasoning', 'code', 'function-calling'], enabled: true },
      { id: 'codestral-latest', name: 'Codestral', contextWindow: 32000, costPer1k: { input: 0.001, output: 0.003 }, capabilities: ['code', 'speed'], enabled: true },
      { id: 'mistral-small-latest', name: 'Mistral Small', contextWindow: 128000, costPer1k: { input: 0.0002, output: 0.0006 }, capabilities: ['speed', 'cost-efficient'], enabled: false },
    ],
  },
  cohere: {
    id: 'cohere', name: 'Cohere', description: 'Command R+ and enterprise RAG models',
    icon: '💠', color: '#39594d', defaultBaseUrl: 'https://api.cohere.ai', requiresKey: true,
    models: [
      { id: 'command-r-plus', name: 'Command R+', contextWindow: 128000, costPer1k: { input: 0.003, output: 0.015 }, capabilities: ['reasoning', 'code', 'function-calling'], enabled: true },
      { id: 'command-r', name: 'Command R', contextWindow: 128000, costPer1k: { input: 0.0005, output: 0.0015 }, capabilities: ['speed', 'cost-efficient'], enabled: true },
    ],
  },
  together: {
    id: 'together', name: 'Together AI', description: 'Open-source model inference at scale',
    icon: '🔗', color: '#6e44ff', defaultBaseUrl: 'https://api.together.xyz/v1', requiresKey: true,
    models: [
      { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', name: 'Llama 3.1 70B', contextWindow: 128000, costPer1k: { input: 0.0009, output: 0.0009 }, capabilities: ['code', 'speed', 'reasoning'], enabled: true },
      { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', name: 'Llama 3.1 8B', contextWindow: 128000, costPer1k: { input: 0.0002, output: 0.0002 }, capabilities: ['speed', 'cost-efficient'], enabled: false },
      { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B', contextWindow: 32000, costPer1k: { input: 0.0006, output: 0.0006 }, capabilities: ['reasoning', 'code'], enabled: false },
    ],
  },
  groq: {
    id: 'groq', name: 'Groq', description: 'Ultra-fast LPU inference',
    icon: '⚡', color: '#f55036', defaultBaseUrl: 'https://api.groq.com/openai/v1', requiresKey: true,
    models: [
      { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B', contextWindow: 128000, costPer1k: { input: 0.00059, output: 0.00079 }, capabilities: ['speed', 'code', 'reasoning'], enabled: true },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', contextWindow: 128000, costPer1k: { input: 0.00005, output: 0.00008 }, capabilities: ['speed', 'cost-efficient'], enabled: true },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B', contextWindow: 8192, costPer1k: { input: 0.0002, output: 0.0002 }, capabilities: ['speed', 'cost-efficient'], enabled: false },
    ],
  },
}

export const CAP_LABELS: Record<ModelCapability, string> = {
  code: 'Code', reasoning: 'Reasoning', vision: 'Vision', speed: 'Speed',
  'long-ctx': 'Long Ctx', 'cost-efficient': 'Budget', multimodal: 'Multimodal', 'function-calling': 'Functions',
}