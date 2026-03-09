import { useEffect } from 'react';
import type { LevelConfig } from '../types';

interface Props {
  level: LevelConfig;
  onStart: () => void;
}

export function StartScreen({
  level,
  onStart,
}: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); onStart(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onStart]);

  const handleTap = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON') return;
    onStart();
  };

  return (
    <div style={styles.container} onClick={handleTap}>
      <div style={styles.briefing}>
        <div style={styles.jobHeader}>
          <span style={styles.levelBadge}>JOB #{level.level}</span>
          <span style={styles.production}>"{level.production}"</span>
        </div>

        <div style={styles.coordinator}>
          <div style={styles.dialogue}>"{level.coordinatorLine}"</div>
        </div>

        <div style={styles.jobDetails}>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>HEIGHT:</span>
            <span>{level.height} ft</span>
          </div>
          {level.jumpType && level.jumpType !== 'building' && (
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>JUMP FROM:</span>
              <span style={{ textTransform: 'uppercase' }}>{level.jumpType}</span>
            </div>
          )}
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

      <button style={styles.startButton} onClick={onStart}>
        LET'S DO IT
      </button>
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
  briefing: {
    background: '#1a1a2e',
    border: '2px solid #333',
    borderRadius: '4px',
    padding: '24px',
    maxWidth: '420px',
    width: '90%',
    marginBottom: '24px',
  },
  jobHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  levelBadge: {
    background: '#FFD700',
    color: '#000',
    padding: '5px 12px',
    fontSize: '14px',
    borderRadius: '2px',
    fontWeight: 'bold',
  },
  production: {
    color: '#88CCFF',
    fontSize: '14px',
  },
  coordinator: {
    borderTop: '1px solid #333',
    paddingTop: '14px',
    marginBottom: '16px',
  },
  dialogue: {
    fontSize: '12px',
    color: '#CCCCCC',
    lineHeight: '1.8',
    fontStyle: 'italic',
  },
  jobDetails: {
    borderTop: '1px solid #333',
    paddingTop: '14px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    fontSize: '13px',
  },
  detailLabel: {
    color: '#888',
  },
  startButton: {
    fontFamily: '"Press Start 2P", "Courier New", monospace',
    fontSize: '16px',
    padding: '14px 36px',
    background: '#1a4a1a',
    color: '#44FF44',
    border: '3px solid #44FF44',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.1s',
  },
};
