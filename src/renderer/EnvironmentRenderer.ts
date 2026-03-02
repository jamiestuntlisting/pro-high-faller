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
  } else {
    const matTop = groundY - matHeight;

    if (level.targetType === 'airbag') {
      // Compute indent at each column if performer has landed
      const getIndent = (px: number): number => {
        if (!landedInfo) return 0;
        const dist = Math.abs(px - landedInfo.x);
        // Smooth gaussian-ish falloff, 4px max indent, 20px radius
        if (dist > 20) return 0;
        return Math.round(4 * Math.exp(-(dist * dist) / 100));
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
          // Only draw body chars below the indented top
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
      // When landed, shift boxes near impact point
      ctx.textBaseline = 'top';
      const boxRows = Math.max(2, Math.floor(matHeight / 4));
      for (let r = 0; r < boxRows; r++) {
        const shade = r % 2 === 0 ? RENDER.ASCII_DIM : '#443322';
        ctx.fillStyle = shade;
        const baseOffset = (r % 2) * 6;
        for (let mx = left + baseOffset; mx < right; mx += 12) {
          let drawX = mx;
          let drawY = matTop + r * 4;
          // Scatter boxes near impact
          if (landedInfo && r < 2) {
            const dist = Math.abs(mx - landedInfo.x);
            if (dist < 15) {
              // Deterministic scatter based on position
              const hash = ((mx * 7 + r * 13) % 5) - 2;
              drawX += hash;
              drawY += Math.abs(hash) > 1 ? 1 : 0;
            }
          }
          ctx.fillText('[##]', drawX, drawY);
        }
      }
    }
  }

  // No center marker — the performer needs to judge their own landing
}
