import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { Pool } from 'pg';

config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

import modelsRouter from './routes/models';
import vaultRouter from './routes/vault';
import capabilitiesRouter from './routes/capabilities';
import providersRouter from './routes/providers';
import atrsRouter from './routes/atrs';
import billingRouter from './routes/billing';
import scoringRouter from './routes/scoring';
import { createBillingGuard } from './middleware/billingGuard';
import { requireAdmin, requireUser } from './middleware/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});

export { pool };

(async () => {
  try {
    const result = await pool.query('SELECT 1');
    console.log('Connected to PostgreSQL');

    const { ensureSchema } = await import('./db/migrations');
    await ensureSchema(pool);

    const { startModelSync } = await import('./jobs/modelSync');
    startModelSync(pool);

    const { startHFSync } = await import('./jobs/hfSync');
    startHFSync(pool);

    const { startChangelogWatcher } = await import('./jobs/changelogWatcher');
    startChangelogWatcher(pool);
  } catch (err) {
    console.error('PostgreSQL connection error (non-fatal):', err);
  }
})();

// Public routes
app.use('/api/models', modelsRouter);

// Admin-only routes
const isDev = process.env.NODE_ENV !== 'production';
app.use('/api/capabilities', isDev ? capabilitiesRouter : [requireAdmin(pool), capabilitiesRouter]);
app.use('/api/providers', isDev ? providersRouter : [requireAdmin(pool), providersRouter]);
app.use('/api/atrs', isDev ? atrsRouter : [requireAdmin(pool), atrsRouter]);
app.use('/api/scoring', isDev ? scoringRouter : [requireAdmin(pool), scoringRouter]);

// User routes (auth required)
app.use('/api/vault', vaultRouter);
app.use('/api/billing', billingRouter);

// Chat with billing guard
app.use('/api/chat', createBillingGuard(pool));

const spineNodes = [
  { id: 'node-orchestrator', nodeType: 'orchestrator', classification: 'fixed', status: 'live', label: 'Orchestrator', description: 'Central coordination. Every task passes through here.', position: { x: 400, y: 150 } },
  { id: 'node-model-hub', nodeType: 'model-hub', classification: 'fixed', status: 'live', label: 'Model', description: 'Central model registry. All model providers connect here.', position: { x: 400, y: 320 } },
  { id: 'node-memory-hub', nodeType: 'memory-hub', classification: 'fixed', status: 'live', label: 'Memory', description: 'Memory palace. 4 tiers, 5 lanes, full knowledge governance.', position: { x: 160, y: 235 } },
  { id: 'node-connector-hub', nodeType: 'connector-hub', classification: 'fixed', status: 'live', label: 'Connectors', description: 'All external connections. Apps, APIs, MCP servers.', position: { x: 640, y: 235 } },
  { id: 'node-credential-vault', nodeType: 'credential-vault', classification: 'fixed', status: 'live', label: 'Vault', description: 'Encrypted credential store. Never exposed, always resolved at call time.', position: { x: 400, y: 490 } }
];

app.get('/', (req, res) => {
  res.json({ message: 'RA1 API is running' });
});

app.get('/api/nodes/spine', (req, res) => {
  res.json(spineNodes);
});

app.post('/api/chat', async (req, res) => {
  const litellmUrl = process.env.LITELLM_URL || 'http://litellm:4000';
  const masterKey = process.env.LITELLM_MASTER_KEY || '';
  const requestedModel = req.body.model || 'gpt-4o-mini';
  const message = req.body.message;
  const explicitTier = req.body.tier as 'T0' | 'T1' | 'T2' | 'T3' | undefined;
  const userId = req.body._userId as string | undefined;
  const accountType = req.body._accountType as string | undefined;
  const byokProvider = req.body._byokProvider as string | undefined;
  const requiredCapabilities: string[] = req.body.requiredCapabilities || [];

  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  const startTime = Date.now();

  try {
    const { classifyTier, getTierModels } = await import('./services/tier.service');
    const tier = classifyTier({
      message,
      tokenEstimate: Math.ceil(message.length / 4),
      explicitTier,
    });

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

    const providerForModel = Object.keys(LITELLM_PROVIDER_PREFIX).find(p =>
      requestedModel.startsWith(p) || requestedModel.includes(p)
    );

    const { resolveKey } = await import('./services/infisical.service');

    const { getCachedScores } = await import('./services/scoring.service');
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
    let fallbackFrom = '';
    let actualIsByok = false;
    for (let i = 0; i < fallbackChain.length; i++) {
      const model = fallbackChain[i];
      const isFallback = i > 0;
      if (isFallback) fallbackFrom = fallbackChain[i - 1];

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
            [model, model.split('/')[0] || 'unknown', reqLatencyMs, isFallback, fallbackFrom || null, userId || 'anonymous']
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
            fallbackFrom || null,
            isFallback ? model : null,
            userId || 'anonymous',
            actualIsByok,
          ]
        ).catch(() => {});

        if (userId && accountType && !byokProvider) {
          const costUsd = (inputTokens + outputTokens) * 0.00001;
          const { writeUsageToBilling } = await import('./services/billing.service');
          await writeUsageToBilling(pool, userId, accountType, inputTokens, outputTokens, costUsd).catch(() => {});
        }

        return res.json({
          response: data.choices?.[0]?.message?.content || '',
          model: usedModel,
          tier,
          usage: data.usage || {},
          byok: actualIsByok,
          fallbackTriggered: isFallback,
          fallbackFrom: isFallback ? fallbackFrom : undefined,
        });
      } catch (err: any) {
        lastError = err.message;
        continue;
      }
    }

    res.status(502).json({ error: `All models failed. Last error: ${lastError}` });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to proxy chat request', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`RA1 API server running on port ${port}`);
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));