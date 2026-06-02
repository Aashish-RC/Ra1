import { Pool } from 'pg';

export async function ensureSchema(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS model_snapshots (
        provider_id TEXT PRIMARY KEY,
        models JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS model_changelog (
        id SERIAL PRIMARY KEY,
        provider_id TEXT NOT NULL,
        change_type TEXT NOT NULL,
        model_id TEXT NOT NULL,
        model_name TEXT,
        detail TEXT,
        seen BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        sunset_date DATE,
        last_seen_at TIMESTAMPTZ
      )
    `);

    // Add columns IF NOT EXISTS for existing tables (idempotent)
    await client.query(`
      ALTER TABLE model_changelog
        ADD COLUMN IF NOT EXISTS sunset_date DATE,
        ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ
    `);

    // Index for deduplication: find existing unseen entries per (provider, model, change_type)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_changelog_dedup
      ON model_changelog (provider_id, model_id, change_type)
      WHERE seen = FALSE
    `);

    // Index for listing unseen entries grouped by provider
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_changelog_unseen
      ON model_changelog (provider_id, created_at DESC)
      WHERE seen = FALSE
    `);

    // model_registry table for enriched per-model metadata
    await client.query(`
      CREATE TABLE IF NOT EXISTS model_registry (
        model_id        TEXT NOT NULL,
        provider_id     TEXT NOT NULL,
        display_name    TEXT,
        status          TEXT NOT NULL DEFAULT 'active',
        context_window  INTEGER,
        input_cost_per_1k  NUMERIC(12,8),
        output_cost_per_1k NUMERIC(12,8),
        capabilities    TEXT[],
        deprecated_at   TIMESTAMPTZ,
        sunset_date     DATE,
        last_seen_at    TIMESTAMPTZ,
        replacement_model TEXT,
        first_seen_at   TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (model_id, provider_id)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_registry_provider ON model_registry(provider_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_registry_status ON model_registry(status)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS provider_config (
        provider_id        TEXT PRIMARY KEY,
        display_name       TEXT NOT NULL,
        base_url           TEXT NOT NULL,
        auth_header_name   TEXT NOT NULL DEFAULT 'Authorization',
        auth_prefix        TEXT NOT NULL DEFAULT 'Bearer',
        models_endpoint    TEXT NOT NULL DEFAULT '/models',
        chat_endpoint      TEXT NOT NULL DEFAULT '/chat/completions',
        sync_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
        sync_frequency_hrs INTEGER NOT NULL DEFAULT 6,
        deprecation_url    TEXT,
        created_at         TIMESTAMPTZ DEFAULT NOW(),
        updated_at         TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS usage_log (
        id             SERIAL PRIMARY KEY,
        user_id        TEXT,
        model_id       TEXT NOT NULL,
        provider_id    TEXT NOT NULL,
        latency_ms     INTEGER NOT NULL,
        status         TEXT NOT NULL DEFAULT 'success',
        input_tokens   INTEGER,
        output_tokens  INTEGER,
        total_cost_usd NUMERIC(14,6),
        request_body   JSONB,
        response_body  JSONB,
        created_at     TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_usage_log_model ON usage_log(model_id, provider_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_usage_log_created ON usage_log(created_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_usage_log_user ON usage_log(user_id)
    `);

    // Add missing columns to usage_log (idempotent)
    await client.query(`
      ALTER TABLE usage_log
        ADD COLUMN IF NOT EXISTS fallback_triggered BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS fallback_from TEXT,
        ADD COLUMN IF NOT EXISTS fallback_to TEXT,
        ADD COLUMN IF NOT EXISTS byok_used BOOLEAN DEFAULT FALSE
    `);

    // User account types
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_accounts (
        user_id         TEXT PRIMARY KEY,
        account_type    TEXT NOT NULL DEFAULT 'free',
        role            TEXT NOT NULL DEFAULT 'user',
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    `);

    // Free tier quotas (daily reset)
    await client.query(`
      CREATE TABLE IF NOT EXISTS free_quotas (
        user_id               TEXT PRIMARY KEY REFERENCES user_accounts(user_id),
        tokens_used_today     INTEGER NOT NULL DEFAULT 0,
        requests_used_today   INTEGER NOT NULL DEFAULT 0,
        tokens_limit_daily    INTEGER NOT NULL DEFAULT 50000,
        requests_limit_daily  INTEGER NOT NULL DEFAULT 50,
        quota_resets_at       TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 day'),
        last_reset_at         TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Prepaid wallet
    await client.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        user_id               TEXT PRIMARY KEY REFERENCES user_accounts(user_id),
        balance_usd           NUMERIC(14,4) NOT NULL DEFAULT 0,
        currency              TEXT NOT NULL DEFAULT 'USD',
        auto_topup_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
        auto_topup_threshold  NUMERIC(14,4) DEFAULT 5.00,
        auto_topup_amount     NUMERIC(14,4) DEFAULT 20.00,
        last_topup_at         TIMESTAMPTZ,
        last_topup_amount     NUMERIC(14,4),
        status                TEXT NOT NULL DEFAULT 'active',
        updated_at            TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Postpaid billing
    await client.query(`
      CREATE TABLE IF NOT EXISTS postpaid_accounts (
        user_id               TEXT PRIMARY KEY REFERENCES user_accounts(user_id),
        billing_cycle         TEXT NOT NULL DEFAULT 'monthly',
        cycle_start           DATE NOT NULL DEFAULT CURRENT_DATE,
        credit_limit_usd      NUMERIC(14,4) NOT NULL DEFAULT 200.00,
        accrued_usd           NUMERIC(14,4) NOT NULL DEFAULT 0,
        next_bill_date        DATE,
        payment_status        TEXT NOT NULL DEFAULT 'current',
        auto_pay_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at            TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Notifications log
    await client.query(`
      CREATE TABLE IF NOT EXISTS billing_notifications (
        id            BIGSERIAL PRIMARY KEY,
        user_id       TEXT NOT NULL,
        type          TEXT NOT NULL,
        message       TEXT NOT NULL,
        metadata      JSONB,
        sent_at       TIMESTAMPTZ DEFAULT NOW(),
        read_at       TIMESTAMPTZ
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_billing_notif_user ON billing_notifications(user_id, sent_at DESC)`);

    await client.query(`
      INSERT INTO provider_config (provider_id, display_name, base_url, deprecation_url)
      VALUES
        ('openai',    'OpenAI',      'https://api.openai.com/v1',                          'https://platform.openai.com/docs/deprecations'),
        ('anthropic', 'Anthropic',   'https://api.anthropic.com/v1',                       'https://www.anthropic.com/news'),
        ('google',    'Google',      'https://generativelanguage.googleapis.com/v1',    'https://ai.google.dev/gemini-api/docs/changelog'),
        ('mistral',   'Mistral',     'https://api.mistral.ai/v1',                           'https://mistral.ai/news'),
        ('cohere',    'Cohere',      'https://api.cohere.ai/v1',                            NULL),
        ('groq',      'Groq',        'https://api.groq.com/openai/v1',                      NULL),
        ('together',  'Together AI', 'https://api.together.xyz/v1',                         NULL)
      ON CONFLICT (provider_id) DO NOTHING
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS credential_metadata (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        key_name VARCHAR(255) NOT NULL,
        provider VARCHAR(100),
        status VARCHAR(20) NOT NULL DEFAULT 'connected',
        created_at TIMESTAMPTZ DEFAULT now(),
        last_accessed_at TIMESTAMPTZ,
        UNIQUE(user_id, key_name)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_credential_metadata_user_id
      ON credential_metadata(user_id)
    `);

    await client.query('COMMIT');
    console.log('[db] Schema ensured: model_snapshots, model_changelog, model_registry, credential_metadata');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[db] Failed to ensure schema:', err);
    throw err;
  } finally {
    client.release();
  }
}