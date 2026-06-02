import { pool } from "../../db/postgres";
import { redis } from "../../db/valkey";
import { client as clickhouseClient } from "../../db/clickhouse";
import { client as qdrantClient } from "../../db/qdrant";
import { secrets } from "../../config/secrets";

interface ServiceStatus {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  latencyMs?: number;
  error?: string;
}

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  latencyMs: number;
  timestamp: string;
  services: ServiceStatus[];
}

const TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), ms)
    ),
  ]);
}

export async function checkAllServices(): Promise<HealthStatus> {
  const startTime = Date.now();
  const services: ServiceStatus[] = [];

  try {
    const start = Date.now();
    await withTimeout(pool.query("SELECT 1"), TIMEOUT_MS);
    services.push({ name: "postgres", status: "healthy", latencyMs: Date.now() - start });
  } catch (error) {
    services.push({ name: "postgres", status: "unhealthy", error: String(error) });
  }

  try {
    const start = Date.now();
    await withTimeout(redis.ping(), TIMEOUT_MS);
    services.push({ name: "valkey", status: "healthy", latencyMs: Date.now() - start });
  } catch (error) {
    services.push({ name: "valkey", status: "unhealthy", error: String(error) });
  }

  try {
    const start = Date.now();
    await withTimeout(clickhouseClient.ping(), TIMEOUT_MS);
    services.push({ name: "clickhouse", status: "healthy", latencyMs: Date.now() - start });
  } catch (error) {
    services.push({ name: "clickhouse", status: "unhealthy", error: String(error) });
  }

  try {
    const start = Date.now();
    await withTimeout(qdrantClient.getCollections(), TIMEOUT_MS);
    services.push({ name: "qdrant", status: "healthy", latencyMs: Date.now() - start });
  } catch (error) {
    services.push({ name: "qdrant", status: "unhealthy", error: String(error) });
  }

  try {
    const start = Date.now();
    const response = await withTimeout(
      fetch(`${secrets.LITELLM_URL}/health`),
      TIMEOUT_MS
    );
    if (response.ok) {
      services.push({ name: "litellm", status: "healthy", latencyMs: Date.now() - start });
    } else {
      services.push({ name: "litellm", status: "unhealthy", latencyMs: Date.now() - start });
    }
  } catch (error) {
    services.push({ name: "litellm", status: "unhealthy", error: String(error) });
  }

  const healthyCount = services.filter((s) => s.status === "healthy").length;
  const totalLatency = Date.now() - startTime;

  const totalServices = 5;

  let status: "healthy" | "degraded" | "unhealthy";
  if (healthyCount === totalServices) {
    status = "healthy";
  } else if (healthyCount > 0) {
    status = "degraded";
  } else {
    status = "unhealthy";
  }

  return {
    status,
    latencyMs: totalLatency,
    timestamp: new Date().toISOString(),
    services,
  };
}