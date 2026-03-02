import type { GameState, InputSnapshot } from '../types';
import { PHYSICS } from '../constants';

/**
 * STANDING → (SPACE press) → LEANING (hinges off building edge)
 * LEANING  → (SPACE press or auto) → JUMPING (hops off)
 * JUMPING  → (auto) → FALLING
 * FALLING  → tuck/spread via SPACE hold/release
 * FALLING  → LANDED (via physics when y <= 0)
 */
export function transition(state: GameState, input: InputSnapshot): void {
  const f = state.faller;

  switch (f.phase) {
    case 'STANDING':
      if (input.spacePressed) {
        const cd = state.countdown;
        if (!cd.actionCalled) {
          // Went before ACTION was called — crew will try to catch up
          cd.wentEarly = true;
          // Penalty calculated at landing based on whether the crew gets the camera rolling
        }
        f.phase = 'LEANING';
        state.leanTimer = 0;
      }
      break;

    case 'LEANING':
      if (input.spacePressed) {
        if (state.leanTimer < 0.25) {
          // Double-tap! Vertical jump — stays on building edge
          f.verticalJump = true;
          state.jumpLeanAngle = 0;
          f.angle = 0;
        } else {
          // Normal jump — save lean angle to determine direction
          state.jumpLeanAngle = f.angle;
          // If cameras aren't rolling yet, this is a voided take
          if (!state.countdown.cameraRolling) {
            state.countdown.jumpedBeforeRolling = true;
          }
        }
        f.phase = 'JUMPING';
        f.x = 0;
        f.y = state.level.height;
        state.jumpTimer = 0;
      } else if (state.leanTimer >= PHYSICS.LEAN_DURATION) {
        // Failed to jump at 90° — fall straight down
        f.phase = 'FALLING';
        f.x = 0;
        f.y = state.level.height;
        f.vx = 0;
        f.vy = 0;
        lockWind(state);
      }
      break;

    case 'JUMPING':
      // Auto-transition handled in Physics.update
      break;

    case 'FALLING':
      f.isTucked = input.spaceHeld;
      break;

    case 'LANDED':
      break;
  }
}

/** Snapshot a single wind+gust value that stays constant for the whole fall. */
export function lockWind(state: GameState): void {
  const { wind, windGust } = state.level;
  state.lockedWind = wind + (Math.random() - 0.5) * 2 * windGust;
}
