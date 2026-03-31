import { useState, useCallback, useRef, useMemo } from 'react';
import type { HudSnapshot, LandingResult } from '../types';
import type { LevelConfig } from '../types';
import { GameCanvas } from './GameCanvas';

interface Props {
  onExit: () => void;
}

type HintStep = 'waiting' | 'hold_to_flip' | 'release' | 'done';

export function PracticeStage2({ onExit }: Props) {
  const [resetKey, setResetKey] = useState(0);
  const [hint, setHint] = useState<HintStep>('waiting');
  const hasFlippedRef = useRef(false);
  const hasUntuckedRef = useRef(false);

  const level = useMemo<LevelConfig>(() => ({
    level: 0,
    production: 'Free Practice',
    height: 1000,
    targetType: 'airbag',
    targetSize: 400,
    idealAngle: 90,
    wind: 0,
    windGust: 0,
    showTimingHints: false,
    pay: 0,
    coordinatorLine: '',
    costumeIndex: resetKey + 1,
  }), [resetKey]);

  const handleHudUpdate = useCallback((snapshot: HudSnapshot) => {
    if (snapshot.phase === 'STANDING' || snapshot.phase === 'LEANING') {
      // Reset hints for new attempt
      if (hasFlippedRef.current) {
        // They've already learned — don't re-show hints
        setHint('done');
      } else {
        setHint('waiting');
      }
      return;
    }

    if (snapshot.phase === 'FALLING') {
      if (!hasFlippedRef.current) {
        if (snapshot.isTucked) {
          hasFlippedRef.current = true;
          setHint('release');
        } else if (hint === 'waiting' || hint === 'hold_to_flip') {
          setHint('hold_to_flip');
        }
      } else if (!hasUntuckedRef.current) {
        if (!snapshot.isTucked && hint === 'release') {
          hasUntuckedRef.current = true;
          setHint('done');
        }
      }
    }
  }, [hint]);

  const handleLanding = useCallback((_result: LandingResult) => {
    // Auto-reset after a pause
    setTimeout(() => {
      setResetKey((k) => k + 1);
      if (hasFlippedRef.current) {
        setHint('done');
      } else {
        setHint('waiting');
      }
    }, 1500);
  }, []);

  let helperText = '';
  if (hint === 'hold_to_flip') helperText = 'PUSH AND HOLD TO FLIP';
  else if (hint === 'release') helperText = 'RELEASE TO OPEN BACK UP';

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
      <GameCanvas
        key={resetKey}
        level={level}
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
      <div style={styles.label}>FREE PRACTICE</div>

      {/* Exit button */}
      <div style={styles.exitBtn} onClick={(e) => { e.stopPropagation(); onExit(); }}>
        BACK TO GAME
      </div>
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
    top: '8px',
    right: '10px',
    fontFamily: mono,
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#44FF44',
    border: '2px solid #44FF44',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    pointerEvents: 'auto',
    background: 'rgba(10, 30, 10, 0.8)',
    textShadow: '0 0 8px rgba(68, 255, 68, 0.4)',
  },
};
