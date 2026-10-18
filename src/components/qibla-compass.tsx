import { cn } from '@/lib/utils';

/** The Kaaba: a black cube with the golden band (hizam) and the door. */
export function KaabaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <polygon points="10,22 38,22 54,12 26,12" fill="#3a3a3a" />
      <rect x="10" y="22" width="28" height="30" fill="#141414" />
      <polygon points="38,22 54,12 54,42 38,52" fill="#0b0b0b" />
      <rect x="10" y="27" width="28" height="5" fill="#d4a93c" />
      <polygon points="38,27 54,17 54,22 38,32" fill="#b98f2a" />
      <rect x="19" y="37" width="9" height="15" rx="1" fill="#d4a93c" />
      <rect x="21" y="39" width="5" height="13" fill="#8a6a1c" />
    </svg>
  );
}

const CARDINALS: { key: 'N' | 'E' | 'S' | 'W'; deg: number }[] = [
  { key: 'N', deg: 0 },
  { key: 'E', deg: 90 },
  { key: 'S', deg: 180 },
  { key: 'W', deg: 270 },
];

/**
 * A dial with the red N for true north on top. The Kaaba sits on the rim in the direction of the Qibla
 * (the browser has no reliable compass, so the dial stays still; the phone app turns it with the device).
 */
export function QiblaCompass({ bearing, label }: { bearing: number; label: string }) {
  /** Something on the rim at `deg`, kept upright. */
  const onRim = (deg: number, node: React.ReactNode, inset: string) => (
    <div className="pointer-events-none absolute inset-0 flex items-start justify-center" style={{ transform: `rotate(${deg}deg)` }}>
      <div className="flex justify-center" style={{ marginTop: inset, transform: `rotate(${-deg}deg)` }}>{node}</div>
    </div>
  );

  return (
    <div className="relative size-64" role="img" aria-label={label}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
        <circle cx="50" cy="50" r="48" fill="none" className="stroke-border" strokeWidth="1" />
        {Array.from({ length: 36 }, (_, i) => i * 10).map(a => {
          const long = a % 90 === 0;
          const rad = (a * Math.PI) / 180;
          const r1 = 47;
          const r2 = long ? 41 : 44;
          return (
            <line
              key={a}
              x1={50 + r1 * Math.sin(rad)} y1={50 - r1 * Math.cos(rad)}
              x2={50 + r2 * Math.sin(rad)} y2={50 - r2 * Math.cos(rad)}
              className={a === 0 ? 'stroke-[#c0392b]' : 'stroke-border'}
              strokeWidth={long ? 1.3 : 0.7}
            />
          );
        })}
      </svg>
      {CARDINALS.map(c => (
        <div key={c.key} className="contents">
          {onRim(c.deg, <span className={cn('text-base font-bold leading-none', c.key === 'N' ? 'text-[#c0392b]' : 'text-muted-foreground')}>{c.key}</span>, '2.6rem')}
        </div>
      ))}
      {onRim(bearing, <KaabaIcon className="size-11" />, '0.1rem')}
      <span className="absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border" aria-hidden />
    </div>
  );
}
