import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

export function createBillingGuard(pool: Pool) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.headers['x-user-id'] as string) || 'anonymous';
    const byokKey = req.headers['x-byok-provider'] as string | undefined;

    if (byokKey) {
      (req as any).body._byokProvider = byokKey;
      return next();
    }

    try {
      const accountResult = await pool.query(
        'SELECT account_type FROM user_accounts WHERE user_id = $1',
        [userId]
      );

      const accountType = accountResult.rows[0]?.account_type || 'free';

      if (accountType === 'free') {
        const quotaResult = await pool.query(
          'SELECT * FROM free_quotas WHERE user_id = $1',
          [userId]
        );
        const quota = quotaResult.rows[0];

        if (!quota) return next();

        if (new Date(quota.quota_resets_at) < new Date()) {
          await pool.query(
            `UPDATE free_quotas SET tokens_used_today = 0, requests_used_today = 0,
             quota_resets_at = NOW() + INTERVAL '1 day', last_reset_at = NOW()
             WHERE user_id = $1`,
            [userId]
          );
          return next();
        }

        if (quota.requests_used_today >= quota.requests_limit_daily) {
          const resetsIn = Math.ceil((new Date(quota.quota_resets_at).getTime() - Date.now()) / 3600000);
          return res.status(429).json({
            error: 'Daily request limit reached',
            accountType: 'free',
            resetsInHours: resetsIn,
            upgradeUrl: '/billing/upgrade',
          });
        }

        if (quota.tokens_used_today >= quota.tokens_limit_daily) {
          const resetsIn = Math.ceil((new Date(quota.quota_resets_at).getTime() - Date.now()) / 3600000);
          return res.status(429).json({
            error: 'Daily token limit reached',
            accountType: 'free',
            resetsInHours: resetsIn,
            upgradeUrl: '/billing/upgrade',
          });
        }
      }

      if (accountType === 'prepaid') {
        const walletResult = await pool.query(
          'SELECT balance_usd FROM wallets WHERE user_id = $1',
          [userId]
        );
        const wallet = walletResult.rows[0];
        if (wallet && parseFloat(wallet.balance_usd) <= 0) {
          return res.status(402).json({
            error: 'Wallet empty',
            accountType: 'prepaid',
            action: 'top_up',
            topUpUrl: '/billing/wallet/topup',
          });
        }
      }

      if (accountType === 'postpaid') {
        const ppResult = await pool.query(
          'SELECT accrued_usd, credit_limit_usd FROM postpaid_accounts WHERE user_id = $1',
          [userId]
        );
        const pp = ppResult.rows[0];
        if (pp && parseFloat(pp.accrued_usd) >= parseFloat(pp.credit_limit_usd)) {
          return res.status(402).json({
            error: 'Credit limit reached',
            accountType: 'postpaid',
            accrued: pp.accrued_usd,
            limit: pp.credit_limit_usd,
            action: 'pay_now',
            payUrl: '/billing/invoice',
          });
        }
      }

      (req as any).body._userId = userId;
      (req as any).body._accountType = accountType;
      next();
    } catch {
      next();
    }
  };
}