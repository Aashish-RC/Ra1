import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/postgres";

export const capabilitiesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/capabilities/tags", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await pool.query(`
        SELECT DISTINCT unnest(capabilities) AS tag
        FROM model_registry
        WHERE capabilities IS NOT NULL
        ORDER BY tag
      `);
      return { tags: result.rows.map((r: any) => r.tag) };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.patch("/capabilities/models/:modelId", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { modelId } = request.params as { modelId: string };
      const { providerId, capabilities } = request.body as { providerId: string; capabilities: string[] };
      if (!providerId || !Array.isArray(capabilities)) {
        return reply.status(400).send({ error: "providerId and capabilities array required" });
      }
      await pool.query(
        "UPDATE model_registry SET capabilities = $1, updated_at = NOW() WHERE model_id = $2 AND provider_id = $3",
        [capabilities, modelId, providerId]
      );
      return { success: true, modelId, capabilities };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.get("/capabilities/models", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await pool.query(`
        SELECT model_id, provider_id, display_name, capabilities, status
        FROM model_registry
        ORDER BY provider_id, model_id
      `);
      return { models: result.rows };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.post("/capabilities/recommend", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { requiredTags = [], preferredTags = [], limit = 5 } = request.body as {
        requiredTags?: string[];
        preferredTags?: string[];
        limit?: number;
      };

      const result = await pool.query(`
        SELECT model_id, provider_id, display_name, capabilities,
          input_cost_per_1k, output_cost_per_1k, context_window,
          (SELECT COUNT(*) FROM unnest($2::text[]) t WHERE t = ANY(capabilities)) AS preferred_match_count
        FROM model_registry
        WHERE status = 'active'
          AND ($1::text[] <@ capabilities OR $1::text[] = '{}')
        ORDER BY preferred_match_count DESC, input_cost_per_1k ASC NULLS LAST
        LIMIT $3
      `, [requiredTags, preferredTags, limit]);

      return { recommendations: result.rows };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
};