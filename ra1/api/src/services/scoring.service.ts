import { Pool } from 'pg';

export interface ModelScore {
  modelId: string;
  providerId: string;
  reliabilityScore: number;
  latencyScore: number;
  costScore: number;
  compositeScore: number;
  sampleSize: number;
}

const WEIGHTS = { reliability: 0.5, latency: 0.3, cost: 0.2 };

export async function computeModelScores(pool: Pool): Promise<ModelScore[]> {
  const result = await pool.query(`
    SELECT
      ul.model_id,
      ul.provider_id,
      COUNT(*) AS total_calls,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success_calls,
      AVG(latency_ms) FILTER (WHERE latency_ms IS NOT NULL) AS avg_latency_ms,
      AVG(total_cost_usd) FILTER (WHERE total_cost_usd > 0) AS avg_cost
    FROM usage_log ul
    JOIN model_registry mr ON mr.model_id = ul.model_id AND mr.provider_id = ul.provider_id
    WHERE ul.created_at > NOW() - INTERVAL '7 days'
      AND mr.status = 'active'
    GROUP BY ul.model_id, ul.provider_id
    HAVING COUNT(*) >= 3
  `);

  if (result.rows.length === 0) return [];

  const rows = result.rows;
  const maxLatency = Math.max(...rows.map((r: any) => parseFloat(r.avg_latency_ms) || 5000));
  const maxCost = Math.max(...rows.map((r: any) => parseFloat(r.avg_cost) || 0.01));

  return rows.map((r: any) => {
    const reliability = parseInt(r.success_calls) / parseInt(r.total_calls);
    const latency = maxLatency > 0 ? 1 - (parseFloat(r.avg_latency_ms) || 0) / maxLatency : 1;
    const cost = maxCost > 0 ? 1 - (parseFloat(r.avg_cost) || 0) / maxCost : 1;

    const composite =
      reliability * WEIGHTS.reliability +
      latency * WEIGHTS.latency +
      cost * WEIGHTS.cost;

    return {
      modelId: r.model_id,
      providerId: r.provider_id,
      reliabilityScore: Math.round(reliability * 1000) / 1000,
      latencyScore: Math.round(latency * 1000) / 1000,
      costScore: Math.round(cost * 1000) / 1000,
      compositeScore: Math.round(composite * 1000) / 1000,
      sampleSize: parseInt(r.total_calls),
    };
  }).sort((a, b) => b.compositeScore - a.compositeScore);
}

let _scoreCache: ModelScore[] = [];
let _scoreCacheAt = 0;

export async function getCachedScores(pool: Pool): Promise<ModelScore[]> {
  if (Date.now() - _scoreCacheAt > 5 * 60 * 1000) {
    _scoreCache = await computeModelScores(pool);
    _scoreCacheAt = Date.now();
  }
  return _scoreCache;
}