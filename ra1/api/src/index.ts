import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import fastifyJwt from "@fastify/jwt";
import { bootstrap } from "./config/bootstrap";
import { connect as connectPostgres, pool } from "./db/postgres";
import { connect as connectValkey } from "./db/valkey";
import { connect as connectClickhouse } from "./db/clickhouse";
import { connect as connectQdrant } from "./db/qdrant";
import { connect as connectOllama } from "./db/ollama";
import { healthRoutes } from "./modules/health/health.routes";
import { vaultRoutes } from "./modules/vault/vault.routes";
import { chatRoutes } from "./modules/chat/chat.routes";
import { spineRoutes } from "./modules/spine/spine.routes";
import { modelsRoutes } from "./modules/models/models.routes";
import { atrsRoutes } from "./modules/atrs/atrs.routes";
import { billingRoutes } from "./modules/billing/billing.routes";
import { capabilitiesRoutes } from "./modules/capabilities/capabilities.routes";
import { providersRoutes } from "./modules/providers/providers.routes";
import { scoringRoutes } from "./modules/scoring/scoring.routes";
import { errorHandler } from "./middleware/error";
import { logger } from "./lib/logger";
import { secrets } from "./config/secrets";

declare module 'fastify' {
  export interface FastifyInstance {
    authenticate: any;
  }
  export interface FastifyRequest {
    auth?: {
      user: {
        userId: string;
      };
    };
  }
}

async function main(): Promise<void> {
  try {
    await bootstrap();
    logger.info("Configuration loaded");

    await connectPostgres();
    logger.info("Connected to PostgreSQL");

    await connectValkey();
    logger.info("Connected to Valkey");

    await connectClickhouse();
    logger.info("Connected to ClickHouse");

    await connectQdrant();
    logger.info("Connected to Qdrant");

    await connectOllama();
    logger.info("Connected to Ollama");

    const app = Fastify({
      logger: false,
    });

    app.setErrorHandler(errorHandler);

    await app.register(helmet);
    await app.register(cors, { origin: "*" });
    await app.register(rateLimit, {
      max: 100,
      timeWindow: "1 minute",
    });

    await app.register(fastifyJwt, {
      secret: secrets.JWT_SECRET
    });

    app.decorate("authenticate", async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();
        request.auth = {
          user: {
            userId: (request.user as any).userId
          }
        };
      } catch (err) {
        reply.code(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' } });
      }
    });

    // Register all route modules under /api prefix
    await app.register(healthRoutes);
    await app.register(vaultRoutes);
    await app.register(chatRoutes);
    await app.register(spineRoutes);
    await app.register(modelsRoutes, { prefix: "/api" });
    await app.register(atrsRoutes, { prefix: "/api" });
    await app.register(billingRoutes, { prefix: "/api" });
    await app.register(capabilitiesRoutes, { prefix: "/api" });
    await app.register(providersRoutes, { prefix: "/api" });
    await app.register(scoringRoutes, { prefix: "/api" });

    // Start background jobs after DB connection
    try {
      const { ensureSchema } = await import("./db/migrations");
      await ensureSchema(pool);
      logger.info("Database schema ensured");

      const { startModelSync } = await import("./jobs/modelSync");
      startModelSync(pool);

      const { startHFSync } = await import("./jobs/hfSync");
      startHFSync(pool);

      const { startChangelogWatcher } = await import("./jobs/changelogWatcher");
      startChangelogWatcher(pool);
    } catch (err) {
      logger.warn({ err }, "Background jobs startup (non-fatal)");
    }

    const port = secrets.API_PORT || 3001;
    const host = "0.0.0.0";

    app.listen({ port, host }, (err, address) => {
      if (err) {
        logger.error(err, "Failed to start server");
        process.exit(1);
      }
      logger.info(`Server listening at ${address}`);
    });

    process.on("SIGTERM", async () => {
      logger.info("SIGTERM received, shutting down gracefully");
      await app.close();
      process.exit(0);
    });

    process.on("SIGINT", async () => {
      logger.info("SIGINT received, shutting down gracefully");
      await app.close();
      process.exit(0);
    });
  } catch (error) {
    logger.error(error, "Failed to start application");
    process.exit(1);
  }
}

main();

export { pool };