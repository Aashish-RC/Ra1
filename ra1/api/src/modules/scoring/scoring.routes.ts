import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/postgres";
import { getCachedScores } from "../../services/scoring.service";

export const scoringRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/scoring/scores", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const scores = await getCachedScores(pool);
      return { scores };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
};