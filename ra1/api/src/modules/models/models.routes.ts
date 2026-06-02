import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/postgres";
import { triggerSyncNow } from "../../jobs/modelSync";

export const modelsRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/models/discover
  fastify.post("/models/discover", async (request: FastifyRequest, reply: FastifyReply) => {
    const { providerId, baseUrl, apiKey } = request.body as { providerId: string; baseUrl: string; apiKey?: string };

    if (!providerId || !baseUrl) {
      return reply.status(400).send({ error: "providerId and baseUrl are required" });
    }

    const LITELLM_PROVIDER_PREFIX: Record<string, string> = {
      openai: "openai/", anthropic: "anthropic/", google: "gemini/", gemini: "gemini/",
      mistral: "mistral/", cohere: "cohere/", together: "together_ai/", groq: "groq/",
    };

    // Step 1: Try LiteLLM first
    try {
      const litellmUrl = process.env.LITELLM_URL || "http://litellm:4000";
      const masterKey = process.env.LITELLM_MASTER_KEY || "";
      const prefix = LITELLM_PROVIDER_PREFIX[providerId];

      if (prefix) {
        const response = await fetch(`${litellmUrl}/model/info`, {
          headers: { Authorization: `Bearer ${masterKey}`, "Content-Type": "application/json" },
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          const body = await response.json() as { data?: Array<{ model_name: string; litellm_params: { model: string } }> };
          const filtered = (body.data ?? []).filter((m) => m.litellm_params?.model?.startsWith(prefix));
          return { models: filtered.map((m) => ({ id: m.litellm_params.model, name: m.model_name })) };
        }
      }
    } catch {
      // fall through
    }

    // Step 2: Fallback — call provider API directly
    const PROVIDER_API: Record<string, { endpoint: string; authScheme?: string; responseParser: (body: any) => Array<{ id: string; name?: string }> }> = {
      openai: { endpoint: "/models", authScheme: "Bearer", responseParser: (body) => body.data?.filter((m: any) => m.object === "model" || !m.object) ?? [] },
      anthropic: { endpoint: "/models", authScheme: "x-api-key", responseParser: (body) => body.data ?? [] },
      google: { endpoint: "/models", responseParser: (body) => body.models ?? [] },
      mistral: { endpoint: "/models", authScheme: "Bearer", responseParser: (body) => body.data ?? [] },
      cohere: { endpoint: "/models", authScheme: "Bearer", responseParser: (body) => body.models ?? [] },
      together: { endpoint: "/models", authScheme: "Bearer", responseParser: (body) => body.data ?? [] },
      groq: { endpoint: "/models", authScheme: "Bearer", responseParser: (body) => body.data ?? [] },
    };

    const provider = PROVIDER_API[providerId];
    if (!provider) {
      return reply.status(400).send({ error: "Unknown provider" });
    }

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      let url = `${baseUrl.replace(/\/+$/, "")}${provider.endpoint}`;

      if (apiKey) {
        if (provider.authScheme === "x-api-key") {
          headers["x-api-key"] = apiKey;
          if (providerId === "anthropic") headers["anthropic-version"] = "2023-06-01";
        } else if (providerId === "google") {
          url = `${url}?key=${encodeURIComponent(apiKey)}`;
        } else {
          headers["Authorization"] = `${provider.authScheme} ${apiKey}`;
        }
      }

      const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`Provider API returned ${response.status}`);

      const body = await response.json();
      const rawModels = provider.responseParser(body);
      return { models: rawModels.map((m: any) => ({ id: m.id, name: m.name || m.id })) };
    } catch (err: any) {
      if (err.name === "TimeoutError" || err.code === "UND_ERR_CONNECT_TIMEOUT") {
        return reply.status(504).send({ error: "Provider API timed out" });
      }
      return reply.status(502).send({ error: `Failed to fetch models: ${err.message}` });
    }
  });

  // GET /api/models/changelog
  fastify.get("/models/changelog", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await pool.query(
        `SELECT id, provider_id, change_type, model_id, model_name, detail, created_at
         FROM model_changelog WHERE seen = FALSE ORDER BY provider_id, created_at DESC`
      );

      const changes: Record<string, any[]> = {};
      for (const row of result.rows) {
        const pid = row.provider_id;
        if (!changes[pid]) changes[pid] = [];
        changes[pid].push({
          id: row.id,
          changeType: row.change_type,
          modelId: row.model_id,
          modelName: row.model_name,
          detail: row.detail,
          createdAt: row.created_at,
        });
      }

      return { hasChanges: Object.keys(changes).length > 0, changes, lastChecked: new Date().toISOString() };
    } catch (err: any) {
      return reply.status(500).send({ error: `Failed to fetch changelog: ${err.message}` });
    }
  });

  // POST /api/models/changelog/apply
  fastify.post("/models/changelog/apply", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { providerIds } = request.body as { providerIds: string[] };
      if (!Array.isArray(providerIds) || providerIds.length === 0) {
        return reply.status(400).send({ error: "providerIds array is required" });
      }

      await pool.query(
        `UPDATE model_changelog SET seen = TRUE WHERE provider_id = ANY($1::text[]) AND seen = FALSE`,
        [providerIds]
      );

      const snapshotResult = await pool.query(
        `SELECT provider_id, models, updated_at FROM model_snapshots WHERE provider_id = ANY($1::text[])`,
        [providerIds]
      );

      const snapshots: Record<string, any[]> = {};
      for (const row of snapshotResult.rows) {
        snapshots[row.provider_id] = row.models;
      }

      return { snapshots };
    } catch (err: any) {
      return reply.status(500).send({ error: `Failed to apply changes: ${err.message}` });
    }
  });

  // POST /api/models/sync/trigger
  fastify.post("/models/sync/trigger", async (_request: FastifyRequest, _reply: FastifyReply) => {
    triggerSyncNow(pool);
    return { status: "triggered" };
  });

  // GET /api/models/snapshot/:providerId
  fastify.get("/models/snapshot/:providerId", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { providerId } = request.params as { providerId: string };
      const result = await pool.query(
        `SELECT provider_id, models, updated_at FROM model_snapshots WHERE provider_id = $1`,
        [providerId]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: "No snapshot found for this provider" });
      }

      return { providerId: result.rows[0].provider_id, models: result.rows[0].models, updatedAt: result.rows[0].updated_at };
    } catch (err: any) {
      return reply.status(500).send({ error: `Failed to fetch snapshot: ${err.message}` });
    }
  });
};