import { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetchWordMeanings, type WordMeaning } from '@/lib/quran';
import { setWordSheet, useWordSheet } from '@/lib/ui-store';
import { useSettings } from '@/context/settings';

/** Meaning, transliteration and audio of the tapped word, with every other word of the ayah one tap away. */
export function WordSheet({ surahName }: { surahName: (n: number) => string }) {
  const { t } = useSettings();
  const [target] = useWordSheet();
  const [words, setWords] = useState<WordMeaning[] | null>(null);
  const [index, setIndex] = useState(0);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    setWords(null);
    setIndex(target.index);
    fetchWordMeanings(target.surah).then(all => !cancelled && setWords(all[target.ayah - 1] ?? [])).catch(() => !cancelled && setWords([]));
    return () => { cancelled = true; };
  }, [target?.surah, target?.ayah]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (target) setIndex(target.index); }, [target?.index]); // eslint-disable-line react-hooks/exhaustive-deps

  const word = words?.[index];
  const listen = () => {
    if (!word?.audio) return;
    audio.current?.pause();
    audio.current = new Audio(word.audio);
    void audio.current.play().catch(() => {});
  };

  return (
    <Sheet open={target !== null} onOpenChange={o => !o && setWordSheet(null)}>
      <SheetContent side="bottom" className="mx-auto max-h-[85dvh] max-w-3xl gap-0 overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>{t('wordTitle')}</SheetTitle>
          <SheetDescription>{target ? `${surahName(target.surah)} · ${t('ayah')} ${target.ayah}` : ''}</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-4 pb-8">
          {!words ? (
            <p className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground" aria-busy>…</p>
          ) : !word ? (
            <p className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">{t('wordNone')}</p>
          ) : (
            <div className="space-y-2 rounded-3xl bg-secondary p-5 text-center" aria-live="polite">
              <p dir="rtl" className="font-quran text-5xl leading-[1.9]">{word.text}</p>
              {word.transliteration && <p className="text-lg italic text-secondary-foreground">{word.transliteration}</p>}
              <p className="text-xl font-medium">{word.translation || t('wordNone')}</p>
              {word.audio && (
                <Button variant="outline" className="mt-2 h-11 gap-2 rounded-full" onClick={listen}>
                  <Volume2 className="size-4" aria-hidden /> {t('wordListen')}
                </Button>
              )}
            </div>
          )}

          {words && words.length > 0 && (
            <section aria-labelledby="all-words">
              <h3 id="all-words" className="mb-2 text-sm font-medium text-muted-foreground">{t('wordAllWords')}</h3>
              <ul dir="rtl" className="flex flex-wrap gap-2">
                {words.map((w, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => setIndex(i)}
                      aria-pressed={i === index}
                      className={cn('flex min-h-14 min-w-14 flex-col items-center justify-center rounded-2xl border px-3 py-1.5 transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none', i === index && 'border-primary bg-secondary')}
                    >
                      <span className="font-quran text-xl">{w.text}</span>
                      <span dir="ltr" className="max-w-24 truncate text-[11px] text-muted-foreground">{w.translation}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p className="text-xs text-muted-foreground">{t('wordSource')}</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
