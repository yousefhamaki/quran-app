import { useEffect, useId, useState } from 'react';
import { cn } from '@/lib/utils';
import type { TKey } from '@/lib/i18n';
import { cornerPrayers, formatHMS, formatTime, prayerWindow, type DayTimes, type Location, type MadhabId, type MethodId, type PrayerName } from '@/lib/prayer';
import { HIJRI_MONTHS_AR, HIJRI_MONTHS_EN, hijriOf } from '@/lib/hijri';
import { useSettings } from '@/context/settings';

const NAME_KEYS: Record<PrayerName, TKey> = {
  fajr: 'prayerFajr',
  sunrise: 'prayerSunrise',
  dhuhr: 'prayerDhuhr',
  asr: 'prayerAsr',
  maghrib: 'prayerMaghrib',
  isha: 'prayerIsha',
};

/** A clock that ticks every second (the countdown shows seconds). */
function useSecond() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    const onVisible = () => setNow(new Date());
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, []);
  return now;
}

interface Props {
  loc: Location;
  method: MethodId;
  madhab: MadhabId;
  hijriAdjust: number;
  /** Today's times (for the corner prayers). */
  times: DayTimes;
}

/**
 * The home of the Prayer tab: a ring that fills as time passes between the last prayer and the next one,
 * a live H:MM:SS countdown in the middle, and the other four prayers in the corners.
 */
export function PrayerRing({ loc, method, madhab, hijriAdjust, times }: Props) {
  const { settings, t } = useSettings();
  const now = useSecond();
  const ar = settings.lang === 'ar';
  const locale = ar ? 'ar' : 'en';
  const gradient = useId();
  const win = prayerWindow(loc, now, method, madhab);
  const left = win.next.at.getTime() - now.getTime();
  const corners = cornerPrayers(win.next.name);
  const hijri = hijriOf(now, hijriAdjust);
  const months = ar ? HIJRI_MONTHS_AR : HIJRI_MONTHS_EN;
  const num = (n: number) => n.toLocaleString(locale, { useGrouping: false });

  const r = 44;
  const c = 2 * Math.PI * r;
  const angle = win.elapsed * 360;
  const end = { x: 50 + r * Math.sin((angle * Math.PI) / 180), y: 50 - r * Math.cos((angle * Math.PI) / 180) };

  // Times of corner prayers: if a prayer already passed today it is shown with today's time (like the day's schedule).
  const corner = (name: PrayerName, align: string) => (
    <div className={cn('flex items-baseline gap-2 text-lg text-muted-foreground', align)}>
      <span className="font-medium">{t(NAME_KEYS[name])}</span>
      <span dir="ltr" className="tabular-nums">{formatTime(times[name], locale)}</span>
    </div>
  );

  return (
    <section aria-label={t('prayerNextLabel')} className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        {corner(corners[0], 'justify-start')}
        {corner(corners[1], 'justify-end')}
      </div>

      <div className="text-center">
        <p className={cn('text-3xl text-gold-foreground', ar ? 'font-quran' : 'font-display font-semibold')}>
          {num(hijri.day)} {months[hijri.month - 1]} {num(hijri.year)}
        </p>
        <p className="mt-1 text-sm text-gold-foreground/80" dir="auto">
          {loc.name ?? `${Math.abs(loc.lat).toFixed(2)}°${loc.lat >= 0 ? 'N' : 'S'}, ${Math.abs(loc.lng).toFixed(2)}°${loc.lng >= 0 ? 'E' : 'W'}`}
        </p>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-[22rem]" role="timer" aria-label={t('prayerNextIn', { name: t(NAME_KEYS[win.next.name]), h: Math.floor(left / 3_600_000), m: Math.floor((left % 3_600_000) / 60_000) })}>
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" style={{ stopColor: 'var(--destructive)' }} />
              <stop offset="45%" style={{ stopColor: 'var(--primary)' }} />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r={r} fill="none" strokeWidth="6.5" style={{ stroke: 'var(--muted)' }} />
          <circle
            cx="50" cy="50" r={r} fill="none" strokeWidth="6.5" strokeLinecap="round"
            stroke={`url(#${gradient})`}
            strokeDasharray={c}
            strokeDashoffset={c * (1 - win.elapsed)}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        {/* marker where "now" is on the ring */}
        <span
          aria-hidden
          className="absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground"
          style={{ left: `${end.x}%`, top: `${end.y}%` }}
        >
          <svg viewBox="0 0 24 24" className="size-5 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 6 6 6-6 6" /><path d="m12 6 6 6-6 6" /></svg>
        </span>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
          <p dir="ltr" className="text-5xl font-semibold tabular-nums">{formatHMS(left)}</p>
          <p className="text-base text-muted-foreground">{t('prayerLeftUntil')}</p>
          <p className={cn('text-5xl font-semibold', ar && 'font-quran leading-[1.8]')}>{t(NAME_KEYS[win.next.name])}</p>
          <p dir="ltr" className="text-xl tabular-nums">{formatTime(win.next.at, locale)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {corner(corners[2], 'justify-start')}
        {corner(corners[3], 'justify-end')}
      </div>
    </section>
  );
}
