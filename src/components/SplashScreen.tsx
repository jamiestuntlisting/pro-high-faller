import { useEffect, useState } from 'react';

interface Props {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: Props) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out' | 'done'>('in');

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
    // Small delay so the very first tap that loaded the page doesn't skip
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
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      opacity,
      transition,
    }}>
      <div style={{
        fontFamily: '"Courier New", monospace',
        fontSize: '14px',
        color: '#888888',
        letterSpacing: '3px',
        textTransform: 'uppercase',
        marginBottom: '8px',
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
        textShadow: '0 0 20px rgba(100,100,100,0.3)',
      }}>
        PRO HIGH FALLER
      </div>
    </div>
  );
}
