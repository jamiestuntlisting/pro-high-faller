import type { GameState } from '../types';
import { GAME_WIDTH, GAME_HEIGHT, PIXELS_PER_FOOT, RENDER_SCALE, CAMERA_CREW_OFFSET, naturalLandingDistance, landingZoneHeight } from '../constants';
import * as FallerRenderer from './FallerRenderer';
import * as EnvironmentRenderer from './EnvironmentRenderer';
import { getLayout, getSkyTopColor } from './EnvironmentRenderer';
import { lerp, lerpAngle } from '../utils/math';

interface WindParticle {
  x: number;
  y: number;
  phase: number; // sinusoidal vertical drift phase
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private windParticles: WindParticle[] | null = null;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  draw(state: GameState, alpha: number): void {
    const ctx = this.ctx;
    const f = state.faller;
    const layout = getLayout(state.level);

    // Interpolate
    const interpX = lerp(state.prevX, f.x, alpha);
    const interpY = lerp(state.prevY, f.y, alpha);
    const interpAngle = lerpAngle(state.prevAngle, f.angle, alpha);

    // Faller's position in world-pixel space (no camera offset)
    let fallerWorldY: number;
    let screenX: number;
    let pivotAtFeet = false;

    if (f.phase === 'STANDING' || f.phase === 'LEANING') {
      // Position faller ON the building, not past the edge
      // Body is ~14px wide at RENDER_SCALE, center needs to be left of edge
      screenX = layout.buildingEdgeX - 8 * RENDER_SCALE;
      // Nudge faller down so feet visually rest ON the rooftop glyph, not above it
      fallerWorldY = layout.buildingTopY + 4;
      pivotAtFeet = true;
    } else {
      fallerWorldY = layout.groundY - interpY * PIXELS_PER_FOOT;
      screenX = layout.buildingEdgeX + interpX * PIXELS_PER_FOOT;
      // Keep pivot at feet during JUMPING so they swing off the edge naturally
      if (f.phase === 'JUMPING') pivotAtFeet = true;
    }

    // Camera: keep faller at ~40% from top of viewport
    const targetOnScreen = GAME_HEIGHT * 0.4;
    const normalViewY = Math.min(fallerWorldY - targetOnScreen, 0);

    // Intro pan: smoothly move from ground level to faller position
    let viewY: number;
    if (state.introPanDuration > 0 && state.introPanTimer < state.introPanDuration) {
      const progress = state.introPanTimer / state.introPanDuration;
      const t = 0.5 - 0.5 * Math.cos(Math.PI * progress); // ease-in-out
      const panStartY = 0; // ground level
      viewY = panStartY + (normalViewY - panStartY) * t;
    } else {
      viewY = normalViewY;
    }

    // Clear the entire canvas (screen space, before transform)
    ctx.fillStyle = getSkyTopColor(state.level.level);
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Apply camera transform: shift world so viewY appears at screen top
    ctx.save();
    ctx.translate(0, -viewY);

    // Landed info for environment deformation
    const landedInfo = f.phase === 'LANDED'
      ? { x: screenX, angle: f.angle, time: state.landedTime }
      : null;

    // Draw environment (world space)
    EnvironmentRenderer.draw(ctx, state.level, layout, landedInfo, viewY);

    // Wind particles (world space, before faller so they appear behind)
    if (state.level.level === 0 && f.phase === 'FALLING') {
      // Practice level: show dynamic wind based on faller's horizontal velocity
      const visualWind = f.vx * 0.3;
      if (Math.abs(visualWind) > 0.5) {
        this.drawWindParticles(ctx, visualWind, layout.groundY, viewY, state.level.level);
      }
    } else if (state.level.wind !== 0) {
      this.drawWindParticles(ctx, state.level.wind, layout.groundY, viewY, state.level.level);
    }

    // Crew text Y — computed for both draw and overlay check
    const crewTextWorldY = layout.groundY - 36;
    const crewTextScreenY = crewTextWorldY - viewY;

    // Camera crew on far side of landing zone (world space) — skip for practice levels
    if (state.level.level > 0) {
      const baseCrewX = layout.landingCenterX + state.level.targetSize + CAMERA_CREW_OFFSET;
      FallerRenderer.drawCameraCrew(
        ctx, baseCrewX, layout.groundY, fallerWorldY, screenX,
        state.level.level, state.countdown.cameraRolling,
      );

      // Crew text — rendered above crew in world space, or as overlay if off-screen
      if (crewTextScreenY < GAME_HEIGHT) {
        this.drawCrewText(ctx, state, layout.groundY);
      }
    }

    // Cat twist: near landing on airbag/boxes, visually rotate toward back-first
    let drawAngle = interpAngle;
    let drawTucked = f.isTucked;

    if (f.phase === 'FALLING' && !f.verticalJump &&
        state.level.targetType !== 'water') {
      const centerFt = naturalLandingDistance(state.level.height);
      const halfWidthFt = state.level.targetSize / PIXELS_PER_FOOT + 1.5;
      const distFromCenter = Math.abs(interpX - centerFt);
      const overCatcher = distFromCenter <= halfWidthFt;

      if (overCatcher) {
        const matHeightFt = landingZoneHeight(state.level.height, state.level.targetType) / PIXELS_PER_FOOT;
        const heightAbove = interpY - matHeightFt;
        const TWIST_HEIGHT = 5; // feet above catcher to start twisting
        if (heightAbove > 0 && heightAbove < TWIST_HEIGHT) {
          const progress = 1 - heightAbove / TWIST_HEIGHT;
          const t = progress * progress; // ease-in (slow start, fast finish)
          const norm = ((interpAngle % 360) + 360) % 360;
          const target = norm <= 180 ? 90 : 270; // nearest horizontal (back-first)
          const diff = target - norm;
          drawAngle = interpAngle + diff * t;
          // Extend body for the twist
          if (progress > 0.3) drawTucked = false;
        }
      }
    }

    // Draw faller (world space)
    FallerRenderer.draw(
      ctx, screenX, fallerWorldY, drawAngle,
      f.phase, drawTucked, pivotAtFeet, state.elapsedTime,
      state.level.level, state.jumpTimer, state.level.targetType,
      state.landedTime, state.backFall, state.level.parachute === true,
    );

    ctx.restore();

    // If crew text is off-screen (camera at top of tall building), draw as screen overlay
    if (state.level.level > 0 && crewTextScreenY >= GAME_HEIGHT) {
      this.drawCrewTextOverlay(ctx, state);
    }
  }

  private drawCrewText(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    groundY: number,
  ): void {
    const text = state.crewCallout || state.crewText;
    if (!text) return;

    // Center text on canvas so long strings don't clip off the edges
    const textX = GAME_WIDTH / 2;
    const textY = groundY - 36;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Pick a font size that fits within the canvas width (with padding)
    let fontSize = 12;
    ctx.font = `bold ${fontSize}px monospace`;
    const maxTextWidth = GAME_WIDTH - 16;
    while (fontSize > 6 && ctx.measureText(text).width > maxTextWidth) {
      fontSize--;
      ctx.font = `bold ${fontSize}px monospace`;
    }

    // Color logic matching the old HUD style
    let color: string;
    if (state.crewCallout) {
      // Landing callouts — gold for good results, red for bad
      const callout = state.crewCallout;
      if (callout.includes('PANAVISION') || callout.includes('MISSED') ||
          callout.includes("WEREN'T ROLLING") || callout.includes('COLD FEET') ||
          callout.includes('HEAD')) {
        color = '#FF4444';
      } else if (callout.includes('BULLSEYE') || callout.includes('DEAD CENTER') ||
                 callout.includes('PERFECTLY')) {
        color = '#FFD700';
      } else {
        color = '#ffcc00';
      }
    } else {
      // Countdown text
      if (text.includes("DIDN'T GET") || text.includes("ROLL IT")) {
        color = '#FF4444';
      } else if (text.includes('GOT THE SHOT')) {
        color = '#66CC66';
      } else if (text.includes('GO!')) {
        color = '#FF8844';
      } else if (text.includes('ACTION')) {
        color = '#FFD700';
      } else {
        color = '#aaaaaa';
      }
    }

    // Shadow for readability
    ctx.fillStyle = '#000000';
    ctx.fillText(text, textX + 1, textY + 1);
    ctx.fillText(text, textX - 1, textY - 1);
    ctx.fillText(text, textX + 1, textY - 1);
    ctx.fillText(text, textX - 1, textY + 1);

    ctx.fillStyle = color;
    ctx.fillText(text, textX, textY);
    ctx.restore();
  }

  /** Draw crew text as a screen-space overlay when crew is off-screen (tall buildings) */
  private drawCrewTextOverlay(ctx: CanvasRenderingContext2D, state: GameState): void {
    const text = state.crewCallout || state.crewText;
    if (!text) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Pick a font size that fits within the canvas width (with padding)
    let fontSize = 14;
    ctx.font = `bold ${fontSize}px monospace`;
    const maxTextWidth = GAME_WIDTH - 16;
    while (fontSize > 7 && ctx.measureText(text).width > maxTextWidth) {
      fontSize--;
      ctx.font = `bold ${fontSize}px monospace`;
    }

    // Same color logic as drawCrewText
    let color: string;
    if (state.crewCallout) {
      const callout = state.crewCallout;
      if (callout.includes('PANAVISION') || callout.includes('MISSED') ||
          callout.includes("WEREN'T ROLLING") || callout.includes('COLD FEET') ||
          callout.includes('HEAD') || callout.includes('FELL STRAIGHT')) {
        color = '#FF4444';
      } else if (callout.includes('BULLSEYE') || callout.includes('DEAD CENTER') ||
                 callout.includes('PERFECTLY')) {
        color = '#FFD700';
      } else {
        color = '#ffcc00';
      }
    } else {
      if (text.includes("DIDN'T GET") || text.includes("ROLL IT")) {
        color = '#FF4444';
      } else if (text.includes('GOT THE SHOT')) {
        color = '#66CC66';
      } else if (text.includes('GO!')) {
        color = '#FF8844';
      } else if (text.includes('ACTION')) {
        color = '#FFD700';
      } else {
        color = '#aaaaaa';
      }
    }

    const x = GAME_WIDTH / 2;
    const y = GAME_HEIGHT - 20;

    // Shadow
    ctx.fillStyle = '#000000';
    ctx.fillText(text, x + 1, y + 1);
    ctx.fillText(text, x - 1, y - 1);
    ctx.fillText(text, x + 1, y - 1);
    ctx.fillText(text, x - 1, y + 1);

    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  private drawWindParticles(
    ctx: CanvasRenderingContext2D,
    wind: number,
    groundY: number,
    viewY: number,
    level: number,
  ): void {
    // Lazy init particles
    if (!this.windParticles) {
      this.windParticles = [];
      for (let i = 0; i < 40; i++) {
        this.windParticles.push({
          x: Math.random() * GAME_WIDTH,
          y: viewY + Math.random() * GAME_HEIGHT,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    const particles = this.windParticles;
    const speed = wind * 0.5;
    const viewTop = viewY;
    const viewBottom = viewY + GAME_HEIGHT;

    // Wind appearance — streaks that contrast with background
    // Bright against dark themes, dark against light themes
    const theme = EnvironmentRenderer.getTheme(level);
    const skyBrightness = theme.skyStops[0][1]; // top sky color
    const isDark = skyBrightness.startsWith('#0') || skyBrightness.startsWith('#1') || skyBrightness.startsWith('#2');
    const windColor = isDark ? 'rgba(200, 220, 255, 0.8)' : 'rgba(20, 15, 10, 0.7)';
    const streakLen = Math.min(Math.abs(wind) * 3, 24);

    for (const p of particles) {
      // Move horizontally by wind
      p.x += speed * 0.3;
      // Slight vertical sinusoidal drift
      p.phase += 0.02;
      p.y += Math.sin(p.phase) * 0.3;

      // Wrap horizontally
      if (speed > 0 && p.x > GAME_WIDTH + 5) {
        p.x = -streakLen;
        p.y = viewTop + Math.random() * (viewBottom - viewTop);
      } else if (speed < 0 && p.x < -streakLen) {
        p.x = GAME_WIDTH + 5;
        p.y = viewTop + Math.random() * (viewBottom - viewTop);
      }

      // Only draw if in view and above ground
      if (p.y >= viewTop && p.y <= groundY) {
        // Draw as directional streaks, not dots
        ctx.strokeStyle = windColor;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + (speed > 0 ? streakLen : -streakLen), p.y + Math.sin(p.phase) * 1.5);
        ctx.stroke();
      }
    }
  }

}
