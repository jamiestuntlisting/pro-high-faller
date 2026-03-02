// === DISPLAY ===
export const GAME_WIDTH = 320;
export const GAME_HEIGHT = 320;

// Scale: a 6ft person is ~24px tall on screen → 4 px per foot
export const PIXELS_PER_FOOT = 4;

// === PHYSICS (all units in feet and seconds) ===
export const PHYSICS = {
  GRAVITY: 38.64,                   // ft/s^2 — 120% Earth gravity for snappier falls
  TERMINAL_VELOCITY: 120,           // ft/s

  JUMP_IMPULSE_VY: 7.0,            // Upward hop velocity (ft/s) — 30% reduction
  JUMP_IMPULSE_VX: 52.9,           // Horizontal push off building (ft/s), scaled by lean angle — 30% reduction

  LEAN_DURATION: 4.5,              // Seconds to reach full 90° lean
  LEAN_MAX_ANGLE: 90,              // Maximum lean angle (degrees)
  JUMP_DURATION: 0.45,             // Hop phase — slow enough to see the launch
  NATURAL_JUMP_LEAN: 15,           // Expected lean angle for airbag placement (degrees)

  SPREAD_ANGULAR_V: 25,            // deg/s — slow tumble when spread
  TUCK_ANGULAR_V: 220,             // deg/s — fast spin when tucked
  TUCK_RAMP_TIME: 0.15,
  UNTUCK_DECEL: 600,

  AIR_DRAG: 0.999,                 // Very light air resistance per frame
} as const;

// === SCORING ===
export const SCORING = {
  GRADE_A_PLUS: 10,
  GRADE_A: 25,
  GRADE_B: 40,
  GRADE_C: 55,
  GRADE_D: 70,
} as const;

// === RENDERING ===
export const RENDER = {
  GROUND_Y: GAME_HEIGHT - 14,
  SKY_COLOR: '#0a0a0a',
  GROUND_COLOR: '#111111',
  ASCII_DIM: '#2a2a2a',
  ASCII_MED: '#555555',
  ASCII_BRIGHT: '#888888',
  ASCII_WHITE: '#bbbbbb',
  FALLER_COLOR: '#cccccc',
  FEET_INDICATOR: '#aa4444',
  LANDING_ZONE_COLOR: '#55aa55',
  CHAR_W: 6,
  CHAR_H: 8,
} as const;

export const HUD_UPDATE_INTERVAL = 100;

// Camera crew offset from landing zone edge (pixels)
export const CAMERA_CREW_OFFSET = 60;

/**
 * Landing zone visual height in pixels, scaled to fall height.
 * Higher falls = bigger, thicker catchers.
 */
export function landingZoneHeight(heightFt: number, targetType: 'airbag' | 'boxes' | 'water'): number {
  if (targetType === 'water') {
    // Water depth scales subtly
    return Math.round(6 + (heightFt - 20) * 0.1);
  }
  const base = targetType === 'airbag' ? 10 : 8;
  // Scale up: every 10ft above 30ft adds ~2px of mat height
  const extra = Math.max(0, (heightFt - 30) * 0.2);
  return Math.round(base + extra);
}

/**
 * Calculate where the landing zone center should be (in feet from building edge).
 * Based on natural trajectory: jump VX * fall time.
 */
export function naturalLandingDistance(heightFt: number): number {
  const leanRad = PHYSICS.NATURAL_JUMP_LEAN * Math.PI / 180;
  const effectiveVX = PHYSICS.JUMP_IMPULSE_VX * Math.sin(leanRad);
  const fallTime = Math.sqrt((2 * heightFt) / PHYSICS.GRAVITY);
  const jumpDist = effectiveVX * PHYSICS.JUMP_DURATION;
  // Account for air drag during the fall (0.999^N averages to ~97% of raw distance)
  const framesInFall = fallTime * 60;
  const avgDrag = (1 + Math.pow(PHYSICS.AIR_DRAG, framesInFall)) / 2;
  const fallDist = effectiveVX * fallTime * avgDrag;
  return jumpDist + fallDist;
}
