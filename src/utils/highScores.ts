const STORAGE_KEY = 'prohighfaller_scores';
const MAX_SCORES = 10;
const API_URL = '/api/scores';

export interface HighScore {
  name: string;       // 3-letter initials
  reputation: number; // Peak career reputation
  earnings: number;   // Career total earnings
  jobsCompleted: number;
  date: string;       // ISO date string
}

/** Synchronous read from localStorage cache (for immediate render). */
export function getHighScores(): HighScore[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const scores: HighScore[] = JSON.parse(raw);
    // Migration: clear scores from before reputation field was added
    if (scores.length > 0 && scores.some(s => typeof s.reputation !== 'number')) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    return scores.sort((a, b) => b.reputation - a.reputation).slice(0, MAX_SCORES);
  } catch {
    return [];
  }
}

/** Async fetch from server. Updates localStorage cache. Returns fresh scores. */
export async function fetchHighScores(): Promise<HighScore[]> {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const scores: HighScore[] = await res.json();
    const sorted = scores.sort((a, b) => b.reputation - a.reputation).slice(0, MAX_SCORES);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted)); } catch { /* ignore */ }
    return sorted;
  } catch {
    // API unavailable — fall back to localStorage
    return getHighScores();
  }
}

/** Save a score to the server (and localStorage as fallback). */
export async function saveHighScore(score: Omit<HighScore, 'date'>): Promise<HighScore[]> {
  // Always save to localStorage as backup
  const local = getHighScores();
  local.push({ ...score, date: new Date().toISOString().slice(0, 10) });
  local.sort((a, b) => b.reputation - a.reputation);
  const topLocal = local.slice(0, MAX_SCORES);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(topLocal)); } catch { /* ignore */ }

  // Try to save to server
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(score),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const serverScores: HighScore[] = await res.json();
    const sorted = serverScores.sort((a, b) => b.reputation - a.reputation).slice(0, MAX_SCORES);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted)); } catch { /* ignore */ }
    return sorted;
  } catch {
    return topLocal;
  }
}

export function isHighScore(reputation: number): boolean {
  if (reputation <= 0) return false;
  const scores = getHighScores();
  if (scores.length < MAX_SCORES) return true;
  return reputation > scores[scores.length - 1].reputation;
}
