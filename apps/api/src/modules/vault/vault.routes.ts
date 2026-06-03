import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import * as infisical from "../../services/infisical.service";
import { updateModelsForProvider } from "../../services/litellm.service";

export const vaultRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /keys — store a key (with LiteLLM sync)
  // userId is extracted from auth when available
  fastify.post("/keys", async (request: FastifyRequest, reply: FastifyReply) => {
    const { providerId, providerName, rawKey } = request.body as { providerId: string; providerName: string; rawKey: string };
    if (!providerId || !rawKey || rawKey.trim() === '') {
      return reply.code(400).send({ error: 'providerId and rawKey are required' });
    }

    const userId = request.auth?.user?.userId;

    try {
      const entry = await infisical.saveKey(providerId, providerName || providerId, rawKey, userId);

      // Sync the key to LiteLLM so it can use it for model routing
      const syncResult = await updateModelsForProvider(providerId, rawKey);

      return reply.send({
        ...entry,
        litellmSync: syncResult,
      });
    } catch (err: any) {
      return reply.code(500).send({ error: `Failed to save key: ${err.message}` });
    }
  });

  // GET /keys — list all key metadata (never exposes raw keys)
  fastify.get("/keys", async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.auth?.user?.userId;

    try {
      const entries = await infisical.listKeys(userId);
      return reply.send(entries);
    } catch (err: any) {
      return reply.code(500).send({ error: `Failed to list keys: ${err.message}` });
    }
  });

  // GET /keys/:providerId/resolve — resolve a key (used by engine at call-time)
  fastify.get("/keys/:providerId/resolve", async (request: FastifyRequest, reply: FastifyReply) => {
    const { providerId } = request.params as { providerId: string };
    const userId = request.auth?.user?.userId;

    try {
      const rawKey = await infisical.resolveKey(providerId, userId);
      if (!rawKey) {
        return reply.code(404).send({ error: 'Key not found' });
      }
      return reply.send({ providerId, rawKey });
    } catch {
      return reply.code(500).send({ error: 'Failed to resolve key' });
    }
  });

  // DELETE /keys/:providerId — revoke a key
  fastify.delete("/keys/:providerId", async (request: FastifyRequest, reply: FastifyReply) => {
    const { providerId } = request.params as { providerId: string };
    const userId = request.auth?.user?.userId;

    try {
      const deleted = await infisical.revokeKey(providerId, userId);
      if (!deleted) {
        return reply.code(404).send({ error: 'Key not found' });
      }
      return reply.send({ success: true });
    } catch (err: any) {
      return reply.code(500).send({ error: `Failed to revoke key: ${err.message}` });
    }
  });

  // PATCH /keys/:providerId/status — update validation status (transient)
  fastify.patch("/keys/:providerId/status", async (request: FastifyRequest, reply: FastifyReply) => {
    const { providerId } = request.params as { providerId: string };
    const { isValid } = request.body as { isValid: boolean | null };

    infisical.setValidationStatus(providerId, isValid === null ? null : Boolean(isValid));
    const normalizedId = providerId.toLowerCase();

    return reply.send({
      success: true,
      isValid: infisical.getValidationStatus(normalizedId),
    });
  });

  // POST /keys/:providerId/test — validate a stored key
  fastify.post("/keys/:providerId/test", async (request: FastifyRequest, reply: FastifyReply) => {
    const { providerId } = request.params as { providerId: string };
    const userId = request.auth?.user?.userId;
    const rawKey = await infisical.resolveKey(providerId, userId);
    if (!rawKey) {
      return reply.code(404).send({ valid: false, error: 'Key not found' });
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
      return reply.send({ valid: true });
    }

    try {
      const r = await fetch(target.url, { headers: target.headers, signal: AbortSignal.timeout(10000) });
      const valid = r.status === 200 || r.status === 403 || r.status === 400;
      infisical.setValidationStatus(providerId.toLowerCase(), valid);
      return reply.send({ valid, status: r.status });
    } catch {
      infisical.setValidationStatus(providerId.toLowerCase(), false);
      return reply.send({ valid: false, error: 'Request failed' });
    }
  });
};