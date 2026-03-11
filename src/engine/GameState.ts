import type { GameState, LevelConfig, CountdownStep, CountdownState } from '../types';
import { GAME_HEIGHT, RENDER, PIXELS_PER_FOOT } from '../constants';
import { isCostumeBouncyForLevel } from '../renderer/FallerRenderer';

function generateCountdown(): CountdownState {
  type Step = { text: string; baseDur: number };

  // Quick countdowns (~60%) — snappy, 1-2 beats then ACTION
  const quick: Step[][] = [
    [
      { text: 'ROLLING!', baseDur: 0.6 },
      { text: 'ACTION!', baseDur: 0 },
    ],
    [
      { text: 'READY—', baseDur: 0.5 },
      { text: 'ACTION!', baseDur: 0 },
    ],
    [
      { text: 'AND...', baseDur: 0.8 },
      { text: 'ACTION!', baseDur: 0 },
    ],
    [
      { text: 'CAMERAS ROLLING!', baseDur: 0.7 },
      { text: 'ACTION!', baseDur: 0 },
    ],
    [
      { text: 'ROLL IT!', baseDur: 0.6 },
      { text: 'GO!', baseDur: 0.4 },
      { text: 'ACTION!', baseDur: 0 },
    ],
  ];

  // Normal countdowns (~20%) — standard film set pacing
  const normal: Step[][] = [
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
  ];

  // Long countdowns (~15%) — extended professional buildup
  const long: Step[][] = [
    [
      { text: 'QUIET ON SET!', baseDur: 1.5 },
      { text: 'BACKGROUND READY!', baseDur: 1.2 },
      { text: 'ROLL CAMERA!', baseDur: 1.0 },
      { text: 'SPEED!', baseDur: 0.8 },
      { text: 'AND...', baseDur: 0.7 },
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
    [
      { text: 'READY...', baseDur: 1.2 },
      { text: 'STUNT TEAM SET!', baseDur: 1.0 },
      { text: 'AND 3...', baseDur: 1.0 },
      { text: 'AND 2...', baseDur: 1.0 },
      { text: 'AND...', baseDur: 0.6 },
      { text: 'ACTION!', baseDur: 0 },
    ],
  ];

  // Really long / comedic countdowns (~5%) — funny extras
  const comedic: Step[][] = [
    [
      { text: 'QUIET ON SET!', baseDur: 1.5 },
      { text: 'BACKGROUND READY?', baseDur: 1.2 },
      { text: 'PERFORMER READY?', baseDur: 1.0 },
      { text: 'DIRECTOR READY?', baseDur: 1.0 },
      { text: 'CATERING READY?', baseDur: 1.0 },
      { text: '...CATERING?', baseDur: 1.5 },
      { text: 'ROLL CAMERA!', baseDur: 0.8 },
      { text: 'ACTION!', baseDur: 0 },
    ],
    [
      { text: 'SETTLE...', baseDur: 1.5 },
      { text: 'STUNT COORDINATOR?', baseDur: 1.2 },
      { text: 'SAFETY?', baseDur: 1.0 },
      { text: 'MEDIC ON STANDBY?', baseDur: 1.0 },
      { text: 'INSURANCE PAID UP?', baseDur: 1.2 },
      { text: 'ROLLING!', baseDur: 0.8 },
      { text: '3', baseDur: 0.6 },
      { text: '2', baseDur: 0.5 },
      { text: '1', baseDur: 0.4 },
      { text: 'ACTION!', baseDur: 0 },
    ],
    [
      { text: 'QUIET ON SET!', baseDur: 1.5 },
      { text: 'WHO LEFT THEIR COFFEE?', baseDur: 1.5 },
      { text: "SERIOUSLY, WHOSE IS THIS?", baseDur: 1.8 },
      { text: 'OK FINE.', baseDur: 0.8 },
      { text: 'ROLL CAMERA!', baseDur: 0.8 },
      { text: 'ACTION!', baseDur: 0 },
    ],
    [
      { text: 'HOLD THE ROLL...', baseDur: 1.5 },
      { text: 'CHECKING THE GATE...', baseDur: 1.8 },
      { text: "WE'RE GOOD!", baseDur: 0.8 },
      { text: 'BACKGROUND ACTION!', baseDur: 1.0 },
      { text: 'AND... ROLLING!', baseDur: 0.8 },
      { text: 'ACTION!', baseDur: 0 },
    ],
  ];

  // Pick tier
  const roll = Math.random();
  let pool: Step[][];
  if (roll < 0.60) pool = quick;
  else if (roll < 0.80) pool = normal;
  else if (roll < 0.95) pool = long;
  else pool = comedic;

  const template = pool[Math.floor(Math.random() * pool.length)];
  const steps: CountdownStep[] = [
    // Brief pause before countdown begins
    { text: '', duration: 0.5 + Math.random() * 0.5 },
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

export function createGameState(level: LevelConfig, drugged = false): GameState {
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
    backFall: Math.random() < 0.2,
    bouncy: isCostumeBouncyForLevel(level.level),
    drugged,
    landedTime: 0,
    prevX: 0,
    prevY: level.height,
    prevAngle: 0,
    countdown: generateCountdown(),
  };
}
