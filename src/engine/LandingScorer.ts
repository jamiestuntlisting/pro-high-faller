import type { GameState, LandingResult, Grade } from '../types';
import { SCORING, PIXELS_PER_FOOT, naturalLandingDistance } from '../constants';
import { angularDistance } from '../utils/math';

const INJURY_DESCRIPTIONS: Array<{ maxPoints: number; description: string }> = [
  { maxPoints: 0, description: "Textbook. Dar would be proud." },
  { maxPoints: 3, description: "You're fine. Walk it off." },
  { maxPoints: 8, description: "Ice it tonight, you'll be fine by Monday." },
  { maxPoints: 12, description: "The chiropractor sends his regards." },
  { maxPoints: 15, description: "Breathing is overrated anyway." },
  { maxPoints: 25, description: "How many fingers? ...Sir? ...SIR?" },
  { maxPoints: 30, description: "The neck brace really completes the look." },
  { maxPoints: 35, description: "Pop. That sound will haunt your dreams." },
  { maxPoints: 50, description: "You heard something crack. That's never good." },
  { maxPoints: 75, description: "The insurance paperwork is going to be legendary." },
  { maxPoints: 100, description: "Call the ambulance. Actually, call two." },
];

export function score(state: GameState): LandingResult {
  const { faller, level } = state;

  // Angle deviation from ideal
  const landingAngle = faller.angle;
  // For airbag/boxes, both 90° and 270° are "flat" (horizontal)
  // For water, only 0° (feet first) counts
  const deviation = (level.targetType === 'water')
    ? angularDistance(landingAngle, level.idealAngle)
    : Math.min(angularDistance(landingAngle, 90), angularDistance(landingAngle, 270));

  // Horizontal accuracy: how centered on the landing zone
  // faller.x is in feet from building edge; landing zone center is offset from building
  // Add 1.5ft body-width tolerance — performer has a physical body, not a point
  const landingCenterFt = naturalLandingDistance(level.height);
  const targetHalfWidthFt = level.targetSize / PIXELS_PER_FOOT + 1.5;
  const distFromCenter = Math.abs(faller.x - landingCenterFt);
  const horizontalAccuracy = Math.max(0, 1 - distFromCenter / targetHalfWidthFt);

  // Grade — missing the airbag is an automatic F
  // Off-center landings also cap the grade — you need both angle AND position
  const missedTarget = horizontalAccuracy <= 0;
  let grade: Grade;
  if (missedTarget) {
    grade = 'F';
  } else {
    let angleGrade = deviationToGrade(deviation);
    // If you hit the target, worst grade is D — F is only for missing entirely
    if (angleGrade === 'F') angleGrade = 'D';
    // Off-center caps your best possible grade — generous thresholds
    if (horizontalAccuracy < 0.1) {
      grade = worstGrade(angleGrade, 'D');
    } else if (horizontalAccuracy < 0.2) {
      grade = worstGrade(angleGrade, 'C');
    } else if (horizontalAccuracy < 0.35) {
      grade = worstGrade(angleGrade, 'B');
    } else if (horizontalAccuracy < 0.5) {
      grade = worstGrade(angleGrade, 'A');
    } else {
      grade = angleGrade;
    }
  }

  // Injury points
  const injuryPoints = calculateInjury(deviation, grade, horizontalAccuracy, level.height, missedTarget, faller.isTucked);

  // Injury description
  const injuryDescription = getInjuryDescription(injuryPoints);

  // Pay
  const pay = calculatePay(grade, level.pay, horizontalAccuracy);

  // Credibility points — reputation in the stunt community
  const credibilityPoints = calculateCredibility(grade, horizontalAccuracy, level.height, faller.totalRotation, level.targetType, missedTarget);

  return {
    landingAngle,
    idealAngle: level.idealAngle,
    angleDeviation: deviation,
    grade,
    injuryPoints,
    injuryDescription,
    pay,
    credibilityPoints,
    horizontalAccuracy,
    totalRotation: faller.totalRotation,
  };
}

const GRADE_ORDER: Grade[] = ['A+', 'A', 'B', 'C', 'D', 'F'];

function worstGrade(a: Grade, b: Grade): Grade {
  const ai = GRADE_ORDER.indexOf(a);
  const bi = GRADE_ORDER.indexOf(b);
  return GRADE_ORDER[Math.max(ai, bi)];
}

function deviationToGrade(deviation: number): Grade {
  if (deviation <= SCORING.GRADE_A_PLUS) return 'A+';
  if (deviation <= SCORING.GRADE_A) return 'A';
  if (deviation <= SCORING.GRADE_B) return 'B';
  if (deviation <= SCORING.GRADE_C) return 'C';
  if (deviation <= SCORING.GRADE_D) return 'D';
  return 'F';
}

function calculateInjury(
  deviation: number,
  grade: Grade,
  horizontalAccuracy: number,
  heightFt: number,
  missedTarget: boolean,
  isTucked: boolean,
): number {
  // Missed the airbag entirely — maximum injury
  if (missedTarget) return 100;

  // Landed flat on the target — no injury. The airbag did its job.
  if (deviation <= SCORING.GRADE_A && !isTucked) return 0;

  let injury: number;

  switch (grade) {
    case 'A+': injury = 0; break;
    case 'A': injury = 0; break;
    case 'B': injury = Math.round(deviation * 0.5); break;
    case 'C': injury = Math.round(deviation * 0.8); break;
    case 'D': injury = Math.round(deviation * 1.0); break;
    case 'F': injury = Math.round(deviation * 2.0); break;
  }

  // Tuck penalty: landing while balled up = much worse impact
  if (isTucked) {
    injury = Math.max(injury, 20);
    injury = Math.round(injury * 2);
  }

  // Penalty for off-center landings — only matters when really at the edge
  if (horizontalAccuracy < 0.1) {
    // Very edge of the airbag — extremely dangerous
    injury = Math.max(injury, 70);
    injury = Math.round(injury * 2.5);
  } else if (horizontalAccuracy < 0.2) {
    // Near the edge — painful
    injury = Math.max(injury, 30);
    injury = Math.round(injury * 1.8);
  } else if (horizontalAccuracy < 0.35) {
    // Off-center — noticeable
    injury = Math.max(injury, 10);
    injury = Math.round(injury * 1.4);
  } else if (horizontalAccuracy < 0.5) {
    // A bit off — slight bump
    injury = Math.round(injury * 1.2);
  }

  // Height multiplier: higher falls = significantly worse injuries on bad landings
  const heightMult = 1 + (heightFt - 15) / 100;
  injury = Math.round(injury * heightMult);

  return Math.min(injury, 100);
}

function getInjuryDescription(points: number): string {
  for (const entry of INJURY_DESCRIPTIONS) {
    if (points <= entry.maxPoints) return entry.description;
  }
  return INJURY_DESCRIPTIONS[INJURY_DESCRIPTIONS.length - 1].description;
}

function calculatePay(grade: Grade, basePay: number, accuracy: number): number {
  const multipliers: Record<Grade, number> = {
    'A+': 1.0,
    'A': 0.85,
    'B': 0.6,
    'C': 0.4,
    'D': 0.25,
    'F': 0,
  };
  return Math.round(basePay * multipliers[grade] * Math.max(accuracy, 0.1));
}

function calculateCredibility(grade: Grade, horizontalAccuracy: number, heightFt: number, totalRotation: number, targetType: string, missedTarget: boolean): number {
  // Base cred from grade
  const baseCred: Record<Grade, number> = {
    'A+': 15,
    'A': 10,
    'B': 5,
    'C': 1,
    'D': -5,
    'F': -10,
  };
  let cred = baseCred[grade];

  // Landing on boxes is gutsy — if you hit them at all, no rep loss.
  // The stunt community respects anyone who lands on cardboard.
  if (targetType === 'boxes' && !missedTarget && cred < 0) {
    cred = 0;
  }

  // Height bonus — higher falls are more impressive
  const heightBonus = Math.floor((heightFt - 20) / 20);
  if (cred > 0) {
    cred += heightBonus;
  }

  // Center bonus for really nailing it
  if (horizontalAccuracy >= 0.85 && cred > 0) {
    cred += 3;
  }

  // Flip bonus — extra rotation beyond the initial 90° lean is showmanship
  // Only counts if you still landed decently (C or better)
  if (cred > 0 && totalRotation > 180) {
    const flipDegrees = totalRotation - 90; // subtract the lean
    const fullFlips = Math.floor(flipDegrees / 360);
    if (fullFlips >= 1) {
      cred += fullFlips * 4; // +4 rep per full flip
    }
  }

  return cred;
}
