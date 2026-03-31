import { useEffect, useRef, useState } from 'react';

interface Props {
  onComplete: () => void;
}

// Debris items that fly upward past the title (as if the camera is falling)
interface Particle {
  x: number;       // 0-1 normalized
  y: number;       // 0-1 normalized (starts below, flies up)
  speed: number;    // how fast it rises
  size: number;     // px
  char: string;     // what it looks like
  color: string;
  drift: number;    // horizontal drift
}

const DEBRIS_CHARS = ['/', '\\', '—', '~', '|', '=', '#', '%', '.', '*', '+'];
const DEBRIS_COLORS = [
  '#333344', '#2a2a3a', '#444455', '#3a3a4a', '#555566',
  '#224488', '#883322', '#887744', '#336644',
];

function createParticle(): Particle {
  return {
    x: Math.random(),
    y: 1.1 + Math.random() * 0.3, // start below screen
    speed: 0.3 + Math.random() * 0.7,
    size: 8 + Math.random() * 18,
    char: DEBRIS_CHARS[Math.floor(Math.random() * DEBRIS_CHARS.length)],
    color: DEBRIS_COLORS[Math.floor(Math.random() * DEBRIS_COLORS.length)],
    drift: (Math.random() - 0.5) * 0.1,
  };
}

export function SplashScreen({ onComplete }: Props) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out' | 'done'>('in');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef(0);

  // Initialize particles
  useEffect(() => {
    const particles: Particle[] = [];
    for (let i = 0; i < 40; i++) {
      const p = createParticle();
      p.y = Math.random(); // spread across screen initially
      particles.push(p);
    }
    particlesRef.current = particles;

    // Animation loop
    let lastTime = performance.now();
    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const canvas = canvasRef.current;
      if (!canvas) { rafRef.current = requestAnimationFrame(animate); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) { rafRef.current = requestAnimationFrame(animate); return; }

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Wind streaks — thin fast lines
      ctx.strokeStyle = 'rgba(60, 60, 80, 0.4)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 15; i++) {
        const sx = ((i * 137 + now * 0.01) % canvas.width);
        const sy = ((i * 89 + now * 0.3) % (canvas.height + 200)) - 100;
        const len = 30 + (i % 5) * 15;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (i % 3 - 1) * 3, sy - len);
        ctx.stroke();
      }

      // Debris particles
      for (const p of particles) {
        p.y -= p.speed * dt;
        p.x += p.drift * dt;

        // Recycle when off top
        if (p.y < -0.1) {
          p.y = 1.1 + Math.random() * 0.2;
          p.x = Math.random();
          p.speed = 0.3 + Math.random() * 0.7;
          p.char = DEBRIS_CHARS[Math.floor(Math.random() * DEBRIS_CHARS.length)];
          p.color = DEBRIS_COLORS[Math.floor(Math.random() * DEBRIS_COLORS.length)];
        }

        const px = p.x * canvas.width;
        const py = p.y * canvas.height;

        // Motion blur — draw a faded trail below
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = p.color;
        ctx.font = `${p.size}px monospace`;
        ctx.fillText(p.char, px, py + p.size * 0.8);
        ctx.fillText(p.char, px, py + p.size * 1.4);

        // Main character
        ctx.globalAlpha = 0.6;
        ctx.fillText(p.char, px, py);
      }
      ctx.globalAlpha = 1;

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Phase timers
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase('hold'), 1200));
    timers.push(setTimeout(() => setPhase('out'), 2400));
    timers.push(setTimeout(() => { setPhase('done'); onComplete(); }, 3400));
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  // Skip on tap/click/key
  useEffect(() => {
    const skip = () => { setPhase('done'); onComplete(); };
    const id = setTimeout(() => {
      window.addEventListener('keydown', skip, { once: true });
      window.addEventListener('pointerdown', skip, { once: true });
    }, 600);
    return () => {
      clearTimeout(id);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
  }, [onComplete]);

  if (phase === 'done') return null;

  const opacity = phase === 'in' ? 1 : phase === 'hold' ? 1 : 0;
  const transition = phase === 'in' ? 'opacity 1.2s ease-in' : 'opacity 1s ease-out';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0a0a1a',
      zIndex: 100,
      opacity,
      transition,
    }}>
      {/* Particle canvas behind text */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />

      {/* Title text centered on top */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
      }}>
        <div style={{
          fontFamily: '"Courier New", monospace',
          fontSize: '14px',
          color: '#888888',
          letterSpacing: '3px',
          textTransform: 'uppercase',
          marginBottom: '8px',
          textShadow: '0 0 10px rgba(0,0,0,0.8)',
        }}>
          StuntListing's
        </div>
        <div style={{
          fontFamily: '"Courier New", monospace',
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#cccccc',
          letterSpacing: '4px',
          textTransform: 'uppercase',
          textShadow: '0 0 20px rgba(0,0,0,0.8), 0 0 40px rgba(100,100,100,0.2)',
        }}>
          PRO HIGH FALLER
        </div>
      </div>
    </div>
  );
}
