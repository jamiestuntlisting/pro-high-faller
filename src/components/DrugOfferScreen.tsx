import { useState } from 'react';

interface Props {
  onAccept: () => void;
  onDecline: () => void;
}

export function DrugOfferScreen({ onAccept, onDecline }: Props) {
  const [step, setStep] = useState(0);

  const lines = [
    "Hey... psst. Over here.",
    "This level is really hard. Like, REALLY hard.",
    "Take these. You won't feel a thing.",
    "You won't lose any points. You can just keep jumping.",
  ];

  const handleSpace = (e: React.KeyboardEvent) => {
    if (e.code !== 'Space') return;
    e.preventDefault();
    if (step < lines.length - 1) {
      setStep(step + 1);
    }
  };

  return (
    <div style={styles.container} onKeyDown={handleSpace} tabIndex={0} ref={el => el?.focus()}>
      <div style={styles.panel}>
        {/* Shady figure */}
        <div style={styles.figure}>
          <pre style={styles.ascii}>{`
   ___
  (o_o)
  <| |>
  / \\
`}</pre>
        </div>

        {/* Dialogue */}
        <div style={styles.dialogue}>
          {lines.slice(0, step + 1).map((line, i) => (
            <div key={i} style={{
              ...styles.line,
              opacity: i === step ? 1 : 0.5,
            }}>
              "{line}"
            </div>
          ))}
        </div>

        {/* He's holding pills */}
        {step >= 2 && (
          <div style={styles.pills}>
            He holds out a handful of pills.
          </div>
        )}

        {/* Choices appear after all dialogue */}
        {step >= lines.length - 1 && (
          <div style={styles.choices}>
            <button style={styles.acceptBtn} onClick={onAccept}>
              TAKE THEM
            </button>
            <button style={styles.declineBtn} onClick={onDecline}>
              NAH, I'M GOOD
            </button>
          </div>
        )}

        {step < lines.length - 1 && (
          <div style={styles.hint}>[SPACE] to continue</div>
        )}
      </div>
    </div>
  );
}

const mono = '"Courier New", "Consolas", monospace';

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.95)',
    fontFamily: mono,
    color: '#cccccc',
    zIndex: 10,
    outline: 'none',
  },
  panel: {
    background: '#0a0a0a',
    border: '1px solid #333',
    padding: '24px',
    maxWidth: '340px',
    width: '90%',
    textAlign: 'center',
  },
  figure: {
    marginBottom: '12px',
  },
  ascii: {
    fontSize: '12px',
    color: '#666',
    lineHeight: '1.2',
    margin: 0,
    fontFamily: mono,
  },
  dialogue: {
    textAlign: 'left',
    marginBottom: '16px',
  },
  line: {
    fontSize: '11px',
    color: '#aaa',
    marginBottom: '8px',
    fontStyle: 'italic',
  },
  pills: {
    fontSize: '9px',
    color: '#cc8844',
    marginBottom: '16px',
    fontStyle: 'italic',
  },
  choices: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  acceptBtn: {
    fontFamily: mono,
    fontSize: '13px',
    padding: '12px',
    background: '#1a0a0a',
    color: '#cc4444',
    border: '1px solid #cc4444',
    cursor: 'pointer',
    letterSpacing: '2px',
  },
  declineBtn: {
    fontFamily: mono,
    fontSize: '13px',
    padding: '12px',
    background: '#0a1a0a',
    color: '#44aa44',
    border: '1px solid #44aa44',
    cursor: 'pointer',
    letterSpacing: '2px',
  },
  hint: {
    fontSize: '9px',
    color: '#444',
    marginTop: '12px',
  },
};
