import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { fetchWordSegments } from '@/lib/quran';
import { tajweedColor, wordText, type Word } from '@/lib/tajweed';
import { activeWordAt, estimateSegments, type WordSegment } from '@/lib/wordtiming';
import { setWordSheet } from '@/lib/ui-store';
import { useSettings } from '@/context/settings';
import { usePlayer } from '@/context/player';
import { useTheme } from '@/context/theme';

interface HookArgs {
  enabled: boolean;
  surah: number;
  ayah: number;
  words: Word[];
}

/**
 * Index of the word being recited right now (-1 = none). Uses Quran.com's exact timestamps when they cover this
 * ayah and match its words; otherwise estimates from word length and the audio duration.
 */
function useActiveWord({ enabled, surah, ayah, words }: HookArgs): number {
  const { playing, isPlaying, duration, getTime } = usePlayer();
  const [exact, setExact] = useState<WordSegment[] | null>(null);
  const [index, setIndex] = useState(-1);
  const reciter = playing?.reciter ?? '';

  useEffect(() => {
    setExact(null);
    if (!enabled || !reciter) return;
    let cancelled = false;
    fetchWordSegments(reciter, surah)
      .then(map => {
        const raw = map?.get(ayah);
        // Only trust the timestamps if they cover exactly the words we are showing.
        const covers = raw && raw.length > 0 && Math.max(...raw.map(s => s.to)) === words.length;
        if (!cancelled) setExact(covers ? raw : null);
      })
      .catch(() => !cancelled && setExact(null));
    return () => { cancelled = true; };
  }, [enabled, reciter, surah, ayah, words.length]);

  const segments = useMemo(
    () => exact ?? estimateSegments(words.map(wordText), duration * 1000),
    [exact, words, duration],
  );

  useEffect(() => {
    if (!enabled) { setIndex(-1); return; }
    if (!isPlaying) return; // paused: keep the last highlighted word
    let frame = 0;
    const tick = () => {
      const i = activeWordAt(segments, getTime() * 1000);
      setIndex(prev => (prev === i ? prev : i));
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [enabled, isPlaying, segments, getTime]);

  return index;
}

interface Props {
  words: Word[];
  /** True for the ayah the player is on. Only that one runs the highlight loop. */
  active: boolean;
  surah: number;
  ayah: number;
}

/** An ayah drawn word by word: optional tajweed colours and a highlight that follows the reciter. */
export function AyahWords({ words, active, surah, ayah }: Props) {
  const { tajweed, wordHighlight } = useSettings();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const index = useActiveWord({ enabled: active && wordHighlight, surah, ayah, words });

  return (
    <>
      {words.map((word, i) => (
        <span key={i}>
          <span
            data-word={i}
            data-active={i === index || undefined}
            role="button"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); setWordSheet({ surah, ayah, index: i }); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); setWordSheet({ surah, ayah, index: i }); } }}
            className={cn('cursor-pointer rounded-lg px-[0.06em] transition-colors duration-150 hover:bg-accent/60 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none', i === index && 'bg-primary/20 ring-1 ring-primary/40')}
          >
            {word.map((chunk, j) => (
              <span key={j} style={tajweed ? { color: tajweedColor(chunk.cls, dark) } : undefined}>{chunk.text}</span>
            ))}
          </span>
          {i < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </>
  );
}
