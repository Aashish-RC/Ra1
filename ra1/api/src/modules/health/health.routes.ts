import { checkAllServices } from "./health.service";
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/health", async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await checkAllServices();
    if (result.status === "unhealthy") {
      return reply.status(503).send(result);
    }
    return result;
  });

  fastify.get("/health/live", async () => {
    return { status: "ok" };
  });
};
