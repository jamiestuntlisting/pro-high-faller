import type { VercelRequest, VercelResponse } from '@vercel/node';

const SCORES_KEY = 'highscores';
const MAX_SCORES = 10;

interface HighScore {
  name: string;
  reputation: number;
  earnings: number;
  highestLevel: number;
  date: string;
}

// Try REST API env vars first (Upstash REST), then fall back to Redis URL
const REST_URL =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  process.env.KV_URL ||
  '';
const REST_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  '';

// If we got a redis:// URL instead of https:// REST URL, extract the password
// redis://default:PASSWORD@host:port → https://host REST URL with PASSWORD as token
let resolvedUrl = REST_URL;
let resolvedToken = REST_TOKEN;

if (REST_URL.startsWith('redis://') || REST_URL.startsWith('rediss://')) {
  try {
    const parsed = new URL(REST_URL);
    // Upstash REST endpoint is at the same host but on HTTPS port 443
    resolvedUrl = `https://${parsed.hostname}`;
    resolvedToken = REST_TOKEN || parsed.password || '';
  } catch {
    // leave as-is
  }
}

async function redisGet(key: string): Promise<HighScore[] | null> {
  if (!resolvedUrl || !resolvedToken) return null;
  const res = await fetch(`${resolvedUrl}/get/${key}`, {
    headers: { Authorization: `Bearer ${resolvedToken}` },
  });
  const data = await res.json();
  if (!data.result) return null;
  return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
}

async function redisSet(key: string, value: HighScore[]): Promise<void> {
  if (!resolvedUrl || !resolvedToken) return;
  await fetch(`${resolvedUrl}/set/${key}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resolvedToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(JSON.stringify(value)),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!resolvedUrl || !resolvedToken) {
    return res.status(500).json({
      error: 'Redis not configured',
      hint: 'Need UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN env vars',
    });
  }

  // Temporary debug: ?debug=1 to see resolved config (no secrets)
  if (req.query.debug === '1') {
    return res.status(200).json({
      resolvedUrl: resolvedUrl ? resolvedUrl.replace(/\/\/.*@/, '//***@') : '(empty)',
      hasToken: !!resolvedToken,
      tokenLength: resolvedToken.length,
      rawUrlPrefix: REST_URL.slice(0, 15) + '...',
      envKeys: Object.keys(process.env).filter(k =>
        k.includes('REDIS') || k.includes('KV') || k.includes('UPSTASH')
      ),
    });
  }

  try {
    if (req.method === 'GET') {
      const scores = (await redisGet(SCORES_KEY)) || [];
      return res.status(200).json(scores);
    }

    if (req.method === 'POST') {
      const { name, reputation, earnings, highestLevel } = req.body;

      if (!name || typeof reputation !== 'number') {
        return res.status(400).json({ error: 'Invalid score data' });
      }

      const safeName = String(name).slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '_');

      const newScore: HighScore = {
        name: safeName,
        reputation: Math.round(reputation),
        earnings: Math.round(earnings || 0),
        highestLevel: Math.round(highestLevel || 1),
        date: new Date().toISOString().slice(0, 10),
      };

      const existing = (await redisGet(SCORES_KEY)) || [];
      existing.push(newScore);
      existing.sort((a, b) => b.reputation - a.reputation);
      const top = existing.slice(0, MAX_SCORES);

      await redisSet(SCORES_KEY, top);
      return res.status(200).json(top);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Scores API error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Internal server error', detail: msg });
  }
}
