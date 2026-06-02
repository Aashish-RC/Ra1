import Redis from "ioredis";
import { secrets } from "../config/secrets";

let redis: Redis;

export async function connect(): Promise<void> {
  redis = new Redis(secrets.VALKEY_URL);
  await redis.connect();
}

export async function disconnect(): Promise<void> {
  if (redis) {
    await redis.quit();
  }
}

export { redis };