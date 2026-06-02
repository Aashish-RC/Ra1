import { pool } from "../db/postgres";
import { client as clickhouseClient } from "../db/clickhouse";
import { infisicalClient } from "../config/bootstrap";
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
    const secretName = `${userId}/${key}`;
    const environment = process.env.INFISICAL_ENVIRONMENT || "development";
    const projectId = process.env.INFISICAL_PROJECT_ID || "";

    try {
      await infisicalClient.createSecret({
        environment,
        projectId,
        secretName,
        secretValue: value,
      });

      await pool.query(
        `INSERT INTO credential_metadata (user_id, key_name, provider)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, key_name)
         DO UPDATE SET provider = EXCLUDED.provider, status = 'connected', last_accessed_at = NULL`,
        [userId, key, null]
      );
    } catch (error) {
      logger.error({ err: error, userId, keyName: key }, "Failed to store credential");
      throw new CredentialVaultError("Failed to store credential");
    }
  }

  async resolve(userId: string, key: string): Promise<string> {
    const secretName = `${userId}/${key}`;
    const environment = process.env.INFISICAL_ENVIRONMENT || "development";
    const projectId = process.env.INFISICAL_PROJECT_ID || "";

    let success = false;
    let errorCode: string | null = null;

    try {
      const result = await infisicalClient.getSecret({
        environment,
        projectId,
        secretName,
      });

      success = true;
      await pool.query(
        "UPDATE credential_metadata SET last_accessed_at = now() WHERE user_id = $1 AND key_name = $2",
        [userId, key]
      );

      await this.writeAccessEvent(userId, key, success, errorCode);
      return result.secretValue;
    } catch (error) {
      errorCode = error instanceof Error ? error.constructor.name : "UnknownError";
      await this.writeAccessEvent(userId, key, success, errorCode);
      throw new CredentialVaultError("Failed to resolve credential");
    }
  }

  async revoke(userId: string, key: string): Promise<void> {
    const secretName = `${userId}/${key}`;
    const environment = process.env.INFISICAL_ENVIRONMENT || "development";
    const projectId = process.env.INFISICAL_PROJECT_ID || "";

    try {
      await infisicalClient.deleteSecret({
        environment,
        projectId,
        secretName,
      });

      await pool.query(
        "UPDATE credential_metadata SET status = 'revoked' WHERE user_id = $1 AND key_name = $2",
        [userId, key]
      );
    } catch (error) {
      logger.error({ err: error, userId, keyName: key }, "Failed to revoke credential");
      throw new CredentialVaultError("Failed to revoke credential");
    }
  }

  async rotate(userId: string, key: string, newValue: string): Promise<void> {
    const secretName = `${userId}/${key}`;
    const environment = process.env.INFISICAL_ENVIRONMENT || "development";
    const projectId = process.env.INFISICAL_PROJECT_ID || "";

    try {
      await infisicalClient.updateSecret({
        environment,
        projectId,
        secretName,
        secretValue: newValue,
      });
    } catch (error) {
      logger.error({ err: error, userId, keyName: key }, "Failed to rotate credential");
      throw new CredentialVaultError("Failed to rotate credential");
    }
  }

  async listCredentials(userId: string): Promise<CredentialMetadata[]> {
    const result = await pool.query(
      "SELECT id, key_name, provider, status, created_at, last_accessed_at FROM credential_metadata WHERE user_id = $1 AND status != 'revoked' ORDER BY created_at DESC",
      [userId]
    );
    return result.rows;
  }
}