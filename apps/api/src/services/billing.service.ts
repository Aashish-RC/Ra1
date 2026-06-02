import { Pool } from 'pg';

export async function writeUsageToBilling(
  pool: Pool,
  userId: string,
  accountType: string,
  inputTokens: number,
  outputTokens: number,
  costUsd: number,
): Promise<void> {
  if (accountType === 'free') {
    await pool.query(
      `UPDATE free_quotas
       SET tokens_used_today = tokens_used_today + $2,
           requests_used_today = requests_used_today + 1
       WHERE user_id = $1`,
      [userId, inputTokens + outputTokens]
    ).catch(() => {});
  }

  if (accountType === 'prepaid') {
    await pool.query(
      `UPDATE wallets SET balance_usd = balance_usd - $2, updated_at = NOW()
       WHERE user_id = $1`,
      [userId, costUsd]
    ).catch(() => {});
    checkWalletThreshold(pool, userId).catch(() => {});
  }

  if (accountType === 'postpaid') {
    await pool.query(
      `UPDATE postpaid_accounts SET accrued_usd = accrued_usd + $2, updated_at = NOW()
       WHERE user_id = $1`,
      [userId, costUsd]
    ).catch(() => {});
    checkCreditLimitThreshold(pool, userId).catch(() => {});
  }
}

async function checkWalletThreshold(pool: Pool, userId: string): Promise<void> {
  const r = await pool.query('SELECT balance_usd, auto_topup_threshold FROM wallets WHERE user_id = $1', [userId]);
  const w = r.rows[0];
  if (!w) return;
  if (parseFloat(w.balance_usd) < parseFloat(w.auto_topup_threshold)) {
    await pool.query(
      `INSERT INTO billing_notifications (user_id, type, message, metadata)
       VALUES ($1, 'wallet_low', 'Your wallet balance is low', $2)`,
      [userId, JSON.stringify({ balance: w.balance_usd, threshold: w.auto_topup_threshold })]
    );
  }
}

async function checkCreditLimitThreshold(pool: Pool, userId: string): Promise<void> {
  const r = await pool.query('SELECT accrued_usd, credit_limit_usd FROM postpaid_accounts WHERE user_id = $1', [userId]);
  const pp = r.rows[0];
  if (!pp) return;
  const pct = parseFloat(pp.accrued_usd) / parseFloat(pp.credit_limit_usd);
  let type = '';
  if (pct >= 0.95) type = 'credit_limit_critical';
  else if (pct >= 0.80) type = 'credit_limit_warning';
  if (!type) return;

  const exists = await pool.query(
    `SELECT id FROM billing_notifications WHERE user_id = $1 AND type = $2 AND sent_at > NOW() - INTERVAL '24 hours'`,
    [userId, type]
  );
  if (exists.rows.length > 0) return;

  await pool.query(
    `INSERT INTO billing_notifications (user_id, type, message, metadata)
     VALUES ($1, $2, $3, $4)`,
    [userId, type, `Credit limit ${Math.round(pct * 100)}% used`, JSON.stringify({ accrued: pp.accrued_usd, limit: pp.credit_limit_usd })]
  );
}