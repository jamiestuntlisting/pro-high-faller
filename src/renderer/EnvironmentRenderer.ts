import type { LevelConfig } from '../types';
import { GAME_WIDTH, GAME_HEIGHT, RENDER, PIXELS_PER_FOOT, naturalLandingDistance, landingZoneHeight } from '../constants';

/** Building width in pixels — left side of screen */
export const BUILDING_WIDTH_PX = 55;

// ========================================================
//  BACKGROUND THEMES — vivid sky gradients + silhouettes
// ========================================================

interface BgTheme {
  skyStops: [number, string][];  // multi-stop gradient [position, color]
  groundColor: string;
  silhouette?: 'city' | 'mountains' | 'desert' | 'ocean';
  stars?: boolean;
  moon?: boolean;
  clouds?: boolean;
}

const THEMES: Record<string, BgTheme> = {
  nightCity: {
    skyStops: [[0, '#050520'], [0.5, '#0c0c38'], [1, '#141430']],
    groundColor: '#0a0a14',
    silhouette: 'city',
    stars: true,
    moon: true,
  },
  sunset: {
    skyStops: [[0, '#15032e'], [0.2, '#5a1040'], [0.45, '#aa2818'], [0.7, '#dd6611'], [0.9, '#eeaa22'], [1, '#ffcc44']],
    groundColor: '#1a0e06',
    silhouette: 'city',
  },
  stormyCity: {
    skyStops: [[0, '#0a0e14'], [0.3, '#161e28'], [0.6, '#222e3a'], [0.85, '#2a3844'], [1, '#344050']],
    groundColor: '#0e1218',
    silhouette: 'city',
    clouds: true,
  },
  dusk: {
    skyStops: [[0, '#08082e'], [0.4, '#1a1050'], [0.7, '#301a4a'], [1, '#401a38']],
    groundColor: '#0c0a18',
    silhouette: 'city',
    stars: true,
  },
  mountains: {
    skyStops: [[0, '#102244'], [0.4, '#2a5588'], [0.7, '#4499bb'], [1, '#66bbcc']],
    groundColor: '#141e14',
    silhouette: 'mountains',
  },
  wildWest: {
    skyStops: [[0, '#200808'], [0.2, '#552010'], [0.4, '#aa3818'], [0.6, '#dd6611'], [0.8, '#eeaa22'], [1, '#ffcc44']],
    groundColor: '#1a0e06',
    silhouette: 'desert',
  },
  desert: {
    skyStops: [[0, '#402800'], [0.3, '#886030'], [0.6, '#bb8833'], [1, '#ddaa44']],
    groundColor: '#221808',
    silhouette: 'desert',
  },
  tropical: {
    skyStops: [[0, '#0a1e44'], [0.3, '#441855'], [0.5, '#aa3355'], [0.7, '#dd7744'], [1, '#ffcc88']],
    groundColor: '#081622',
    silhouette: 'ocean',
    clouds: true,
  },
  ocean: {
    skyStops: [[0, '#0a1e44'], [0.4, '#1a4477'], [0.7, '#2a77aa'], [1, '#44aacc']],
    groundColor: '#081622',
    silhouette: 'ocean',
  },
  dawn: {
    skyStops: [[0, '#180a33'], [0.2, '#441560'], [0.45, '#bb3355'], [0.7, '#ee7744'], [1, '#ffdd77']],
    groundColor: '#1a1008',
  },
};

// Theme matched to costume — costumes cycle every 21 levels via (level-1) % 21
const COSTUME_THEMES: string[] = [
  'nightCity',   // 0: Red Plaid Flannel — Hollywood night shoot
  'stormyCity',  // 1: Denim Jacket — stormy urban set
  'nightCity',   // 2: Police — cop show night shoot
  'sunset',      // 3: Bruce Lee — dramatic martial arts action
  'dawn',        // 4: Red Tracksuit — sunrise training montage
  'wildWest',    // 5: Cowboy — epic western sunset
  'stormyCity',  // 6: Chaplin — moody silent film city
  'nightCity',   // 7: Disco — nightclub scene
  'sunset',      // 8: Woman in Dress — romantic dramatic backdrop
  'nightCity',   // 9: Superhero — dark sky, red cape pops
  'tropical',    // 10: Hawaiian — warm ocean sunset
  'mountains',   // 11: Green Jacket — outdoors, wilderness
  'dusk',        // 12: Black Tee — casual evening
  'desert',      // 13: Orange Jumpsuit — prison in the desert
  'mountains',   // 14: Leather Cowboy — rugged mountain west
  'stormyCity',  // 15: Hi-Vis — construction site, stormy day
  'nightCity',   // 16: Spy — espionage under cover of night
  'dusk',        // 17: Fantasy Wizard — mystical twilight
  'stormyCity',  // 18: Waldo — busy urban scene
  'mountains',   // 19: Gorilla — wilderness
  'nightCity',   // 20: Straitjacket — dark institutional night
  'sunset',      // 21: Sumo Wrestler — dramatic arena sunset
  'dawn',        // 22: Easter Bunny — spring morning
];

export function getTheme(level: number): BgTheme {
  const costumeIdx = (level - 1) % COSTUME_THEMES.length;
  const key = COSTUME_THEMES[costumeIdx];
  return THEMES[key] || THEMES.nightCity;
}

export function getSkyTopColor(level: number): string {
  return getTheme(level).skyStops[0][1];
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
  viewY: number = 0,
): void {
  const { groundY, buildingTopY, buildingEdgeX } = layout;
  const theme = getTheme(level.level);

  // === SKY + DISTANT ATMOSPHERE with parallax ===
  // Sky/stars/moon/clouds move at 30% of camera speed for depth perception
  // on tall levels. Partially undo the camera transform for these elements.
  const skyParallax = 0.7;
  ctx.save();
  ctx.translate(0, viewY * skyParallax);

  const skyTop = buildingTopY - GAME_HEIGHT * 2;
  const skyBottom = groundY + GAME_HEIGHT;
  const grad = ctx.createLinearGradient(0, skyTop, 0, groundY);
  for (const [pos, color] of theme.skyStops) {
    grad.addColorStop(pos, color);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, skyTop, GAME_WIDTH, skyBottom - skyTop);

  if (theme.stars) drawStars(ctx, skyTop, groundY, buildingEdgeX);
  if (theme.moon) drawMoon(ctx, skyTop, groundY);
  if (theme.clouds) drawClouds(ctx, skyTop, groundY, buildingEdgeX);

  ctx.restore();

  // === SILHOUETTES (no parallax — anchored to ground) ===
  if (theme.silhouette === 'city') drawCitySkyline(ctx, groundY, buildingEdgeX);
  else if (theme.silhouette === 'mountains') drawMountainRange(ctx, groundY, buildingEdgeX);
  else if (theme.silhouette === 'desert') drawDesertLandscape(ctx, groundY, buildingEdgeX);
  else if (theme.silhouette === 'ocean') drawOceanscape(ctx, groundY, buildingEdgeX);

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
//  ATMOSPHERE — stars, moon, clouds, silhouettes
// ========================================================

// ---- Stars ----

function drawStars(
  ctx: CanvasRenderingContext2D,
  skyTop: number,
  groundY: number,
  buildingEdgeX: number,
): void {
  const skyH = groundY - skyTop;
  const usableW = GAME_WIDTH - buildingEdgeX - 8;

  for (let i = 0; i < 50; i++) {
    const x = ((i * 157 + 31) % usableW) + buildingEdgeX + 8;
    const yFrac = ((i * 89 + 17) % 100) / 100;
    const y = skyTop + yFrac * skyH * 0.85;
    const bright = ((i * 43 + 7) % 10) / 10;
    const alpha = 0.3 + bright * 0.6;

    ctx.fillStyle = `rgba(255, 255, 240, ${alpha})`;
    ctx.fillRect(x, y, 1, 1);

    // Brighter stars get a tiny cross twinkle
    if (bright > 0.7) {
      ctx.fillStyle = `rgba(255, 255, 240, ${alpha * 0.4})`;
      ctx.fillRect(x - 1, y, 3, 1);
      ctx.fillRect(x, y - 1, 1, 3);
    }
  }
}

// ---- Moon ----

function drawMoon(
  ctx: CanvasRenderingContext2D,
  skyTop: number,
  groundY: number,
): void {
  const skyH = groundY - skyTop;
  const x = GAME_WIDTH - 45;
  const y = skyTop + skyH * 0.12;
  const r = 10;

  // Soft glow
  const glow = ctx.createRadialGradient(x, y, r, x, y, r * 3);
  glow.addColorStop(0, 'rgba(200, 200, 240, 0.12)');
  glow.addColorStop(1, 'rgba(200, 200, 240, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 3, 0, Math.PI * 2);
  ctx.fill();

  // Moon disc
  ctx.fillStyle = '#dddde6';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // Craters
  ctx.fillStyle = '#bbbbcc';
  ctx.beginPath();
  ctx.arc(x - 3, y - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 4, y + 3, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 1, y + 1, 1.2, 0, Math.PI * 2);
  ctx.fill();
}

// ---- Clouds ----

function drawClouds(
  ctx: CanvasRenderingContext2D,
  skyTop: number,
  groundY: number,
  buildingEdgeX: number,
): void {
  const skyH = groundY - skyTop;
  const clouds = [
    { x: 80, y: 0.15, w: 55, h: 14 },
    { x: 170, y: 0.25, w: 70, h: 16 },
    { x: 260, y: 0.1, w: 50, h: 12 },
    { x: 100, y: 0.42, w: 60, h: 14 },
    { x: 210, y: 0.55, w: 75, h: 16 },
    { x: 65, y: 0.65, w: 45, h: 12 },
    { x: 285, y: 0.45, w: 55, h: 13 },
  ];

  for (const c of clouds) {
    const cy = skyTop + c.y * skyH;
    if (c.x + c.w <= buildingEdgeX) continue;

    ctx.fillStyle = 'rgba(180, 185, 195, 0.08)';
    ctx.beginPath();
    ctx.ellipse(c.x + c.w * 0.3, cy, c.w * 0.35, c.h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(200, 205, 215, 0.06)';
    ctx.beginPath();
    ctx.ellipse(c.x + c.w * 0.55, cy - c.h * 0.15, c.w * 0.3, c.h * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(180, 185, 195, 0.07)';
    ctx.beginPath();
    ctx.ellipse(c.x + c.w * 0.75, cy + c.h * 0.05, c.w * 0.28, c.h * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---- City Skyline ----

function drawCitySkyline(
  ctx: CanvasRenderingContext2D,
  groundY: number,
  buildingEdgeX: number,
): void {
  // Far layer — taller, dimmer
  const farBuildings = [
    { x: 70, w: 18, h: 60 }, { x: 95, w: 12, h: 40 },
    { x: 115, w: 20, h: 78 }, { x: 145, w: 14, h: 50 },
    { x: 165, w: 22, h: 92 }, { x: 195, w: 14, h: 55 },
    { x: 215, w: 18, h: 68 }, { x: 240, w: 12, h: 35 },
    { x: 260, w: 20, h: 75 }, { x: 285, w: 16, h: 48 },
    { x: 305, w: 14, h: 58 },
  ];

  for (const b of farBuildings) {
    if (b.x <= buildingEdgeX - 5) continue;
    ctx.fillStyle = 'rgba(18, 20, 40, 0.55)';
    ctx.fillRect(b.x, groundY - b.h, b.w, b.h);

    // Window grid
    for (let wy = groundY - b.h + 5; wy < groundY - 4; wy += 6) {
      for (let wx = b.x + 2; wx < b.x + b.w - 2; wx += 4) {
        const lit = ((wx * 7 + wy * 3) % 5) < 2;
        ctx.fillStyle = lit
          ? 'rgba(255, 200, 100, 0.3)'
          : 'rgba(80, 100, 140, 0.12)';
        ctx.fillRect(wx, wy, 2, 3);
      }
    }
  }

  // Near layer — shorter, darker, brighter windows
  const nearBuildings = [
    { x: 85, w: 15, h: 45 }, { x: 108, w: 22, h: 55 },
    { x: 138, w: 16, h: 38 }, { x: 180, w: 20, h: 70 },
    { x: 208, w: 14, h: 42 }, { x: 248, w: 18, h: 54 },
    { x: 275, w: 22, h: 64 }, { x: 302, w: 16, h: 44 },
  ];

  for (const b of nearBuildings) {
    if (b.x <= buildingEdgeX - 5) continue;
    ctx.fillStyle = 'rgba(14, 14, 30, 0.65)';
    ctx.fillRect(b.x, groundY - b.h, b.w, b.h);

    for (let wy = groundY - b.h + 4; wy < groundY - 3; wy += 5) {
      for (let wx = b.x + 2; wx < b.x + b.w - 3; wx += 5) {
        const lit = ((wx * 11 + wy * 7) % 7) < 3;
        ctx.fillStyle = lit
          ? 'rgba(255, 220, 120, 0.45)'
          : 'rgba(60, 80, 120, 0.15)';
        ctx.fillRect(wx, wy, 2, 3);
      }
    }
  }
}

// ---- Mountain Range ----

function drawMountainRange(
  ctx: CanvasRenderingContext2D,
  groundY: number,
  _buildingEdgeX: number,
): void {
  // Far range — lighter, hazier
  ctx.fillStyle = 'rgba(40, 60, 100, 0.4)';
  ctx.beginPath();
  ctx.moveTo(50, groundY);
  ctx.lineTo(80, groundY - 70);
  ctx.lineTo(110, groundY - 50);
  ctx.lineTo(150, groundY - 98);
  ctx.lineTo(190, groundY - 60);
  ctx.lineTo(220, groundY - 82);
  ctx.lineTo(260, groundY - 55);
  ctx.lineTo(300, groundY - 78);
  ctx.lineTo(330, groundY - 45);
  ctx.lineTo(330, groundY);
  ctx.closePath();
  ctx.fill();

  // Far snow caps
  ctx.fillStyle = 'rgba(220, 235, 255, 0.35)';
  ctx.beginPath();
  ctx.moveTo(138, groundY - 85);
  ctx.lineTo(150, groundY - 98);
  ctx.lineTo(162, groundY - 85);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(288, groundY - 66);
  ctx.lineTo(300, groundY - 78);
  ctx.lineTo(312, groundY - 66);
  ctx.closePath();
  ctx.fill();

  // Near range — darker, more solid
  ctx.fillStyle = 'rgba(20, 35, 55, 0.65)';
  ctx.beginPath();
  ctx.moveTo(40, groundY);
  ctx.lineTo(90, groundY - 42);
  ctx.lineTo(120, groundY - 28);
  ctx.lineTo(165, groundY - 58);
  ctx.lineTo(205, groundY - 36);
  ctx.lineTo(245, groundY - 50);
  ctx.lineTo(285, groundY - 32);
  ctx.lineTo(320, groundY - 44);
  ctx.lineTo(330, groundY);
  ctx.closePath();
  ctx.fill();

  // Near snow caps
  ctx.fillStyle = 'rgba(240, 245, 255, 0.5)';
  ctx.beginPath();
  ctx.moveTo(155, groundY - 50);
  ctx.lineTo(165, groundY - 58);
  ctx.lineTo(175, groundY - 50);
  ctx.closePath();
  ctx.fill();

  // Pine tree silhouettes along near ridge
  ctx.fillStyle = 'rgba(10, 28, 18, 0.5)';
  const nearRidgePoints: [number, number][] = [
    [90, -42], [120, -28], [165, -58], [205, -36], [245, -50], [285, -32], [320, -44],
  ];
  for (let tx = 60; tx < GAME_WIDTH; tx += 7) {
    // Interpolate near ridge height at this x
    let baseY = groundY;
    for (let s = 0; s < nearRidgePoints.length - 1; s++) {
      const [x0, h0] = nearRidgePoints[s];
      const [x1, h1] = nearRidgePoints[s + 1];
      if (tx >= x0 && tx <= x1) {
        const t = (tx - x0) / (x1 - x0);
        baseY = groundY + h0 + (h1 - h0) * t;
        break;
      }
    }
    if (baseY < groundY - 5) {
      ctx.beginPath();
      ctx.moveTo(tx - 3, baseY + 2);
      ctx.lineTo(tx, baseY - 5);
      ctx.lineTo(tx + 3, baseY + 2);
      ctx.closePath();
      ctx.fill();
    }
  }
}

// ---- Desert Landscape ----

function drawDesertLandscape(
  ctx: CanvasRenderingContext2D,
  groundY: number,
  buildingEdgeX: number,
): void {
  // Far mesa
  ctx.fillStyle = 'rgba(80, 40, 15, 0.45)';
  ctx.beginPath();
  ctx.moveTo(100, groundY);
  ctx.lineTo(112, groundY - 48);
  ctx.lineTo(185, groundY - 48);
  ctx.lineTo(197, groundY);
  ctx.closePath();
  ctx.fill();

  // Mesa striations
  ctx.strokeStyle = 'rgba(120, 60, 25, 0.2)';
  ctx.lineWidth = 1;
  for (let sy = groundY - 44; sy < groundY; sy += 6) {
    ctx.beginPath();
    ctx.moveTo(114, sy);
    ctx.lineTo(183, sy);
    ctx.stroke();
  }

  // Near butte
  ctx.fillStyle = 'rgba(90, 45, 18, 0.55)';
  ctx.beginPath();
  ctx.moveTo(220, groundY);
  ctx.lineTo(236, groundY - 60);
  ctx.lineTo(280, groundY - 60);
  ctx.lineTo(296, groundY);
  ctx.closePath();
  ctx.fill();

  // Small distant butte
  ctx.fillStyle = 'rgba(60, 30, 12, 0.35)';
  ctx.beginPath();
  ctx.moveTo(65, groundY);
  ctx.lineTo(76, groundY - 28);
  ctx.lineTo(100, groundY - 28);
  ctx.lineTo(111, groundY);
  ctx.closePath();
  ctx.fill();

  // Cactus silhouettes
  ctx.strokeStyle = 'rgba(25, 55, 18, 0.5)';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  if (155 > buildingEdgeX) {
    // Saguaro 1
    ctx.beginPath();
    ctx.moveTo(155, groundY);
    ctx.lineTo(155, groundY - 22);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(155, groundY - 14);
    ctx.lineTo(149, groundY - 18);
    ctx.lineTo(149, groundY - 24);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(155, groundY - 11);
    ctx.lineTo(161, groundY - 15);
    ctx.lineTo(161, groundY - 20);
    ctx.stroke();
  }

  // Saguaro 2
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(305, groundY);
  ctx.lineTo(305, groundY - 16);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(305, groundY - 10);
  ctx.lineTo(300, groundY - 14);
  ctx.lineTo(300, groundY - 18);
  ctx.stroke();

  ctx.lineCap = 'butt';
}

// ---- Ocean ----

function drawOceanscape(
  ctx: CanvasRenderingContext2D,
  groundY: number,
  buildingEdgeX: number,
): void {
  const horizonY = groundY - 22;

  // Water area gradient
  const waterGrad = ctx.createLinearGradient(0, horizonY, 0, groundY);
  waterGrad.addColorStop(0, 'rgba(20, 60, 110, 0.4)');
  waterGrad.addColorStop(1, 'rgba(10, 30, 60, 0.25)');
  ctx.fillStyle = waterGrad;
  ctx.fillRect(buildingEdgeX + 5, horizonY, GAME_WIDTH - buildingEdgeX - 5, groundY - horizonY);

  // Horizon shimmer
  ctx.fillStyle = 'rgba(150, 200, 240, 0.18)';
  ctx.fillRect(buildingEdgeX + 10, horizonY, GAME_WIDTH - buildingEdgeX - 10, 2);

  // Wave lines
  ctx.lineWidth = 1;
  for (let row = 0; row < 5; row++) {
    const y = horizonY + 3 + row * 4;
    const alpha = 0.25 - row * 0.03;
    ctx.strokeStyle = `rgba(80, 160, 220, ${alpha})`;
    ctx.beginPath();
    for (let x = buildingEdgeX + 10; x < GAME_WIDTH; x += 2) {
      const wave = Math.sin(x * 0.1 + row * 1.5) * 1.5;
      if (x === buildingEdgeX + 10) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }

  // Distant sailboat
  const boatX = 230;
  const boatY = horizonY - 2;

  ctx.fillStyle = 'rgba(30, 30, 50, 0.5)';
  // Hull
  ctx.beginPath();
  ctx.moveTo(boatX - 8, boatY);
  ctx.lineTo(boatX - 6, boatY + 3);
  ctx.lineTo(boatX + 6, boatY + 3);
  ctx.lineTo(boatX + 8, boatY);
  ctx.closePath();
  ctx.fill();

  // Mast
  ctx.strokeStyle = 'rgba(30, 30, 50, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(boatX, boatY);
  ctx.lineTo(boatX, boatY - 12);
  ctx.stroke();

  // Sail
  ctx.fillStyle = 'rgba(200, 200, 220, 0.25)';
  ctx.beginPath();
  ctx.moveTo(boatX, boatY - 12);
  ctx.lineTo(boatX + 8, boatY - 4);
  ctx.lineTo(boatX, boatY - 2);
  ctx.closePath();
  ctx.fill();
}

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  edgeX: number,
  topY: number,
  groundY: number,
  heightFt: number,
): void {
  // Solid opaque background behind entire building — prevents sky gradient
  // from bleeding through gaps between ASCII characters
  ctx.fillStyle = '#0d0d14';
  ctx.fillRect(0, topY, edgeX, groundY - topY);

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
  // Helicopter centered above where the performer stands — 3x scale
  const cx = edgeX - 10;
  const cy = topY - 20;
  const s = 3; // scale factor

  ctx.save();
  ctx.lineCap = 'round';

  // Main rotor — spinning line
  ctx.strokeStyle = '#777777';
  ctx.lineWidth = 2;
  const time = Date.now() / 80;
  const rotorLen = 30 * s;
  ctx.beginPath();
  ctx.moveTo(cx - rotorLen * Math.cos(time), cy - 18 * s);
  ctx.lineTo(cx + rotorLen * Math.cos(time), cy - 18 * s);
  ctx.stroke();

  // Rotor mast
  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 18 * s);
  ctx.lineTo(cx, cy - 10 * s);
  ctx.stroke();

  // Body — rounded rectangle shape
  ctx.fillStyle = '#444444';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 5 * s, 18 * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cockpit windshield
  ctx.fillStyle = '#556677';
  ctx.beginPath();
  ctx.ellipse(cx + 10 * s, cy - 6 * s, 6 * s, 5 * s, 0.2, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.fill();

  // Tail boom
  ctx.strokeStyle = '#444444';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx - 16 * s, cy - 5 * s);
  ctx.lineTo(cx - 35 * s, cy - 12 * s);
  ctx.stroke();

  // Tail rotor
  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 35 * s, cy - 18 * s);
  ctx.lineTo(cx - 35 * s, cy - 6 * s);
  ctx.stroke();

  // Skids
  ctx.strokeStyle = '#555555';
  ctx.lineWidth = 2;
  // Left skid strut
  ctx.beginPath();
  ctx.moveTo(cx - 8 * s, cy + 2 * s);
  ctx.lineTo(cx - 10 * s, cy + 8 * s);
  ctx.stroke();
  // Right skid strut
  ctx.beginPath();
  ctx.moveTo(cx + 8 * s, cy + 2 * s);
  ctx.lineTo(cx + 6 * s, cy + 8 * s);
  ctx.stroke();
  // Skid bars
  ctx.beginPath();
  ctx.moveTo(cx - 16 * s, cy + 8 * s);
  ctx.lineTo(cx + 12 * s, cy + 8 * s);
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
  const s = 3; // scale factor

  ctx.save();
  ctx.lineCap = 'round';

  // Envelope (the big balloon part) — 3x scale
  const envCY = basketY - 40 * s;
  const envRX = 22 * s;
  const envRY = 28 * s;

  // Envelope body — gradient stripes
  const stripeColors = ['#cc3333', '#cc8833', '#cccc33', '#cc3333', '#cc8833'];
  const stripeWidth = envRX * 2 / stripeColors.length;
  for (let i = 0; i < stripeColors.length; i++) {
    ctx.fillStyle = stripeColors[i];
    const sx = cx - envRX + i * stripeWidth;
    // clip to ellipse by drawing horizontal lines
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
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, envCY, envRX, envRY, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Ropes from envelope to basket
  ctx.strokeStyle = '#886644';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 10 * s, envCY + envRY - 2);
  ctx.lineTo(cx - 6 * s, basketY);
  ctx.moveTo(cx + 10 * s, envCY + envRY - 2);
  ctx.lineTo(cx + 6 * s, basketY);
  ctx.stroke();

  // Basket — scaled
  const bw = 8 * s;
  const bh = 10 * s;
  ctx.fillStyle = '#664422';
  ctx.fillRect(cx - bw, basketY, bw * 2, bh);
  // Basket rim
  ctx.strokeStyle = '#886644';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - bw - 1, basketY);
  ctx.lineTo(cx + bw + 1, basketY);
  ctx.stroke();
  // Basket weave pattern
  ctx.strokeStyle = '#553311';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - bw, basketY + bh * 0.35);
  ctx.lineTo(cx + bw, basketY + bh * 0.35);
  ctx.moveTo(cx - bw, basketY + bh * 0.65);
  ctx.lineTo(cx + bw, basketY + bh * 0.65);
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
    const matTop = groundY - matHeight;

    // Tank structure — solid opaque background + walls + window
    ctx.fillStyle = '#0a1828';
    ctx.fillRect(left, matTop, right - left, matHeight);

    // Side walls
    ctx.fillStyle = '#556677';
    ctx.fillRect(left, matTop, 3, matHeight);
    ctx.fillRect(right - 3, matTop, 3, matHeight);

    // Top rim
    ctx.fillStyle = '#667788';
    ctx.fillRect(left, matTop, right - left, 2);

    // Viewing window on right wall
    const winY = matTop + matHeight * 0.25;
    const winH = matHeight * 0.4;
    ctx.fillStyle = '#1a3855';
    ctx.fillRect(right - 3, winY, 3, winH);
    ctx.fillStyle = '#88aacc';
    ctx.fillRect(right - 1, winY, 1, winH);

    // Rows of waves scaling with depth
    const rows = Math.max(2, Math.floor(matHeight / 7));
    for (let r = 0; r < rows; r++) {
      const shade = r === 0 ? '#4477aa' : r === 1 ? '#335588' : '#224466';
      ctx.fillStyle = shade;
      const offset = (r % 2) * 3;
      const rowY = groundY - r * 7;
      for (let wx = left + offset + 3; wx < right - 3; wx += 6) {
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

    // Solid opaque background behind landing zone — prevents sky bleed-through
    ctx.fillStyle = level.targetType === 'airbag' ? '#0e0e0e' : '#2a1c0e';
    ctx.fillRect(left, matTop, right - left, matHeight);

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
      // Boxes — cardboard box stack with store logos and edge lines
      // Clip to landing zone boundaries so boxes don't bleed out
      ctx.save();
      ctx.beginPath();
      ctx.rect(left, matTop, right - left, matHeight);
      ctx.clip();
      // When landed, crush and scatter boxes at impact point
      const boxW = 11;
      const boxH = 9;
      const cols = Math.ceil((right - left) / boxW);
      const boxRows = Math.max(2, Math.ceil(matHeight / boxH));
      const logos = ['##', 'HD', 'LW', '##', '##', 'HD', '##', 'LW', '##', '##'];

      for (let r = 0; r < boxRows; r++) {
        const rowOffset = (r % 2) * Math.floor(boxW / 2); // stagger rows
        for (let c = -1; c <= cols; c++) {
          let bx = left + c * boxW + rowOffset;
          let by = matTop + r * boxH;
          const hash = ((c * 3 + r * 7) % logos.length + logos.length) % logos.length;
          const logoKey = logos[hash];
          let crushed = false;

          // Landed impact: scatter and crush nearby boxes
          if (landedInfo) {
            const dist = Math.abs(bx + boxW / 2 - landedInfo.x);
            if (dist < 25) {
              if (r < 2) {
                const nudge = ((c * 7 + r * 13) % 5) - 2;
                const push = dist < 10 ? (landedInfo.x > bx ? -3 : 3) : 0;
                bx += nudge * 2 + push;
                by += Math.round(3 * Math.exp(-(dist * dist) / 120));
                if (dist < 8 && r === 0) crushed = true;
              } else if (r < 4) {
                bx += ((c * 7 + r * 13) % 3) - 1;
              }
            }
          }

          // Clip to landing zone
          if (bx + boxW < left || bx > right) continue;

          // Box face color — alternate shades per row
          const faceColor = crushed ? '#665533'
            : r % 2 === 0 ? '#bb8844' : '#aa7733';
          const edgeDark = crushed ? '#443322' : '#7a5522'; // shadow edge
          const edgeLight = crushed ? '#776644' : '#ccaa66'; // highlight edge

          if (crushed) {
            // Crushed: flatten the box
            ctx.fillStyle = faceColor;
            ctx.fillRect(bx, by + boxH - 3, boxW, 3);
            ctx.strokeStyle = edgeDark;
            ctx.lineWidth = 0.5;
            ctx.strokeRect(bx, by + boxH - 3, boxW, 3);
          } else {
            // Box face
            ctx.fillStyle = faceColor;
            ctx.fillRect(bx, by, boxW, boxH);

            // Bottom/right shadow edges (darker)
            ctx.strokeStyle = edgeDark;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(bx + boxW, by);
            ctx.lineTo(bx + boxW, by + boxH);
            ctx.lineTo(bx, by + boxH);
            ctx.stroke();

            // Top/left highlight edges (lighter)
            ctx.strokeStyle = edgeLight;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(bx, by + boxH);
            ctx.lineTo(bx, by);
            ctx.lineTo(bx + boxW, by);
            ctx.stroke();

            // Tape line across middle of box
            ctx.strokeStyle = '#aa8855';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(bx + 1, by + Math.floor(boxH / 2));
            ctx.lineTo(bx + boxW - 1, by + Math.floor(boxH / 2));
            ctx.stroke();

            // Logo text on some boxes
            if (logoKey === 'HD' || logoKey === 'LW') {
              ctx.font = '5px monospace';
              ctx.textBaseline = 'top';
              ctx.fillStyle = logoKey === 'HD' ? '#dd6611' : '#4477bb';
              ctx.fillText(logoKey, bx + 2, by + 1);
              ctx.font = '7px monospace'; // restore
            }
          }
        }
      }
      ctx.restore(); // end box clip
    }
  }

  // No center marker — the performer needs to judge their own landing
}
