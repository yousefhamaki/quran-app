import { useEffect, useRef, useState } from 'react';
import { Bookmark, Brain, Eye, EyeOff, Volume2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetchSurah, normalize, type Ayah, type Surah } from '@/lib/quran';
import { useSettings } from '@/context/settings';
import { useLibrary } from '@/context/library';
import { usePlayer } from '@/context/player';

interface Props {
  surah: Surah;
  focusAyah: number | null;
  onSelectAyah: (ayah: number) => void;
}

/** Ornamental ayah-end marker. */
function AyahMark({ n }: { n: number }) {
  return (
    <span className="mx-1 inline-flex align-middle text-gold-foreground" aria-hidden>
      <span className="font-quran text-[0.55em]">﴿{n.toLocaleString('ar-EG')}﴾</span>
    </span>
  );
}

export function Reader({ surah, focusAyah, onSelectAyah }: Props) {
  const { settings, memorize, setMemorize, t } = useSettings();
  const { isBookmarked, markRead } = useLibrary();
  const { playing, setSurahLength } = usePlayer();
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const focused = useRef<string | null>(null);
  // Ayahs the user has chosen to peek at while memorize mode is on.
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());
  useEffect(() => setRevealed(new Set()), [surah.number, memorize]);
  const toggleReveal = (n: number) =>
    setRevealed(prev => {
      const next = new Set(prev);
      if (!next.delete(n)) next.add(n);
      return next;
    });

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setAyahs([]);
    fetchSurah(surah.number)
      .then(list => {
        if (cancelled) return;
        setAyahs(list);
        setSurahLength(list.length);
        setState('ok');
      })
      .catch(() => !cancelled && setState('error'));
    return () => { cancelled = true; };
  }, [surah.number, attempt, setSurahLength]);

  // Deep link / resume: scroll to the requested ayah once the text is on screen.
  useEffect(() => {
    if (state !== 'ok' || !focusAyah) return;
    const key = `${surah.number}:${focusAyah}`;
    if (focused.current === key) return;
    focused.current = key;
    requestAnimationFrame(() => document.getElementById(`ayah-${focusAyah}`)?.scrollIntoView({ block: 'center' }));
  }, [state, focusAyah, surah.number]);

  // Follow the audio.
  useEffect(() => {
    if (playing?.surah === surah.number) {
      document.getElementById(`ayah-${playing.ayah}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [playing?.surah, playing?.ayah, surah.number]);

  if (state === 'loading') {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pt-6" aria-busy aria-label={t('loading')}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="ms-auto h-10 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-dashed p-8 text-center">
        <p className="mb-4 text-muted-foreground">{t('error')}</p>
        <Button onClick={() => setAttempt(a => a + 1)}>{t('retry')}</Button>
      </div>
    );
  }

  return (
    <article className="mx-auto w-full max-w-3xl px-2 pt-4 pb-40 sm:px-4">
      {surah.number !== 9 && surah.number !== 1 && (
        <p className="py-6 text-center font-quran text-3xl text-gold-foreground" aria-label={t('bismillah')}>
          بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
        </p>
      )}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-2">
        <Button
          type="button"
          variant={memorize ? 'default' : 'outline'}
          size="sm"
          className="h-11 gap-2 rounded-full px-4"
          aria-pressed={memorize}
          onClick={() => setMemorize(!memorize)}
        >
          <Brain className="size-4" aria-hidden /> {t('memorize')}
        </Button>
        {memorize && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-11 gap-2 rounded-full px-4"
            onClick={() => setRevealed(revealed.size === ayahs.length ? new Set() : new Set(ayahs.map(a => a.number)))}
          >
            {revealed.size === ayahs.length ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            {revealed.size === ayahs.length ? t('hideAll') : t('revealAll')}
          </Button>
        )}
      </div>
      <ol>
        {ayahs.map((a, i) => {
          const isPlaying = playing?.surah === surah.number && playing.ayah === a.number;
          const marked = isBookmarked(surah.number, a.number);
          // The API prepends the basmala to ayah 1 of most surahs; it is shown as the heading above instead.
          const hasBasmala = a.number === 1 && surah.number !== 1 && surah.number !== 9 && normalize(a.ar).startsWith('بسم الله الرحمن الرحيم');
          const hidden = memorize && !revealed.has(a.number);
          const text = hasBasmala ? a.ar.replace(/^(\S+\s+){4}/, '') : a.ar;
          return (
            <li
              key={a.number}
              id={`ayah-${a.number}`}
              style={{ ['--i' as string]: Math.min(i, 8) }}
              className="rise-in scroll-mt-24 scroll-mb-40"
            >
              <button
                type="button"
                onClick={() => { markRead(surah.number, a.number); onSelectAyah(a.number); }}
                aria-label={`${t('ayah')} ${a.number}`}
                className={cn(
                  'group block w-full rounded-2xl px-4 py-5 text-start transition-colors duration-200 hover:bg-accent/60 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                  isPlaying && 'ayah-playing bg-accent',
                )}
              >
                <p
                  dir="rtl"
                  className={cn('font-quran text-end transition-[filter] duration-300', hidden && 'pointer-events-none blur-lg select-none')}
                  style={{ fontSize: 'var(--ayah-size)' }}
                  aria-hidden={hidden || undefined}
                >
                  {text} <AyahMark n={a.number} />
                  {marked && <Bookmark className="ms-1 inline size-4 fill-gold text-gold" aria-label={t('bookmark')} />}
                  {isPlaying && <Volume2 className="ms-1 inline size-4 text-primary" aria-label={t('nowPlaying')} />}
                </p>
                {settings.showTranslation && (
                  <p dir="ltr" className="mt-3 text-start text-[0.95rem] leading-relaxed text-muted-foreground">{a.en}</p>
                )}
              </button>
              {memorize && (
                <div className="flex justify-end px-3 pb-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-11 gap-2 rounded-full px-4 text-muted-foreground"
                    aria-pressed={!hidden}
                    onClick={() => toggleReveal(a.number)}
                  >
                    {hidden ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
                    {hidden ? t('revealAyah') : t('hideAyah')}
                  </Button>
                </div>
              )}
              {i < ayahs.length - 1 && <div className="mx-4 h-px bg-border/70" role="presentation" />}
            </li>
          );
        })}
      </ol>
    </article>
  );
}
