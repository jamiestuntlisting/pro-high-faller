import type { GameState, LevelConfig, CountdownStep, CountdownState } from '../types';
import { GAME_HEIGHT, RENDER, PIXELS_PER_FOOT } from '../constants';

function generateCountdown(): CountdownState {
  const templates: Array<Array<{ text: string; baseDur: number }>> = [
    [
      { text: 'ROLL CAMERA!', baseDur: 1.2 },
      { text: 'SPEED!', baseDur: 0.8 },
      { text: 'AND...', baseDur: 0.7 },
      { text: 'ACTION!', baseDur: 0 },
    ],
    [
      { text: 'READY...', baseDur: 1.0 },
      { text: '3', baseDur: 0.9 },
      { text: '2', baseDur: 0.9 },
      { text: '1', baseDur: 0.7 },
      { text: 'ACTION!', baseDur: 0 },
    ],
    [
      { text: 'READY...', baseDur: 1.2 },
      { text: 'AND 3...', baseDur: 1.0 },
      { text: 'AND 2...', baseDur: 1.0 },
      { text: 'AND...', baseDur: 0.6 },
      { text: 'ACTION!', baseDur: 0 },
    ],
    [
      { text: 'CAMERAS ROLLING!', baseDur: 1.5 },
      { text: 'AND...', baseDur: 0.8 },
      { text: 'ACTION!', baseDur: 0 },
    ],
    [
      { text: 'QUIET ON SET!', baseDur: 1.5 },
      { text: 'ROLL CAMERA!', baseDur: 1.0 },
      { text: 'SPEED!', baseDur: 0.8 },
      { text: 'ACTION!', baseDur: 0 },
    ],
    [
      { text: 'SETTLE...', baseDur: 1.3 },
      { text: 'ROLLING!', baseDur: 0.9 },
      { text: '3...', baseDur: 0.8 },
      { text: '2...', baseDur: 0.7 },
      { text: '1...', baseDur: 0.5 },
      { text: 'ACTION!', baseDur: 0 },
    ],
  ];

  const template = templates[Math.floor(Math.random() * templates.length)];
  const steps: CountdownStep[] = [
    // Brief pause before countdown begins
    { text: '', duration: 0.8 + Math.random() * 0.4 },
    ...template.map(step => ({
      text: step.text,
      duration: step.baseDur > 0 ? step.baseDur + (Math.random() - 0.3) * 0.4 : 0,
    })),
  ];

  return {
    steps,
    currentStep: 0,
    stepTimer: 0,
    actionCalled: false,
    cameraRolling: false,
    wentEarly: false,
    jumpedBeforeRolling: false,
    repPenalty: 0,
  };
}

export function createGameState(level: LevelConfig): GameState {
  // Calculate if intro pan is needed (building taller than viewport)
  const groundY = RENDER.GROUND_Y;
  const buildingTopY = groundY - level.height * PIXELS_PER_FOOT;
  const fallerViewY = Math.min(buildingTopY - GAME_HEIGHT * 0.4, 0);
  const screenBottom = fallerViewY + GAME_HEIGHT;
  const needsPan = screenBottom < groundY; // ground not visible at faller's start position

  return {
    faller: {
      x: 0,
      y: level.height,
      vy: 0,
      vx: 0,
      angle: 0,         // 0 = upright
      angularVelocity: 0,
      phase: 'STANDING',
      isTucked: false,
      verticalJump: false,
      totalRotation: 0,
    },
    level,
    elapsedTime: 0,
    jumpTimer: 0,
    leanTimer: 0,
    jumpLeanAngle: 0,
    lockedWind: 0,
    landing: null,
    totalHealth: 200,
    totalEarnings: 0,
    jobsCompleted: 0,
    introPanTimer: 0,
    introPanDuration: needsPan ? 2.0 : 0,
    crewText: null,
    crewCallout: null,
    landedTime: 0,
    prevX: 0,
    prevY: level.height,
    prevAngle: 0,
    countdown: generateCountdown(),
  };
}
