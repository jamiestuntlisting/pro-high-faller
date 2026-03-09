import { useEffect } from 'react';
import type { LandingResult as LandingResultType } from '../types';

interface Props {
  result: LandingResultType;
  careerCredibility: number;
  careerHealth: number;
  onNextLevel: () => void;
  onRetry: () => void;
  onShop: (fromPass: boolean) => void;
}

export function LandingResult({
  result,
  careerCredibility,
  careerHealth,
  onNextLevel,
  onRetry,
  onShop,
}: Props) {
  const passed = result.grade !== 'F';
  const showShop = careerHealth < 120 && careerHealth > 0;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        passed ? onNextLevel() : onRetry();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [passed, onNextLevel, onRetry]);

  const handleTap = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON') return;
    passed ? onNextLevel() : onRetry();
  };

  return (
    <div style={styles.container} onClick={handleTap}>
      <div style={{ ...styles.panel, borderColor: passed ? '#55aa55' : '#aa4444' }}>
        <h2 style={{ ...styles.grade, color: gradeColor(result.grade) }}>
          {result.grade}
        </h2>

        <div style={styles.stats}>
          <div style={styles.row}>
            <span style={styles.statLabel}>PAY</span>
            <span style={{ color: result.pay > 0 ? '#FFD700' : '#666' }}>
              ${result.pay.toLocaleString()}
            </span>
          </div>
          <div style={styles.row}>
            <span style={styles.statLabel}>REPUTATION</span>
            <span style={{ color: '#88CCFF' }}>{careerCredibility}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.statLabel}>HEALTH</span>
            <span style={{ color: careerHealth <= 40 ? '#aa4444' : careerHealth <= 100 ? '#aaaa44' : '#55aa55' }}>
              {careerHealth}/200
            </span>
          </div>
        </div>

        <div style={styles.buttons}>
          {!passed && (
            <button style={styles.button} onClick={onRetry}>
              TRY AGAIN
            </button>
          )}
          {showShop && (
            <button style={{ ...styles.button, ...styles.shopButton }} onClick={() => onShop(passed)}>
              SHOP
            </button>
          )}
          {passed && (
            <button style={{ ...styles.button, ...styles.nextButton }} onClick={onNextLevel}>
              NEXT JOB →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A+': return '#FFD700';
    case 'A': return '#55aa55';
    case 'B': return '#77aa55';
    case 'C': return '#aaaa44';
    case 'D': return '#aa7744';
    case 'F': return '#aa4444';
    default: return '#cccccc';
  }
}

const mono = '"Courier New", "Consolas", monospace';

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.8)',
    fontFamily: mono,
    color: '#cccccc',
    zIndex: 10,
  },
  panel: {
    background: '#111111',
    border: '2px solid',
    padding: '20px',
    maxWidth: '320px',
    width: '90%',
    textAlign: 'center',
  },
  grade: {
    fontSize: '42px',
    margin: '0 0 16px 0',
    fontFamily: mono,
  },
  stats: {
    textAlign: 'left',
    fontSize: '16px',
    marginBottom: '20px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #222',
  },
  statLabel: {
    color: '#888',
    letterSpacing: '2px',
  },
  buttons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
  },
  button: {
    fontFamily: mono,
    fontSize: '14px',
    padding: '12px 20px',
    background: '#222',
    color: '#cccccc',
    border: '1px solid #444',
    cursor: 'pointer',
  },
  shopButton: {
    background: '#1a2a1a',
    borderColor: '#44aa44',
    color: '#44aa44',
  },
  nextButton: {
    background: '#1a2a1a',
    borderColor: '#55aa55',
    color: '#55aa55',
  },
};
