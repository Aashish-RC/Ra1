import { Pool } from 'pg';
import { webcrypto } from 'node:crypto';

interface WatchTarget {
  providerId: string;
  url: string;
}

const WATCH_TARGETS: WatchTarget[] = [
  { providerId: 'openai',    url: 'https://platform.openai.com/docs/deprecations' },
  { providerId: 'anthropic', url: 'https://www.anthropic.com/news' },
  { providerId: 'mistral',   url: 'https://mistral.ai/news' },
  { providerId: 'google',    url: 'https://ai.google.dev/gemini-api/docs/changelog' },
];

// Keywords that suggest a new model announcement
const ANNOUNCEMENT_KEYWORDS = [
  'introducing', 'now available', 'new model', 'released', 'launching', 'announcing'
];

// Cache of last-seen content hashes to detect changes
const _lastHashes: Record<string, string> = {};

async function hashContent(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.slice(0, 5000)); // hash first 5k chars
  const hashBuffer = await webcrypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkTarget(pool: Pool, target: WatchTarget): Promise<void> {
  let text: string;
  try {
    const res = await fetch(target.url, {
      headers: { 'User-Agent': 'RA1-ChangelogWatcher/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return;
    text = await res.text();
  } catch {
    return;
  }

  const hash = await hashContent(text);
  const lastHash = _lastHashes[target.providerId];
  _lastHashes[target.providerId] = hash;

  // First run — just record hash, don't flag as changed
  if (!lastHash) return;
  if (hash === lastHash) return;

  // Content changed — check for announcement keywords
  const lower = text.toLowerCase();
  const hasAnnouncement = ANNOUNCEMENT_KEYWORDS.some(kw => lower.includes(kw));
  if (!hasAnnouncement) return;

  // Write a changelog entry to alert the admin
  await pool.query(
    `INSERT INTO model_changelog (provider_id, change_type, model_id, model_name, detail)
     VALUES ($1, 'added', 'changelog-update', 'Changelog page changed', $2)`,
    [target.providerId, `Potential new model announcement detected at ${target.url}`]
  ).catch(() => {});

  console.log(`[changelogWatcher] ${target.providerId}: page changed, possible new model`);
}

export async function runChangelogWatcher(pool: Pool): Promise<void> {
  console.log('[changelogWatcher] checking provider changelog pages');
  for (const target of WATCH_TARGETS) {
    await checkTarget(pool, target).catch(() => {});
  }
}

export function startChangelogWatcher(pool: Pool): void {
  runChangelogWatcher(pool).catch(() => {});
  const ONE_DAY = 24 * 60 * 60 * 1000;
  setInterval(() => {
    runChangelogWatcher(pool).catch(() => {});
  }, ONE_DAY);
}