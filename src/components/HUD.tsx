import type { HudSnapshot } from '../types';

interface Props {
  data: HudSnapshot | null;
}

export function HUD({ data }: Props) {
  if (!data) return null;

  return (
    <div style={styles.overlay}>
      {/* Top-left: level number */}
      <div style={styles.topLeft}>
        <span style={styles.dim}>JOB</span> #{data.levelNumber}
      </div>

      {/* Top-right: height */}
      <div style={styles.topRight}>
        {Math.round(data.height)}ft
      </div>

      {/* Top-center: wind */}
      {data.wind !== 0 && (
        <div style={styles.topCenter}>
          {data.wind > 0 ? '→' : '←'} <span style={styles.dim}>WIND</span> {Math.abs(data.wind)}
        </div>
      )}

      {/* Timing hint */}
      {data.timingHint && <div style={styles.hint}>{data.timingHint}</div>}

    </div>
  );
}

const mono = '"Courier New", "Consolas", monospace';

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    fontFamily: mono,
    fontSize: '30px',
    color: '#cccccc',
    textShadow: '0 0 4px #000, 0 0 8px #000, 2px 2px 4px #000',
  },
  dim: {
    color: '#888888',
  },
  topLeft: {
    position: 'absolute',
    top: '8px',
    left: '10px',
  },
  topRight: {
    position: 'absolute',
    top: '8px',
    right: '10px',
    textAlign: 'right' as const,
  },
  topCenter: {
    position: 'absolute',
    top: '8px',
    left: '50%',
    transform: 'translateX(-50%)',
  },
  botRight: {
    position: 'absolute',
    bottom: '8px',
    right: '10px',
  },
  hint: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#cc4444',
    fontSize: '28px',
    fontWeight: 'bold',
    animation: 'blink 0.5s infinite',
  },
};
