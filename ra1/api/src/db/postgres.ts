import { Pool } from "pg";
import { secrets } from "../config/secrets";

let pool: Pool;

export async function connect(): Promise<void> {
  pool = new Pool({
    connectionString: secrets.DATABASE_URL,
  });
  await pool.connect();
}

export async function disconnect(): Promise<void> {
  if (pool) {
    await pool.end();
  }
}

export { pool };