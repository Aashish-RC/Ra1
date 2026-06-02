import type { ClickHouseClient } from "@clickhouse/client";
import { createClient } from "@clickhouse/client";
import { secrets } from "../config/secrets";

let client: ClickHouseClient;

export async function connect(): Promise<void> {
  const url = new URL(secrets.CLICKHOUSE_URL);
  client = createClient({
    host: `${url.hostname}:${url.port || "8123"}`,
    username: secrets.CLICKHOUSE_USER,
    password: secrets.CLICKHOUSE_PASSWORD || "",
    database: secrets.CLICKHOUSE_DB,
  } as any);
}

export async function disconnect(): Promise<void> {
  if (client) {
    await client.close();
  }
}

export { client };