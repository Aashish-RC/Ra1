import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/postgres";

export const providersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/providers", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await pool.query(
        "SELECT provider_id, display_name, base_url, auth_header_name, auth_prefix, models_endpoint, chat_endpoint, sync_enabled, sync_frequency_hrs, deprecation_url FROM provider_config ORDER BY provider_id"
      );
      return result.rows;
    } catch (err: any) {
      return reply.status(500).send({ error: `Failed to fetch provider configs: ${err.message}` });
    }
  });

  fastify.get("/providers/:providerId", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { providerId } = request.params as { providerId: string };
      const result = await pool.query(
        "SELECT provider_id, display_name, base_url, auth_header_name, auth_prefix, models_endpoint, chat_endpoint, sync_enabled, sync_frequency_hrs, deprecation_url FROM provider_config WHERE provider_id = $1",
        [providerId]
      );
      if (result.rows.length === 0) {
        return reply.status(404).send({ error: "Provider config not found" });
      }
      return result.rows[0];
    } catch (err: any) {
      return reply.status(500).send({ error: `Failed to fetch provider config: ${err.message}` });
    }
  });

  fastify.patch("/providers/:providerId", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { providerId } = request.params as { providerId: string };
      const updates = request.body as Record<string, any>;
      const allowedFields = [
        "display_name", "base_url", "auth_header_name", "auth_prefix",
        "models_endpoint", "chat_endpoint", "sync_enabled", "sync_frequency_hrs", "deprecation_url",
      ];

      const setClauses: string[] = [];
      const values: any[] = [];
      let idx = 1;

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          setClauses.push(`${field} = $${idx}`);
          values.push(updates[field]);
          idx++;
        }
      }

      if (setClauses.length === 0) {
        return reply.status(400).send({ error: "No fields to update" });
      }

      values.push(providerId);
      const query = `UPDATE provider_config SET ${setClauses.join(", ")}, updated_at = NOW() WHERE provider_id = $${idx} RETURNING *`;
      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: "Provider config not found" });
      }

      return result.rows[0];
    } catch (err: any) {
      return reply.status(500).send({ error: `Failed to update provider config: ${err.message}` });
    }
  });
};