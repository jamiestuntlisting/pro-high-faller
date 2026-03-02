import { useEffect } from 'react';
import type { LandingResult as LandingResultType } from '../types';

interface Props {
  result: LandingResultType;
  careerEarnings: number;
  careerCredibility: number;
  careerHealth: number;
  onNextLevel: () => void;
  onRetry: () => void;
  onShop: (fromPass: boolean) => void;
}

export function LandingResult({
  result,
  careerEarnings,
  careerCredibility,
  careerHealth,
  onNextLevel,
  onRetry,
  onShop,
}: Props) {
  const passed = result.grade !== 'F' && result.grade !== 'D';
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

  return (
    <div style={styles.container}>
      <div style={{ ...styles.panel, borderColor: passed ? '#55aa55' : '#aa4444' }}>
        <h2 style={{ ...styles.grade, color: gradeColor(result.grade) }}>
          {result.grade}
        </h2>

        <div style={styles.description}>{result.injuryDescription}</div>

        {!passed && (
          <div style={styles.failMessage}>
            Tough break (pun intended). Think you can do another one?
          </div>
        )}

        <div style={styles.stats}>
          <div style={styles.row}>
            <span style={styles.statLabel}>INJURY</span>
            <span style={{ color: result.injuryPoints > 20 ? '#aa4444' : result.injuryPoints > 0 ? '#aaaa44' : '#55aa55' }}>
              -{result.injuryPoints}
            </span>
          </div>
          <div style={styles.row}>
            <span style={styles.statLabel}>PAY</span>
            <span style={{ color: result.pay > 0 ? '#FFD700' : '#666' }}>
              ${result.pay.toLocaleString()}
            </span>
          </div>
          <div style={styles.row}>
            <span style={styles.statLabel}>REPUTATION</span>
            <span style={{ color: result.credibilityPoints > 0 ? '#55aa55' : result.credibilityPoints < 0 ? '#aa4444' : '#666' }}>
              {result.credibilityPoints > 0 ? '+' : ''}{result.credibilityPoints}
            </span>
          </div>
        </div>

        <div style={styles.careerSection}>
          <div style={styles.careerRow}>
            <span style={styles.careerLabel}>Total Earnings:</span>
            <span style={{ color: '#FFD700' }}>${careerEarnings.toLocaleString()}</span>
          </div>
          <div style={styles.careerRow}>
            <span style={styles.careerLabel}>Reputation:</span>
            <span style={{ color: '#88CCFF' }}>{careerCredibility}</span>
          </div>
          <div style={styles.careerRow}>
            <span style={styles.careerLabel}>Health:</span>
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
    fontSize: '32px',
    margin: '0 0 8px 0',
    fontFamily: mono,
  },
  description: {
    fontSize: '10px',
    color: '#999999',
    marginBottom: '12px',
    lineHeight: '1.6',
  },
  failMessage: {
    fontSize: '10px',
    color: '#aa6644',
    marginBottom: '12px',
    fontStyle: 'italic',
    lineHeight: '1.6',
  },
  stats: {
    textAlign: 'left',
    fontSize: '10px',
    marginBottom: '12px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    borderBottom: '1px solid #222',
  },
  statLabel: {
    color: '#888',
    letterSpacing: '1px',
  },
  careerSection: {
    borderTop: '1px solid #333',
    paddingTop: '10px',
    marginBottom: '16px',
    fontSize: '9px',
  },
  careerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '3px 0',
  },
  careerLabel: {
    color: '#555',
  },
  buttons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
  },
  button: {
    fontFamily: mono,
    fontSize: '10px',
    padding: '8px 14px',
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
