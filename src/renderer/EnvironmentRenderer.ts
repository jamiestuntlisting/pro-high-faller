import type { LevelConfig } from '../types';
import { GAME_WIDTH, GAME_HEIGHT, RENDER, PIXELS_PER_FOOT, naturalLandingDistance, landingZoneHeight } from '../constants';

/** Building width in pixels — left side of screen */
export const BUILDING_WIDTH_PX = 55;

// ========================================================
//  BACKGROUND THEMES — subtle sky gradients + silhouettes
// ========================================================

interface BgTheme {
  skyTop: string;       // color at top of sky
  skyBottom: string;    // color near horizon
  groundColor: string;  // ground tint
  silhouette?: 'city' | 'mountains' | 'desert' | 'ocean';
}

const THEMES: Record<string, BgTheme> = {
  nightCity:   { skyTop: '#060612', skyBottom: '#0e1428', groundColor: '#0c0c10', silhouette: 'city' },
  sunset:      { skyTop: '#1a0a1e', skyBottom: '#2a1008', groundColor: '#140c08', silhouette: 'city' },
  overcast:    { skyTop: '#0c0e12', skyBottom: '#141618', groundColor: '#0e0e0e' },
  dusk:        { skyTop: '#08061a', skyBottom: '#121028', groundColor: '#0a0a12', silhouette: 'city' },
  mountains:   { skyTop: '#060a14', skyBottom: '#0c1420', groundColor: '#0a0e0a', silhouette: 'mountains' },
  desert:      { skyTop: '#1a1008', skyBottom: '#1e1408', groundColor: '#14100a', silhouette: 'desert' },
  ocean:       { skyTop: '#06101a', skyBottom: '#081420', groundColor: '#080e14', silhouette: 'ocean' },
  dawn:        { skyTop: '#120818', skyBottom: '#1a0c14', groundColor: '#100a0e' },
};

// Map levels to themes by production name feel
const LEVEL_THEMES: Record<number, string> = {
  1: 'nightCity', 2: 'overcast', 3: 'sunset', 4: 'nightCity', 5: 'dusk',
  6: 'overcast', 7: 'dusk', 8: 'nightCity', 9: 'nightCity', 10: 'sunset',
  11: 'dusk', 12: 'ocean', 13: 'overcast', 14: 'sunset', 15: 'mountains',
  16: 'mountains', 17: 'desert', 18: 'dusk', 19: 'desert', 20: 'sunset',
  21: 'dawn', 22: 'overcast', 23: 'mountains', 24: 'dawn', 25: 'nightCity',
  26: 'ocean', 27: 'sunset', 28: 'dusk', 29: 'ocean', 30: 'nightCity',
  31: 'overcast', 32: 'ocean', 33: 'dawn', 34: 'dusk', 35: 'mountains',
  36: 'sunset', 37: 'nightCity', 38: 'ocean', 39: 'dawn', 40: 'desert',
};

export function getTheme(level: number): BgTheme {
  const key = LEVEL_THEMES[level] || 'nightCity';
  return THEMES[key] || THEMES.nightCity;
}

export function getSkyTopColor(level: number): string {
  return getTheme(level).skyTop;
}

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
  const theme = getTheme(level.level);

  // === SKY with gradient === (extends above building top for camera scrolling)
  const skyTop = buildingTopY - GAME_HEIGHT;
  const skyH = groundY - skyTop;
  const grad = ctx.createLinearGradient(0, skyTop, 0, groundY);
  grad.addColorStop(0, theme.skyTop);
  grad.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, skyTop, GAME_WIDTH, skyH);

  // === DISTANT SILHOUETTES (behind building, very subtle) ===
  if (theme.silhouette) {
    drawSilhouette(ctx, theme.silhouette, groundY, buildingEdgeX);
  }

  // === GROUND ===
  ctx.fillStyle = theme.groundColor;
  ctx.fillRect(0, groundY, GAME_WIDTH, GAME_HEIGHT);

  // Ground line as dashes
  ctx.font = '7px monospace';
  ctx.fillStyle = RENDER.ASCII_DIM;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  for (let gx = 0; gx < GAME_WIDTH; gx += 6) {
    ctx.fillText('-', gx, groundY);
  }

  // === STRUCTURE (building, helicopter, or balloon) ===
  const jumpType = level.jumpType || 'building';
  if (jumpType === 'helicopter') {
    drawHelicopter(ctx, buildingEdgeX, buildingTopY);
  } else if (jumpType === 'balloon') {
    drawBalloon(ctx, buildingEdgeX, buildingTopY);
  } else {
    drawBuilding(ctx, buildingEdgeX, buildingTopY, groundY, level.height);
  }

  // === LANDING ZONE ===
  drawLandingZone(ctx, level, layout, landedInfo ?? null);
}

// ========================================================
//  DISTANT SILHOUETTES — very dim shapes behind everything
// ========================================================

function drawSilhouette(
  ctx: CanvasRenderingContext2D,
  type: string,
  groundY: number,
  buildingEdgeX: number,
): void {
  ctx.save();

  if (type === 'city') {
    // Distant city skyline — very dim blocks behind the action area
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    const buildings = [
      { x: 80, w: 12, h: 35 }, { x: 100, w: 8, h: 22 }, { x: 115, w: 14, h: 45 },
      { x: 140, w: 10, h: 28 }, { x: 160, w: 16, h: 52 }, { x: 185, w: 10, h: 30 },
      { x: 200, w: 12, h: 38 }, { x: 220, w: 8, h: 20 }, { x: 240, w: 14, h: 42 },
      { x: 260, w: 10, h: 26 }, { x: 280, w: 12, h: 34 }, { x: 300, w: 8, h: 18 },
    ];
    for (const b of buildings) {
      if (b.x > buildingEdgeX) {
        ctx.fillRect(b.x, groundY - b.h, b.w, b.h);
      }
    }
    // Slightly brighter windows on a couple buildings
    ctx.fillStyle = 'rgba(255,255,200,0.03)';
    ctx.fillRect(163, groundY - 48, 3, 2);
    ctx.fillRect(167, groundY - 42, 3, 2);
    ctx.fillRect(118, groundY - 38, 3, 2);
    ctx.fillRect(243, groundY - 36, 3, 2);

  } else if (type === 'mountains') {
    // Distant mountain range — subtle triangular shapes
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.beginPath();
    ctx.moveTo(60, groundY);
    ctx.lineTo(110, groundY - 55);
    ctx.lineTo(160, groundY);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.beginPath();
    ctx.moveTo(120, groundY);
    ctx.lineTo(190, groundY - 70);
    ctx.lineTo(260, groundY);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    ctx.beginPath();
    ctx.moveTo(200, groundY);
    ctx.lineTo(250, groundY - 45);
    ctx.lineTo(320, groundY);
    ctx.fill();

    // Snow caps
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.moveTo(105, groundY - 50);
    ctx.lineTo(110, groundY - 55);
    ctx.lineTo(115, groundY - 50);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(183, groundY - 64);
    ctx.lineTo(190, groundY - 70);
    ctx.lineTo(197, groundY - 64);
    ctx.fill();

  } else if (type === 'desert') {
    // Distant mesa / butte silhouettes
    ctx.fillStyle = 'rgba(255,200,150,0.03)';
    // Large mesa
    ctx.beginPath();
    ctx.moveTo(130, groundY);
    ctx.lineTo(140, groundY - 30);
    ctx.lineTo(200, groundY - 30);
    ctx.lineTo(210, groundY);
    ctx.fill();
    // Small butte
    ctx.beginPath();
    ctx.moveTo(240, groundY);
    ctx.lineTo(252, groundY - 22);
    ctx.lineTo(268, groundY - 22);
    ctx.lineTo(280, groundY);
    ctx.fill();
    // Distant butte
    ctx.fillStyle = 'rgba(255,200,150,0.02)';
    ctx.beginPath();
    ctx.moveTo(85, groundY);
    ctx.lineTo(95, groundY - 18);
    ctx.lineTo(115, groundY - 18);
    ctx.lineTo(125, groundY);
    ctx.fill();

  } else if (type === 'ocean') {
    // Gentle wave horizon line
    ctx.strokeStyle = 'rgba(100,160,200,0.04)';
    ctx.lineWidth = 1;
    for (let row = 0; row < 3; row++) {
      const y = groundY - 8 - row * 6;
      ctx.beginPath();
      for (let x = buildingEdgeX + 10; x < GAME_WIDTH; x += 2) {
        const wave = Math.sin(x * 0.08 + row * 2) * 2;
        if (x === buildingEdgeX + 10) ctx.moveTo(x, y + wave);
        else ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  edgeX: number,
  topY: number,
  groundY: number,
  heightFt: number,
): void {
  ctx.font = '7px monospace';
  const cw = 6;
  const ch = 8;

  const cols = Math.floor(edgeX / cw);
  const startRow = Math.floor(topY / ch);
  const endRow = Math.floor(groundY / ch);


  // Floor height: ~10ft per floor = 40px = 5 rows
  const rowsPerFloor = 5;
  const totalFloors = Math.max(1, Math.round(heightFt / 10));

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  for (let row = startRow; row < endRow; row++) {
    const rowInBuilding = row - startRow;
    const floorFromTop = Math.floor(rowInBuilding / rowsPerFloor);
    const rowInFloor = rowInBuilding % rowsPerFloor;
    const floorNum = totalFloors - floorFromTop;

    for (let col = 0; col < cols; col++) {
      const y = row * ch;
      const x = col * cw;

      if (col === cols - 1) {
        // Right edge
        ctx.fillStyle = RENDER.ASCII_MED;
        ctx.fillText('|', x, y);
      } else if (rowInFloor === 0 && col < cols - 1) {
        // Floor separator line
        ctx.fillStyle = RENDER.ASCII_DIM;
        ctx.fillText('-', x, y);
      } else if (rowInFloor >= 1 && rowInFloor <= 3 && col >= 1 && col <= cols - 3 && (col % 3 === 1)) {
        // Window columns — lit or dark
        const isLit = ((floorFromTop * 7 + col * 3) % 5) < 2;
        ctx.fillStyle = isLit ? '#445566' : '#1a1a22';
        ctx.fillText('░', x, y);
      } else {
        ctx.fillStyle = RENDER.ASCII_DIM;
        ctx.fillText('#', x, y);
      }
    }

    // Floor number label on every 5th floor (right side inside building)
    if (rowInFloor === 2 && floorNum > 0 && floorNum % 5 === 0 && floorNum < totalFloors) {
      ctx.fillStyle = '#444444';
      ctx.font = '6px monospace';
      ctx.fillText(String(floorNum), 2, row * ch);
      ctx.font = '7px monospace';
    }
  }

  // Rooftop
  ctx.fillStyle = RENDER.ASCII_BRIGHT;
  for (let rx = 0; rx < edgeX; rx += cw) {
    ctx.fillText('=', rx, topY);
  }

  // Corner
  ctx.fillStyle = RENDER.ASCII_WHITE;
  ctx.fillText(']', edgeX - cw, topY);
}

function drawHelicopter(
  ctx: CanvasRenderingContext2D,
  edgeX: number,
  topY: number,
): void {
  // Helicopter centered above where the performer stands
  const cx = edgeX - 10;
  const cy = topY - 10;

  ctx.save();
  ctx.lineCap = 'round';

  // Main rotor — spinning line
  ctx.strokeStyle = '#777777';
  ctx.lineWidth = 1.5;
  const time = Date.now() / 80;
  const rotorLen = 30;
  ctx.beginPath();
  ctx.moveTo(cx - rotorLen * Math.cos(time), cy - 18);
  ctx.lineTo(cx + rotorLen * Math.cos(time), cy - 18);
  ctx.stroke();

  // Rotor mast
  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 18);
  ctx.lineTo(cx, cy - 10);
  ctx.stroke();

  // Body — rounded rectangle shape
  ctx.fillStyle = '#444444';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 5, 18, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cockpit windshield
  ctx.fillStyle = '#556677';
  ctx.beginPath();
  ctx.ellipse(cx + 10, cy - 6, 6, 5, 0.2, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.fill();

  // Tail boom
  ctx.strokeStyle = '#444444';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy - 5);
  ctx.lineTo(cx - 35, cy - 12);
  ctx.stroke();

  // Tail rotor
  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 35, cy - 18);
  ctx.lineTo(cx - 35, cy - 6);
  ctx.stroke();

  // Skids
  ctx.strokeStyle = '#555555';
  ctx.lineWidth = 1.5;
  // Left skid strut
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy + 2);
  ctx.lineTo(cx - 10, cy + 8);
  ctx.stroke();
  // Right skid strut
  ctx.beginPath();
  ctx.moveTo(cx + 8, cy + 2);
  ctx.lineTo(cx + 6, cy + 8);
  ctx.stroke();
  // Skid bars
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy + 8);
  ctx.lineTo(cx + 12, cy + 8);
  ctx.stroke();

  ctx.restore();
}

function drawBalloon(
  ctx: CanvasRenderingContext2D,
  edgeX: number,
  topY: number,
): void {
  const cx = edgeX - 5;
  const basketY = topY + 2;

  ctx.save();
  ctx.lineCap = 'round';

  // Envelope (the big balloon part)
  const envCY = basketY - 40;
  const envRX = 22;
  const envRY = 28;

  // Envelope body — gradient stripes
  const stripeColors = ['#cc3333', '#cc8833', '#cccc33', '#cc3333', '#cc8833'];
  const stripeWidth = envRX * 2 / stripeColors.length;
  for (let i = 0; i < stripeColors.length; i++) {
    ctx.fillStyle = stripeColors[i];
    const sx = cx - envRX + i * stripeWidth;
    ctx.beginPath();
    // clip to ellipse by drawing arcs
    for (let py = envCY - envRY; py <= envCY + envRY; py += 1) {
      const dy = py - envCY;
      const halfW = envRX * Math.sqrt(1 - (dy * dy) / (envRY * envRY));
      const lx = cx - halfW;
      const rx = cx + halfW;
      const clipLeft = Math.max(sx, lx);
      const clipRight = Math.min(sx + stripeWidth, rx);
      if (clipRight > clipLeft) {
        ctx.fillRect(clipLeft, py, clipRight - clipLeft, 1);
      }
    }
  }

  // Envelope outline
  ctx.strokeStyle = '#884422';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, envCY, envRX, envRY, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Ropes from envelope to basket
  ctx.strokeStyle = '#886644';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 10, envCY + envRY - 2);
  ctx.lineTo(cx - 6, basketY);
  ctx.moveTo(cx + 10, envCY + envRY - 2);
  ctx.lineTo(cx + 6, basketY);
  ctx.stroke();

  // Basket
  ctx.fillStyle = '#664422';
  ctx.fillRect(cx - 8, basketY, 16, 10);
  // Basket rim
  ctx.strokeStyle = '#886644';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 9, basketY);
  ctx.lineTo(cx + 9, basketY);
  ctx.stroke();
  // Basket weave pattern
  ctx.strokeStyle = '#553311';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(cx - 8, basketY + 4);
  ctx.lineTo(cx + 8, basketY + 4);
  ctx.moveTo(cx - 8, basketY + 7);
  ctx.lineTo(cx + 8, basketY + 7);
  ctx.stroke();

  ctx.restore();
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

    // Water splash animation — only if performer actually hit the water
    const hitWater = landedInfo && landedInfo.x >= left && landedInfo.x <= right;
    if (hitWater && landedInfo.time < 1.5) {
      const t = landedInfo.time;
      const splashAlpha = Math.max(0, 1 - t / 1.5);
      const waterSurface = groundY - matHeight; // top of water

      ctx.save();
      ctx.globalAlpha = splashAlpha;

      // Splash droplets rising and falling from water surface
      const dropCount = 8;
      for (let i = 0; i < dropCount; i++) {
        const seed = ((i * 17 + 7) % 13) / 13;
        const spreadX = (seed - 0.5) * 40;
        const launchV = 20 + seed * 30;
        const dropY = waterSurface - launchV * t + 60 * t * t;
        const dropX = landedInfo.x + spreadX * t;

        if (dropY < waterSurface) {
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
      ctx.ellipse(landedInfo.x, waterSurface, ringRadius, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (t < 0.8) {
        const ring2 = 2 + t * 15;
        ctx.beginPath();
        ctx.ellipse(landedInfo.x, waterSurface, ring2, 2, 0, 0, Math.PI * 2);
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
