import type { GameState, InputSnapshot, FallerState } from '../types';
import { PHYSICS, PIXELS_PER_FOOT, naturalLandingDistance, landingZoneHeight } from '../constants';
import { normalizeAngle } from '../utils/math';
import { lockWind } from './StateMachine';

/**
 * Horizontal jump velocity with soft cap above 18° lean.
 * Below 18° the curve is unchanged (sin-based).
 * Above 18° only 40% of the extra gain carries through — prevents
 * overshooting the airbag at higher lean angles.
 */
function jumpVXForLean(leanDeg: number): number {
  const leanRad = leanDeg * Math.PI / 180;
  const rawVX = PHYSICS.JUMP_IMPULSE_VX * Math.sin(leanRad);
  const CAP_DEG = 18;
  if (leanDeg <= CAP_DEG) return rawVX;
  const capVX = PHYSICS.JUMP_IMPULSE_VX * Math.sin(CAP_DEG * Math.PI / 180);
  return capVX + (rawVX - capVX) * 0.4;
}

export function update(state: GameState, dt: number, _input: InputSnapshot): void {
  const f = state.faller;

  // Save previous position for interpolation
  state.prevX = f.x;
  state.prevY = f.y;
  state.prevAngle = f.angle;

  switch (f.phase) {
    case 'STANDING': {
      // Advance the countdown sequence
      const cd = state.countdown;
      if (cd.currentStep < cd.steps.length) {
        cd.stepTimer += dt;
        const step = cd.steps[cd.currentStep];
        if (step.duration > 0 && cd.stepTimer >= step.duration && cd.currentStep < cd.steps.length - 1) {
          cd.currentStep++;
          cd.stepTimer = 0;
          // Camera starts rolling ~2 steps before ACTION
          const rollingIndex = Math.max(1, cd.steps.length - 3);
          if (cd.currentStep >= rollingIndex) {
            cd.cameraRolling = true;
          }
          // Check if ACTION was just called
          if (cd.steps[cd.currentStep].text.includes('ACTION')) {
            cd.actionCalled = true;
            cd.cameraRolling = true;
          }
        }
      }
      break;
    }

    case 'LEANING': {
      state.leanTimer += dt;
      const t = Math.min(state.leanTimer / PHYSICS.LEAN_DURATION, 1);
      // Linear lean from 0° to 90°
      f.angle = PHYSICS.LEAN_MAX_ANGLE * t;

      // If went early, crew panics and rushes through countdown at 3x speed
      advancePanicCountdown(state, dt);
      break;
    }

    case 'JUMPING': {
      state.jumpTimer += dt;
      const hopT = state.jumpTimer / PHYSICS.JUMP_DURATION;

      if (f.verticalJump) {
        // Double-tap: straight up hop, no horizontal, no rotation
        const hopUp = 5 * (1 - (2 * hopT - 1) ** 2);
        f.y = state.level.height + hopUp;
        f.angle = 0;
      } else {
        // Normal jump direction based on lean angle at jump time
        const jumpVX = jumpVXForLean(state.jumpLeanAngle);

        // Small upward arc (parabolic hop)
        const hopUp = 5 * (1 - (2 * hopT - 1) ** 2);
        f.y = state.level.height + hopUp;

        // Push outward from building (in feet)
        f.x += jumpVX * dt;

        // Start rotating
        f.angularVelocity = PHYSICS.SPREAD_ANGULAR_V;
        const rotDelta = f.angularVelocity * dt;
        f.angle += rotDelta;
        f.angle = normalizeAngle(f.angle);
        f.totalRotation += rotDelta;
      }

      // Continue panic countdown rush during the hop
      advancePanicCountdown(state, dt);

      if (state.jumpTimer >= PHYSICS.JUMP_DURATION) {
        f.phase = 'FALLING';
        f.vy = 0;
        if (f.verticalJump) {
          f.vx = 3; // slight drift off the building edge
          f.angularVelocity = 0;
        } else {
          f.vx = jumpVXForLean(state.jumpLeanAngle);
        }
        lockWind(state);
      }
      break;
    }

    case 'FALLING':
      state.elapsedTime += dt;

      // Parachute: reduced gravity and terminal velocity, more drift
      const isParachute = state.level.parachute === true;
      const gravity = isParachute ? PHYSICS.GRAVITY * 0.25 : PHYSICS.GRAVITY;
      const termV = isParachute ? 30 : PHYSICS.TERMINAL_VELOCITY;
      const drag = isParachute ? 0.995 : PHYSICS.AIR_DRAG;

      f.vy = Math.min(f.vy + gravity * dt, termV);
      f.y -= f.vy * dt;

      if (f.verticalJump) {
        // Double-tap panic: falls off edge feet first
        f.angle = 0;
        f.x += f.vx * dt;
        // Land at ground level (not back on building)
        if (f.y <= 0) {
          f.y = 0;
          f.phase = 'LANDED';
        }
      } else {
        applyRotation(f, dt);
        applyWind(f, dt, state);

        // Drugged: random jerky movement, uncontrollable body
        if (state.drugged) {
          applyDruggedEffects(f, state.elapsedTime, dt);
        }

        // Horizontal movement: jump momentum persists with air drag
        f.vx *= drag;
        f.x += f.vx * dt;

        // Land on top of the landing zone if over it, otherwise on the ground
        const landingY = getLandingHeight(f, state);
        if (f.y <= landingY) {
          // Sumo bounce: if bouncy and missed the catcher (ground level), bounce back up
          if (state.bouncy && landingY === 0 && Math.abs(f.vy) > 15) {
            f.vy = -f.vy * 0.45; // reverse with dampening
            f.vx *= 0.6;
            f.y = 0.1;
          } else {
            f.y = landingY;
            f.phase = 'LANDED';
          }
        }
      }
      break;

    case 'LANDED':
      break;
  }
}

function applyRotation(f: FallerState, dt: number): void {
  if (f.isTucked) {
    const rampRate = (PHYSICS.TUCK_ANGULAR_V - PHYSICS.SPREAD_ANGULAR_V) / PHYSICS.TUCK_RAMP_TIME;
    f.angularVelocity = Math.min(f.angularVelocity + rampRate * dt, PHYSICS.TUCK_ANGULAR_V);
  } else {
    if (f.angularVelocity > PHYSICS.SPREAD_ANGULAR_V) {
      f.angularVelocity = Math.max(
        f.angularVelocity - PHYSICS.UNTUCK_DECEL * dt,
        PHYSICS.SPREAD_ANGULAR_V,
      );
    }
  }
  const rotDelta = f.angularVelocity * dt;
  f.angle += rotDelta;
  f.angle = normalizeAngle(f.angle);
  f.totalRotation += rotDelta;
}

function applyWind(f: FallerState, dt: number, state: GameState): void {
  // Tall practice levels (level 0, 1000ft): keep faller centered in screen
  if (state.level.level === 0 && state.level.height > 100 && f.phase === 'FALLING') {
    // Target: center of screen in feet from building edge
    // Screen is 320px wide, building edge ~42px, so center ~160px → (160-42)/4 ≈ 30ft
    const centerFt = 30;
    const centerPull = -(f.x - centerFt) * 2.0;
    const damping = -f.vx * 0.8;
    const sway = Math.sin(state.elapsedTime * 0.5) * 2;
    f.vx += (centerPull + damping + sway) * dt;
    return;
  }
  if (state.lockedWind === 0) return;
  // Constant wind force locked at the start of the fall
  f.vx += state.lockedWind * dt;
}

/**
 * When the performer went early, the crew panics and rushes through
 * the remaining countdown steps at 3x speed. If they're fast enough,
 * the camera gets rolling and they might even reach ACTION.
 */
function advancePanicCountdown(state: GameState, dt: number): void {
  const cd = state.countdown;
  if (!cd.wentEarly || cd.actionCalled) return;
  if (cd.currentStep >= cd.steps.length) return;

  cd.stepTimer += dt * 3; // 3x speed — panic!
  const step = cd.steps[cd.currentStep];
  if (step.duration > 0 && cd.stepTimer >= step.duration && cd.currentStep < cd.steps.length - 1) {
    cd.currentStep++;
    cd.stepTimer = 0;
    // Camera starts rolling ~2 steps before ACTION
    const rollingIndex = Math.max(1, cd.steps.length - 3);
    if (cd.currentStep >= rollingIndex) {
      cd.cameraRolling = true;
    }
    // Check if ACTION was just called
    if (cd.steps[cd.currentStep].text.includes('ACTION')) {
      cd.actionCalled = true;
      cd.cameraRolling = true;
    }
  }
}

/** Returns the Y height (in feet) where the faller should land. */
function getLandingHeight(f: FallerState, state: GameState): number {
  const level = state.level;

  // Mat height scales with fall height
  const matHeightPx = landingZoneHeight(level.height, level.targetType);
  // Practice levels use a thin flat pad regardless of fall height
  const effectiveMatPx = level.level === 0 ? Math.min(matHeightPx, 16) : matHeightPx;
  const matHeightFt = effectiveMatPx / PIXELS_PER_FOOT;

  // Check if faller is horizontally over the landing zone
  // Add 1.5ft body-width tolerance — performer has a physical body, not a point
  const centerFt = naturalLandingDistance(level.height);
  const halfWidthFt = level.targetSize / PIXELS_PER_FOOT + 1.5;
  const distFromCenter = Math.abs(f.x - centerFt);

  if (distFromCenter <= halfWidthFt) {
    return matHeightFt; // land on top of catcher (including water surface)
  }
  return 0;
}

/**
 * Drugged: percocet makes the body jerk randomly.
 * Angular velocity spikes, random horizontal nudges, tuck/spread unreliable.
 */
function applyDruggedEffects(f: FallerState, elapsed: number, dt: number): void {
  // Every ~0.3s: random angular velocity spike
  const pulse = Math.floor(elapsed / 0.3);
  const pulsePhase = elapsed - pulse * 0.3;
  if (pulsePhase < dt) {
    // Spike: add or subtract a big chunk of angular velocity
    const spike = (Math.random() - 0.5) * 300;
    f.angularVelocity += spike;
  }

  // Random horizontal nudges
  f.vx += (Math.random() - 0.5) * 40 * dt;

  // Tuck/spread controls unreliable: randomly force or deny tuck
  if (Math.random() < 0.3) {
    f.isTucked = !f.isTucked;
  }
}
