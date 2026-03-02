import type { FallerPhase } from '../types';
import { RENDER } from '../constants';

/**
 * Draw the performer as a pixel-art stick figure on canvas.
 * Uses line drawing for limbs and a circle for the head.
 *
 * For STANDING/LEANING, pivot is at feet (building edge).
 * For everything else, pivot is at center of bounding box.
 */
export function draw(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  phase: FallerPhase,
  isTucked: boolean,
  pivotAtFeet: boolean,
  fallTime = 0,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angle * Math.PI) / 180);

  const color = phase === 'LANDED'
    ? RENDER.ASCII_MED
    : isTucked ? RENDER.ASCII_BRIGHT : RENDER.FALLER_COLOR;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';

  // Body dimensions (in local coordinates, 0,0 = pivot)
  const headR = 3;
  const bodyH = 28; // total height head-to-toe

  // Offset: if pivotAtFeet, body extends upward; otherwise centred
  const oy = pivotAtFeet ? -bodyH : -bodyH / 2;

  if (phase === 'LANDED') {
    drawLanded(ctx, oy + bodyH);
  } else if (isTucked && phase === 'FALLING') {
    drawTucked(ctx, oy, headR, bodyH);
  } else {
    drawUpright(ctx, oy, headR, bodyH, phase, fallTime);
  }

  ctx.restore();
}

/** Standing / falling pose — arms swing and legs scissor during fall like a stuntman */
function drawUpright(
  ctx: CanvasRenderingContext2D,
  oy: number,
  headR: number,
  bodyH: number,
  phase: FallerPhase,
  fallTime = 0,
): void {
  const headCY = oy + headR;
  const shoulderY = oy + headR * 2 + 2;
  const hipY = oy + bodyH * 0.62;
  const footY = oy + bodyH;

  // Head (bright filled circle)
  ctx.beginPath();
  ctx.arc(0, headCY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Face marker — small dark dot so you can tell head from feet during rotation
  const prevFill = ctx.fillStyle;
  ctx.fillStyle = '#222222';
  ctx.beginPath();
  ctx.arc(1.5, headCY - 0.5, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = prevFill;

  // Spine (neck to hip)
  ctx.beginPath();
  ctx.moveTo(0, shoulderY);
  ctx.lineTo(0, hipY);
  ctx.stroke();

  // Belt / waistline — visual divider between upper and lower body
  ctx.beginPath();
  ctx.moveTo(-3, hipY);
  ctx.lineTo(3, hipY);
  ctx.stroke();

  if (phase === 'FALLING' && fallTime > 0) {
    // === ANIMATED STUNTMAN FALL — arms swing, legs scissor ===
    const armSwing = Math.sin(fallTime * 7);   // ~1.1 cycles/sec
    const legSwing = Math.sin(fallTime * 5.5); // slightly offset frequency

    // Arms swing from shoulders — windmilling motion
    const leftHandX = -8 + armSwing * 2;
    const leftHandY = shoulderY - 5 + armSwing * 4;
    const rightHandX = 7 - armSwing * 2;
    const rightHandY = shoulderY - 5 - armSwing * 4;

    ctx.beginPath();
    ctx.moveTo(leftHandX, leftHandY);
    ctx.lineTo(0, shoulderY);
    ctx.lineTo(rightHandX, rightHandY);
    ctx.stroke();

    // Legs scissor with bent knees
    const kneeY = hipY + (footY - hipY) * 0.5;

    // Left leg: hip → knee → foot
    const lKneeX = -2 + legSwing * 3;
    const lFootX = -4 + legSwing * 4;
    const lFootY = footY - Math.abs(legSwing) * 2;
    ctx.beginPath();
    ctx.moveTo(0, hipY);
    ctx.lineTo(lKneeX, kneeY);
    ctx.lineTo(lFootX, lFootY);
    ctx.stroke();

    // Right leg: opposite phase
    const rKneeX = 2 - legSwing * 3;
    const rFootX = 4 - legSwing * 4;
    const rFootY = footY - Math.abs(legSwing) * 2;
    ctx.beginPath();
    ctx.moveTo(0, hipY);
    ctx.lineTo(rKneeX, kneeY);
    ctx.lineTo(rFootX, rFootY);
    ctx.stroke();

    // Boot marks on animated feet
    ctx.beginPath();
    ctx.moveTo(lFootX - 2, lFootY);
    ctx.lineTo(lFootX + 2, lFootY);
    ctx.moveTo(rFootX - 2, rFootY);
    ctx.lineTo(rFootX + 2, rFootY);
    ctx.stroke();
  } else if (phase === 'JUMPING') {
    // Static spread during the hop off the building
    ctx.beginPath();
    ctx.moveTo(-9, shoulderY - 8);
    ctx.lineTo(0, shoulderY);
    ctx.lineTo(7, shoulderY - 2);
    ctx.stroke();

    // Straight legs
    ctx.beginPath();
    ctx.moveTo(-5, footY);
    ctx.lineTo(0, hipY);
    ctx.lineTo(5, footY);
    ctx.stroke();

    // Boot marks
    ctx.beginPath();
    ctx.moveTo(-7, footY);
    ctx.lineTo(-3, footY);
    ctx.moveTo(3, footY);
    ctx.lineTo(7, footY);
    ctx.stroke();
  } else {
    // Arms down/neutral (STANDING, LEANING)
    ctx.beginPath();
    ctx.moveTo(-6, hipY - 2);
    ctx.lineTo(0, shoulderY);
    ctx.lineTo(6, hipY - 2);
    ctx.stroke();

    // Straight legs
    ctx.beginPath();
    ctx.moveTo(-5, footY);
    ctx.lineTo(0, hipY);
    ctx.lineTo(5, footY);
    ctx.stroke();

    // Boot marks
    ctx.beginPath();
    ctx.moveTo(-7, footY);
    ctx.lineTo(-3, footY);
    ctx.moveTo(3, footY);
    ctx.lineTo(7, footY);
    ctx.stroke();
  }
}

/** Tucked cannonball pose */
function drawTucked(
  ctx: CanvasRenderingContext2D,
  oy: number,
  headR: number,
  bodyH: number,
): void {
  const cx = 0;
  const cy = oy + bodyH / 2;

  // Compact ball
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.stroke();

  // Head poking out the top
  ctx.beginPath();
  ctx.arc(cx, cy - 6, headR, 0, Math.PI * 2);
  ctx.fill();

  // Knees indication
  ctx.beginPath();
  ctx.arc(cx - 3, cy + 3, 2, 0, Math.PI * 2);
  ctx.arc(cx + 3, cy + 3, 2, 0, Math.PI * 2);
  ctx.fill();
}

/** Lying flat on the catcher surface — sunk slightly into the mat */
function drawLanded(ctx: CanvasRenderingContext2D, groundLocalY: number): void {
  const gy = groundLocalY - 1; // +1px into the mat surface compared to before
  // Head
  ctx.beginPath();
  ctx.arc(-8, gy - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Body line
  ctx.beginPath();
  ctx.moveTo(-5, gy);
  ctx.lineTo(8, gy);
  ctx.stroke();
  // Arm up
  ctx.beginPath();
  ctx.moveTo(2, gy);
  ctx.lineTo(5, gy - 5);
  ctx.stroke();
}


// ========================================================
//  CAMERA CREW — film camera on tripod + crew members
// ========================================================

/** Draw camera crew. Camera tilts toward the faller. Red recording light when rolling. */
export function drawCameraCrew(
  ctx: CanvasRenderingContext2D,
  crewX: number,
  groundY: number,
  fallerScreenY: number,
  fallerScreenX: number,
  levelNum: number,
  isRolling: boolean,
): void {
  // Vary crew position per level/camera seed
  const crewOffset = ((levelNum * 13) % 50) - 25;
  const baseX = crewX + crewOffset;

  ctx.save();
  ctx.lineCap = 'round';

  // === CAMERA ON TRIPOD ===
  const camX = baseX - 14;
  const camY = groundY - 16;

  // Tripod legs
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(camX, camY + 4);
  ctx.lineTo(camX - 7, groundY);
  ctx.moveTo(camX, camY + 4);
  ctx.lineTo(camX + 7, groundY);
  ctx.moveTo(camX, camY + 4);
  ctx.lineTo(camX, groundY);
  ctx.stroke();

  // Camera body — tilts subtly toward the faller
  const dx = fallerScreenX - camX;
  const dy = fallerScreenY - camY;
  const rawAngle = Math.atan2(dy, dx);
  // Clamp to a subtle tilt so the camera stays looking like a camera
  const clamped = Math.max(-0.5, Math.min(0.15, rawAngle));

  ctx.save();
  ctx.translate(camX, camY);
  ctx.rotate(clamped);

  // Camera body — long horizontal rectangle (film camera)
  ctx.fillStyle = '#888888';
  ctx.fillRect(-6, -3, 22, 7);

  // Lens housing at front (pointing toward faller = +x direction after rotation)
  ctx.fillStyle = '#444444';
  ctx.fillRect(16, -4, 6, 9);

  // Lens front — dark glass
  ctx.fillStyle = '#111111';
  ctx.fillRect(21, -2, 2, 5);

  // Film magazine at rear — small bump at top-rear
  ctx.fillStyle = '#666666';
  ctx.fillRect(-8, -6, 5, 4);

  // Recording light — red dot on top when camera is rolling
  if (isRolling) {
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(8, -5, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // === CAMERA OPERATOR (standing behind camera) ===
  drawCrewPerson(ctx, baseX, groundY, '#CCCCCC');

  // === DIRECTOR (further out, with arm raised) ===
  const dirX = baseX + 22;
  drawCrewPerson(ctx, dirX, groundY, '#AAAAAA', true);

  ctx.restore();
}

/** Draw a simple stick-figure crew member */
function drawCrewPerson(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  color: string,
  armRaised?: boolean,
): void {
  const headR = 2.5;
  const headY = groundY - 22;
  const shoulderY = groundY - 17;
  const hipY = groundY - 10;
  const footY = groundY - 1;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;

  // Head
  ctx.beginPath();
  ctx.arc(x, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Spine
  ctx.beginPath();
  ctx.moveTo(x, shoulderY);
  ctx.lineTo(x, hipY);
  ctx.stroke();

  // Arms
  if (armRaised) {
    // One arm up (directing)
    ctx.beginPath();
    ctx.moveTo(x - 5, shoulderY + 4);
    ctx.lineTo(x, shoulderY);
    ctx.lineTo(x + 5, shoulderY - 5);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x - 5, hipY - 2);
    ctx.lineTo(x, shoulderY);
    ctx.lineTo(x + 5, hipY - 2);
    ctx.stroke();
  }

  // Legs
  ctx.beginPath();
  ctx.moveTo(x - 4, footY);
  ctx.lineTo(x, hipY);
  ctx.lineTo(x + 4, footY);
  ctx.stroke();
}
