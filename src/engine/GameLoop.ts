import type { GameState, HudSnapshot, LandingResult, LevelConfig } from '../types';
import { HUD_UPDATE_INTERVAL, PIXELS_PER_FOOT, CAMERA_CREW_OFFSET, naturalLandingDistance } from '../constants';
import { BUILDING_WIDTH_PX } from '../renderer/EnvironmentRenderer';
import { CanvasRenderer } from '../renderer/CanvasRenderer';
import { InputManager } from './InputManager';
import { createGameState } from './GameState';
import { transition } from './StateMachine';
import * as Physics from './Physics';
import * as LandingScorer from './LandingScorer';
import { playThump } from './SoundFX';

const PHYSICS_FPS = 60;
const PHYSICS_DT = 1000 / PHYSICS_FPS;
const MAX_FRAME_TIME = 250; // Prevent spiral of death

export class GameLoop {
  private state: GameState;
  private renderer: CanvasRenderer;
  private input: InputManager;
  private rafId = 0;
  private previousTime = 0;
  private accumulator = 0;
  private running = false;
  private lastHudUpdate = 0;
  private landingFrames = 0;
  private landingDone = false;
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private onLanding: (result: LandingResult) => void;

  constructor(
    canvas: HTMLCanvasElement,
    level: LevelConfig,
    onHudUpdate: (snapshot: HudSnapshot) => void,
    onLanding: (result: LandingResult) => void,
    drugged = false,
  ) {
    this.state = createGameState(level, drugged);
    this.renderer = new CanvasRenderer(canvas);
    this.input = new InputManager();
    this.onHudUpdate = onHudUpdate;
    this.onLanding = onLanding;
  }

  start(): void {
    this.running = true;
    this.input.attach();
    this.previousTime = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;
    this.input.detach();
    cancelAnimationFrame(this.rafId);
  }

  /** Update career stats on the state (called externally for persistence) */
  setCareerStats(health: number, earnings: number, jobs: number): void {
    this.state.totalHealth = health;
    this.state.totalEarnings = earnings;
    this.state.jobsCompleted = jobs;
  }

  private loop = (currentTime: number): void => {
    if (!this.running) return;

    let frameTime = currentTime - this.previousTime;
    if (frameTime > MAX_FRAME_TIME) frameTime = MAX_FRAME_TIME;
    this.previousTime = currentTime;
    this.accumulator += frameTime;

    // Fixed-timestep physics updates
    while (this.accumulator >= PHYSICS_DT) {
      this.tick(PHYSICS_DT / 1000); // dt in seconds
      this.accumulator -= PHYSICS_DT;
    }

    // Render with interpolation
    const alpha = this.accumulator / PHYSICS_DT;
    this.renderer.draw(this.state, alpha);

    // Throttled HUD update
    if (currentTime - this.lastHudUpdate >= HUD_UPDATE_INTERVAL) {
      this.lastHudUpdate = currentTime;
      this.sendHudUpdate();
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  private tick(dt: number): void {
    // Intro pan phase — advance timer, skip all gameplay
    if (this.state.introPanDuration > 0 && this.state.introPanTimer < this.state.introPanDuration) {
      this.state.introPanTimer = Math.min(this.state.introPanTimer + dt, this.state.introPanDuration);
      return;
    }

    const input = this.input.getSnapshot();

    // State machine transitions
    transition(this.state, input);

    // Physics
    Physics.update(this.state, dt, input);

    // Update crew text on state (for canvas world-space rendering)
    this.updateCrewText();

    // Check if just landed — show callout, then advance after 2s or on SPACE
    if (this.state.faller.phase === 'LANDED') {
      this.state.landedTime += dt;
      if (!this.state.landing) {
        let result;

        if (this.state.faller.verticalJump) {
          // Double-tap panic — fell straight off the building feet first
          const h = this.state.level.height;
          result = {
            landingAngle: 0,
            idealAngle: this.state.level.idealAngle,
            angleDeviation: Math.abs(0 - this.state.level.idealAngle),
            grade: 'F' as const,
            injuryPoints: Math.min(80, Math.round(h * 1.5)),
            injuryDescription: this.state.level.targetType === 'water'
              ? "Panicked and fell straight off the edge. Missed the water."
              : "Panicked and fell straight off the edge. No airbag.",
            pay: 0,
            credibilityPoints: -8,
            horizontalAccuracy: 0,
            totalRotation: this.state.faller.totalRotation,
          };
        } else if (this.state.countdown.jumpedBeforeRolling) {
          // Jumped before cameras were rolling — voided take, but still physically hit the ground
          const physicalResult = LandingScorer.score(this.state);
          result = {
            ...physicalResult,
            grade: 'F' as const,
            injuryDescription: "Cameras weren't rolling. Wasted take. " + physicalResult.injuryDescription,
            pay: 0,
            credibilityPoints: -5,
          };
        } else {
          result = LandingScorer.score(this.state);
          // Apply penalty for going before ACTION — severity depends on whether crew caught up
          const cd = this.state.countdown;
          if (cd.wentEarly) {
            if (!cd.cameraRolling) {
              result.credibilityPoints -= 15;
            } else if (!cd.actionCalled) {
              result.credibilityPoints -= 5;
            } else {
              result.credibilityPoints -= 3;
            }
          }

          // Check if faller hit the Panavision camera — catastrophic penalty
          const baseCrewX = BUILDING_WIDTH_PX + naturalLandingDistance(this.state.level.height) * PIXELS_PER_FOOT
            + this.state.level.targetSize + CAMERA_CREW_OFFSET;
          const crewFt = (baseCrewX - BUILDING_WIDTH_PX) / PIXELS_PER_FOOT;
          if (Math.abs(this.state.faller.x - crewFt) < 4) {
            result.credibilityPoints = -20;
            result.injuryPoints = 100;
            result.grade = 'F';
          }
        }

        this.state.landing = result;
        this.landingFrames = 0;
        this.landingDone = false;

        // Thump sound when faller misses the target
        if (result.horizontalAccuracy <= 0) {
          playThump();
        }

        // Update crew callout with landing feedback
        this.updateCrewText();
        // Immediately push a HUD update
        this.sendHudUpdate();
      }

      if (!this.landingDone) {
        this.landingFrames++;
        // Advance after 2 seconds (120 frames at 60fps) or when space is pressed
        if (this.landingFrames >= 120 || input.spacePressed) {
          this.landingDone = true;
          const result = this.state.landing!;
          this.stop();
          this.onLanding(result);
        }
      }
    }
  }

  /**
   * Compute crew text (countdown, callout) and store on state for canvas rendering.
   * Called each tick so text updates are in sync with gameplay.
   */
  private updateCrewText(): void {
    const f = this.state.faller;
    const level = this.state.level;
    const cdh = this.state.countdown;

    // --- Countdown text (crew calling out the count) ---
    let crewText: string | null = null;
    if (f.phase === 'STANDING') {
      if (cdh.currentStep < cdh.steps.length) {
        const text = cdh.steps[cdh.currentStep].text;
        crewText = text || null;
      }
    } else if (cdh.wentEarly && (f.phase === 'LEANING' || f.phase === 'JUMPING')) {
      if (cdh.actionCalled) {
        crewText = '...WE GOT THE SHOT!';
      } else if (cdh.cameraRolling) {
        const stepText = cdh.currentStep < cdh.steps.length ? cdh.steps[cdh.currentStep].text : '';
        crewText = stepText ? stepText + ' GO! GO!' : 'GO GO GO!!';
      } else {
        crewText = "HE'S GOING!! ROLL IT!!";
      }
    } else if (cdh.wentEarly && f.phase === 'FALLING') {
      if (cdh.actionCalled) {
        crewText = '...WE GOT THE SHOT!';
      } else if (!cdh.cameraRolling) {
        crewText = "DIDN'T GET THE SHOT!";
      }
    }
    this.state.crewText = crewText;

    // --- Landing callout (crew reacting to impact) ---
    let crewCallout: string | null = null;
    if (this.state.landing) {
      const { horizontalAccuracy, grade } = this.state.landing;

      // Check if faller hit the camera crew
      const baseCrewScreenX = BUILDING_WIDTH_PX + naturalLandingDistance(level.height) * PIXELS_PER_FOOT
        + level.targetSize + CAMERA_CREW_OFFSET;
      const crewFt = (baseCrewScreenX - BUILDING_WIDTH_PX) / PIXELS_PER_FOOT;
      const hitCrew = Math.abs(f.x - crewFt) < 4;

      if (f.verticalJump) {
        crewCallout = 'HE FELL STRAIGHT OFF THE EDGE!';
      } else if (cdh.jumpedBeforeRolling) {
        crewCallout = "CAMERAS WEREN'T ROLLING!";
      } else if (hitCrew) {
        crewCallout = 'IDIOT HIT THE PANAVISION!';
      } else if (horizontalAccuracy <= 0) {
        crewCallout = level.targetType === 'water'
          ? 'HE MISSED THE WATER!'
          : level.targetType === 'boxes'
            ? 'HE MISSED THE BOXES!'
            : 'HE MISSED THE AIRBAG!';
      } else {
        const { angleDeviation } = this.state.landing!;

        let posLine: string;
        if (horizontalAccuracy >= 0.7) {
          posLine = 'DEAD CENTER!';
        } else if (horizontalAccuracy >= 0.45) {
          posLine = 'GOOD PLACEMENT';
        } else if (horizontalAccuracy >= 0.25) {
          posLine = 'A BIT OFF CENTER';
        } else if (horizontalAccuracy >= 0.1) {
          posLine = 'OFF CENTER!';
        } else {
          posLine = level.targetType === 'water'
            ? 'BARELY IN THE WATER!'
            : level.targetType === 'boxes'
              ? 'BARELY ON THE BOXES!'
              : 'BARELY ON THE AIRBAG!';
        }

        let angleLine: string;
        if (level.targetType === 'water') {
          if (angleDeviation <= 10) {
            angleLine = 'PERFECT FEET FIRST!';
          } else if (angleDeviation <= 25) {
            angleLine = 'ALMOST FEET FIRST';
          } else if (angleDeviation <= 55) {
            angleLine = 'NOT FEET FIRST!';
          } else {
            angleLine = 'BELLY FLOP!';
          }
        } else {
          if (angleDeviation <= 10) {
            angleLine = 'PERFECTLY FLAT!';
          } else if (angleDeviation <= 25) {
            angleLine = 'NICE AND FLAT';
          } else if (angleDeviation <= 40) {
            angleLine = 'A BIT CROOKED';
          } else if (angleDeviation <= 55) {
            angleLine = 'NOT FLAT!';
          } else {
            // Distinguish head-first (near 180°) from feet-first (near 0°/360°)
            const norm = ((this.state.landing!.landingAngle % 360) + 360) % 360;
            const nearUpsideDown = norm > 135 && norm < 225;
            angleLine = nearUpsideDown ? 'LANDED ON HIS HEAD!' : 'FELL STRAIGHT DOWN!';
          }
        }

        if (grade === 'A+') {
          crewCallout = 'BULLSEYE! ' + angleLine;
        } else {
          crewCallout = posLine + ' ' + angleLine;
        }
      }
    }
    this.state.crewCallout = crewCallout;
  }

  private sendHudUpdate(): void {
    const f = this.state.faller;
    const level = this.state.level;

    let timingHint: string | null = null;
    if (level.showTimingHints && f.phase === 'FALLING') {
      const heightRatio = f.y / level.height;
      if (heightRatio < 0.6 && heightRatio > 0.3 && !f.isTucked) {
        timingHint = 'HOLD SPACE TO TUCK!';
      } else if (heightRatio <= 0.3 && heightRatio > 0.1 && f.isTucked) {
        timingHint = 'RELEASE TO SPREAD!';
      }
    }

    this.onHudUpdate({
      height: f.y,
      maxHeight: level.height,
      angle: f.angle,
      phase: f.phase,
      isTucked: f.isTucked,
      wind: level.wind,
      credibility: 0,
      levelNumber: level.level,
      timingHint,
      landingCallout: null,
      countdownText: null,
    });
  }
}
