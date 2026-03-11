import { useEffect, useRef, useState } from 'react';
import type { LevelConfig, HudSnapshot, LandingResult } from '../types';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { GameLoop } from '../engine/GameLoop';

interface Props {
  level: LevelConfig;
  careerHealth: number;
  careerEarnings: number;
  jobsCompleted: number;
  drugged?: boolean;
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onLanding: (result: LandingResult) => void;
}

/**
 * Compute CSS size so the canvas covers the viewport (zoom-to-fill)
 * while maintaining the native aspect ratio. Overflow is cropped.
 */
function useCoverSize() {
  const [size, setSize] = useState({ width: '100vw', height: '100dvh' });

  useEffect(() => {
    function calc() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const canvasRatio = GAME_WIDTH / GAME_HEIGHT; // ~0.461
      const screenRatio = vw / vh;

      if (screenRatio > canvasRatio) {
        // Screen is wider than canvas — fill width, overflow height
        setSize({ width: `${vw}px`, height: `${vw / canvasRatio}px` });
      } else {
        // Screen is taller than canvas — fill height, overflow width
        setSize({ width: `${vh * canvasRatio}px`, height: `${vh}px` });
      }
    }
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  return size;
}

export function GameCanvas({
  level,
  careerHealth,
  careerEarnings,
  jobsCompleted,
  drugged = false,
  onHudUpdate,
  onLanding,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coverSize = useCoverSize();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    const loop = new GameLoop(canvas, level, onHudUpdate, onLanding, drugged);
    loop.setCareerStats(careerHealth, careerEarnings, jobsCompleted);
    loop.start();

    return () => {
      loop.stop();
    };
    // Only re-create on level change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  return (
    <div style={{
      width: '100vw',
      height: '100dvh',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
    }}>
      <canvas
        ref={canvasRef}
        style={{
          width: coverSize.width,
          height: coverSize.height,
          imageRendering: 'pixelated',
          display: 'block',
          touchAction: 'none',
        }}
      />
    </div>
  );
}
