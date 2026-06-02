import { Pool } from 'pg';

const HF_API = 'https://huggingface.co/api/models';

interface HFModel {
  id: string;
  modelId: string;
  downloads?: number;
  pipeline_tag?: string;
}

async function fetchHFTrending(): Promise<HFModel[]> {
  const url = `${HF_API}?pipeline_tag=text-generation&inference=warm&sort=trending&limit=20`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HF API returned ${res.status}`);
  return res.json() as Promise<HFModel[]>;
}

export async function runHFSync(pool: Pool): Promise<void> {
  console.log('[hfSync] starting HuggingFace trending sync');
  let models: HFModel[];
  try {
    models = await fetchHFTrending();
  } catch (err: any) {
    console.error('[hfSync] fetch failed:', err.message);
    return;
  }

  for (const m of models) {
    const modelId = m.id || m.modelId;
    if (!modelId) continue;
    await pool.query(
      `INSERT INTO model_registry (model_id, provider_id, display_name, status, last_seen_at, first_seen_at, updated_at)
       VALUES ($1, 'huggingface', $1, 'active', NOW(), NOW(), NOW())
       ON CONFLICT (model_id, provider_id) DO UPDATE
         SET last_seen_at = NOW(), status = 'active', updated_at = NOW()`,
      [modelId]
    ).catch(() => {});

    // Write to changelog if new
    const exists = await pool.query(
      `SELECT id FROM model_changelog WHERE provider_id = 'huggingface' AND model_id = $1 LIMIT 1`,
      [modelId]
    ).catch(() => ({ rows: [] }));
    if (exists.rows.length === 0) {
      await pool.query(
        `INSERT INTO model_changelog (provider_id, change_type, model_id, model_name)
         VALUES ('huggingface', 'added', $1, $1)`,
        [modelId]
      ).catch(() => {});
    }
  }

  console.log(`[hfSync] synced ${models.length} HF trending models`);
}

export function startHFSync(pool: Pool): void {
  // Run immediately on boot
  runHFSync(pool).catch(err => console.error('[hfSync] initial run failed:', err));
  // Then weekly
  const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
  setInterval(() => {
    runHFSync(pool).catch(err => console.error('[hfSync] scheduled run failed:', err));
  }, ONE_WEEK);
}