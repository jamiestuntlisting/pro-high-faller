import type { FallerPhase, TargetType } from '../types';
import { RENDER } from '../constants';

// ========================================================
//  COSTUME SYSTEM — per-level outfits
// ========================================================

type HatStyle = 'cowboy' | 'beanie' | 'hardhat' | 'bowler' | 'police' | 'wig';

interface Costume {
  shirt: string;
  shirtAccent: string;
  sleeve: string;
  pants: string;
  boots: string;
  cape?: string;       // cape color (undefined = no cape)
  hat?: { color: string; style: HatStyle };
  skirt?: string;      // if present, draws a dress/skirt instead of pants
  mustache?: boolean;  // Chaplin-style mustache
  straitjacket?: boolean; // arms bound, buckle straps
  belt?: string;       // sumo belt (mawashi) — flies off during jump
  bunnyEars?: boolean; // Easter bunny ears — flap like cape in fall
  dropsEggs?: boolean; // drops colored eggs during fall
  bouncy?: boolean;    // bounces on miss (sumo)
}

const COSTUMES: Costume[] = [
  // 1: Red plaid flannel + jeans (classic stuntman)
  { shirt: '#aa3333', shirtAccent: '#661a1a', sleeve: '#aa3333', pants: '#335588', boots: '#664422' },
  // 2: Denim jacket + jeans (stunt double)
  { shirt: '#4477aa', shirtAccent: '#335588', sleeve: '#4477aa', pants: '#335588', boots: '#8B6914' },
  // 3: Police uniform + police cap
  { shirt: '#1a3366', shirtAccent: '#0d1a33', sleeve: '#1a3366', pants: '#1a2244', boots: '#111111', hat: { color: '#1a2244', style: 'police' } },
  // 4: Bruce Lee — yellow jumpsuit (Game of Death)
  { shirt: '#FFD700', shirtAccent: '#222222', sleeve: '#FFD700', pants: '#FFD700', boots: '#222222' },
  // 5: Red tracksuit (Dar Robinson style)
  { shirt: '#cc2222', shirtAccent: '#ffffff', sleeve: '#cc2222', pants: '#cc2222', boots: '#ffffff' },
  // 6: Full cowboy — leather vest + jeans + boots + hat
  { shirt: '#8B6914', shirtAccent: '#6B4F10', sleeve: '#aa8833', pants: '#335588', boots: '#5C3317', hat: { color: '#6B4226', style: 'cowboy' } },
  // 7: Charlie Chaplin — black suit + bowler hat + mustache
  { shirt: '#1a1a1a', shirtAccent: '#333333', sleeve: '#1a1a1a', pants: '#1a1a1a', boots: '#1a1a1a', hat: { color: '#1a1a1a', style: 'bowler' }, mustache: true },
  // 8: White disco suit (Saturday Night Fever)
  { shirt: '#eeeeee', shirtAccent: '#cccccc', sleeve: '#eeeeee', pants: '#eeeeee', boots: '#222222' },
  // 9: Woman in a dress — wig flies off on jump!
  { shirt: '#cc3366', shirtAccent: '#992244', sleeve: '#cc3366', pants: '#cc3366', boots: '#aa2244', skirt: '#cc3366', hat: { color: '#FFD700', style: 'wig' } },
  // 10: Superhero suit + red cape
  { shirt: '#2244aa', shirtAccent: '#112255', sleeve: '#2244aa', pants: '#2244aa', boots: '#aa2222', cape: '#cc2222' },
  // 11: Hawaiian shirt + khakis + cowboy hat
  { shirt: '#cc6622', shirtAccent: '#886611', sleeve: '#cc6622', pants: '#aa9966', boots: '#664422', hat: { color: '#8B7355', style: 'cowboy' } },
  // 12: Green jacket + dark pants + beanie
  { shirt: '#336633', shirtAccent: '#224422', sleeve: '#336633', pants: '#333333', boots: '#444444', hat: { color: '#224422', style: 'beanie' } },
  // 13: Black tee + cargo pants
  { shirt: '#333333', shirtAccent: '#222222', sleeve: '#333333', pants: '#445533', boots: '#333322' },
  // 14: Orange jumpsuit
  { shirt: '#cc6600', shirtAccent: '#993300', sleeve: '#cc6600', pants: '#cc6600', boots: '#222222' },
  // 15: Leather jacket + cowboy hat
  { shirt: '#552222', shirtAccent: '#331111', sleeve: '#552222', pants: '#222222', boots: '#222222', hat: { color: '#3a2a1a', style: 'cowboy' } },
  // 16: Hi-vis vest + hardhat
  { shirt: '#ccaa22', shirtAccent: '#998811', sleeve: '#ccaa22', pants: '#335588', boots: '#664422', hat: { color: '#cccc22', style: 'hardhat' } },
  // 17: Black suit (spy)
  { shirt: '#1a1a1a', shirtAccent: '#111111', sleeve: '#1a1a1a', pants: '#1a1a1a', boots: '#111111' },
  // 18: Purple + gold cape (fantasy)
  { shirt: '#663399', shirtAccent: '#442266', sleeve: '#663399', pants: '#442266', boots: '#333333', cape: '#9933cc' },
  // 19: Where's Waldo — red/white striped shirt + jeans + red beanie
  { shirt: '#cc2222', shirtAccent: '#ffffff', sleeve: '#cc2222', pants: '#335588', boots: '#664422', hat: { color: '#cc2222', style: 'beanie' } },
  // 20: Gorilla suit — full dark brown fur costume
  { shirt: '#3a2a1a', shirtAccent: '#2a1a0a', sleeve: '#3a2a1a', pants: '#3a2a1a', boots: '#2a1a0a' },
  // 21: Straitjacket — white institutional jacket, arms bound
  { shirt: '#ccccbb', shirtAccent: '#999977', sleeve: '#ccccbb', pants: '#445544', boots: '#333333', straitjacket: true },
  // 22: Sumo Wrestler — big suit, mawashi belt flies off, bounces on miss
  { shirt: '#ddbb88', shirtAccent: '#ccaa66', sleeve: '#ddbb88', pants: '#ddbb88', boots: '#222222', belt: '#1a1a66', bouncy: true },
  // 23: Easter Bunny — full white costume, floppy ears, drops eggs
  { shirt: '#ffffff', shirtAccent: '#ffccdd', sleeve: '#ffffff', pants: '#ffffff', boots: '#ffaacc', bunnyEars: true, dropsEggs: true },
];

function getCostume(level: number): Costume {
  return COSTUMES[(level - 1) % COSTUMES.length];
}

/** Check if the costume for a given level has bouncy property */
export function isCostumeBouncyForLevel(level: number): boolean {
  return getCostume(level).bouncy === true;
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
  landedTime = 0,
  backFall = false,
): void {
  ctx.save();
  ctx.translate(x, y);

  // Dark outline glow for separation from background
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 4;

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
    drawLanded(ctx, costume, targetType, angle, landedTime);
  } else {
    const oy = pivotAtFeet ? -bodyH : -bodyH / 2;

    // Draw body in rotated space
    ctx.save();
    // Back fall: mirror sprite so performer faces backwards
    if (backFall) {
      ctx.scale(-1, 1);
    }
    // Negate angle during LEANING with backFall so lean goes toward edge, not building
    const rotAngle = (backFall && phase === 'LEANING') ? -angle : angle;
    ctx.rotate((rotAngle * Math.PI) / 180);

    if (isTucked && phase === 'FALLING') {
      drawTucked(ctx, oy, headR, bodyH, costume);
    } else {
      drawUpright(ctx, oy, headR, bodyH, phase, fallTime, costume);
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
      if (timeSinceJump <= 2.5) {
        // Calculate head-top position in world space (rotated from body-local)
        const headTopLocal = oy - 2; // top of head in body-local Y
        const rad = (angle * Math.PI) / 180;
        const headWorldX = -Math.sin(rad) * headTopLocal;
        const headWorldY = Math.cos(rad) * headTopLocal;

        // Drift away from head — direction matches performer's facing
        const drift = timeSinceJump;
        const hatDir = backFall ? -1 : 1;
        const driftX = drift * 10 * hatDir;
        const driftY = -drift * 18;
        const spin = drift * 3 * hatDir;

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
): void {
  const headCY = oy + headR;
  const shoulderY = oy + headR * 2 + 2;
  const hipY = oy + bodyH * 0.62;
  const footY = oy + bodyH;

  // === CAPE (behind body — draw first so body is on top) ===
  if (costume.cape) {
    drawCape(ctx, shoulderY, hipY, phase, fallTime, costume.cape);
  }

  // === BUNNY EARS (behind head) ===
  if (costume.bunnyEars) {
    drawBunnyEars(ctx, headCY, headR, phase, fallTime);
  }

  // === EASTER EGGS (drop during fall) ===
  if (costume.dropsEggs && (phase === 'FALLING' || phase === 'JUMPING') && fallTime > 0) {
    drawFallingEggs(ctx, fallTime);
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

  // Mustache (Chaplin)
  if (costume.mustache) {
    ctx.fillStyle = '#222222';
    ctx.fillRect(-1.5, headCY + 1, 3, 1);
  }

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

  // === SUMO BELT (mawashi) ===
  if (costume.belt) {
    drawBelt(ctx, hipY, phase, fallTime, costume.belt);
  }

  ctx.lineWidth = 1.5;

  if (phase === 'FALLING' && fallTime > 0) {
    const armSwing = Math.sin(fallTime * 7);
    const legSwing = Math.sin(fallTime * 5.5);

    // Arms (sleeve color)
    if (costume.straitjacket) {
      drawBoundArms(ctx, shoulderY, costume.sleeve, armSwing);
    } else {
      ctx.strokeStyle = costume.sleeve;
      ctx.beginPath();
      ctx.moveTo(-8 + armSwing * 2, shoulderY - 5 + armSwing * 4);
      ctx.lineTo(0, shoulderY);
      ctx.lineTo(7 - armSwing * 2, shoulderY - 5 - armSwing * 4);
      ctx.stroke();
    }

    if (costume.skirt) {
      // Skirt billowing in the fall
      const skirtWave = Math.sin(fallTime * 4) * 2;
      ctx.fillStyle = costume.skirt;
      ctx.beginPath();
      ctx.moveTo(-2, hipY);
      ctx.lineTo(-9 + skirtWave, footY - 4);
      ctx.lineTo(9 - skirtWave, footY - 4);
      ctx.lineTo(2, hipY);
      ctx.closePath();
      ctx.fill();
      // Legs below skirt (skin tone)
      ctx.strokeStyle = '#ddbbaa';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-3, footY - 4);
      ctx.lineTo(-4 + legSwing * 2, footY);
      ctx.moveTo(3, footY - 4);
      ctx.lineTo(4 - legSwing * 2, footY);
      ctx.stroke();
      // Shoes
      ctx.strokeStyle = costume.boots;
      ctx.beginPath();
      ctx.moveTo(-6 + legSwing * 2, footY);
      ctx.lineTo(-2 + legSwing * 2, footY);
      ctx.moveTo(2 - legSwing * 2, footY);
      ctx.lineTo(6 - legSwing * 2, footY);
      ctx.stroke();
    } else {
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
    }
  } else if (phase === 'JUMPING') {
    // Arms
    if (costume.straitjacket) {
      drawBoundArms(ctx, shoulderY, costume.sleeve);
    } else {
      ctx.strokeStyle = costume.sleeve;
      ctx.beginPath();
      ctx.moveTo(-9, shoulderY - 8);
      ctx.lineTo(0, shoulderY);
      ctx.lineTo(7, shoulderY - 2);
      ctx.stroke();
    }

    if (costume.skirt) {
      // Skirt flares out during jump
      ctx.fillStyle = costume.skirt;
      ctx.beginPath();
      ctx.moveTo(-2, hipY);
      ctx.lineTo(-8, footY - 3);
      ctx.lineTo(8, footY - 3);
      ctx.lineTo(2, hipY);
      ctx.closePath();
      ctx.fill();
      // Legs below (skin)
      ctx.strokeStyle = '#ddbbaa';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-4, footY - 3);
      ctx.lineTo(-5, footY);
      ctx.moveTo(4, footY - 3);
      ctx.lineTo(5, footY);
      ctx.stroke();
      // Shoes
      ctx.strokeStyle = costume.boots;
      ctx.beginPath();
      ctx.moveTo(-7, footY);
      ctx.lineTo(-3, footY);
      ctx.moveTo(3, footY);
      ctx.lineTo(7, footY);
      ctx.stroke();
    } else {
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
  } else {
    // Standing / leaning — arms
    if (costume.straitjacket) {
      drawBoundArms(ctx, shoulderY, costume.sleeve);
    } else {
      ctx.strokeStyle = costume.sleeve;
      ctx.beginPath();
      ctx.moveTo(-6, hipY - 2);
      ctx.lineTo(0, shoulderY);
      ctx.lineTo(6, hipY - 2);
      ctx.stroke();
    }

    if (costume.skirt) {
      // Dress/skirt — triangle from hips
      ctx.fillStyle = costume.skirt;
      ctx.beginPath();
      ctx.moveTo(-2, hipY);
      ctx.lineTo(-7, footY - 3);
      ctx.lineTo(7, footY - 3);
      ctx.lineTo(2, hipY);
      ctx.closePath();
      ctx.fill();
      // Legs below skirt (skin)
      ctx.strokeStyle = '#ddbbaa';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-3, footY - 3);
      ctx.lineTo(-4, footY);
      ctx.moveTo(3, footY - 3);
      ctx.lineTo(4, footY);
      ctx.stroke();
      // Shoes
      ctx.strokeStyle = costume.boots;
      ctx.beginPath();
      ctx.moveTo(-6, footY);
      ctx.lineTo(-2, footY);
      ctx.moveTo(2, footY);
      ctx.lineTo(6, footY);
      ctx.stroke();
    } else {
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
}

// ========================================================
//  STRAITJACKET ARMS — bound across chest with buckle straps
// ========================================================

function drawBoundArms(
  ctx: CanvasRenderingContext2D,
  shoulderY: number,
  sleeve: string,
  flutter?: number,
): void {
  ctx.strokeStyle = sleeve;
  ctx.lineWidth = 2;
  // Crossed arm wraps over chest
  ctx.beginPath();
  ctx.moveTo(-4, shoulderY + 1);
  ctx.quadraticCurveTo(0, shoulderY + 4, 4, shoulderY + 1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-3, shoulderY + 4);
  ctx.quadraticCurveTo(0, shoulderY + 7, 3, shoulderY + 4);
  ctx.stroke();
  // Buckle straps dangling from back
  ctx.strokeStyle = '#777777';
  ctx.lineWidth = 0.8;
  if (flutter !== undefined) {
    ctx.beginPath();
    ctx.moveTo(-2, shoulderY + 3);
    ctx.lineTo(-7 + flutter * 2, shoulderY + 5 + flutter * 3);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-2, shoulderY + 3);
    ctx.lineTo(-6, shoulderY + 7);
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
//  SUMO BELT (mawashi)
// ========================================================

function drawBelt(
  ctx: CanvasRenderingContext2D,
  hipY: number,
  phase: FallerPhase,
  fallTime: number,
  beltColor: string,
): void {
  if (phase === 'JUMPING' || phase === 'FALLING') {
    // Belt flies off — spirals away behind the performer
    const t = fallTime;
    if (t > 2.5) return; // gone
    const drift = t;
    ctx.save();
    ctx.strokeStyle = beltColor;
    ctx.lineWidth = 3;
    ctx.translate(-drift * 8, -drift * 6);
    ctx.rotate(drift * 4);
    // Thick belt strip
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(4, 0);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-3, 1.5);
    ctx.lineTo(3, 1.5);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Belt on body (STANDING/LEANING)
  ctx.fillStyle = beltColor;
  ctx.fillRect(-4, hipY - 2, 8, 4);
  // Belt knot
  ctx.fillStyle = '#ddcc66';
  ctx.fillRect(-1.5, hipY - 1, 3, 2);
}

// ========================================================
//  BUNNY EARS
// ========================================================

function drawBunnyEars(
  ctx: CanvasRenderingContext2D,
  headCY: number,
  headR: number,
  phase: FallerPhase,
  fallTime: number,
): void {
  ctx.fillStyle = '#ffffff';
  const earTop = headCY - headR - 2;

  if (phase === 'FALLING' || phase === 'JUMPING') {
    // Ears flap behind like a cape
    const wave = Math.sin(fallTime * 5) * 4;
    const wave2 = Math.sin(fallTime * 6 + 1) * 3;
    // Left ear
    ctx.beginPath();
    ctx.ellipse(-2 - wave * 0.3, earTop + wave2 * 0.5, 2, 7, -0.3 + wave * 0.05, 0, Math.PI * 2);
    ctx.fill();
    // Right ear
    ctx.beginPath();
    ctx.ellipse(2 + wave * 0.3, earTop + wave2 * 0.3, 2, 7, 0.3 - wave * 0.05, 0, Math.PI * 2);
    ctx.fill();
    // Pink inner
    ctx.fillStyle = '#ffaabb';
    ctx.beginPath();
    ctx.ellipse(-2 - wave * 0.3, earTop + wave2 * 0.5, 1, 5, -0.3 + wave * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(2 + wave * 0.3, earTop + wave2 * 0.3, 1, 5, 0.3 - wave * 0.05, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Ears upright on head
    ctx.beginPath();
    ctx.ellipse(-2, earTop - 5, 2, 6, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(2, earTop - 5, 2, 6, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Pink inner
    ctx.fillStyle = '#ffaabb';
    ctx.beginPath();
    ctx.ellipse(-2, earTop - 5, 1, 4, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(2, earTop - 5, 1, 4, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ========================================================
//  EASTER EGGS (dropped during fall)
// ========================================================

const EGG_COLORS = ['#ff4444', '#44cc44', '#4488ff', '#ffdd00', '#ff88cc', '#88ddff'];

function drawFallingEggs(
  ctx: CanvasRenderingContext2D,
  fallTime: number,
): void {
  // Drop an egg every 0.4 seconds of fall
  const numEggs = Math.min(Math.floor(fallTime / 0.4), 15);
  for (let i = 0; i < numEggs; i++) {
    const age = fallTime - i * 0.4;
    // Eggs drift down and slightly to the side
    const ex = (i % 2 === 0 ? -1 : 1) * (3 + i * 2) + Math.sin(age * 2) * 2;
    const ey = age * 15; // fall behind performer
    const color = EGG_COLORS[i % EGG_COLORS.length];

    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(age * 2 + i);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Stripe
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-1.5, 0);
    ctx.lineTo(1.5, 0);
    ctx.stroke();
    ctx.restore();
  }
}

// ========================================================
//  HAT
// ========================================================

function drawHat(
  ctx: CanvasRenderingContext2D,
  headCY: number,
  headR: number,
  hat: { color: string; style: HatStyle },
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

function drawHatShape(ctx: CanvasRenderingContext2D, style: HatStyle): void {
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
  } else if (style === 'bowler') {
    // Round dome + small curled brim
    ctx.fillRect(-4, 0, 8, 1.5);
    ctx.beginPath();
    ctx.arc(0, -1, 3, Math.PI, 0);
    ctx.fill();
  } else if (style === 'police') {
    // Flat-topped police cap with badge
    ctx.fillRect(-4, 0, 8, 1);       // brim
    ctx.fillRect(-3, -3, 6, 3);      // flat crown
    // Gold badge
    const prevFill = ctx.fillStyle;
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(-1, -2.5, 2, 1.5);
    ctx.fillStyle = prevFill;
  } else if (style === 'wig') {
    // Big fluffy wig — sits on head with long flowing hair
    ctx.beginPath();
    ctx.arc(0, 2, 5, Math.PI, 0); // poof sits on head
    ctx.fill();
    // Long hair flowing down both sides
    ctx.fillRect(-5, 2, 2.5, 10);
    ctx.fillRect(2.5, 2, 2.5, 10);
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

  // Cape trails behind when tucked — draw first (behind body)
  if (costume.cape) {
    ctx.strokeStyle = costume.cape;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 2);
    ctx.quadraticCurveTo(cx - 12, cy, cx - 16, cy + 2);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy - 1);
    ctx.quadraticCurveTo(cx - 10, cy + 1, cx - 14, cy + 4);
    ctx.stroke();
  }

  // === CURVED BACK (shirt) — thick arc from shoulders to lower back ===
  ctx.strokeStyle = costume.shirt;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 6, -Math.PI * 0.8, Math.PI * 0.15);
  ctx.stroke();

  // Shirt accent stripe on back
  ctx.strokeStyle = costume.shirtAccent;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(cx, cy, 6, -Math.PI * 0.5, -Math.PI * 0.15);
  ctx.stroke();

  // === HEAD — tucked down, chin to chest ===
  ctx.fillStyle = '#ddbbaa';
  ctx.beginPath();
  ctx.arc(cx + 3, cy - 5, headR, 0, Math.PI * 2);
  ctx.fill();

  // Face marker (eye) — looking down
  ctx.fillStyle = '#222222';
  ctx.beginPath();
  ctx.arc(cx + 4.5, cy - 4.5, 0.8, 0, Math.PI * 2);
  ctx.fill();

  // Mustache
  if (costume.mustache) {
    ctx.fillStyle = '#222222';
    ctx.fillRect(cx + 2, cy - 3.5, 2.5, 0.8);
  }

  // === ARMS (sleeves) — wrapped around knees ===
  ctx.strokeStyle = costume.sleeve;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  // Left arm: from shoulder area, curling around front
  ctx.moveTo(cx + 1, cy - 3);
  ctx.quadraticCurveTo(cx + 6, cy - 1, cx + 5, cy + 2);
  ctx.stroke();
  ctx.beginPath();
  // Right arm: from other shoulder, crossing over
  ctx.moveTo(cx + 2, cy - 2);
  ctx.quadraticCurveTo(cx + 7, cy + 1, cx + 4, cy + 4);
  ctx.stroke();

  // Hands (skin) gripping shins
  ctx.fillStyle = '#ddbbaa';
  ctx.beginPath();
  ctx.arc(cx + 5, cy + 2, 1, 0, Math.PI * 2);
  ctx.arc(cx + 4, cy + 4, 1, 0, Math.PI * 2);
  ctx.fill();

  // === THIGHS (pants) — pulled up to chest ===
  ctx.strokeStyle = costume.pants;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 1, cy + 3);
  ctx.lineTo(cx + 3, cy + 1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 1, cy + 4);
  ctx.lineTo(cx + 2, cy + 3);
  ctx.stroke();

  if (costume.skirt) {
    // Skirt bunched around tucked legs
    ctx.fillStyle = costume.skirt;
    ctx.beginPath();
    ctx.moveTo(cx - 1, cy + 1);
    ctx.lineTo(cx + 4, cy + 1);
    ctx.lineTo(cx + 3, cy + 5);
    ctx.lineTo(cx - 2, cy + 5);
    ctx.closePath();
    ctx.fill();
  }

  // === SHINS + BOOTS — folded under ===
  ctx.strokeStyle = costume.pants;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx + 3, cy + 1);
  ctx.lineTo(cx + 1, cy + 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 2, cy + 3);
  ctx.lineTo(cx, cy + 7);
  ctx.stroke();

  // Boots
  ctx.strokeStyle = costume.boots;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 1, cy + 6);
  ctx.lineTo(cx + 1, cy + 6);
  ctx.moveTo(cx - 2, cy + 7);
  ctx.lineTo(cx, cy + 7);
  ctx.stroke();
}

// ========================================================
//  LANDED POSE
// ========================================================

function drawLanded(
  ctx: CanvasRenderingContext2D,
  costume: Costume,
  targetType: TargetType,
  angle: number,
  _landedTime: number,
): void {
  // Origin is at the landing point (ground surface level)
  // y < 0 is above surface, y > 0 is below
  const headR = 2.5;

  // Flip the landed pose if the performer's head was on the right side at impact.
  // The default pose draws head to the left, matching angles ~180-360 (head-left).
  // For angles ~0-180 (head-right), mirror horizontally so there's no visual jump.
  const normAngle = ((angle % 360) + 360) % 360;
  const flip = normAngle > 0 && normAngle < 180;
  if (flip) {
    ctx.scale(-1, 1);
  }

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

    if (costume.skirt) {
      // Skirt fanned out on airbag
      ctx.fillStyle = costume.skirt;
      ctx.beginPath();
      ctx.moveTo(3, -3);
      ctx.lineTo(9, -4);
      ctx.lineTo(10, 2);
      ctx.lineTo(3, 1);
      ctx.closePath();
      ctx.fill();
      // Legs (skin) below skirt
      ctx.strokeStyle = '#ddbbaa';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(10, 1);
      ctx.moveTo(9, -2);
      ctx.lineTo(11, -2);
      ctx.stroke();
    } else {
      // Legs (pants) — slightly apart
      ctx.strokeStyle = costume.pants;
      ctx.beginPath();
      ctx.moveTo(3, -1);
      ctx.lineTo(8, 1);
      ctx.moveTo(3, -1);
      ctx.lineTo(9, -2);
      ctx.stroke();
    }

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

    if (costume.skirt) {
      // Skirt bunched up around sitting position
      ctx.fillStyle = costume.skirt;
      ctx.beginPath();
      ctx.moveTo(-1, -3);
      ctx.lineTo(-6, -1);
      ctx.lineTo(7, -1);
      ctx.lineTo(3, -3);
      ctx.closePath();
      ctx.fill();
      // Legs (skin) below skirt
      ctx.strokeStyle = '#ddbbaa';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-3, -1);
      ctx.lineTo(-4, 0);
      ctx.moveTo(4, -1);
      ctx.lineTo(5, 0);
      ctx.stroke();
    } else {
      // Legs (pants) — splayed out
      ctx.strokeStyle = costume.pants;
      ctx.beginPath();
      ctx.moveTo(1, -3);
      ctx.lineTo(-4, 0);
      ctx.moveTo(1, -3);
      ctx.lineTo(5, 0);
      ctx.stroke();
    }

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

  // Hat/wig — flew off during the jump, doesn't come back
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

  // Lens — flared outward like a camera lens
  ctx.fillStyle = '#555555';
  ctx.beginPath();
  ctx.moveTo(bodyW / 2, -2);
  ctx.lineTo(bodyW / 2 + 8, -bodyH / 2 - 1);
  ctx.lineTo(bodyW / 2 + 8, bodyH / 2 + 1);
  ctx.lineTo(bodyW / 2, 2);
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
