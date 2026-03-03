import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

const SCORES_KEY = 'prohighfaller:scores';
const MAX_SCORES = 10;

interface HighScore {
  name: string;
  reputation: number;
  earnings: number;
  jobsCompleted: number;
  date: string;
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const redis = getRedis();
  if (!redis) {
    return res.status(503).json({ error: 'Redis not configured' });
  }

  try {
    if (req.method === 'GET') {
      const scores = await redis.get<HighScore[]>(SCORES_KEY) || [];
      return res.status(200).json(scores);
    }

    if (req.method === 'POST') {
      const { name, reputation, earnings, jobsCompleted } = req.body as HighScore;
      if (!name || typeof reputation !== 'number') {
        return res.status(400).json({ error: 'Invalid score data' });
      }

      const scores = await redis.get<HighScore[]>(SCORES_KEY) || [];
      scores.push({
        name: String(name).slice(0, 3).toUpperCase(),
        reputation,
        earnings: earnings || 0,
        jobsCompleted: jobsCompleted || 0,
        date: new Date().toISOString().slice(0, 10),
      });
      scores.sort((a, b) => b.reputation - a.reputation);
      const top = scores.slice(0, MAX_SCORES);
      await redis.set(SCORES_KEY, top);
      return res.status(200).json(top);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Scores API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
