import { useState } from 'react';
import { AlertCircle, ChevronUp, Loader2, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrderedReciters } from '@/components/reciter-list';
import { GapControl } from '@/components/gap-control';
import { RepeatControl } from '@/components/repeat-control';
import { SleepControl, AutoNextSurahControl, formatCountdown } from '@/components/sleep-control';
import { cn } from '@/lib/utils';
import { RECITERS, type Surah } from '@/lib/quran';
import { useSettings } from '@/context/settings';
import { usePlayer } from '@/context/player';

const SPEEDS = [0.75, 1, 1.25, 1.5];

function formatTime(s: number) {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function PlayPause({ className }: { className?: string }) {
  const { t } = useSettings();
  const { isPlaying, loading, failed, toggle, gapLeft, gapPaused } = usePlayer();
  const running = isPlaying || (gapLeft !== null && !gapPaused);
  return (
    <Button size="icon" className={cn('size-12 rounded-full', className)} onClick={toggle} aria-label={running ? t('pause') : t('play')}>
      {loading ? <Loader2 className="size-5 animate-spin" aria-hidden /> : failed ? <AlertCircle className="size-5" aria-hidden /> : running ? <Pause className="size-5 fill-current" aria-hidden /> : <Play className="size-5 fill-current rtl:-scale-x-100" aria-hidden />}
    </Button>
  );
}

export function PlayerBar({ surahs }: { surahs: Surah[] }) {
  const { settings, update, repeatTimes, t } = useSettings();
  const { playing, failed, time, duration, pass, sleep, sleepLeft, gapLeft, gapTotal, gapPaused, stop, next, previous, seek, changeReciter } = usePlayer();
  const { pinned, others } = useOrderedReciters();
  const [open, setOpen] = useState(false);
  if (!playing) return null;

  const ar = settings.lang === 'ar';
  const reciter = RECITERS.find(r => r.id === playing.reciter);
  const surah = surahs.find(s => s.number === playing.surah);
  const reciterName = (r: { ar: string; en: string }) => (ar ? r.ar : r.en);
  const surahLabel = surah ? (ar ? surah.name : surah.englishName) : '';
  const inGap = gapLeft !== null;
  // During the pause between ayahs the line under the bar counts down instead of showing audio progress.
  const pct = inGap ? (gapTotal > 0 ? Math.min(100, (gapLeft / gapTotal) * 100) : 0) : duration > 0 ? Math.min(100, (time / duration) * 100) : 0;
  const atEnd = surah ? playing.ayah >= surah.numberOfAyahs : false;

  return (
    <>
      <div role="region" aria-label={t('nowPlaying')} className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border bg-card/90 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <div className="h-1 w-full bg-muted" aria-hidden>
            <div className={cn('h-full transition-[width] duration-100 ease-linear', inGap ? 'bg-gold' : 'bg-primary')} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center gap-2 p-2.5">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={t('expand')}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1 text-start focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary font-semibold text-primary-foreground tabular-nums" aria-hidden>
                {playing.ayah}
              </span>
              <span className="min-w-0 flex-1">
                <span className="ar-safe block truncate text-sm font-medium">{surahLabel}</span>
                <span className={cn('block truncate text-xs', failed ? 'text-destructive' : inGap ? 'font-medium text-gold-foreground' : 'text-muted-foreground')} aria-live={inGap ? 'polite' : 'off'}>
                  {failed
                    ? t('error')
                    : inGap
                      ? `${t('yourTurn')} · ${gapPaused ? t('gapPausedLabel') : t('gapSeconds', { n: Math.ceil(gapLeft) })}`
                      : `${sleep ? `${sleep.kind === 'surah' ? t('sleepEndOfSurah') : t('sleepLeft', { time: formatCountdown(sleepLeft ?? 0) })} · ` : ''}${reciter ? reciterName(reciter) : ''}${repeatTimes !== 1 ? ` · ${repeatTimes === 0 ? t('repeatPassForever', { i: pass }) : t('repeatPass', { i: pass, n: repeatTimes })}` : ''}`}
                </span>
              </span>
              <ChevronUp className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            </button>
            <Button variant="ghost" size="icon" className="hidden size-11 rounded-full sm:inline-flex" onClick={previous} aria-label={t('previous')}>
              <SkipBack className="size-5 rtl:-scale-x-100" aria-hidden />
            </Button>
            <PlayPause />
            <Button variant="ghost" size="icon" className="size-11 rounded-full" onClick={next} disabled={atEnd} aria-label={t('next')}>
              <SkipForward className="size-5 rtl:-scale-x-100" aria-hidden />
            </Button>
          </div>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="mx-auto w-full max-w-3xl gap-0 rounded-t-3xl p-0">
          <SheetHeader className="px-5 pt-5 pb-2 text-start">
            <SheetTitle className={cn('text-xl', ar ? 'font-quran' : 'font-display')}>
              {surahLabel} · {t('ayah')} {playing.ayah}
            </SheetTitle>
            <SheetDescription>{reciter ? reciterName(reciter) : ''}</SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-5 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {/* Seek */}
            <div className="space-y-2" dir="ltr">
              <Slider
                min={0}
                max={Math.max(duration, 0.1)}
                step={0.1}
                value={[Math.min(time, duration || 0)]}
                onValueChange={([v]) => seek(v)}
                disabled={!duration}
                aria-label={t('seek')}
              />
              <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
                <span>{formatTime(time)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Transport */}
            <div className="flex items-center justify-center gap-3" dir="ltr">
              <Button variant="ghost" size="icon" className="size-12 rounded-full" onClick={previous} aria-label={t('previous')}>
                <SkipBack className="size-6" aria-hidden />
              </Button>
              <PlayPause className="size-16" />
              <Button variant="ghost" size="icon" className="size-12 rounded-full" onClick={next} disabled={atEnd} aria-label={t('next')}>
                <SkipForward className="size-6" aria-hidden />
              </Button>
              <Button variant="ghost" size="icon" className="size-11 rounded-full" onClick={() => { stop(); setOpen(false); }} aria-label={t('stop')}>
                <X className="size-5" aria-hidden />
              </Button>
            </div>

            {/* Options */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('reciter')}</Label>
                <Select value={playing.reciter} onValueChange={id => { update({ reciter: id }); changeReciter(id); }}>
                  <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {pinned.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>{t('pinned')}</SelectLabel>
                        {pinned.map(r => <SelectItem key={r.id} value={r.id}>{reciterName(r)}</SelectItem>)}
                      </SelectGroup>
                    )}
                    <SelectGroup>
                      {pinned.length > 0 && <SelectLabel>{t('allReciters')}</SelectLabel>}
                      {others.map(r => <SelectItem key={r.id} value={r.id}>{reciterName(r)}</SelectItem>)}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('speed')}</Label>
                <ToggleGroup type="single" variant="outline" value={String(settings.speed)} onValueChange={v => v && update({ speed: Number(v) })} className="w-full">
                  {SPEEDS.map(v => <ToggleGroupItem key={v} value={String(v)} className="h-11 flex-1">{v}x</ToggleGroupItem>)}
                </ToggleGroup>
              </div>

              <RepeatControl />

              <SleepControl />

              <AutoNextSurahControl id="player-auto-next" />

              <GapControl idPrefix="player-gap" />

              <div className="flex min-h-11 items-center justify-between gap-4">
                <Label htmlFor="player-continuous">{t('continuous')}</Label>
                <Switch id="player-continuous" checked={settings.continuous} onCheckedChange={v => update({ continuous: v })} />
              </div>
              <p className="text-xs text-muted-foreground">{t('volumeNote')}</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
