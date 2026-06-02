import { z } from "zod";

export const appSecretsSchema = z.object({
  DATABASE_URL: z.string().url(),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_DB: z.string().default("ra1"),
  VALKEY_URL: z.string().url(),
  CLICKHOUSE_URL: z.string().url(),
  CLICKHOUSE_USER: z.string(),
  CLICKHOUSE_PASSWORD: z.string().optional(),
  CLICKHOUSE_DB: z.string().default("ra1_analytics"),
  QDRANT_URL: z.string().url(),
  OLLAMA_BASE_URL: z.string().url(),
  EMBEDDING_MODEL: z.string().default("nomic-embed-text"),
  LITELLM_URL: z.string().url(),
  LITELLM_MASTER_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  SESSION_SECRET: z.string().min(1),
  API_PORT: z.number().int().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type AppSecrets = z.infer<typeof appSecretsSchema>;

export const secrets: AppSecrets = {} as AppSecrets;

export function setSecrets(values: Partial<AppSecrets>): void {
  Object.assign(secrets, values);
}