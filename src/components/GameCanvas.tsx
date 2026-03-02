import { useEffect, useRef } from 'react';
import type { LevelConfig, HudSnapshot, LandingResult } from '../types';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { GameLoop } from '../engine/GameLoop';

interface Props {
  level: LevelConfig;
  careerHealth: number;
  careerEarnings: number;
  jobsCompleted: number;
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onLanding: (result: LandingResult) => void;
}

export function GameCanvas({
  level,
  careerHealth,
  careerEarnings,
  jobsCompleted,
  onHudUpdate,
  onLanding,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    const loop = new GameLoop(canvas, level, onHudUpdate, onLanding);
    loop.setCareerStats(careerHealth, careerEarnings, jobsCompleted);
    loop.start();

    return () => {
      loop.stop();
    };
    // Only re-create on level change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        maxWidth: '768px',
        imageRendering: 'pixelated',
        aspectRatio: `${GAME_WIDTH} / ${GAME_HEIGHT}`,
        display: 'block',
        margin: '0 auto',
        border: '2px solid #333',
        touchAction: 'none',
      }}
    />
  );
}
