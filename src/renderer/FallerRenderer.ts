import type { FallerPhase, TargetType } from '../types';
import { RENDER } from '../constants';

// ========================================================
//  COSTUME SYSTEM — per-level outfits
// ========================================================

interface Costume {
  shirt: string;
  shirtAccent: string;
  sleeve: string;
  pants: string;
  boots: string;
  cape?: string;       // cape color (undefined = no cape)
  hat?: { color: string; style: 'cowboy' | 'beanie' | 'hardhat' };
}

const COSTUMES: Costume[] = [
  // 1: Red plaid flannel + jeans (classic stuntman)
  { shirt: '#aa3333', shirtAccent: '#661a1a', sleeve: '#aa3333', pants: '#335588', boots: '#664422' },
  // 2: Black tee + cargo pants
  { shirt: '#333333', shirtAccent: '#222222', sleeve: '#333333', pants: '#445533', boots: '#333322' },
  // 3: Hawaiian shirt + khakis + cowboy hat
  { shirt: '#cc6622', shirtAccent: '#886611', sleeve: '#cc6622', pants: '#aa9966', boots: '#664422', hat: { color: '#8B7355', style: 'cowboy' } },
  // 4: Superhero suit + red cape
  { shirt: '#2244aa', shirtAccent: '#112255', sleeve: '#2244aa', pants: '#2244aa', boots: '#aa2222', cape: '#cc2222' },
  // 5: Green jacket + dark pants + beanie
  { shirt: '#336633', shirtAccent: '#224422', sleeve: '#336633', pants: '#333333', boots: '#444444', hat: { color: '#224422', style: 'beanie' } },
  // 6: Orange jumpsuit
  { shirt: '#cc6600', shirtAccent: '#993300', sleeve: '#cc6600', pants: '#cc6600', boots: '#222222' },
  // 7: Leather jacket + cowboy hat
  { shirt: '#552222', shirtAccent: '#331111', sleeve: '#552222', pants: '#222222', boots: '#222222', hat: { color: '#3a2a1a', style: 'cowboy' } },
  // 8: Hi-vis vest + hardhat
  { shirt: '#ccaa22', shirtAccent: '#998811', sleeve: '#ccaa22', pants: '#335588', boots: '#664422', hat: { color: '#cccc22', style: 'hardhat' } },
  // 9: Black suit (spy)
  { shirt: '#1a1a1a', shirtAccent: '#111111', sleeve: '#1a1a1a', pants: '#1a1a1a', boots: '#111111' },
  // 10: Purple + gold cape (fantasy)
  { shirt: '#663399', shirtAccent: '#442266', sleeve: '#663399', pants: '#442266', boots: '#333333', cape: '#9933cc' },
];

function getCostume(level: number): Costume {
  return COSTUMES[(level - 1) % COSTUMES.length];
}

// ========================================================
//  MAIN DRAW
// ========================================================

/**
 * Draw the performer as a pixel-art stick figure on canvas.
 * Costume varies per level. Some levels include capes and hats.
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
  levelNum = 1,
  jumpTimer = 0,
  targetType: TargetType = 'airbag',
): void {
  ctx.save();
  ctx.translate(x, y);

  const color = isTucked ? RENDER.ASCII_BRIGHT : RENDER.FALLER_COLOR;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';

  const headR = 3;
  const bodyH = 28;
  const costume = getCostume(levelNum);

  if (phase === 'LANDED') {
    // No rotation for landed — draw in a natural ground-relative pose
    drawLanded(ctx, costume, targetType);
  } else {
    const oy = pivotAtFeet ? -bodyH : -bodyH / 2;

    // Draw body in rotated space
    ctx.save();
    ctx.rotate((angle * Math.PI) / 180);

    if (isTucked && phase === 'FALLING') {
      drawTucked(ctx, oy, headR, bodyH, costume);
    } else {
      drawUpright(ctx, oy, headR, bodyH, phase, fallTime, costume, jumpTimer);
    }

    // Hat on head (STANDING/LEANING) — stays in rotated space
    if (costume.hat && phase !== 'JUMPING' && phase !== 'FALLING') {
      const headCY = oy + headR;
      drawHat(ctx, headCY, headR, costume.hat, phase, jumpTimer + fallTime);
    }
    ctx.restore(); // undo rotation, back to translated-only space

    // Hat flying off (JUMPING/FALLING) — drawn in world space so it doesn't orbit
    if (costume.hat && (phase === 'JUMPING' || phase === 'FALLING')) {
      const timeSinceJump = jumpTimer + fallTime;
      if (timeSinceJump <= 2.0) {
        // Calculate head-top position in world space (rotated from body-local)
        const headTopLocal = oy - 2; // top of head in body-local Y
        const rad = (angle * Math.PI) / 180;
        const headWorldX = -Math.sin(rad) * headTopLocal;
        const headWorldY = Math.cos(rad) * headTopLocal;

        // Drift away in world space (to the right and upward)
        const drift = timeSinceJump;
        const driftX = drift * 10;
        const driftY = -drift * 18;
        const spin = drift * 3;

        ctx.save();
        ctx.fillStyle = costume.hat.color;
        ctx.translate(headWorldX + driftX, headWorldY + driftY);
        ctx.rotate(spin);
        drawHatShape(ctx, costume.hat.style);
        ctx.restore();
      }
    }
  }

  ctx.restore();
}

// ========================================================
//  UPRIGHT POSE (standing, leaning, jumping, falling spread)
// ========================================================

function drawUpright(
  ctx: CanvasRenderingContext2D,
  oy: number,
  headR: number,
  bodyH: number,
  phase: FallerPhase,
  fallTime: number,
  costume: Costume,
  jumpTimer: number,
): void {
  const headCY = oy + headR;
  const shoulderY = oy + headR * 2 + 2;
  const hipY = oy + bodyH * 0.62;
  const footY = oy + bodyH;

  // === CAPE (behind body — draw first so body is on top) ===
  if (costume.cape) {
    drawCape(ctx, shoulderY, hipY, phase, fallTime, costume.cape);
  }

  // === HEAD (skin tone) ===
  ctx.fillStyle = '#ddbbaa';
  ctx.beginPath();
  ctx.arc(0, headCY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Face marker
  ctx.fillStyle = '#222222';
  ctx.beginPath();
  ctx.arc(1.5, headCY - 0.5, 1, 0, Math.PI * 2);
  ctx.fill();

  // === TORSO (shirt) ===
  ctx.strokeStyle = costume.shirt;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, shoulderY);
  ctx.lineTo(0, hipY);
  ctx.stroke();

  // Shirt accent/pattern stripes
  ctx.strokeStyle = costume.shirtAccent;
  ctx.lineWidth = 1;
  const torsoMid = (shoulderY + hipY) / 2;
  ctx.beginPath();
  ctx.moveTo(-2, shoulderY + 2);
  ctx.lineTo(2, shoulderY + 2);
  ctx.moveTo(-2, torsoMid);
  ctx.lineTo(2, torsoMid);
  ctx.moveTo(-2, hipY - 2);
  ctx.lineTo(2, hipY - 2);
  ctx.stroke();

  ctx.lineWidth = 1.5;

  if (phase === 'FALLING' && fallTime > 0) {
    const armSwing = Math.sin(fallTime * 7);
    const legSwing = Math.sin(fallTime * 5.5);

    // Arms (sleeve color)
    ctx.strokeStyle = costume.sleeve;
    ctx.beginPath();
    ctx.moveTo(-8 + armSwing * 2, shoulderY - 5 + armSwing * 4);
    ctx.lineTo(0, shoulderY);
    ctx.lineTo(7 - armSwing * 2, shoulderY - 5 - armSwing * 4);
    ctx.stroke();

    // Legs (pants color)
    const kneeY = hipY + (footY - hipY) * 0.5;
    const lKneeX = -2 + legSwing * 3;
    const lFootX = -4 + legSwing * 4;
    const lFootY = footY - Math.abs(legSwing) * 2;
    const rKneeX = 2 - legSwing * 3;
    const rFootX = 4 - legSwing * 4;
    const rFootY = footY - Math.abs(legSwing) * 2;

    ctx.strokeStyle = costume.pants;
    ctx.beginPath();
    ctx.moveTo(0, hipY);
    ctx.lineTo(lKneeX, kneeY);
    ctx.lineTo(lFootX, lFootY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, hipY);
    ctx.lineTo(rKneeX, kneeY);
    ctx.lineTo(rFootX, rFootY);
    ctx.stroke();

    // Boots
    ctx.strokeStyle = costume.boots;
    ctx.beginPath();
    ctx.moveTo(lFootX - 2, lFootY);
    ctx.lineTo(lFootX + 2, lFootY);
    ctx.moveTo(rFootX - 2, rFootY);
    ctx.lineTo(rFootX + 2, rFootY);
    ctx.stroke();
  } else if (phase === 'JUMPING') {
    // Arms spread
    ctx.strokeStyle = costume.sleeve;
    ctx.beginPath();
    ctx.moveTo(-9, shoulderY - 8);
    ctx.lineTo(0, shoulderY);
    ctx.lineTo(7, shoulderY - 2);
    ctx.stroke();

    // Legs
    ctx.strokeStyle = costume.pants;
    ctx.beginPath();
    ctx.moveTo(-5, footY);
    ctx.lineTo(0, hipY);
    ctx.lineTo(5, footY);
    ctx.stroke();

    // Boots
    ctx.strokeStyle = costume.boots;
    ctx.beginPath();
    ctx.moveTo(-7, footY);
    ctx.lineTo(-3, footY);
    ctx.moveTo(3, footY);
    ctx.lineTo(7, footY);
    ctx.stroke();
  } else {
    // Standing / leaning — arms down
    ctx.strokeStyle = costume.sleeve;
    ctx.beginPath();
    ctx.moveTo(-6, hipY - 2);
    ctx.lineTo(0, shoulderY);
    ctx.lineTo(6, hipY - 2);
    ctx.stroke();

    // Legs
    ctx.strokeStyle = costume.pants;
    ctx.beginPath();
    ctx.moveTo(-5, footY);
    ctx.lineTo(0, hipY);
    ctx.lineTo(5, footY);
    ctx.stroke();

    // Boots
    ctx.strokeStyle = costume.boots;
    ctx.beginPath();
    ctx.moveTo(-7, footY);
    ctx.lineTo(-3, footY);
    ctx.moveTo(3, footY);
    ctx.lineTo(7, footY);
    ctx.stroke();
  }
}

// ========================================================
//  CAPE
// ========================================================

function drawCape(
  ctx: CanvasRenderingContext2D,
  shoulderY: number,
  hipY: number,
  phase: FallerPhase,
  fallTime: number,
  capeColor: string,
): void {
  ctx.strokeStyle = capeColor;
  ctx.lineWidth = 2.5;

  if (phase === 'FALLING' || phase === 'JUMPING') {
    // Cape trails behind the performer (negative X = back toward the building)
    const wave1 = Math.sin(fallTime * 4) * 3;
    const wave2 = Math.sin(fallTime * 6 + 1) * 2;
    const capeLen = 18;

    ctx.beginPath();
    ctx.moveTo(-1, shoulderY);
    ctx.quadraticCurveTo(-capeLen * 0.5, shoulderY - 3 + wave1, -capeLen, shoulderY - 4 + wave2);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(1, shoulderY);
    ctx.quadraticCurveTo(-capeLen * 0.4, shoulderY - 1 + wave1 * 0.6, -capeLen + 3, shoulderY - 2 + wave2 * 0.7);
    ctx.stroke();
  } else {
    // Standing/leaning: cape hangs down behind
    const capeBottom = hipY + 8;
    ctx.beginPath();
    ctx.moveTo(-1, shoulderY);
    ctx.lineTo(-2, capeBottom);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(1, shoulderY);
    ctx.lineTo(0, capeBottom);
    ctx.stroke();
  }
}

// ========================================================
//  HAT
// ========================================================

function drawHat(
  ctx: CanvasRenderingContext2D,
  headCY: number,
  headR: number,
  hat: { color: string; style: 'cowboy' | 'beanie' | 'hardhat' },
  phase: FallerPhase,
  timeSinceJump: number,
): void {
  ctx.fillStyle = hat.color;

  if (phase === 'JUMPING' || phase === 'FALLING') {
    // Hat flies off — drift upward and to the side
    if (timeSinceJump > 2.0) return; // gone off screen

    const drift = timeSinceJump;
    const ox = drift * 10;
    const oy2 = -drift * 18;
    const spin = drift * 3;

    ctx.save();
    ctx.translate(ox, headCY - headR - 2 + oy2);
    ctx.rotate(spin);
    drawHatShape(ctx, hat.style);
    ctx.restore();
    return;
  }

  // Hat on head
  ctx.save();
  ctx.translate(0, headCY - headR - 2);
  drawHatShape(ctx, hat.style);
  ctx.restore();
}

function drawHatShape(ctx: CanvasRenderingContext2D, style: 'cowboy' | 'beanie' | 'hardhat'): void {
  if (style === 'cowboy') {
    ctx.fillRect(-5, 0, 10, 1.5);
    ctx.fillRect(-2.5, -3.5, 5, 3.5);
  } else if (style === 'beanie') {
    ctx.beginPath();
    ctx.arc(0, -1, 3.5, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-3.5, -0.5, 7, 1);
  } else if (style === 'hardhat') {
    ctx.fillRect(-4.5, 0, 9, 1.5);
    ctx.beginPath();
    ctx.arc(0, 0, 4, Math.PI, 0);
    ctx.fill();
  }
}

// ========================================================
//  TUCKED (cannonball) POSE
// ========================================================

function drawTucked(
  ctx: CanvasRenderingContext2D,
  oy: number,
  headR: number,
  bodyH: number,
  costume: Costume,
): void {
  const cx = 0;
  const cy = oy + bodyH / 2;

  // Ball outline in shirt color
  ctx.strokeStyle = costume.shirt;
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.stroke();

  // Head poking out
  ctx.fillStyle = '#ddbbaa';
  ctx.beginPath();
  ctx.arc(cx, cy - 6, headR, 0, Math.PI * 2);
  ctx.fill();

  // Knees (pants color)
  ctx.fillStyle = costume.pants;
  ctx.beginPath();
  ctx.arc(cx - 3, cy + 3, 2, 0, Math.PI * 2);
  ctx.arc(cx + 3, cy + 3, 2, 0, Math.PI * 2);
  ctx.fill();

  // Cape trails behind when tucked (negative X = back toward building)
  if (costume.cape) {
    ctx.strokeStyle = costume.cape;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy);
    ctx.lineTo(cx - 16, cy + 2);
    ctx.stroke();
  }
}

// ========================================================
//  LANDED POSE
// ========================================================

function drawLanded(
  ctx: CanvasRenderingContext2D,
  costume: Costume,
  targetType: TargetType,
): void {
  // Origin is at the landing point (ground surface level)
  // y < 0 is above surface, y > 0 is below
  const headR = 2.5;

  if (targetType === 'airbag') {
    // Lying on back, sunk into airbag — relaxed pose
    // Head
    ctx.fillStyle = '#ddbbaa';
    ctx.beginPath();
    ctx.arc(-8, -3, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222222';
    ctx.beginPath();
    ctx.arc(-7, -3.5, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Torso (shirt) — horizontal
    ctx.strokeStyle = costume.shirt;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-5, -1);
    ctx.lineTo(3, -1);
    ctx.stroke();

    // Shirt stripes
    ctx.strokeStyle = costume.shirtAccent;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-3, -2.5);
    ctx.lineTo(-3, 0.5);
    ctx.moveTo(0, -2.5);
    ctx.lineTo(0, 0.5);
    ctx.stroke();

    // Arms out to sides (sleeve) — relaxed spread
    ctx.strokeStyle = costume.sleeve;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, -1);
    ctx.lineTo(-7, -6);
    ctx.moveTo(1, -1);
    ctx.lineTo(5, -5);
    ctx.stroke();

    // Legs (pants) — slightly apart
    ctx.strokeStyle = costume.pants;
    ctx.beginPath();
    ctx.moveTo(3, -1);
    ctx.lineTo(8, 1);
    ctx.moveTo(3, -1);
    ctx.lineTo(9, -2);
    ctx.stroke();

    // Boots
    ctx.strokeStyle = costume.boots;
    ctx.beginPath();
    ctx.moveTo(8, 1);
    ctx.lineTo(10, 1);
    ctx.moveTo(9, -2);
    ctx.lineTo(11, -2);
    ctx.stroke();

  } else if (targetType === 'water') {
    // Upper body visible above water, lower half submerged
    // Head
    ctx.fillStyle = '#ddbbaa';
    ctx.beginPath();
    ctx.arc(0, -10, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222222';
    ctx.beginPath();
    ctx.arc(1, -10.5, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Torso (shirt) — upper body above surface
    ctx.strokeStyle = costume.shirt;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(0, -2);
    ctx.stroke();

    // Arms (sleeve) — treading water, spread out
    ctx.strokeStyle = costume.sleeve;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-7, -3);
    ctx.lineTo(0, -5);
    ctx.lineTo(7, -3);
    ctx.stroke();

    // Water line ripples around the figure
    ctx.strokeStyle = '#6699bb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-10, -1);
    ctx.lineTo(-5, -2);
    ctx.moveTo(5, -2);
    ctx.lineTo(10, -1);
    ctx.stroke();

  } else {
    // Boxes — slumped/sitting among crushed boxes
    // Head
    ctx.fillStyle = '#ddbbaa';
    ctx.beginPath();
    ctx.arc(-1, -12, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222222';
    ctx.beginPath();
    ctx.arc(0, -12.5, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Torso (shirt) — slumped forward
    ctx.strokeStyle = costume.shirt;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-1, -9);
    ctx.lineTo(1, -3);
    ctx.stroke();

    // Arms (sleeve) — one hanging, one resting on knee
    ctx.strokeStyle = costume.sleeve;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-1, -8);
    ctx.lineTo(-5, -5);
    ctx.moveTo(0, -6);
    ctx.lineTo(5, -4);
    ctx.stroke();

    // Legs (pants) — splayed out
    ctx.strokeStyle = costume.pants;
    ctx.beginPath();
    ctx.moveTo(1, -3);
    ctx.lineTo(-4, 0);
    ctx.moveTo(1, -3);
    ctx.lineTo(5, 0);
    ctx.stroke();

    // Boots
    ctx.strokeStyle = costume.boots;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(-2, 0);
    ctx.moveTo(3, 0);
    ctx.lineTo(7, 0);
    ctx.stroke();
  }

  // Cape draped nearby
  if (costume.cape) {
    ctx.strokeStyle = costume.cape;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (targetType === 'water') {
      ctx.moveTo(-3, -1);
      ctx.quadraticCurveTo(-8, -2, -14, 0);
    } else if (targetType === 'airbag') {
      ctx.moveTo(-5, -1);
      ctx.quadraticCurveTo(-10, -3, -15, 0);
    } else {
      ctx.moveTo(-1, -9);
      ctx.quadraticCurveTo(-6, -7, -10, -2);
    }
    ctx.stroke();
  }

  // Hat knocked off to the side
  if (costume.hat) {
    ctx.save();
    ctx.translate(10, -14);
    ctx.rotate(0.4);
    ctx.fillStyle = costume.hat.color;
    drawHatShape(ctx, costume.hat.style);
    ctx.restore();
  }
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
  const crewOffset = ((levelNum * 13) % 50) - 25;
  const baseX = crewX + crewOffset;

  ctx.save();
  ctx.lineCap = 'round';

  // === CAMERA ON TRIPOD ===
  const camX = baseX - 14;
  const camY = groundY - 18;

  // Tripod legs
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(camX, camY + 5);
  ctx.lineTo(camX - 8, groundY);
  ctx.moveTo(camX, camY + 5);
  ctx.lineTo(camX + 8, groundY);
  ctx.moveTo(camX, camY + 5);
  ctx.lineTo(camX, groundY);
  ctx.stroke();

  // Camera body — tilts to track the faller
  const dx = fallerScreenX - camX;
  const dy = fallerScreenY - camY;
  const rawAngle = Math.atan2(dy, dx);

  ctx.save();
  ctx.translate(camX, camY);
  ctx.rotate(rawAngle);

  // Camera body — rectangle with 1:1.6 aspect ratio
  const bodyW = 16;
  const bodyH = 10;
  ctx.fillStyle = '#888888';
  ctx.fillRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH);

  // Lens — triangle at front
  ctx.fillStyle = '#555555';
  ctx.beginPath();
  ctx.moveTo(bodyW / 2, -bodyH / 2 - 1);
  ctx.lineTo(bodyW / 2 + 8, 0);
  ctx.lineTo(bodyW / 2, bodyH / 2 + 1);
  ctx.closePath();
  ctx.fill();

  // Lens glass
  ctx.fillStyle = '#222222';
  ctx.beginPath();
  ctx.arc(bodyW / 2 + 5, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Film magazine
  ctx.fillStyle = '#666666';
  ctx.fillRect(-bodyW / 2 - 4, -bodyH / 2 - 3, 5, 4);

  // Recording light
  if (isRolling) {
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(0, -bodyH / 2 - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // === CAMERA OPERATOR ===
  drawCrewPerson(ctx, baseX, groundY, '#CCCCCC');

  // === DIRECTOR ===
  const dirX = baseX + 22;
  drawCrewPerson(ctx, dirX, groundY, '#AAAAAA', true);

  ctx.restore();
}

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

  ctx.beginPath();
  ctx.arc(x, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x, shoulderY);
  ctx.lineTo(x, hipY);
  ctx.stroke();

  if (armRaised) {
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

  ctx.beginPath();
  ctx.moveTo(x - 4, footY);
  ctx.lineTo(x, hipY);
  ctx.lineTo(x + 4, footY);
  ctx.stroke();
}
