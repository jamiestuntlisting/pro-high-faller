import type { VercelRequest, VercelResponse } from '@vercel/node';
import Redis from 'ioredis';

const SCORES_KEY = 'highscores';
const MAX_SCORES = 10;

interface HighScore {
  name: string;
  reputation: number;
  earnings: number;
  highestLevel: number;
  date: string;
}

// Support multiple env var naming conventions
const REDIS_URL =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_URL ||
  process.env.REDIS_URL ||
  '';

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!REDIS_URL) return null;
  if (!redis) {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: true,
    });
  }
  return redis;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const client = getRedis();
  if (!client) {
    return res.status(500).json({
      error: 'Redis not configured',
      hint: 'Need REDIS_URL or UPSTASH_REDIS_REST_URL env var with redis:// connection string',
    });
  }

  try {
    await client.connect();
  } catch {
    // already connected — ioredis handles this
  }

  try {
    if (req.method === 'GET') {
      const raw = await client.get(SCORES_KEY);
      const scores: HighScore[] = raw ? JSON.parse(raw) : [];
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

      const raw = await client.get(SCORES_KEY);
      const existing: HighScore[] = raw ? JSON.parse(raw) : [];
      existing.push(newScore);
      existing.sort((a, b) => b.reputation - a.reputation);
      const top = existing.slice(0, MAX_SCORES);

      await client.set(SCORES_KEY, JSON.stringify(top));
      return res.status(200).json(top);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Scores API error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Internal server error', detail: msg });
  }
}
