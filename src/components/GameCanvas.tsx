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
 * Compute CSS size so the canvas fits within the viewport (contain mode).
 * Portrait/narrow screens: fill height, width follows aspect ratio.
 * Wide/landscape screens: fit to height with pillar bars on the sides.
 */
function useContainSize() {
  const [size, setSize] = useState({ width: '100vw', height: '100dvh' });

  useEffect(() => {
    function calc() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const canvasRatio = GAME_WIDTH / GAME_HEIGHT; // ~0.461

      // Always fit to height — on wide screens this leaves bars on the sides
      const w = vh * canvasRatio;
      const finalW = Math.min(w, vw); // don't exceed viewport width
      const finalH = finalW / canvasRatio;
      setSize({ width: `${finalW}px`, height: `${finalH}px` });
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
  const containSize = useContainSize();

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
      background: '#000',
    }}>
      <canvas
        ref={canvasRef}
        style={{
          width: containSize.width,
          height: containSize.height,
          imageRendering: 'pixelated',
          display: 'block',
          touchAction: 'none',
        }}
      />
    </div>
  );
}
