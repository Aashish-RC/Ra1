import { pool } from "../db/postgres";
import { client as clickhouseClient } from "../db/clickhouse";
import * as infisical from "../services/infisical.service";
import { logger } from "../lib/logger";

export class CredentialVaultError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CredentialVaultError";
  }
}

export interface CredentialMetadata {
  id: string;
  key_name: string;
  provider: string | null;
  status: string;
  created_at: Date;
  last_accessed_at: Date | null;
}

export class CredentialVault {
  private async writeAccessEvent(
    userId: string,
    keyName: string,
    success: boolean,
    errorCode: string | null
  ): Promise<void> {
    try {
      await clickhouseClient.insert({
        table: "ra1_analytics.credential_access_events",
        values: [
          {
            user_id: userId,
            key_name: keyName,
            success: success ? 1 : 0,
            error_code: errorCode,
          },
        ],
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to write credential access event");
    }
  }

  async store(userId: string, key: string, value: string): Promise<void> {
    await infisical.saveKey(key, key, value, userId);
    await pool.query(
      `INSERT INTO credential_metadata (user_id, key_name, provider, status)
       VALUES ($1, $2, $3, 'connected')
       ON CONFLICT (user_id, key_name)
       DO UPDATE SET status = 'connected', last_accessed_at = NULL`,
      [userId, key, key]
    );
  }

  async resolve(userId: string, key: string): Promise<string> {
    const value = await infisical.resolveKey(key, userId);
    if (!value) throw new CredentialVaultError('Credential not found');
    await pool.query(
      'UPDATE credential_metadata SET last_accessed_at = now() WHERE user_id = $1 AND key_name = $2',
      [userId, key]
    );
    await this.writeAccessEvent(userId, key, true, null);
    return value;
  }

  async revoke(userId: string, key: string): Promise<void> {
    await infisical.revokeKey(key, userId);
    await pool.query(
      "UPDATE credential_metadata SET status = 'revoked' WHERE user_id = $1 AND key_name = $2",
      [userId, key]
    );
  }

  async rotate(userId: string, key: string, newValue: string): Promise<void> {
    await infisical.saveKey(key, key, newValue, userId);
  }

  async listCredentials(userId: string): Promise<CredentialMetadata[]> {
    const result = await pool.query(
      `SELECT id, key_name, provider, status, created_at, last_accessed_at
       FROM credential_metadata
       WHERE user_id = $1 AND status != 'revoked'
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }
}