import { z } from "zod";

export const systemSecretsSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_DB: z.string().default("ra1"),

  // Cache / Queue
  VALKEY_URL: z.string().url(),
  REDIS_AUTH: z.string().min(1),

  // Analytics
  CLICKHOUSE_URL: z.string().url(),
  CLICKHOUSE_USER: z.string(),
  CLICKHOUSE_PASSWORD: z.string().optional(),
  CLICKHOUSE_DB: z.string().default("ra1_analytics"),

  // Vector store
  QDRANT_URL: z.string().url(),

  // Local AI
  OLLAMA_BASE_URL: z.string().url(),
  EMBEDDING_MODEL: z.string().default("nomic-embed-text"),

  // Model proxy
  LITELLM_URL: z.string().url(),
  LITELLM_MASTER_KEY: z.string().min(1),

  // JWT / Session
  JWT_SECRET: z.string().min(1),
  SESSION_SECRET: z.string().min(1),

  // LibreChat secrets
  CREDS_KEY: z.string().min(1),
  CREDS_IV: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),

  // MinIO
  MINIO_ROOT_USER: z.string().min(1),
  MINIO_ROOT_PASSWORD: z.string().min(1),

  // Langfuse
  LANGFUSE_PUBLIC_KEY: z.string().min(1),
  LANGFUSE_SECRET_KEY: z.string().min(1),
  LANGFUSE_SALT: z.string().min(1),

  // API config
  API_PORT: z.coerce.number().int().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type SystemSecrets = z.infer<typeof systemSecretsSchema>;

export const secrets: SystemSecrets = {} as SystemSecrets;

export function setSecrets(values: Partial<SystemSecrets>): void {
  Object.assign(secrets, values);
}