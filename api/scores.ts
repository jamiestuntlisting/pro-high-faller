import { kv } from '@vercel/kv';
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers for potential mobile app access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const scores: HighScore[] = (await kv.get<HighScore[]>(SCORES_KEY)) || [];
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
      const existing: HighScore[] = (await kv.get<HighScore[]>(SCORES_KEY)) || [];
      existing.push(newScore);
      existing.sort((a, b) => b.reputation - a.reputation);
      const top = existing.slice(0, MAX_SCORES);

      await kv.set(SCORES_KEY, top);
      return res.status(200).json(top);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Scores API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
