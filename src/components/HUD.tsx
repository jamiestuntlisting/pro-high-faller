import type { HudSnapshot } from '../types';

interface Props {
  data: HudSnapshot | null;
  credibility?: number;
}

export function HUD({ data, credibility }: Props) {
  if (!data) return null;

  return (
    <div style={styles.overlay}>
      {/* Top-right: height */}
      <div style={styles.topRight}>
        <span style={styles.dim}>HT:</span> {Math.round(data.height)}ft
      </div>

      {/* Bottom-left: wind */}
      {data.wind !== 0 && (
        <div style={styles.botLeft}>
          <span style={styles.dim}>WIND:</span> {data.wind > 0 ? '>>>' : '<<<'}{Math.abs(data.wind)}
        </div>
      )}

      {/* Bottom-right: credibility */}
      <div style={styles.botRight}>
        <span style={styles.dim}>CRED:</span> {credibility ?? 0}
      </div>

      {/* Timing hint */}
      {data.timingHint && <div style={styles.hint}>{data.timingHint}</div>}

      {/* Controls hint */}
      {data.phase === 'STANDING' && (
        <div style={styles.controlHint}>[SPACE] to lean</div>
      )}
      {data.phase === 'LEANING' && (
        <div style={styles.controlHint}>[SPACE] to jump!</div>
      )}
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
    fontSize: '10px',
    color: '#888888',
  },
  dim: {
    color: '#555555',
  },
  topRight: {
    position: 'absolute',
    top: '4px',
    right: '6px',
  },
  botLeft: {
    position: 'absolute',
    bottom: '4px',
    left: '6px',
  },
  botRight: {
    position: 'absolute',
    bottom: '4px',
    right: '6px',
  },
  hint: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#cc4444',
    fontSize: '11px',
    fontWeight: 'bold',
    animation: 'blink 0.5s infinite',
  },
  controlHint: {
    position: 'absolute',
    bottom: '25%',
    left: '50%',
    transform: 'translateX(-50%)',
    color: '#666666',
    fontSize: '10px',
  },
};
