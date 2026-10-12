import { useEffect, useState } from 'react';
import { fetchSurahWords, fetchWordSegments } from '@/lib/quran';
import type { Word } from '@/lib/tajweed';

/**
 * The words (with tajweed rules) of every ayah of a surah, or null until loaded / when unavailable offline.
 * Only fetched while `enabled`, so users who use neither tajweed colours nor word highlighting pay nothing.
 */
export function useSurahWords(surah: number, enabled: boolean, reciter?: string): Word[][] | null {
  const [words, setWords] = useState<Word[][] | null>(null);

  useEffect(() => {
    setWords(null);
    if (!enabled) return;
    let cancelled = false;
    fetchSurahWords(surah)
      .then(list => {
        if (cancelled) return;
        setWords(list);
        // Fetch the word timings now, so the very first words are highlighted the moment playback starts.
        if (reciter) void fetchWordSegments(reciter, surah).catch(() => {});
      })
      .catch(() => !cancelled && setWords(null));
    return () => { cancelled = true; };
  }, [surah, enabled, reciter]);

  return words;
}
