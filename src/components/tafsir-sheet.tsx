import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { TAFSIRS, fetchTafsir, type Ayah, type Surah } from '@/lib/quran';
import { useSettings } from '@/context/settings';

interface Props {
  surah: Surah;
  ayahs: Ayah[];
  /** The ayah being explained, or null when closed. */
  ayahNumber: number | null;
  onAyahChange: (n: number) => void;
  onClose: () => void;
}

type State = { state: 'loading' | 'error' } | { state: 'ok'; text: string };

/** Dedicated tafsir reader: pick a source with one tap, step through ayahs without closing. */
export function TafsirSheet({ surah, ayahs, ayahNumber, onAyahChange, onClose }: Props) {
  const { settings, update, t } = useSettings();
  const [result, setResult] = useState<State>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const ar = settings.lang === 'ar';
  const open = ayahNumber !== null;
  const ayah = ayahs.find(a => a.number === ayahNumber) ?? null;
  const source = TAFSIRS.find(x => x.id === settings.tafsirId) ?? TAFSIRS[0];
  const total = surah.numberOfAyahs;

  useEffect(() => {
    if (ayahNumber === null) return;
    let cancelled = false;
    setResult({ state: 'loading' });
    fetchTafsir(source.id, surah.number, ayahNumber)
      .then(text => !cancelled && setResult({ state: 'ok', text }))
      .catch(() => !cancelled && setResult({ state: 'error' }));
    return () => { cancelled = true; };
  }, [source.id, surah.number, ayahNumber, attempt]);

  const go = (delta: number) => {
    if (ayahNumber === null) return;
    const next = ayahNumber + delta;
    if (next >= 1 && next <= total) onAyahChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="bottom" className="mx-auto max-h-[94dvh] w-full max-w-3xl gap-0 overflow-y-auto rounded-t-3xl p-0 [&>*]:shrink-0">
        <SheetHeader className="px-5 pt-5 pb-2 text-start">
          <SheetTitle className="font-display text-2xl">{t('tafsir')}</SheetTitle>
          <SheetDescription className={cn(ar && 'font-quran text-base')}>
            {ar ? surah.name : surah.englishName} · {t('ayahOf', { i: ayahNumber ?? 0, n: total })}
          </SheetDescription>
        </SheetHeader>

        {ayah && (
          <p dir="rtl" className="px-5 pb-3 font-quran text-2xl text-primary">{ayah.ar}</p>
        )}

        {/* Sources: all visible, one tap to switch (remembered). */}
        <div className="px-5 pb-3">
          <ToggleGroup
            type="single"
            variant="outline"
            value={String(source.id)}
            onValueChange={v => v && update({ tafsirId: Number(v) })}
            className="flex w-full flex-wrap justify-start gap-2"
            aria-label={t('defaultTafsir')}
          >
            {TAFSIRS.map(x => (
              <ToggleGroupItem
                key={x.id}
                value={String(x.id)}
                className="h-11 rounded-full! border! px-4 text-sm shadow-none data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {ar ? x.ar : x.en}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <ScrollArea className="h-[clamp(8rem,calc(100dvh-26rem),24rem)] border-t">
          <div className="px-5 py-4" aria-live="polite">
            {result.state === 'loading' && (
              <div className="space-y-3" aria-label={t('loadingTafsir')} aria-busy>
                <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-11/12" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/5" />
              </div>
            )}
            {result.state === 'error' && (
              <div className="space-y-3 text-center">
                <p className="text-destructive">{t('error')}</p>
                <Button variant="outline" onClick={() => setAttempt(a => a + 1)}>{t('retry')}</Button>
              </div>
            )}
            {result.state === 'ok' && (
              <p dir={source.dir} className={cn('whitespace-pre-wrap', source.dir === 'rtl' ? 'font-quran text-xl' : 'leading-8')}>
                {result.text || t('tafsirEmpty')}
              </p>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between gap-2 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button variant="ghost" className="h-11 gap-1 rounded-xl px-3" onClick={() => go(-1)} disabled={!ayahNumber || ayahNumber <= 1}>
            <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden /> {t('previous')}
          </Button>
          <Button variant="ghost" className="h-11 gap-1 rounded-xl px-3" onClick={() => go(1)} disabled={!ayahNumber || ayahNumber >= total}>
            {t('next')} <ChevronRight className="size-5 rtl:rotate-180" aria-hidden />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
