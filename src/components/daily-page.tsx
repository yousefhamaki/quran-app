import { useEffect, useState } from 'react';
import { ArrowRight, Bell, BookCheck, CheckCircle2, Flame, HandHeart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { TKey } from '@/lib/i18n';
import type { Page } from '@/hooks/use-hash-route';
import { approxPages, daysEarly, takenDays, TOTAL_AYAHS, type Ref } from '@/lib/habit';
import { fetchSurah, type Ayah, type Surah } from '@/lib/quran';
import { useHabit, type Reminder } from '@/context/habit';
import { useSettings } from '@/context/settings';

const DAY_CHOICES = [7, 15, 30, 60, 90];

/** The text of one ayah, fetched (and cached) with its surah. */
export function useAyahText(ref: Ref): Ayah | null {
  const [ayah, setAyah] = useState<Ayah | null>(null);
  useEffect(() => {
    let cancelled = false;
    setAyah(null);
    fetchSurah(ref.surah)
      .then(list => !cancelled && setAyah(list.find(a => a.number === ref.ayah) ?? null))
      .catch(() => !cancelled && setAyah(null));
    return () => { cancelled = true; };
  }, [ref.surah, ref.ayah]);
  return ayah;
}

function Ring({ percent, label }: { percent: number; label: string }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-28 shrink-0" role="img" aria-label={label}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-muted" />
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" strokeLinecap="round" className="stroke-primary transition-[stroke-dashoffset] duration-500" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, percent) / 100)} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xl font-semibold tabular-nums">{Math.floor(percent)}%</span>
    </div>
  );
}

type Tab = 'reading' | 'khatmah' | 'completed';
const TABS: { id: Tab; label: TKey }[] = [
  { id: 'reading', label: 'dailyTabReading' },
  { id: 'khatmah', label: 'dailyTabKhatmah' },
  { id: 'completed', label: 'dailyTabCompleted' },
];

interface ReminderCardProps {
  id: string;
  title: string;
  hint: string;
  reminder: Reminder;
  onChange: (r: Reminder) => void;
}

/** A switch + time picker for a browser notification (it only appears while the page is open). */
function ReminderCard({ id, title, hint, reminder, onChange }: ReminderCardProps) {
  const { t } = useSettings();
  const [message, setMessage] = useState<string | null>(null);
  const timeValue = `${String(reminder.hour).padStart(2, '0')}:${String(reminder.minute).padStart(2, '0')}`;

  const toggle = async (on: boolean) => {
    setMessage(null);
    if (!on) { onChange({ ...reminder, enabled: false }); return; }
    if (typeof Notification === 'undefined') { setMessage(t('reminderUnsupported')); return; }
    const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (perm !== 'granted') { setMessage(t('reminderDenied')); return; }
    onChange({ ...reminder, enabled: true });
  };

  return (
    <Card className="gap-4 rounded-3xl p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary" aria-hidden><Bell className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <Label htmlFor={`${id}-switch`} className="text-base font-medium">{title}</Label>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <Switch id={`${id}-switch`} checked={reminder.enabled} onCheckedChange={v => void toggle(v)} />
      </div>
      {reminder.enabled && (
        <div className="flex items-center gap-3">
          <Label htmlFor={`${id}-time`}>{t('reminderTime')}</Label>
          <Input
            id={`${id}-time`}
            type="time"
            value={timeValue}
            onChange={e => {
              const [h, m] = e.target.value.split(':').map(Number);
              if (Number.isFinite(h) && Number.isFinite(m)) onChange({ ...reminder, hour: h, minute: m });
            }}
            className="h-11 w-36 rounded-xl"
          />
        </div>
      )}
      {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
      <p className="text-xs text-muted-foreground">{t('reminderWebNote')}</p>
    </Card>
  );
}

interface Props {
  surahs: Surah[];
  onOpen: (surah: number, ayah: number) => void;
  onOpenPage: (page: Page, param?: string) => void;
  /** Open on this tab ("reading", "khatmah" or "completed"), e.g. from the feature search. */
  initialTab?: string | null;
}

export function DailyPage({ surahs, onOpen, onOpenPage, initialTab }: Props) {
  const { settings, t } = useSettings();
  const habit = useHabit();
  const { khatmah, stats, streak, longest, week, readToday, ayahOfDay, reminder, khatmahReminder, completed } = habit;
  const ar = settings.lang === 'ar';
  const locale = ar ? 'ar' : 'en';
  const nameOf = (n: number) => { const s = surahs.find(x => x.number === n); return s ? (ar ? s.name : s.englishName) : `#${n}`; };
  const refLabel = (r: Ref) => `${nameOf(r.surah)} ${r.ayah}`;
  const ayahText = useAyahText(ayahOfDay);
  const dateLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });

  const [tab, setTab] = useState<Tab>(() => (TABS.some(x => x.id === initialTab) ? (initialTab as Tab) : 'reading'));
  useEffect(() => { if (TABS.some(x => x.id === initialTab)) setTab(initialTab as Tab); }, [initialTab]);
  const [days, setDays] = useState(30);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const perDay = Math.ceil(TOTAL_AYAHS / days);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 pt-4 pb-32">
      <div role="tablist" aria-label={t('dailyTitle')} className="flex gap-1 rounded-full bg-muted p-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn('h-10 flex-1 rounded-full px-2 text-sm font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none', tab === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            {t(label)}{id === 'completed' && completed.length > 0 ? ` (${completed.length})` : ''}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------ Daily reading */}
      {tab === 'reading' && (
        <div className="space-y-5">
          <Card className="gap-3 rounded-3xl p-5">
            <p className="text-xs font-medium tracking-wide text-primary uppercase">{t('ayahOfDay')} · {refLabel(ayahOfDay)}</p>
            {ayahText ? (
              <>
                <p lang="ar" dir="rtl" className="font-quran ar-safe text-2xl leading-[1.9]">{ayahText.ar}</p>
                {settings.lang === 'en' && <p className="text-sm text-muted-foreground">{ayahText.en}</p>}
              </>
            ) : (
              <div className="h-16 animate-pulse rounded-xl bg-muted" aria-hidden />
            )}
            <Button variant="outline" className="h-11 w-fit gap-2 rounded-xl" onClick={() => onOpen(ayahOfDay.surah, ayahOfDay.ayah)}>
              {t('ayahOfDayOpen')} <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
            </Button>
          </Card>

          <Card className="gap-4 rounded-3xl p-5">
            <div className="flex items-center gap-4">
              <span className={cn('grid size-14 shrink-0 place-items-center rounded-2xl', streak > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')} aria-hidden>
                <Flame className="size-7" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-medium text-muted-foreground">{t('streakHeading')}</h2>
                <p className="text-2xl font-semibold tabular-nums">{streak === 1 ? t('streakDay1') : t('streakDays', { n: streak })}</p>
                <p className="text-xs text-muted-foreground">
                  {readToday ? t('streakToday') : streak > 0 ? t('streakKeep') : t('streakNone')}
                  {longest > 1 ? ` · ${t('streakBest', { n: longest })}` : ''}
                </p>
              </div>
            </div>
            <ol className="flex justify-between gap-1" aria-label={t('streakHeading')}>
              {week.map(d => (
                <li key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className={cn('grid size-8 place-items-center rounded-full border', d.read ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-transparent')} aria-label={`${d.day}: ${d.read ? '✓' : '–'}`}>
                    <CheckCircle2 className="size-4" aria-hidden />
                  </span>
                  <span className="text-[11px] text-muted-foreground">{new Date(`${d.day}T00:00:00`).toLocaleDateString(locale, { weekday: 'narrow' })}</span>
                </li>
              ))}
            </ol>
          </Card>

          <ReminderCard id="daily" title={t('reminderHeading')} hint={t('reminderHint')} reminder={reminder} onChange={habit.setReminder} />

          <button type="button" onClick={() => onOpenPage('adhkar')} className="flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-start transition-colors hover:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary" aria-hidden><HandHeart className="size-6" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{t('adhkarTitle')}</span>
              <span className="block truncate text-sm text-muted-foreground">{t('adhkarCardHint')}</span>
            </span>
            <ArrowRight className="size-5 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
          </button>
        </div>
      )}

      {/* ------------------------------------------------ Khatmah planner */}
      {tab === 'khatmah' && (
        <div className="space-y-5">
          {!khatmah || !stats ? (
            <Card className="space-y-5 rounded-3xl p-5">
              <p className="text-sm leading-relaxed text-muted-foreground">{t('khatmahIntro')}</p>
              <div className="space-y-2">
                <Label>{t('khatmahDays')}</Label>
                <ToggleGroup type="single" variant="outline" value={String(days)} onValueChange={v => v !== '' && setDays(Number(v))} className="flex w-full flex-wrap justify-start gap-2" aria-label={t('khatmahDays')}>
                  {DAY_CHOICES.map(n => (
                    <ToggleGroupItem key={n} value={String(n)} className="h-11 min-w-12 rounded-full! border! px-4 text-sm shadow-none">{n}</ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <Input type="number" inputMode="numeric" min={1} max={365} value={days} onChange={e => setDays(Math.min(365, Math.max(1, Number(e.target.value) || 1)))} className="h-12 w-32 rounded-xl" aria-label={t('khatmahDays')} />
                <p className="text-sm text-muted-foreground">{t('khatmahPerDay', { n: perDay, pages: approxPages(perDay) })}</p>
              </div>
              <Button className="h-12 w-full rounded-xl text-base" onClick={() => habit.startKhatmah(days)}>{t('khatmahStart')}</Button>
            </Card>
          ) : (
            <>
              <Card className="flex-row items-center gap-5 rounded-3xl p-5">
                <Ring percent={stats.percent} label={`${Math.floor(stats.percent)}%`} />
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold">{stats.finished ? t('khatmahFinished') : t('khatmahDay', { day: Math.min(stats.day, khatmah.days), days: khatmah.days })}</p>
                  <p className="text-sm text-muted-foreground">{t('khatmahRead', { n: stats.read })}</p>
                  {!stats.finished && stats.daysLeft === 0 && <p className="text-xs text-muted-foreground">{t('khatmahLate')}</p>}
                  {!stats.finished && stats.daysLeft > 0 && <p className="text-xs text-muted-foreground">{t('khatmahNeed', { n: stats.perDayNow })}</p>}
                </div>
              </Card>

              {stats.finished && (
                <Card className="gap-3 rounded-2xl border-primary/40 p-4">
                  <p className="text-sm text-muted-foreground">{t('khatmDuaHint')}</p>
                  <Button className="h-11 w-fit gap-2 rounded-xl" onClick={() => onOpenPage('adhkar', 'khatm')}>
                    <HandHeart className="size-4" aria-hidden /> {t('khatmDuaOpen')}
                  </Button>
                </Card>
              )}

              {!stats.finished && (
                stats.portion ? (
                  <Card className="gap-3 rounded-2xl border-primary/40 p-4">
                    <p className="text-xs font-medium tracking-wide text-primary uppercase">{t('khatmahToday')}</p>
                    <p className="text-lg font-semibold">{t('khatmahFrom', { from: refLabel(stats.portion.from), to: refLabel(stats.portion.to) })}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('khatmahCount', { n: stats.portion.count, pages: approxPages(stats.portion.count) })}
                      {stats.behind > 0 ? ` · ${t('khatmahBehind', { n: stats.behind })}` : ''}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" className="h-11 gap-2 rounded-xl" onClick={() => onOpen(stats.portion!.from.surah, stats.portion!.from.ayah)}>
                        {t('khatmahOpen')} <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
                      </Button>
                      <Button className="h-11 gap-2 rounded-xl" onClick={habit.finishToday}>
                        <CheckCircle2 className="size-4" aria-hidden /> {t('khatmahDone')}
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    <p className="flex items-center gap-2 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
                      <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden /> {t('khatmahTodayDone')}
                    </p>
                    {stats.next && (
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" className="h-11 gap-2 rounded-xl" onClick={() => onOpen(stats.next!.surah, stats.next!.ayah)}>
                          {t('khatmahOpen')} <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
                        </Button>
                        <Button variant="ghost" className="h-11 rounded-xl text-primary" onClick={() => habit.readExtra(Math.ceil(TOTAL_AYAHS / khatmah.days))}>
                          {t('khatmahReadExtra', { n: Math.ceil(TOTAL_AYAHS / khatmah.days) })}
                        </Button>
                      </div>
                    )}
                  </div>
                )
              )}

              {!stats.finished && (
                <ReminderCard id="khatmah" title={t('khatmahReminderHeading')} hint={t('khatmahReminderHint')} reminder={khatmahReminder} onChange={habit.setKhatmahReminder} />
              )}

              <Button variant="ghost" className="h-11 gap-2 rounded-xl text-destructive hover:text-destructive" onClick={() => (stats.finished ? habit.removeKhatmah() : setConfirmDelete(true))}>
                <Trash2 className="size-4" aria-hidden /> {stats.finished ? t('khatmahNew') : t('khatmahDelete')}
              </Button>
            </>
          )}
        </div>
      )}

      {/* ------------------------------------------------ Completed khatmahs */}
      {tab === 'completed' && (
        <section aria-labelledby="completed-heading" className="space-y-4">
          <h2 id="completed-heading" className="sr-only">{t('completedHeading')}</h2>
          {completed.length === 0 ? (
            <div className="space-y-2 rounded-3xl bg-secondary p-6 text-center">
              <BookCheck className="mx-auto size-9 text-primary" aria-hidden />
              <p className="text-sm text-secondary-foreground">{t('completedEmpty')}</p>
            </div>
          ) : (
            <>
              <Card className="flex-row items-center gap-4 rounded-3xl bg-primary p-5 text-primary-foreground">
                <BookCheck className="size-9 shrink-0" aria-hidden />
                <p className="text-xl font-semibold">{t('completedCount', { n: completed.length })}</p>
              </Card>
              <ul className="space-y-3">
                {completed.map((c, i) => {
                  const early = daysEarly(c);
                  return (
                    <li key={`${c.startDate}:${c.finishedOn}`}>
                      <Card className="gap-1.5 rounded-2xl p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold">{t('completedTitle', { n: completed.length - i })}</p>
                          <span className={cn('rounded-full px-3 py-1 text-xs font-medium', early >= 0 ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
                            {early === 0 ? t('completedOnTime') : early > 0 ? t('completedEarly', { n: early }) : t('completedLate', { n: -early })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{t('completedDates', { from: dateLabel(c.startDate), to: dateLabel(c.finishedOn) })}</p>
                        <p className="text-sm text-muted-foreground">{t('completedTook', { n: takenDays(c), plan: c.days })}</p>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('khatmahDelete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('khatmahDeleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { habit.removeKhatmah(); setConfirmDelete(false); }}>{t('khatmahDelete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
