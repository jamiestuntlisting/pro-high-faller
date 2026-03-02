/** Normalize angle to 0-360 range */
export function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/** Shortest angular distance between two angles (always positive) */
export function angularDistance(a: number, b: number): number {
  const diff = ((normalizeAngle(a) - normalizeAngle(b) + 180) % 360) - 180;
  return Math.abs(diff);
}

/** Linear interpolation */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Interpolate angle (handles wraparound) */
export function lerpAngle(a: number, b: number, t: number): number {
  const diff = ((b - a + 180) % 360) - 180;
  return a + diff * t;
}

/** Clamp value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Move value toward target by at most maxDelta */
export function moveToward(current: number, target: number, maxDelta: number): number {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}
