import { useState, useCallback } from 'react';
import type { HudSnapshot, LandingResult } from '../types';
import type { LevelConfig } from '../types';
import { GameCanvas } from './GameCanvas';

interface Props {
  onNext: () => void;
  onExit: () => void;
}

const PRACTICE_LEVEL: LevelConfig = {
  level: 0,
  production: 'Tutorial',
  height: 20,
  targetType: 'airbag',
  targetSize: 80,
  idealAngle: 90,
  wind: 0,
  windGust: 0,
  showTimingHints: false,
  pay: 0,
  coordinatorLine: '',
};

export function PracticeStage1({ onNext, onExit }: Props) {
  const [resetKey, setResetKey] = useState(0);
  const [phase, setPhase] = useState<'standing' | 'leaning' | 'jumping' | 'landed'>('standing');
  const [hasCompletedOnce, setHasCompletedOnce] = useState(false);

  const handleHudUpdate = useCallback((snapshot: HudSnapshot) => {
    if (snapshot.phase === 'STANDING') setPhase('standing');
    else if (snapshot.phase === 'LEANING') setPhase('leaning');
    else if (snapshot.phase === 'JUMPING' || snapshot.phase === 'FALLING') setPhase('jumping');
  }, []);

  const handleLanding = useCallback((_result: LandingResult) => {
    setPhase('landed');
    setHasCompletedOnce(true);
    // Auto-reset after a short pause
    setTimeout(() => {
      setResetKey((k) => k + 1);
      setPhase('standing');
    }, 1500);
  }, []);

  let helperText = '';
  if (phase === 'standing') helperText = 'TAP TO LEAN';
  else if (phase === 'leaning') helperText = 'TAP TO JUMP';
  else if (phase === 'jumping') helperText = '';

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
      <GameCanvas
        key={resetKey}
        level={PRACTICE_LEVEL}
        careerHealth={200}
        careerEarnings={0}
        jobsCompleted={0}
        onHudUpdate={handleHudUpdate}
        onLanding={handleLanding}
      />

      {/* Helper text overlay */}
      {helperText && (
        <div style={styles.helperText}>
          {helperText}
        </div>
      )}

      {/* Top-left label */}
      <div style={styles.label}>PRACTICE</div>

      {/* Exit button */}
      <div style={styles.exitBtn} onClick={(e) => { e.stopPropagation(); onExit(); }}>
        EXIT
      </div>

      {/* "Got it" button — only after completing once */}
      {hasCompletedOnce && (
        <div
          style={styles.gotItBtn}
          onClick={(e) => { e.stopPropagation(); onNext(); }}
        >
          GOT IT, MOVING ON
        </div>
      )}
    </div>
  );
}

const mono = '"Courier New", "Consolas", monospace';

const styles: Record<string, React.CSSProperties> = {
  helperText: {
    position: 'absolute',
    top: '35%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontFamily: mono,
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#ffcc00',
    textShadow: '0 0 6px #000, 0 0 12px #000, 2px 2px 4px #000',
    pointerEvents: 'none',
    animation: 'blink 1s infinite',
    textAlign: 'center',
  },
  label: {
    position: 'absolute',
    top: '4px',
    left: '6px',
    fontFamily: mono,
    fontSize: '10px',
    color: '#888888',
    textShadow: '0 0 3px #000',
    pointerEvents: 'none',
  },
  exitBtn: {
    position: 'absolute',
    top: '4px',
    right: '6px',
    fontFamily: mono,
    fontSize: '9px',
    color: '#888888',
    border: '1px solid #444',
    padding: '2px 6px',
    cursor: 'pointer',
    pointerEvents: 'auto',
  },
  gotItBtn: {
    position: 'absolute',
    top: '42%',
    left: '50%',
    transform: 'translateX(-50%)',
    fontFamily: mono,
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#66cc66',
    border: '2px solid #66cc66',
    padding: '8px 16px',
    cursor: 'pointer',
    pointerEvents: 'auto',
    textShadow: '0 0 6px #000',
    background: 'rgba(0, 0, 0, 0.7)',
  },
};
