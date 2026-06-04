import { InfisicalClient } from "@infisical/sdk";
import { setSecrets, systemSecretsSchema } from "./secrets";
import { logger } from "../lib/logger";

export let infisicalClient: InfisicalClient | null = null;

export async function bootstrap(): Promise<void> {
  const infisicalUrl = process.env.INFISICAL_URL || "http://infisical:8080";
  const serviceToken = process.env.INFISICAL_SERVICE_TOKEN;
  const systemProjectId = process.env.INFISICAL_SYSTEM_PROJECT_ID;
  const environment = process.env.INFISICAL_ENVIRONMENT || "dev";

  if (!serviceToken || !systemProjectId) {
    // No Infisical configured — load secrets directly from environment variables
    logger.warn("INFISICAL_SERVICE_TOKEN not set — loading secrets from environment variables directly");
    const parsed = systemSecretsSchema.partial().parse(process.env);
    setSecrets(parsed);
    logger.info(`Bootstrap complete: secrets loaded from environment (${environment} environment)`);
    return;
  }

  infisicalClient = new InfisicalClient({
    siteUrl: infisicalUrl,
    accessToken: serviceToken,
  });

  // 1. Read system secrets (DB, Redis, MinIO, JWT, LiteLLM, Langfuse, LibreChat)
  const systemSecrets = await infisicalClient.listSecrets({
    projectId: systemProjectId,
    environment,
  });

  const secretsMap: Record<string, string> = {};
  for (const s of systemSecrets) {
    secretsMap[s.secretKey] = s.secretValue;
  }

  const parsed = systemSecretsSchema.parse(secretsMap);
  setSecrets(parsed);

  const env = process.env.INFISICAL_ENVIRONMENT || "development";
  logger.info(`Bootstrap complete: ${systemSecrets.length} system secrets loaded in ${env} environment`);
}