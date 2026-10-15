import { useEffect, useMemo, useState } from 'react';
import { useCSSVariable, useUniwind } from 'uniwind';
import { Text } from '@/components/ui/text';
import { fetchWordSegments } from '@/lib/quran';
import { tajweedColor, wordText, type Word } from '@/lib/tajweed';
import { activeWordAt, estimateSegments, type WordSegment } from '@/lib/wordtiming';
import { usePlayer } from '@/context/player';
import { useSettings } from '@/context/settings';
import { useUI } from '@/context/ui';

/** The highlight runs this far ahead of the audio clock to hide the polling and render delay. */
const LEAD_MS = 110;

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
        const covers = raw && raw.length > 0 && Math.max(...raw.map(s => s.to)) === words.length;
        if (!cancelled) setExact(covers ? raw : null);
      })
      .catch(() => !cancelled && setExact(null));
    return () => { cancelled = true; };
  }, [enabled, reciter, surah, ayah, words.length]);

  const segments = useMemo(() => exact ?? estimateSegments(words.map(wordText), duration * 1000), [exact, words, duration]);

  useEffect(() => {
    if (!enabled) { setIndex(-1); return; }
    if (!isPlaying) return; // paused: keep the last highlighted word
    const tick = () => {
      const i = activeWordAt(segments, getTime() * 1000 + LEAD_MS);
      setIndex(prev => (prev === i ? prev : i));
    };
    tick();
    const id = setInterval(tick, 50);
    return () => clearInterval(id);
  }, [enabled, isPlaying, segments, getTime]);

  return index;
}

/** "#rrggbb" + opacity → rgba(); anything else is returned unchanged. */
function withAlpha(color: string, alpha: number) {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return color;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

interface Props {
  words: Word[];
  /** True for the ayah the player is on. Only that one runs the highlight loop. */
  active: boolean;
  surah: number;
  ayah: number;
}

/**
 * An ayah drawn word by word: optional tajweed colours and a highlight that follows the reciter.
 * Renders nested <Text> so it can sit inside the ayah's own <Text>.
 */
export function AyahWords({ words, active, surah, ayah }: Props) {
  const { tajweed, wordHighlight } = useSettings();
  const { setWord } = useUI();
  const { theme } = useUniwind();
  const primary = String(useCSSVariable('--color-primary') ?? '#0b5d4b');
  const dark = theme === 'dark';
  const index = useActiveWord({ enabled: active && wordHighlight, surah, ayah, words });
  const highlight = withAlpha(primary, 0.22);

  return (
    <>
      {words.map((word, i) => (
        <Text key={i} className="font-quran" onPress={() => setWord({ surah, ayah, index: i })} accessibilityRole="button" style={i === index ? { backgroundColor: highlight } : undefined}>
          {word.map((chunk, j) => (
            <Text key={j} className="font-quran" style={tajweed && chunk.cls ? { color: tajweedColor(chunk.cls, dark) } : undefined}>
              {chunk.text}
            </Text>
          ))}
          {i < words.length - 1 ? ' ' : ''}
        </Text>
      ))}
    </>
  );
}
