import { useMemo, useState } from 'react';
import { ArrowDownToLine, Check, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { juzSurahs } from '@/lib/juz';
import { RECITERS, estimateReciterBytes, type Surah } from '@/lib/quran';
import { formatBytes, offlineSupported } from '@/lib/offline';
import { useDownloads } from '@/context/downloads';
import { useSettings } from '@/context/settings';

interface Props {
  surahs: Surah[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Download several surahs, or a whole juz, as a queue (one after another, with the saved reciter). */
export function QueueSheet({ surahs, open, onOpenChange }: Props) {
  const { settings, t } = useSettings();
  const { has, job, startMany, cancel } = useDownloads();
  const ar = settings.lang === 'ar';
  const reciter = RECITERS.find(r => r.id === settings.reciter) ?? RECITERS[0];
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const running = job !== null;

  const todo = useMemo(() => surahs.filter(s => picked.has(s.number) && !has(s.number, reciter.id)), [surahs, picked, has, reciter.id]);
  const skipped = picked.size - todo.length;
  const bytes = todo.reduce((sum, s) => sum + estimateReciterBytes(reciter.id, s.numberOfAyahs), 0);
  const big = bytes > 500 * 1048576;
  const pct = job && job.total > 0 ? Math.round((job.done / job.total) * 100) : 0;
  const surahName = (n: number) => { const s = surahs.find(x => x.number === n); return s ? (ar ? s.name : s.englishName) : `#${n}`; };

  const toggle = (n: number) => setPicked(prev => { const next = new Set(prev); if (next.has(n)) next.delete(n); else next.add(n); return next; });
  const addJuz = (juz: number) => setPicked(prev => new Set([...prev, ...juzSurahs(juz)]));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto flex max-h-[92dvh] w-full max-w-3xl flex-col gap-0 rounded-t-3xl p-0">
        <SheetHeader className="px-5 pt-5 pb-3 text-start">
          <SheetTitle className="font-display text-2xl">{t('queueTitle')}</SheetTitle>
          <SheetDescription>{t('queueHint')} · {ar ? reciter.ar : reciter.en}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-3">
          <Button variant="secondary" disabled={running} className="h-12 w-full rounded-xl text-base" onClick={() => setPicked(new Set(surahs.map(s => s.number)))}>
            {t('queueWholeQuran')}
          </Button>

          <section aria-labelledby="queue-juz">
            <h3 id="queue-juz" className="mb-2 text-sm font-medium text-muted-foreground">{t('queueJuz')}</h3>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 30 }, (_, i) => i + 1).map(n => (
                <Button key={n} variant="outline" disabled={running} className="h-11 min-w-11 rounded-full px-3 tabular-nums" onClick={() => addJuz(n)}>
                  {n}
                </Button>
              ))}
            </div>
          </section>

          <section aria-labelledby="queue-surahs">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 id="queue-surahs" className="text-sm font-medium text-muted-foreground">{t('queueSurahs')}</h3>
              <span className="flex gap-1">
                <Button variant="ghost" size="sm" disabled={running} className="h-9 rounded-lg text-primary" onClick={() => setPicked(new Set(surahs.map(s => s.number)))}>{t('queueSelectAll')}</Button>
                <Button variant="ghost" size="sm" disabled={running || picked.size === 0} className="h-9 rounded-lg" onClick={() => setPicked(new Set())}>{t('queueClear')}</Button>
              </span>
            </div>
            <ul className="grid gap-1 sm:grid-cols-2">
              {surahs.map(s => {
                const on = picked.has(s.number);
                const done = has(s.number, reciter.id);
                return (
                  <li key={s.number}>
                    <button
                      type="button"
                      aria-pressed={on}
                      disabled={running}
                      onClick={() => toggle(s.number)}
                      className={cn('flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-start transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60', on ? 'bg-primary/15' : 'bg-muted hover:bg-accent')}
                    >
                      <span className={cn('grid size-5 shrink-0 place-items-center rounded-md border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-input')} aria-hidden>
                        {on && <Check className="size-3.5" />}
                      </span>
                      <span className="w-7 text-center text-xs text-muted-foreground tabular-nums">{s.number}</span>
                      <span className={cn('min-w-0 flex-1 truncate text-sm', ar && 'font-quran')}>{ar ? s.name : s.englishName}</span>
                      {done && <span className="text-xs text-primary">{t('offlineReady')}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="space-y-3 border-t px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {!offlineSupported && <p role="alert" className="text-sm text-destructive">{t('offlineUnsupported')}</p>}

          {job ? (
            <div className="space-y-2" aria-live="polite">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{job.queue ? `${t('queueProgress', { i: job.queue.index, n: job.queue.total })} · ` : ''}{surahName(job.surah)}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{job.done}/{job.total} · {pct}%</span>
              </div>
              <Progress value={pct} aria-label={t('downloading')} />
              <Button variant="outline" className="h-11 w-full gap-2 rounded-xl" onClick={cancel}>
                <X className="size-4" aria-hidden /> {t('cancel')}
              </Button>
            </div>
          ) : (
            <>
              {big && <p role="note" className="rounded-xl bg-secondary p-3 text-xs text-secondary-foreground">{t('queueBigWarning', { size: formatBytes(bytes) })}</p>}
              {picked.size > 0 && (
                <p className="text-sm text-muted-foreground">
                  {t('queueSelected', { n: todo.length, size: formatBytes(bytes) })}
                  {skipped > 0 ? ` · ${t('queueAlready', { n: skipped })}` : ''}
                </p>
              )}
              <Button
                className="h-12 w-full gap-2 rounded-xl text-base"
                disabled={!offlineSupported || todo.length === 0}
                onClick={() => void startMany(todo.map(s => ({ surah: s.number, ayahCount: s.numberOfAyahs })), reciter.id)}
              >
                <ArrowDownToLine className="size-5" aria-hidden /> {t('queueStart', { n: todo.length })}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
