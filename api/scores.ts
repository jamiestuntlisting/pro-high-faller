import { Redis } from '@upstash/redis';
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

// Try multiple env var naming conventions (Vercel KV vs Upstash direct)
const url =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  process.env.REDIS_URL ||
  '';
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  process.env.REDIS_TOKEN ||
  '';

function getRedis(): Redis | null {
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers for potential mobile app access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const redis = getRedis();
  if (!redis) {
    // List which env vars we can see (names only, not values) for debugging
    const found = [
      'UPSTASH_REDIS_REST_URL',
      'KV_REST_API_URL',
      'REDIS_URL',
      'UPSTASH_REDIS_REST_TOKEN',
      'KV_REST_API_TOKEN',
      'REDIS_TOKEN',
    ].filter(k => !!process.env[k]);
    return res.status(500).json({
      error: 'Redis not configured',
      hint: 'Need UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_URL + KV_REST_API_TOKEN)',
      envVarsFound: found,
    });
  }

  try {
    if (req.method === 'GET') {
      const scores: HighScore[] = (await redis.get<HighScore[]>(SCORES_KEY)) || [];
      return res.status(200).json(scores);
    }

    if (req.method === 'POST') {
      const { name, reputation, earnings, highestLevel } = req.body;

      // Validate
      if (!name || typeof reputation !== 'number') {
        return res.status(400).json({ error: 'Invalid score data' });
      }

      // Sanitize name to 3 chars
      const safeName = String(name).slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '_');

      const newScore: HighScore = {
        name: safeName,
        reputation: Math.round(reputation),
        earnings: Math.round(earnings || 0),
        highestLevel: Math.round(highestLevel || 1),
        date: new Date().toISOString().slice(0, 10),
      };

      // Get existing scores, add new, sort, keep top N
      const existing: HighScore[] = (await redis.get<HighScore[]>(SCORES_KEY)) || [];
      existing.push(newScore);
      existing.sort((a, b) => b.reputation - a.reputation);
      const top = existing.slice(0, MAX_SCORES);

      await redis.set(SCORES_KEY, top);
      return res.status(200).json(top);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Scores API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
