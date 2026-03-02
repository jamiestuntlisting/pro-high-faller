const STORAGE_KEY = 'prohighfaller_scores';
const MAX_SCORES = 10;

export interface HighScore {
  name: string;       // 3-letter initials
  reputation: number; // Peak career reputation
  earnings: number;   // Career total earnings
  jobsCompleted: number;
  date: string;       // ISO date string
}

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

export function saveHighScore(score: Omit<HighScore, 'date'>): void {
  const scores = getHighScores();
  scores.push({ ...score, date: new Date().toISOString().slice(0, 10) });
  scores.sort((a, b) => b.reputation - a.reputation);
  const top = scores.slice(0, MAX_SCORES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(top));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

export function isHighScore(reputation: number): boolean {
  if (reputation <= 0) return false;
  const scores = getHighScores();
  if (scores.length < MAX_SCORES) return true;
  return reputation > scores[scores.length - 1].reputation;
}
