import { Router, Request, Response } from 'express';
import * as infisical from '../services/infisical.service';
import { updateModelsForProvider } from '../services/litellm.service';

const router = Router();

// POST /api/vault/keys — store a key (with LiteLLM sync)
router.post('/keys', async (req: Request, res: Response) => {
  const { providerId, providerName, rawKey } = req.body;
  if (!providerId || !rawKey || rawKey.trim() === '') {
    res.status(400).json({ error: 'providerId and rawKey are required' });
    return;
  }

  try {
    const entry = await infisical.saveKey(providerId, providerName || providerId, rawKey);

    // Sync the key to LiteLLM so it can use it for model routing
    const syncResult = await updateModelsForProvider(providerId, rawKey);

    res.json({
      ...entry,
      litellmSync: syncResult,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to save key: ${err.message}` });
  }
});

// GET /api/vault/keys — list all key metadata (never exposes raw keys)
router.get('/keys', async (_req: Request, res: Response) => {
  try {
    const entries = await infisical.listKeys();
    res.json(entries);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to list keys: ${err.message}` });
  }
});

// GET /api/vault/keys/:providerId/resolve — resolve a key (used by engine at call-time)
router.get('/keys/:providerId/resolve', async (req: Request, res: Response) => {
  const { providerId } = req.params;

  try {
    const rawKey = await infisical.resolveKey(providerId);
    if (!rawKey) {
      res.status(404).json({ error: 'Key not found' });
      return;
    }
    res.json({ providerId, rawKey });
  } catch {
    res.status(500).json({ error: 'Failed to resolve key' });
  }
});

// DELETE /api/vault/keys/:providerId — revoke a key
router.delete('/keys/:providerId', async (req: Request, res: Response) => {
  const { providerId } = req.params;

  try {
    const deleted = await infisical.revokeKey(providerId);
    if (!deleted) {
      res.status(404).json({ error: 'Key not found' });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to revoke key: ${err.message}` });
  }
});

// PATCH /api/vault/keys/:providerId/status — update validation status (transient)
router.patch('/keys/:providerId/status', (req: Request, res: Response) => {
  const { providerId } = req.params;
  const { isValid } = req.body;

  infisical.setValidationStatus(providerId, isValid === null ? null : Boolean(isValid));
  const normalizedId = providerId.toLowerCase();

  res.json({
    success: true,
    isValid: infisical.getValidationStatus(normalizedId),
  });
});

// POST /api/vault/keys/:providerId/test — validate a stored key
router.post('/keys/:providerId/test', async (req: Request, res: Response) => {
  const { providerId } = req.params;
  const rawKey = await infisical.resolveKey(providerId);
  if (!rawKey) {
    res.status(404).json({ valid: false, error: 'Key not found' });
    return;
  }

  const testUrls: Record<string, { url: string; headers: Record<string, string>; useKeyInUrl?: boolean }> = {
    openai: { url: 'https://api.openai.com/v1/models', headers: { Authorization: `Bearer ${rawKey}` } },
    anthropic: { url: 'https://api.anthropic.com/v1/models', headers: { 'x-api-key': rawKey, 'anthropic-version': '2023-06-01' } },
    google: { url: `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(rawKey)}`, headers: {} },
    mistral: { url: 'https://api.mistral.ai/v1/models', headers: { Authorization: `Bearer ${rawKey}` } },
    cohere: { url: 'https://api.cohere.ai/v1/models', headers: { Authorization: `Bearer ${rawKey}` } },
    groq: { url: 'https://api.groq.com/openai/v1/models', headers: { Authorization: `Bearer ${rawKey}` } },
    together: { url: 'https://api.together.xyz/v1/models', headers: { Authorization: `Bearer ${rawKey}` } },
  };

  const target = testUrls[providerId.toLowerCase()];
  if (!target) {
    res.json({ valid: true });
    return;
  }

  try {
    const r = await fetch(target.url, { headers: target.headers, signal: AbortSignal.timeout(10000) });
    const valid = r.status === 200 || r.status === 403 || r.status === 400;
    infisical.setValidationStatus(providerId.toLowerCase(), valid);
    res.json({ valid, status: r.status });
  } catch {
    infisical.setValidationStatus(providerId.toLowerCase(), false);
    res.json({ valid: false, error: 'Request failed' });
  }
});

export default router;