import type { LevelConfig } from '../types';
import { GAME_WIDTH, GAME_HEIGHT, RENDER, PIXELS_PER_FOOT, naturalLandingDistance, landingZoneHeight } from '../constants';

/** Building width in pixels — left side of screen */
export const BUILDING_WIDTH_PX = 55;

export interface SceneLayout {
  buildingTopY: number;
  buildingEdgeX: number;
  groundY: number;
  landingCenterX: number;    // Computed from natural trajectory
  buildingHeightPx: number;
}

/** Info about where the performer landed, for deformation visuals */
export interface LandedInfo {
  x: number;     // screen-space X of the faller
  angle: number; // landing angle
  time: number;  // seconds since landing (for splash animation)
}

export function getLayout(level: LevelConfig): SceneLayout {
  const groundY = RENDER.GROUND_Y;
  const buildingHeightPx = level.height * PIXELS_PER_FOOT;
  const buildingTopY = groundY - buildingHeightPx;

  // Landing zone placed where performer naturally lands
  const landingDistFt = naturalLandingDistance(level.height);
  const landingCenterX = BUILDING_WIDTH_PX + landingDistFt * PIXELS_PER_FOOT;

  return {
    buildingTopY,
    buildingEdgeX: BUILDING_WIDTH_PX,
    groundY,
    landingCenterX,
    buildingHeightPx,
  };
}

export function draw(
  ctx: CanvasRenderingContext2D,
  level: LevelConfig,
  layout: SceneLayout,
  landedInfo?: LandedInfo | null,
): void {
  const { groundY, buildingTopY, buildingEdgeX } = layout;

  // === SKY === (extends above building top for camera scrolling)
  ctx.fillStyle = RENDER.SKY_COLOR;
  ctx.fillRect(0, buildingTopY - GAME_HEIGHT, GAME_WIDTH, groundY - buildingTopY + GAME_HEIGHT);

  // === GROUND ===
  ctx.fillStyle = RENDER.GROUND_COLOR;
  ctx.fillRect(0, groundY, GAME_WIDTH, GAME_HEIGHT);

  // Ground line as dashes
  ctx.font = '7px monospace';
  ctx.fillStyle = RENDER.ASCII_DIM;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  for (let gx = 0; gx < GAME_WIDTH; gx += 6) {
    ctx.fillText('-', gx, groundY);
  }

  // === BUILDING ===
  drawBuilding(ctx, buildingEdgeX, buildingTopY, groundY);

  // === LANDING ZONE ===
  drawLandingZone(ctx, level, layout, landedInfo ?? null);
}

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  edgeX: number,
  topY: number,
  groundY: number,
): void {
  ctx.font = '7px monospace';
  const cw = 6;
  const ch = 8;

  const cols = Math.floor(edgeX / cw);
  const startRow = Math.floor(topY / ch);
  const endRow = Math.floor(groundY / ch);

  for (let row = startRow; row < endRow; row++) {
    for (let col = 0; col < cols; col++) {
      const y = row * ch;
      const x = col * cw;
      if (col === cols - 1) {
        ctx.fillStyle = RENDER.ASCII_MED;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('|', x, y);
      } else {
        const isWindow = (row % 3 === 1) && (col % 3 === 1);
        ctx.fillStyle = isWindow ? RENDER.ASCII_MED : RENDER.ASCII_DIM;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(isWindow ? '░' : '#', x, y);
      }
    }
  }

  // Rooftop
  ctx.fillStyle = RENDER.ASCII_BRIGHT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  for (let rx = 0; rx < edgeX; rx += cw) {
    ctx.fillText('=', rx, topY);
  }

  // Corner
  ctx.fillStyle = RENDER.ASCII_WHITE;
  ctx.fillText(']', edgeX - cw, topY);
}

function drawLandingZone(
  ctx: CanvasRenderingContext2D,
  level: LevelConfig,
  layout: SceneLayout,
  landedInfo: LandedInfo | null,
): void {
  const { groundY, landingCenterX } = layout;
  const halfW = level.targetSize;
  const left = landingCenterX - halfW;
  const right = landingCenterX + halfW;

  ctx.font = '7px monospace';
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left';

  const matHeight = landingZoneHeight(level.height, level.targetType);

  if (level.targetType === 'water') {
    // Rows of waves scaling with depth
    const rows = Math.max(2, Math.floor(matHeight / 7));
    for (let r = 0; r < rows; r++) {
      const shade = r === 0 ? '#4477aa' : r === 1 ? '#335588' : '#224466';
      ctx.fillStyle = shade;
      const offset = (r % 2) * 3;
      const rowY = groundY - r * 7;
      for (let wx = left + offset; wx < right; wx += 6) {
        ctx.fillText('~', wx, rowY);
      }
    }

    // Water splash animation on landing
    if (landedInfo && landedInfo.time < 1.5) {
      const t = landedInfo.time;
      const splashAlpha = Math.max(0, 1 - t / 1.5);
      ctx.save();
      ctx.globalAlpha = splashAlpha;

      // Splash droplets rising and falling
      const dropCount = 8;
      for (let i = 0; i < dropCount; i++) {
        const seed = ((i * 17 + 7) % 13) / 13;
        const spreadX = (seed - 0.5) * 40;
        const launchV = 20 + seed * 30;
        const dropY = groundY - launchV * t + 60 * t * t; // gravity pulls back
        const dropX = landedInfo.x + spreadX * t;

        if (dropY < groundY) {
          ctx.fillStyle = '#88bbdd';
          ctx.beginPath();
          ctx.arc(dropX, dropY, 1.5 - t * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Splash rings on water surface
      const ringRadius = 5 + t * 25;
      ctx.strokeStyle = '#88bbdd';
      ctx.lineWidth = 1.5 - t;
      ctx.beginPath();
      ctx.ellipse(landedInfo.x, groundY - 2, ringRadius, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (t < 0.8) {
        const ring2 = 2 + t * 15;
        ctx.beginPath();
        ctx.ellipse(landedInfo.x, groundY - 2, ring2, 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }
  } else {
    const matTop = groundY - matHeight;

    if (level.targetType === 'airbag') {
      // Compute indent at each column if performer has landed
      const getIndent = (px: number): number => {
        if (!landedInfo) return 0;
        const dist = Math.abs(px - landedInfo.x);
        // Deep gaussian fold, 10px max indent, 30px radius
        if (dist > 30) return 0;
        return Math.round(10 * Math.exp(-(dist * dist) / 180));
      };

      // Top edge — indents where the performer landed
      ctx.fillStyle = RENDER.ASCII_MED;
      ctx.textBaseline = 'top';
      ctx.fillText('[', left, matTop + getIndent(left));
      for (let mx = left + 6; mx < right - 6; mx += 6) {
        ctx.fillText('=', mx, matTop + getIndent(mx));
      }
      ctx.fillText(']', right - 6, matTop + getIndent(right - 6));

      // Fill body rows
      const bodyRows = Math.max(1, Math.floor((matHeight - 8) / 4));
      for (let r = 0; r < bodyRows; r++) {
        ctx.fillStyle = r % 2 === 0 ? RENDER.ASCII_DIM : '#1a1a1a';
        for (let mx = left + 6; mx < right - 6; mx += 6) {
          const indent = getIndent(mx);
          const charY = matTop + 4 + r * 4;
          if (charY >= matTop + indent) {
            ctx.fillText('█', mx, charY);
          }
        }
      }

      // Bottom edge
      ctx.fillStyle = RENDER.ASCII_MED;
      for (let mx = left; mx < right; mx += 6) {
        ctx.fillText('-', mx, groundY - 4);
      }
    } else {
      // Boxes — stack rows of [##] scaling with height
      // When landed, crush and scatter boxes at impact point
      ctx.textBaseline = 'top';
      const boxRows = Math.max(2, Math.floor(matHeight / 4));
      for (let r = 0; r < boxRows; r++) {
        const shade = r % 2 === 0 ? RENDER.ASCII_DIM : '#443322';
        ctx.fillStyle = shade;
        const baseOffset = (r % 2) * 6;
        for (let mx = left + baseOffset; mx < right; mx += 12) {
          let drawX = mx;
          let drawY = matTop + r * 4;
          let boxText = '[##]';

          if (landedInfo) {
            const dist = Math.abs(mx - landedInfo.x);
            if (dist < 25) {
              if (r < 2) {
                // Top rows: scatter outward and crush
                const hash = ((mx * 7 + r * 13) % 5) - 2;
                const push = dist < 10 ? (landedInfo.x > mx ? -3 : 3) : 0;
                drawX += hash * 2 + push;
                drawY += Math.round(3 * Math.exp(-(dist * dist) / 120));
                if (dist < 8 && r === 0) {
                  boxText = '[__]'; // crushed flat
                  ctx.fillStyle = '#332211';
                }
              } else if (r < 4) {
                const hash = ((mx * 7 + r * 13) % 3) - 1;
                drawX += hash;
              }
            }
          }

          ctx.fillText(boxText, drawX, drawY);
          // Restore shade after crushed box override
          ctx.fillStyle = shade;
        }
      }
    }
  }

  // No center marker — the performer needs to judge their own landing
}
