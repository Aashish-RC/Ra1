import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/postgres";
import { getCachedScores } from "../../services/scoring.service";
import { getCooldowns } from "../../services/fallback-router.service";

export const scoringRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/scoring/scores", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const scores = await getCachedScores(pool);
      return { scores };
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  fastify.get("/scoring/cooldowns", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      return getCooldowns();
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });
};
