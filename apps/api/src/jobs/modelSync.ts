import { Pool } from 'pg';
import { resolveKey } from '../services/infisical.service';

// ─── Provider API Config ────────────────────────────────────────────────────

interface NormalizedModel {
  id: string;
  name: string;
}

const SUPPORTED_PROVIDERS = [
  'openai', 'anthropic', 'google', 'mistral',
  'cohere', 'groq', 'together',
] as const;

type ProviderId = typeof SUPPORTED_PROVIDERS[number];

/**
 * LiteLLM provider prefix mapping.
 */
const LITELLM_PREFIX: Record<string, string> = {
  openai: 'openai',
  anthropic: 'anthropic',
  google: 'gemini',
  mistral: 'mistral',
  cohere: 'cohere',
  groq: 'groq',
  together: 'together',
};

/**
 * Deprecation patterns used to detect deprecated models from IDs.
 */
const DEPRECATION_PATTERNS = [
  /preview/i,
  /legacy/i,
  /old/i,
  /deprecated/i,
  /turbo-instruct/i,
  /(?:^|[_-])00[12](?:$|[_-])/,
];

/**
 * Check if a model ID looks deprecated based on naming patterns.
 */
function isIdDeprecated(id: string): boolean {
  return DEPRECATION_PATTERNS.some((p) => p.test(id));
}

// ─── Provider Fetch Functions ────────────────────────────────────────────────

async function fetchOpenAIModels(key: string): Promise<NormalizedModel[]> {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`OpenAI API returned ${res.status}`);
  const body = await res.json() as { data?: Array<{ id: string; object?: string }> };
  return (body.data ?? [])
    .filter((m) => !m.object || m.object === 'model')
    .map((m) => ({ id: m.id, name: m.id }));
}

async function fetchAnthropicModels(key: string): Promise<NormalizedModel[]> {
  const res = await fetch('https://api.anthropic.com/v1/models', {
    headers: { 'x-api-key': key },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Anthropic API returned ${res.status}`);
  const body = await res.json() as { data?: Array<{ id: string; display_name?: string }> };
  return (body.data ?? []).map((m) => ({ id: m.id, name: m.display_name || m.id }));
}

async function fetchGoogleModels(key: string): Promise<NormalizedModel[]> {
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1/models?key=' + encodeURIComponent(key),
    { signal: AbortSignal.timeout(15000) },
  );
  if (!res.ok) throw new Error(`Google API returned ${res.status}`);
  const body = await res.json() as { models?: Array<{ name: string; displayName?: string; supportedGenerationMethods?: string[] }> };
  return (body.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => ({ id: m.name, name: m.displayName || m.name }));
}

async function fetchMistralModels(key: string): Promise<NormalizedModel[]> {
  const res = await fetch('https://api.mistral.ai/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Mistral API returned ${res.status}`);
  const body = await res.json() as { data?: Array<{ id: string }> };
  return (body.data ?? []).map((m) => ({ id: m.id, name: m.id }));
}

async function fetchCohereModels(key: string): Promise<NormalizedModel[]> {
  const res = await fetch('https://api.cohere.ai/v1/models', {
    headers: { Authorization: `Bearer ${key}`, accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Cohere API returned ${res.status}`);
  const body = await res.json() as { models?: Array<{ name: string }> };
  return (body.models ?? []).map((m) => ({ id: m.name, name: m.name }));
}

async function fetchGroqModels(key: string): Promise<NormalizedModel[]> {
  const res = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Groq API returned ${res.status}`);
  const body = await res.json() as { data?: Array<{ id: string }> };
  return (body.data ?? []).map((m) => ({ id: m.id, name: m.id }));
}

async function fetchTogetherModels(key: string): Promise<NormalizedModel[]> {
  const res = await fetch('https://api.together.xyz/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Together API returned ${res.status}`);
  const body = await res.json() as { data?: Array<{ id: string }> };
  return (body.data ?? []).map((m) => ({ id: m.id, name: m.id }));
}

interface ProviderFetcher {
  fetch: (key: string, baseUrl?: string) => Promise<NormalizedModel[]>;
  needsKey: boolean;
}

const PROVIDER_FETCHERS: Record<string, ProviderFetcher> = {
  openai: { fetch: (k) => fetchOpenAIModels(k), needsKey: true },
  anthropic: { fetch: (k) => fetchAnthropicModels(k), needsKey: true },
  google: { fetch: (k) => fetchGoogleModels(k), needsKey: true },
  mistral: { fetch: (k) => fetchMistralModels(k), needsKey: true },
  cohere: { fetch: (k) => fetchCohereModels(k), needsKey: true },
  groq: { fetch: (k) => fetchGroqModels(k), needsKey: true },
  together: { fetch: (k) => fetchTogetherModels(k), needsKey: true },
};

// ─── LiteLLM Runtime Update ──────────────────────────────────────────────────

const LITELLM_URL = process.env.LITELLM_URL || 'http://litellm:4000';
const LITELLM_MASTER_KEY = process.env.LITELLM_MASTER_KEY || '';

async function registerModelWithLiteLLM(
  providerId: string,
  modelId: string,
  apiKey: string,
): Promise<void> {
  const prefix = LITELLM_PREFIX[providerId] || providerId;
  const litellmParams: Record<string, string> = {
    model: `${prefix}/${modelId}`,
    api_key: apiKey,
  };

  const res = await fetch(`${LITELLM_URL}/model/new`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LITELLM_MASTER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_name: modelId,
      litellm_params: litellmParams,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`LiteLLM /model/new returned ${res.status} for ${modelId}`);
  }
}

async function unregisterModelFromLiteLLM(litellmModelId: string): Promise<void> {
  const res = await fetch(`${LITELLM_URL}/model/delete`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LITELLM_MASTER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: litellmModelId }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`LiteLLM /model/delete returned ${res.status} for ${litellmModelId}`);
  }
}

// ─── Core Sync Logic ─────────────────────────────────────────────────────────

interface SyncResult {
  providerId: string;
  added: NormalizedModel[];
  removed: NormalizedModel[];
  deprecated: NormalizedModel[];
  error?: string;
}

/**
 * Diff live models against the stored snapshot to produce added/removed/deprecated lists.
 * Does NOT fetch from provider APIs — uses the provided liveModels.
 */
function diffModels(
  providerId: string,
  snapshotModels: NormalizedModel[],
  liveModels: NormalizedModel[],
): SyncResult {
  const snapshotMap = new Map(snapshotModels.map((m) => [m.id, m]));
  const liveMap = new Map(liveModels.map((m) => [m.id, m]));

  // Diff: added — in live but not in snapshot
  const added: NormalizedModel[] = [];
  for (const lm of liveModels) {
    if (!snapshotMap.has(lm.id)) {
      added.push(lm);
    }
  }

  // Diff: removed — in snapshot but not in live
  const removed: NormalizedModel[] = [];
  for (const sm of snapshotModels) {
    if (!liveMap.has(sm.id)) {
      removed.push(sm);
    }
  }

  // Diff: deprecated — still in live but naming pattern suggests deprecation
  const newlyDeprecated: NormalizedModel[] = [];
  for (const lm of liveModels) {
    if (snapshotMap.has(lm.id)) {
      // Existed before — check if it's now deprecated by naming patterns
      if (isIdDeprecated(lm.id)) {
        newlyDeprecated.push(lm);
      }
    }
  }

  return { providerId, added, removed, deprecated: newlyDeprecated };
}

async function writeChangelog(pool: Pool, result: SyncResult): Promise<void> {
  const entries: Array<{ providerId: string; changeType: string; modelId: string; modelName?: string; detail?: string }> = [
    ...result.added.map((m) => ({ providerId: result.providerId, changeType: 'added' as const, modelId: m.id, modelName: m.name })),
    ...result.removed.map((m) => ({ providerId: result.providerId, changeType: 'removed' as const, modelId: m.id, modelName: m.name })),
    ...result.deprecated.map((m) => ({ providerId: result.providerId, changeType: 'deprecated' as const, modelId: m.id, modelName: m.name, detail: 'Deprecated by naming pattern' })),
  ];

  for (const entry of entries) {
    // Dedup: only insert if (provider_id, model_id, change_type) has no unseen entry
    const exists = await pool.query(
      `SELECT id FROM model_changelog
       WHERE provider_id = $1 AND model_id = $2 AND change_type = $3 AND seen = FALSE
       LIMIT 1`,
      [entry.providerId, entry.modelId, entry.changeType],
    );

    if (exists.rows.length === 0) {
      await pool.query(
        `INSERT INTO model_changelog (provider_id, change_type, model_id, model_name, detail)
         VALUES ($1, $2, $3, $4, $5)`,
        [entry.providerId, entry.changeType, entry.modelId, entry.modelName ?? null, entry.detail ?? null],
      );
    }
  }
}

async function updateLiteLLMForChanges(
  providerId: string,
  added: NormalizedModel[],
  removed: NormalizedModel[],
  apiKey: string | null,
): Promise<void> {
  if (!apiKey) return;

  const key = apiKey ?? '';

  // Register added models
  for (const model of added) {
    try {
      await registerModelWithLiteLLM(providerId, model.id, key);
    } catch (err: any) {
      console.error(`[modelSync] LiteLLM register failed for ${providerId}/${model.id}: ${err.message}`);
    }
  }

  // Unregister removed models
  for (const model of removed) {
    try {
      // LiteLLM uses the prefixed model ID as the model identifier
      const prefix = LITELLM_PREFIX[providerId] || providerId;
      await unregisterModelFromLiteLLM(`${prefix}/${model.id}`);
    } catch (err: any) {
      console.error(`[modelSync] LiteLLM unregister failed for ${providerId}/${model.id}: ${err.message}`);
    }
  }
}

async function updateSnapshot(pool: Pool, providerId: string, liveModels: NormalizedModel[]): Promise<void> {
  await pool.query(
    `INSERT INTO model_snapshots (provider_id, models, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (provider_id)
     DO UPDATE SET models = $2::jsonb, updated_at = NOW()`,
    [providerId, JSON.stringify(liveModels)],
  );

  // Upsert each live model into model_registry with status 'active'
  for (const m of liveModels) {
    await pool.query(
      `INSERT INTO model_registry (model_id, provider_id, display_name, status, last_seen_at, first_seen_at, updated_at)
       VALUES ($1, $2, $3, 'active', NOW(), NOW(), NOW())
       ON CONFLICT (model_id, provider_id) DO UPDATE
         SET status = 'active', last_seen_at = NOW(), display_name = COALESCE($3, model_registry.display_name), updated_at = NOW()`,
      [m.id, providerId, m.name],
    ).catch((err) => {
      // model_registry table may not exist yet if migration hasn't run; log and ignore
      console.warn(`[modelSync] model_registry upsert failed for ${providerId}/${m.id}: ${err.message}`);
    });
  }
}

// ─── Main Sync Run ───────────────────────────────────────────────────────────

export async function runSync(
  pool: Pool,
  onProgress?: (msg: string) => void,
): Promise<void> {
  const log = (msg: string) => {
    console.log(`[modelSync] ${msg}`);
    onProgress?.(msg);
  };

  log('starting sync run');
  const summaryParts: string[] = [];

  for (const providerId of SUPPORTED_PROVIDERS) {
    const fetcher = PROVIDER_FETCHERS[providerId];
    if (!fetcher) continue;

    // Resolve API key from vault
    let apiKey: string | null = null;
    try {
      apiKey = await resolveKey(providerId);
    } catch {
      // Vault unreachable — skip providers that need a key
    }

    if (fetcher.needsKey && !apiKey) {
      log(`${providerId}: skipped (no key in vault)`);
      continue;
    }

    // Fetch live models
    let liveModels: NormalizedModel[];
    try {
      liveModels = await fetcher.fetch(apiKey ?? '');
    } catch (err: any) {
      log(`${providerId}: fetch error — ${err.message}`);
      summaryParts.push(`${providerId}: fetch error`);
      continue;
    }

    // Load last snapshot from DB
    const snapshotResult = await pool.query(
      'SELECT models, updated_at FROM model_snapshots WHERE provider_id = $1',
      [providerId],
    );

    const snapshotModels: NormalizedModel[] = snapshotResult.rows.length > 0
      ? snapshotResult.rows[0].models as NormalizedModel[]
      : [];

    // Diff snapshot vs live models
    const result = diffModels(providerId, snapshotModels, liveModels);

    // For models in snapshot but not in live (removed), update model_registry status to 'deprecated'
    for (const removedModel of result.removed) {
      await pool.query(
        `UPDATE model_registry SET status = 'deprecated', updated_at = NOW()
         WHERE model_id = $1 AND provider_id = $2`,
        [removedModel.id, providerId],
      ).catch(() => {}); // ignore if table doesn't exist yet
    }

    // Write changelog entries
    if (result.added.length > 0 || result.removed.length > 0 || result.deprecated.length > 0) {
      await writeChangelog(pool, result);

      // Update LiteLLM (fire-and-forget, errors logged but don't block)
      await updateLiteLLMForChanges(providerId, result.added, result.removed, apiKey);
    }

    // Update snapshot with current live models
    await updateSnapshot(pool, providerId, liveModels);

    const parts: string[] = [];
    if (result.added.length > 0) parts.push(`+${result.added.length} added`);
    if (result.removed.length > 0) parts.push(`${result.removed.length} removed`);
    if (result.deprecated.length > 0) parts.push(`${result.deprecated.length} deprecated`);
    if (result.error) parts.push(`error: ${result.error}`);

    if (parts.length === 0) {
      summaryParts.push(`${providerId}: no changes`);
    } else {
      summaryParts.push(`${providerId}: ${parts.join(', ')}`);
    }
  }

  log(summaryParts.join(' | '));
  log('next run in 6 hours');
}

// ─── Scheduler ───────────────────────────────────────────────────────────────

let syncTimer: ReturnType<typeof setInterval> | null = null;

export function startModelSync(pool: Pool): void {
  // Run immediately on boot
  runSync(pool).catch((err) => {
    console.error('[modelSync] initial run failed:', err);
  });

  // Schedule every 6 hours
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  syncTimer = setInterval(() => {
    runSync(pool).catch((err) => {
      console.error('[modelSync] scheduled run failed:', err);
    });
  }, SIX_HOURS);
}

export function triggerSyncNow(pool: Pool): void {
  // Run asynchronously — don't await
  setTimeout(() => {
    runSync(pool).catch((err) => {
      console.error('[modelSync] triggered run failed:', err);
    });
  }, 0);
}

/**
 * Get the LiteLLM prefix for a provider (used by routes).
 */
export function getLiteLLMPrefix(providerId: string): string {
  return LITELLM_PREFIX[providerId] || providerId;
}