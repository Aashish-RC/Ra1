import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/postgres";

export const atrsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/atrs/log", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as { limit?: string; userId?: string; modelId?: string };
      const limit = Math.min(parseInt(query.limit || "100"), 1000);
      const conditions: string[] = [];
      const params: any[] = [];

      if (query.userId) { params.push(query.userId); conditions.push(`user_id = $${params.length}`); }
      if (query.modelId) { params.push(query.modelId); conditions.push(`model_id = $${params.length}`); }

      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
      params.push(limit);

      const result = await pool.query(
        `SELECT * FROM usage_log ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
        params
      );

      return { log: result.rows, count: result.rows.length };
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  fastify.get("/atrs/summary", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await pool.query(`
        SELECT model_id, provider_id,
          COUNT(*) AS total_calls,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success_calls,
          ROUND(AVG(latency_ms)::numeric, 0) AS avg_latency_ms,
          SUM(input_tokens) AS total_input_tokens,
          SUM(output_tokens) AS total_output_tokens,
          SUM(total_cost_usd)::numeric(14,6) AS total_cost_usd,
          MAX(created_at) AS last_used_at
        FROM usage_log
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY model_id, provider_id
        ORDER BY total_calls DESC
      `);
      return { summary: result.rows };
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });
};