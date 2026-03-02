// === FALLER STATE ===

export type FallerPhase =
  | 'STANDING'   // Idle on edge, waiting for ACTION call
  | 'LEANING'    // Tilting forward, waiting for second SPACE
  | 'JUMPING'    // Brief launch animation off the edge
  | 'FALLING'    // In the air — tuck or spread
  | 'LANDED';    // Hit the ground

export interface FallerState {
  x: number;              // Horizontal offset from center (pixels)
  y: number;              // Height remaining (feet, decreases toward 0)
  vy: number;             // Vertical velocity (ft/s, positive = falling faster)
  vx: number;             // Horizontal velocity (px/s)
  angle: number;          // Body rotation (degrees, 0 = upright, 90/270 = horizontal/flat)
  angularVelocity: number; // Degrees per second
  phase: FallerPhase;
  isTucked: boolean;      // Currently holding SPACE during fall
  verticalJump: boolean;  // Double-tap: jumped straight up, no flip
  totalRotation: number;  // Accumulated degrees rotated (not wrapped)
}

// === LEVEL CONFIG ===

export type TargetType = 'airbag' | 'boxes' | 'water';

export interface LevelConfig {
  level: number;
  production: string;      // Film/show name
  height: number;          // Fall height in feet
  targetType: TargetType;
  targetSize: number;      // Landing zone half-width in pixels
  idealAngle: number;      // Perfect landing angle (90 = flat on back for airbag, 0 = feet for water)
  wind: number;            // Constant wind (px/s)
  windGust: number;        // Random gust variance
  showTimingHints: boolean;
  pay: number;             // Base pay for the job
  coordinatorLine: string; // Briefing dialogue
}

// === COUNTDOWN ===

export interface CountdownStep {
  text: string;
  duration: number;        // Seconds this step is shown before advancing
}

export interface CountdownState {
  steps: CountdownStep[];
  currentStep: number;
  stepTimer: number;
  actionCalled: boolean;        // Has "ACTION!" step been reached?
  cameraRolling: boolean;       // Is the camera recording? (red light)
  wentEarly: boolean;           // Did player press space before ACTION?
  jumpedBeforeRolling: boolean; // Did player jump off building before cameras rolled?
  repPenalty: number;           // Reputation penalty for bad timing
}

// === GAME STATE ===

export interface GameState {
  faller: FallerState;
  level: LevelConfig;
  elapsedTime: number;     // Seconds since jump
  jumpTimer: number;       // Time in JUMPING phase
  leanTimer: number;       // Time in LEANING phase
  jumpLeanAngle: number;   // Lean angle when jump was initiated (degrees)
  lockedWind: number;      // Wind force locked at start of fall (ft/s)
  landing: LandingResult | null;
  totalHealth: number;     // Health pool (starts at 200, injuries subtract)
  totalEarnings: number;
  jobsCompleted: number;
  countdown: CountdownState;
  // Intro camera pan (tall levels)
  introPanTimer: number;      // Current pan time (seconds)
  introPanDuration: number;   // Total pan duration (0 = no pan needed)
  // Crew text rendered in world space above camera crew
  crewText: string | null;
  crewCallout: string | null;
  // Landing animation
  landedTime: number;       // Seconds since landing (for splash/settle animation)
  // Previous frame (for interpolation)
  prevX: number;
  prevY: number;
  prevAngle: number;
}

// === INPUT ===

export interface InputSnapshot {
  spacePressed: boolean;    // Rising edge: SPACE just pressed this tick
  spaceHeld: boolean;       // SPACE is currently held down
}

// === SCORING ===

export type Grade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface LandingResult {
  landingAngle: number;
  idealAngle: number;
  angleDeviation: number;
  grade: Grade;
  injuryPoints: number;
  injuryDescription: string;
  pay: number;
  credibilityPoints: number;  // Earned/lost based on performance
  horizontalAccuracy: number;  // 0-1, how centered on landing zone
}

// === HUD ===

export interface HudSnapshot {
  height: number;
  maxHeight: number;
  angle: number;
  phase: FallerPhase;
  isTucked: boolean;
  wind: number;
  credibility: number;
  levelNumber: number;
  timingHint: string | null;
  landingCallout: string | null;
  countdownText: string | null;
}
