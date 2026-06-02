import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { CredentialVault, CredentialVaultError } from "../../vault/CredentialVault";
import { pool } from "../../db/postgres";
import { logger } from "../../lib/logger";

interface AuthenticatedRequest {
  user: {
    userId: string;
    scope?: string;
  };
}

function getUserId(request: FastifyRequest): string {
  const auth = request.auth as AuthenticatedRequest;
  if (!auth?.user?.userId) {
    throw new Error("Authentication required");
  }
  return auth.user.userId;
}

export const vaultRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  const vault = new CredentialVault();

  fastify.post("/credentials", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = getUserId(request);
      const { key, value } = request.body as { key: string; value: string };

      if (!key || !value) {
        return reply.status(400).send({ error: "key and value are required" });
      }

      await vault.store(userId, key, value);
      return reply.status(201).send({ success: true });
    } catch (error) {
      if (error instanceof CredentialVaultError) {
        logger.error({ err: error }, "Failed to store credential");
        return reply.status(500).send({ error: error.message });
      }
      throw error;
    }
  });

  fastify.delete("/credentials/:keyName", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = getUserId(request);
      const { keyName } = request.params as { keyName: string };

      await vault.revoke(userId, keyName);
      return reply.send({ success: true });
    } catch (error) {
      if (error instanceof CredentialVaultError) {
        logger.error({ err: error }, "Failed to revoke credential");
        return reply.status(500).send({ error: error.message });
      }
      throw error;
    }
  });

  fastify.get("/credentials", async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const result = await pool.query(
      "SELECT id, key_name, provider, status, created_at, last_accessed_at FROM credential_metadata WHERE user_id = $1 AND status != 'revoked' ORDER BY created_at DESC",
      [userId]
    );
    return result.rows;
  });
};