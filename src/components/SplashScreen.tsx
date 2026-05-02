import { useEffect, useState } from 'react';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'draw' | 'glow' | 'text' | 'exit'>('draw');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('glow'), 800);
    const t2 = setTimeout(() => setPhase('text'), 1400);
    const t3 = setTimeout(() => setPhase('exit'), 2200);
    const t4 = setTimeout(() => onComplete(), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 bg-black z-50 flex flex-col items-center justify-center transition-transform duration-700 ${phase === 'exit' ? '-translate-y-full' : 'translate-y-0'}`} style={{ transitionTimingFunction: 'cubic-bezier(0.7, 0, 0.3, 1)' }}>
      <div className="relative flex flex-col items-center">
        <svg width="120" height="140" viewBox="0 0 120 140" className={`transition-all duration-500 ${phase === 'draw' ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
          <defs>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4AF37" />
              <stop offset="50%" stopColor="#FFF8DC" />
              <stop offset="100%" stopColor="#D4AF37" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path
            d="M20 130 L20 10 L60 70 L100 10 L100 130"
            fill="none"
            stroke="url(#goldGrad)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={phase === 'glow' || phase === 'text' ? 'url(#glow)' : undefined}
            className={phase === 'draw' ? 'animate-pulse-gold' : ''}
          />
          <path
            d="M35 50 L35 10 L60 45 L85 10 L85 50"
            fill="none"
            stroke="#D4AF37"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.6"
          />
        </svg>
        <h1
          className={`mt-8 text-3xl font-bold tracking-[0.3em] text-[#D4AF37] transition-all duration-500 ${phase === 'text' || phase === 'exit' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
          style={{ fontFamily: 'Inter, monospace' }}
        >
          NEXUS
        </h1>
        <p
          className={`mt-2 text-xs tracking-[0.5em] text-neutral-500 uppercase transition-all duration-500 delay-100 ${phase === 'text' || phase === 'exit' ? 'opacity-100' : 'opacity-0'}`}
        >
          Premium Communication
        </p>
      </div>
    </div>
  );
}
