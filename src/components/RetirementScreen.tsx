import { useEffect, useState } from 'react';
import { getHighScores, saveHighScore, isHighScore, type HighScore } from '../utils/highScores';

interface Props {
  jobsCompleted: number;
  careerEarnings: number;
  careerCredibility: number;
  onRestart: () => void;
}

export function RetirementScreen({ jobsCompleted, careerEarnings, careerCredibility, onRestart }: Props) {
  const [initials, setInitials] = useState('');
  const [saved, setSaved] = useState(false);
  const qualifies = isHighScore(careerCredibility);
  const [scores, setScores] = useState<HighScore[]>(getHighScores);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (saved || !qualifies)) {
        e.preventDefault();
        onRestart();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onRestart, saved, qualifies]);

  const handleSave = () => {
    if (initials.length === 0) return;
    const name = initials.toUpperCase().padEnd(3, ' ').slice(0, 3);
    saveHighScore({ name, reputation: careerCredibility, earnings: careerEarnings, jobsCompleted });
    setSaved(true);
    setScores(getHighScores());
  };

  const handleTap = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT') return;
    if (saved || !qualifies) onRestart();
  };

  return (
    <div style={styles.container} onClick={handleTap}>
      <div style={styles.panel}>
        <h2 style={styles.title}>RETIRED</h2>
        <div style={styles.subtitle}>Your body gave out.</div>
        <div style={styles.flavor}>
          The doc says you've got more metal in you than bone at this point.
          Time to write that memoir.
        </div>

        <div style={styles.summary}>
          <div style={styles.row}>
            <span style={styles.label}>Jobs Completed:</span>
            <span style={styles.value}>{jobsCompleted}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Career Earnings:</span>
            <span style={{ color: '#FFD700' }}>${careerEarnings.toLocaleString()}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Peak Reputation:</span>
            <span style={{ color: '#88CCFF' }}>{careerCredibility}</span>
          </div>
        </div>

        {qualifies && !saved && (
          <div style={styles.initialsSection}>
            <div style={styles.highScoreLabel}>NEW HIGH SCORE!</div>
            <div style={styles.initialsRow}>
              <span style={styles.initialsPrompt}>ENTER INITIALS:</span>
              <input
                style={styles.initialsInput}
                type="text"
                maxLength={3}
                value={initials}
                onChange={(e) => setInitials(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                autoFocus
              />
              <button style={styles.saveBtn} onClick={handleSave}>OK</button>
            </div>
          </div>
        )}

        {saved && <div style={styles.savedMsg}>SCORE SAVED!</div>}

        {scores.length > 0 && (
          <HighScoreTable scores={scores} highlightRep={saved ? careerCredibility : undefined} />
        )}

        <button style={styles.button} onClick={onRestart}>
          START NEW CAREER
        </button>
      </div>
    </div>
  );
}

function HighScoreTable({ scores, highlightRep }: { scores: HighScore[]; highlightRep?: number }) {
  return (
    <div style={styles.scoresSection}>
      <div style={styles.scoresTitle}>HIGH SCORES</div>
      <div style={styles.scoresHeader}>
        <span style={{ width: '24px' }}>#</span>
        <span style={{ width: '40px' }}>NAME</span>
        <span style={{ flex: 1, textAlign: 'right' }}>REP</span>
        <span style={{ width: '50px', textAlign: 'right' }}>EARNINGS</span>
        <span style={{ width: '34px', textAlign: 'right' }}>JOBS</span>
      </div>
      {scores.map((s, i) => (
        <div
          key={i}
          style={{
            ...styles.scoresRow,
            color: highlightRep !== undefined && s.reputation === highlightRep ? '#FFD700' : '#aaa',
          }}
        >
          <span style={{ width: '24px' }}>{i + 1}.</span>
          <span style={{ width: '40px' }}>{s.name}</span>
          <span style={{ flex: 1, textAlign: 'right' }}>{s.reputation}</span>
          <span style={{ width: '50px', textAlign: 'right' }}>${s.earnings.toLocaleString()}</span>
          <span style={{ width: '34px', textAlign: 'right' }}>{s.jobsCompleted}</span>
        </div>
      ))}
    </div>
  );
}

export { HighScoreTable };

const mono = '"Courier New", "Consolas", monospace';

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.9)',
    fontFamily: mono,
    color: '#cccccc',
    zIndex: 10,
    overflow: 'auto',
  },
  panel: {
    background: '#111111',
    border: '2px solid #aa4444',
    padding: '24px',
    maxWidth: '340px',
    width: '90%',
    textAlign: 'center',
  },
  title: {
    fontSize: '28px',
    color: '#aa4444',
    margin: '0 0 6px 0',
    fontFamily: mono,
  },
  subtitle: {
    fontSize: '12px',
    color: '#aa6644',
    marginBottom: '14px',
  },
  flavor: {
    fontSize: '10px',
    color: '#777777',
    marginBottom: '18px',
    lineHeight: '1.6',
    fontStyle: 'italic',
  },
  summary: {
    textAlign: 'left',
    fontSize: '10px',
    marginBottom: '18px',
    borderTop: '1px solid #333',
    paddingTop: '12px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
  },
  label: { color: '#555' },
  value: { color: '#cccccc' },
  initialsSection: {
    marginBottom: '14px',
    padding: '10px',
    background: '#1a1a0a',
    border: '1px solid #FFD700',
  },
  highScoreLabel: {
    color: '#FFD700',
    fontSize: '12px',
    marginBottom: '8px',
    letterSpacing: '2px',
  },
  initialsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  initialsPrompt: {
    fontSize: '9px',
    color: '#aaa',
  },
  initialsInput: {
    fontFamily: mono,
    fontSize: '16px',
    width: '50px',
    textAlign: 'center',
    background: '#000',
    color: '#FFD700',
    border: '1px solid #555',
    padding: '4px',
    letterSpacing: '4px',
    textTransform: 'uppercase',
  },
  saveBtn: {
    fontFamily: mono,
    fontSize: '10px',
    padding: '4px 10px',
    background: '#333',
    color: '#FFD700',
    border: '1px solid #FFD700',
    cursor: 'pointer',
  },
  savedMsg: {
    color: '#55aa55',
    fontSize: '10px',
    marginBottom: '12px',
  },
  scoresSection: {
    textAlign: 'left',
    fontSize: '8px',
    marginBottom: '16px',
    borderTop: '1px solid #333',
    paddingTop: '10px',
  },
  scoresTitle: {
    textAlign: 'center',
    fontSize: '10px',
    color: '#FFD700',
    marginBottom: '8px',
    letterSpacing: '2px',
  },
  scoresHeader: {
    display: 'flex',
    gap: '4px',
    color: '#555',
    marginBottom: '4px',
    fontSize: '7px',
    borderBottom: '1px solid #222',
    paddingBottom: '3px',
  },
  scoresRow: {
    display: 'flex',
    gap: '4px',
    padding: '2px 0',
    fontSize: '8px',
  },
  button: {
    fontFamily: mono,
    fontSize: '11px',
    padding: '10px 18px',
    background: '#1a1a1a',
    color: '#aa4444',
    border: '1px solid #aa4444',
    cursor: 'pointer',
    letterSpacing: '1px',
  },
};
