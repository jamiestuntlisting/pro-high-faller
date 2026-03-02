import { useEffect, useState } from 'react';
import type { LevelConfig } from '../types';
import { getHighScores, type HighScore } from '../utils/highScores';
import { HighScoreTable } from './RetirementScreen';

interface Props {
  level: LevelConfig;
  careerHealth: number;
  careerEarnings: number;
  careerCredibility: number;
  jobsCompleted: number;
  onStart: () => void;
}

export function StartScreen({
  level,
  careerHealth,
  careerEarnings,
  careerCredibility,
  jobsCompleted,
  onStart,
}: Props) {
  const [scores] = useState<HighScore[]>(getHighScores);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); onStart(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onStart]);

  const handleTap = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'A') return;
    onStart();
  };

  return (
    <div style={styles.container} onClick={handleTap}>
      <h1 style={styles.title}>STUNTLISTING'S</h1>
      <h2 style={styles.subtitle}>PRO STUNT HIGH FALLER</h2>

      <div style={styles.briefing}>
        <div style={styles.jobHeader}>
          <span style={styles.levelBadge}>JOB #{level.level}</span>
          <span style={styles.production}>"{level.production}"</span>
        </div>

        <div style={styles.coordinator}>
          <div style={styles.coordLabel}>STUNT COORDINATOR:</div>
          <div style={styles.dialogue}>"{level.coordinatorLine}"</div>
        </div>

        <div style={styles.jobDetails}>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>HEIGHT:</span>
            <span>{level.height} ft</span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>LANDING:</span>
            <span style={{ textTransform: 'uppercase' }}>{level.targetType}</span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>IDEAL:</span>
            <span>{level.idealAngle === 90 ? 'FLAT ON BACK' : 'FEET FIRST'}</span>
          </div>
          {level.wind !== 0 && (
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>WIND:</span>
              <span>{level.wind > 0 ? '→' : '←'} {Math.abs(level.wind)}</span>
            </div>
          )}
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>PAY:</span>
            <span style={{ color: '#FFD700' }}>${level.pay.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Career stats */}
      {jobsCompleted > 0 && (
        <div style={styles.career}>
          <span>Jobs: {jobsCompleted}</span>
          <span>Earnings: ${careerEarnings.toLocaleString()}</span>
          <span>Cred: {careerCredibility}</span>
          <span>Health: {careerHealth}/200</span>
        </div>
      )}

      <button style={styles.startButton} onClick={onStart}>
        LET'S DO IT
      </button>

      {scores.length > 0 && (
        <div style={styles.scoresWrap}>
          <HighScoreTable scores={scores} />
        </div>
      )}

      <div style={styles.controls}>
        <div style={styles.controlLine}>SPACE — lean / jump / tuck</div>
        <div style={styles.controlLine}>Hold SPACE in air to tuck (fast spin)</div>
        <div style={styles.controlLine}>Release SPACE to spread (slow spin)</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#0a0a1a',
    color: '#FFFFFF',
    fontFamily: '"Press Start 2P", "Courier New", monospace',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    textAlign: 'center',
  },
  title: {
    fontSize: '18px',
    color: '#FFD700',
    margin: '0',
    textShadow: '2px 2px 0 #8B6914',
    letterSpacing: '2px',
  },
  subtitle: {
    fontSize: '24px',
    color: '#FFD700',
    margin: '4px 0 24px 0',
    textShadow: '3px 3px 0 #8B6914',
  },
  briefing: {
    background: '#1a1a2e',
    border: '2px solid #333',
    borderRadius: '4px',
    padding: '16px',
    maxWidth: '400px',
    width: '90%',
    marginBottom: '16px',
  },
  jobHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  levelBadge: {
    background: '#FFD700',
    color: '#000',
    padding: '3px 8px',
    fontSize: '10px',
    borderRadius: '2px',
    fontWeight: 'bold',
  },
  production: {
    color: '#88CCFF',
    fontSize: '10px',
  },
  coordinator: {
    borderTop: '1px solid #333',
    paddingTop: '10px',
    marginBottom: '12px',
  },
  coordLabel: {
    fontSize: '7px',
    color: '#888',
    marginBottom: '6px',
  },
  dialogue: {
    fontSize: '9px',
    color: '#CCCCCC',
    lineHeight: '1.6',
    fontStyle: 'italic',
  },
  jobDetails: {
    borderTop: '1px solid #333',
    paddingTop: '10px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '3px 0',
    fontSize: '8px',
  },
  detailLabel: {
    color: '#888',
  },
  career: {
    display: 'flex',
    gap: '16px',
    fontSize: '7px',
    color: '#888',
    marginBottom: '16px',
  },
  startButton: {
    fontFamily: '"Press Start 2P", "Courier New", monospace',
    fontSize: '14px',
    padding: '12px 30px',
    background: '#1a4a1a',
    color: '#44FF44',
    border: '3px solid #44FF44',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '20px',
    transition: 'all 0.1s',
  },
  controls: {
    fontSize: '7px',
    color: '#666',
    lineHeight: '2',
  },
  controlLine: {},
  scoresWrap: {
    maxWidth: '400px',
    width: '90%',
    marginBottom: '16px',
  },
};
