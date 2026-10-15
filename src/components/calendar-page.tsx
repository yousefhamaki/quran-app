import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { dateString } from '@/lib/habit';
import { HIJRI_MONTHS_AR, HIJRI_MONTHS_EN, monthDays, monthLength, OCCASIONS, RAMADAN, shiftMonth } from '@/lib/hijri';
import { formatTime } from '@/lib/prayer';
import { usePrayer } from '@/context/prayer';
import { useHabit } from '@/context/habit';
import { useSettings } from '@/context/settings';

interface Props {
  /** Start a 30-day khatmah (Ramadan card). */
  onOpenDaily: () => void;
}

export function CalendarPage({ onOpenDaily }: Props) {
  const { settings, t } = useSettings();
  const { hijri, hijriAdjust, setHijriAdjust, times } = usePrayer();
  const { khatmah, startKhatmah } = useHabit();
  const ar = settings.lang === 'ar';
  const locale = ar ? 'ar' : 'en';
  const months = ar ? HIJRI_MONTHS_AR : HIJRI_MONTHS_EN;
  const [view, setView] = useState({ year: hijri.year, month: hijri.month });
  const today = dateString();

  const days = useMemo(() => monthDays(view.year, view.month, hijriAdjust), [view, hijriAdjust]);
  const occasions = OCCASIONS.filter(o => o.month === view.month);
  const weekdayNames = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 7 + i).toLocaleDateString(locale, { weekday: 'narrow' })), [locale]);
  const label = (y: number, m: number) => `${months[m - 1]} ${y.toLocaleString(locale, { useGrouping: false })}`;
  const inRamadan = hijri.month === RAMADAN;
  const lead = days[0]?.weekday ?? 0;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pt-6 pb-32">
      {/* Today */}
      <Card className="gap-1 rounded-3xl p-5">
        <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-primary uppercase"><Moon className="size-4" aria-hidden /> {t('hijriTodayLabel')}</p>
        <p className={cn('text-3xl', ar ? 'font-quran' : 'font-display font-semibold')}>{hijri.day.toLocaleString(locale, { useGrouping: false })} {months[hijri.month - 1]} {hijri.year.toLocaleString(locale, { useGrouping: false })}</p>
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </Card>

      {/* Ramadan mode */}
      {inRamadan && (
        <Card className="pattern-lattice gap-3 rounded-3xl bg-primary p-5 text-primary-foreground">
          <h2 className="font-display text-2xl font-semibold">{t('ramadanGreeting')}</h2>
          <p className="text-sm opacity-90">{t('ramadanDay', { n: hijri.day, total: monthLength(hijri.year, RAMADAN) })}</p>
          {times && (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-primary-foreground/15 p-3"><dt className="opacity-80">{t('ramadanSuhoor')}</dt><dd dir="ltr" className="text-xl font-semibold tabular-nums">{formatTime(times.fajr, locale)}</dd></div>
              <div className="rounded-2xl bg-primary-foreground/15 p-3"><dt className="opacity-80">{t('ramadanIftar')}</dt><dd dir="ltr" className="text-xl font-semibold tabular-nums">{formatTime(times.maghrib, locale)}</dd></div>
            </dl>
          )}
          {!khatmah && (
            <Button variant="secondary" className="h-11 w-fit rounded-xl" onClick={() => { startKhatmah(30); onOpenDaily(); }}>{t('ramadanKhatmah')}</Button>
          )}
        </Card>
      )}

      {/* Month */}
      <Card className="gap-3 rounded-3xl p-4">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon" className="size-11 rtl:rotate-180" aria-label={t('hijriPrev')} onClick={() => setView(v => shiftMonth(v.year, v.month, -1))}><ChevronLeft className="size-5" aria-hidden /></Button>
          <h2 className="text-lg font-semibold" aria-live="polite">{label(view.year, view.month)}</h2>
          <Button variant="ghost" size="icon" className="size-11 rtl:rotate-180" aria-label={t('hijriNext')} onClick={() => setView(v => shiftMonth(v.year, v.month, 1))}><ChevronRight className="size-5" aria-hidden /></Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label={label(view.year, view.month)}>
          {weekdayNames.map((w, i) => <span key={i} className="py-1 text-xs text-muted-foreground" role="columnheader">{w}</span>)}
          {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} aria-hidden />)}
          {days.map(d => {
            const isToday = d.iso === today;
            const special = OCCASIONS.some(o => o.month === view.month && o.day === d.day);
            return (
              <div key={d.day} role="gridcell" aria-current={isToday ? 'date' : undefined} className={cn('grid aspect-square place-items-center rounded-xl text-sm tabular-nums', isToday ? 'bg-primary font-semibold text-primary-foreground' : special ? 'bg-secondary font-medium' : 'bg-muted/50')}>
                <span>{d.day.toLocaleString(locale, { useGrouping: false })}</span>
                <span className="-mt-3 text-[9px] opacity-60">{Number(d.iso.slice(8)).toLocaleString(locale, { useGrouping: false })}</span>
              </div>
            );
          })}
        </div>
        <Button variant="ghost" className="h-10 w-fit rounded-xl text-primary" onClick={() => setView({ year: hijri.year, month: hijri.month })}>{t('hijriTodayLabel')}</Button>
      </Card>

      {occasions.length > 0 && (
        <section className="space-y-2" aria-labelledby="occ">
          <h2 id="occ" className="text-sm font-medium text-muted-foreground">{t('hijriOccasions')}</h2>
          <ul className="space-y-1.5">
            {occasions.map(o => <li key={o.day} className="flex gap-3 rounded-xl bg-muted px-4 py-2.5 text-sm"><span className="w-6 font-semibold tabular-nums">{o.day.toLocaleString(locale, { useGrouping: false })}</span><span>{ar ? o.ar : o.en}</span></li>)}
          </ul>
        </section>
      )}

      {/* Adjust */}
      <Card className="gap-3 rounded-3xl p-5">
        <p className="font-medium">{t('hijriAdjust')}</p>
        <div className="flex items-center gap-2" role="group" aria-label={t('hijriAdjust')}>
          {[-1, 0, 1].map(n => (
            <Button key={n} variant={hijriAdjust === n ? 'default' : 'outline'} className="h-11 min-w-14 rounded-full tabular-nums" onClick={() => setHijriAdjust(n)} aria-pressed={hijriAdjust === n}>{n > 0 ? `+${n}` : n}</Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t('hijriAdjustHint')}</p>
      </Card>
    </div>
  );
}
