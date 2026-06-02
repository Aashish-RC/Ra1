import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/postgres";

export const billingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/billing/account/:userId", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.params as { userId: string };
      const [account, quota, wallet, postpaid] = await Promise.all([
        pool.query("SELECT * FROM user_accounts WHERE user_id = $1", [userId]),
        pool.query("SELECT * FROM free_quotas WHERE user_id = $1", [userId]),
        pool.query("SELECT balance_usd, status, auto_topup_enabled, auto_topup_threshold FROM wallets WHERE user_id = $1", [userId]),
        pool.query("SELECT accrued_usd, credit_limit_usd, next_bill_date, payment_status FROM postpaid_accounts WHERE user_id = $1", [userId]),
      ]);
      return {
        account: account.rows[0] || null,
        quota: quota.rows[0] || null,
        wallet: wallet.rows[0] || null,
        postpaid: postpaid.rows[0] || null,
      };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.get("/billing/usage/:userId", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.params as { userId: string };
      const result = await pool.query(`
        SELECT model_id, provider_id,
          COUNT(*) AS calls,
          SUM(input_tokens + output_tokens) AS total_tokens,
          SUM(total_cost_usd)::numeric(14,6) AS total_cost,
          ROUND(AVG(latency_ms)::numeric, 0) AS avg_latency_ms,
          ROUND(100.0 * SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) / COUNT(*), 1) AS success_rate
        FROM usage_log
        WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY model_id, provider_id
        ORDER BY calls DESC
      `, [userId]);
      return { usage: result.rows };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.get("/billing/notifications/:userId", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.params as { userId: string };
      const result = await pool.query(
        "SELECT * FROM billing_notifications WHERE user_id = $1 ORDER BY sent_at DESC LIMIT 50",
        [userId]
      );
      return { notifications: result.rows };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.post("/billing/wallet/topup", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId, amountUsd } = request.body as { userId: string; amountUsd: number };
      if (!userId || !amountUsd) {
        return reply.status(400).send({ error: "userId and amountUsd required" });
      }
      await pool.query(
        "UPDATE wallets SET balance_usd = balance_usd + $2, last_topup_at = NOW(), last_topup_amount = $2, updated_at = NOW() WHERE user_id = $1",
        [userId, amountUsd]
      );
      const r = await pool.query("SELECT balance_usd FROM wallets WHERE user_id = $1", [userId]);
      return { success: true, newBalance: r.rows[0]?.balance_usd };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
};