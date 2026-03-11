/**
 * Synthesized sound effects using Web Audio API.
 * No audio files needed — all sounds generated programmatically.
 * ALL IMPACTS ARE LOUD AND PUNCHY.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Resume if suspended (mobile browsers block until user gesture)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/** Call on first user interaction to unlock audio on mobile */
export function unlockAudio(): void {
  try {
    const ctx = getCtx();
    // Create a silent buffer and play it to unlock the context
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  } catch {
    // Audio not available
  }
}

/** Create a compressor node for maximum loudness without distortion */
function createLimiter(ctx: AudioContext): DynamicsCompressorNode {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -6;
  comp.knee.value = 3;
  comp.ratio.value = 12;
  comp.attack.value = 0.001;
  comp.release.value = 0.1;
  return comp;
}

/** MASSIVE thump for missing the landing target — body slamming concrete */
export function playThump(): void {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const limiter = createLimiter(ctx);
    limiter.connect(ctx.destination);

    // Layer 1: Sub-bass body slam
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(50, now);
    sub.frequency.exponentialRampToValueAtTime(18, now + 0.4);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(1.0, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    sub.connect(subGain);
    subGain.connect(limiter);
    sub.start(now);
    sub.stop(now + 0.7);

    // Layer 2: Mid punch
    const mid = ctx.createOscillator();
    mid.type = 'triangle';
    mid.frequency.setValueAtTime(120, now);
    mid.frequency.exponentialRampToValueAtTime(40, now + 0.2);
    const midGain = ctx.createGain();
    midGain.gain.setValueAtTime(0.9, now);
    midGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    mid.connect(midGain);
    midGain.connect(limiter);
    mid.start(now);
    mid.stop(now + 0.4);

    // Layer 3: Attack transient click
    const click = ctx.createOscillator();
    click.type = 'square';
    click.frequency.setValueAtTime(200, now);
    click.frequency.exponentialRampToValueAtTime(60, now + 0.05);
    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.8, now);
    clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    click.connect(clickGain);
    clickGain.connect(limiter);
    click.start(now);
    click.stop(now + 0.1);

    // Layer 4: Heavy crunch noise
    const bufferSize = Math.round(ctx.sampleRate * 0.25);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.2);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(limiter);
    noise.start(now);
    noise.stop(now + 0.3);
  } catch {
    // Audio not available
  }
}

/** BIG cushioned impact for landing on the airbag/boxes */
export function playCushionImpact(): void {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const limiter = createLimiter(ctx);
    limiter.connect(ctx.destination);

    // Layer 1: Deep whomp
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(45, now);
    sub.frequency.exponentialRampToValueAtTime(20, now + 0.35);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(1.0, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    sub.connect(subGain);
    subGain.connect(limiter);
    sub.start(now);
    sub.stop(now + 0.6);

    // Layer 2: Mid body thud
    const mid = ctx.createOscillator();
    mid.type = 'sine';
    mid.frequency.setValueAtTime(80, now);
    mid.frequency.exponentialRampToValueAtTime(30, now + 0.25);
    const midGain = ctx.createGain();
    midGain.gain.setValueAtTime(0.8, now);
    midGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    mid.connect(midGain);
    midGain.connect(limiter);
    mid.start(now);
    mid.stop(now + 0.35);

    // Layer 3: Air burst noise (the cushion puff)
    const bufferSize = Math.round(ctx.sampleRate * 0.3);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + 0.25);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(limiter);
    noise.start(now);
    noise.stop(now + 0.35);
  } catch {
    // Audio not available
  }
}

/** BIG splash sound for landing in water */
export function playSplash(): void {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const limiter = createLimiter(ctx);
    limiter.connect(ctx.destination);

    // Layer 1: Sub impact of hitting water
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(55, now);
    sub.frequency.exponentialRampToValueAtTime(20, now + 0.3);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.9, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    sub.connect(subGain);
    subGain.connect(limiter);
    sub.start(now);
    sub.stop(now + 0.5);

    // Layer 2: Splash noise — wide bandpass
    const bufferSize = Math.round(ctx.sampleRate * 0.5);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.pow(1 - i / bufferSize, 1.2);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.4);
    filter.Q.setValueAtTime(0.8, now);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(limiter);
    noise.start(now);
    noise.stop(now + 0.55);

    // Layer 3: High splash sparkle
    const bufferSize2 = Math.round(ctx.sampleRate * 0.2);
    const sparkleBuffer = ctx.createBuffer(1, bufferSize2, ctx.sampleRate);
    const data2 = sparkleBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize2; i++) {
      data2[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize2, 3);
    }
    const sparkle = ctx.createBufferSource();
    sparkle.buffer = sparkleBuffer;
    const sparkleGain = ctx.createGain();
    sparkleGain.gain.setValueAtTime(0.5, now + 0.02);
    sparkleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    const hiPass = ctx.createBiquadFilter();
    hiPass.type = 'highpass';
    hiPass.frequency.setValueAtTime(2000, now);
    sparkle.connect(hiPass);
    hiPass.connect(sparkleGain);
    sparkleGain.connect(limiter);
    sparkle.start(now + 0.02);
    sparkle.stop(now + 0.25);
  } catch {
    // Audio not available
  }
}
