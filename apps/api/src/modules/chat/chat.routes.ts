import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/postgres";
import { proxyChatRequest } from "./chat.service";

export const chatRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/chat", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any;
      const result = await proxyChatRequest(pool, {
        message: body.message,
        model: body.model,
        tier: body.tier,
        userId: body._userId,
        accountType: body._accountType,
        byokProvider: body._byokProvider,
        requiredCapabilities: body.requiredCapabilities,
      });
      return reply.send(result);
    } catch (error: any) {
      if (error.message === "message is required") {
        return reply.code(400).send({ error: "message is required" });
      }
      if (error.message.startsWith("All models failed")) {
        return reply.code(502).send({ error: error.message });
      }
      return reply.code(500).send({ error: "Failed to proxy chat request", details: error.message });
    }
  });
};