import { InfisicalClient } from "@infisical/sdk";
import { setSecrets, appSecretsSchema } from "./secrets";
import { logger } from "../lib/logger";

export let infisicalClient: InfisicalClient;

export async function bootstrap(): Promise<void> {
  if (!process.env.INFISICAL_SERVICE_TOKEN) {
    throw new Error("INFISICAL_SERVICE_TOKEN is required");
  }

  infisicalClient = new InfisicalClient({
    siteUrl: process.env.INFISICAL_URL || "https://app.infisical.com",
    accessToken: process.env.INFISICAL_SERVICE_TOKEN,
  });

  const secretsList = await infisicalClient.listSecrets({
    projectId: process.env.INFISICAL_PROJECT_ID || "",
    environment: process.env.INFISICAL_ENVIRONMENT || "development",
  });

  const secrets: Record<string, string> = {};
  for (const item of secretsList) {
    secrets[item.secretKey] = item.secretValue;
  }

  const parsed = appSecretsSchema.parse(secrets);
  setSecrets(parsed);

  const environment = process.env.INFISICAL_ENVIRONMENT || "development";
  logger.info(`Configuration bootstrapped successfully in ${environment} environment with ${secretsList.length} secrets loaded`);
}