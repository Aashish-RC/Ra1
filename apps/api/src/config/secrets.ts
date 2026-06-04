import { z } from "zod";

export const systemSecretsSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  POSTGRES_USER: z.string().default("ra1"),
  POSTGRES_PASSWORD: z.string().default(""),
  POSTGRES_DB: z.string().default("ra1"),

  // Cache / Queue
  VALKEY_URL: z.string().url().default("redis://valkey:6379"),
  REDIS_AUTH: z.string().default(""),

  // Analytics
  CLICKHOUSE_URL: z.string().url().default("http://clickhouse:8123"),
  CLICKHOUSE_USER: z.string().default("clickhouse"),
  CLICKHOUSE_PASSWORD: z.string().default(""),
  CLICKHOUSE_DB: z.string().default("ra1_analytics"),

  // Vector store
  QDRANT_URL: z.string().url().default("http://qdrant:6333"),

  // Local AI
  OLLAMA_BASE_URL: z.string().url().default("http://ollama:11434"),
  EMBEDDING_MODEL: z.string().default("nomic-embed-text"),

  // Model proxy
  LITELLM_URL: z.string().url().default("http://litellm:4000"),
  LITELLM_MASTER_KEY: z.string().default(""),

  // JWT / Session
  JWT_SECRET: z.string().default(""),
  SESSION_SECRET: z.string().default(""),

  // LibreChat secrets
  CREDS_KEY: z.string().default(""),
  CREDS_IV: z.string().default(""),
  JWT_REFRESH_SECRET: z.string().default(""),

  // MinIO
  MINIO_ROOT_USER: z.string().default(""),
  MINIO_ROOT_PASSWORD: z.string().default(""),

  // Langfuse
  LANGFUSE_PUBLIC_KEY: z.string().default(""),
  LANGFUSE_SECRET_KEY: z.string().default(""),
  LANGFUSE_SALT: z.string().default(""),

  // API config
  API_PORT: z.coerce.number().int().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type SystemSecrets = z.infer<typeof systemSecretsSchema>;

export const secrets: SystemSecrets = {} as SystemSecrets;

export function setSecrets(values: Partial<SystemSecrets>): void {
  Object.assign(secrets, values);
}