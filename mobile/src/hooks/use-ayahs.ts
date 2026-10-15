import { useCallback, useEffect, useState } from 'react';
import { fetchSurah, getTranslationEdition, type Ayah } from '@/lib/quran';
import { useSettings } from '@/context/settings';

type State = { status: 'loading' | 'error'; ayahs: Ayah[] } | { status: 'ok'; ayahs: Ayah[] };

const memory = new Map<string, Ayah[]>();

/** The ayahs of one surah (memory cache → device cache → network). */
export function useAyahs(surah: number | null) {
  const { settings } = useSettings();
  const edition = settings.translation;
  const [state, setState] = useState<State>(() => {
    const hit = surah ? memory.get(`${getTranslationEdition()}:${surah}`) : undefined;
    return hit ? { status: 'ok', ayahs: hit } : { status: 'loading', ayahs: [] };
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!surah) return;
    const hit = memory.get(`${edition}:${surah}`);
    if (hit) { setState({ status: 'ok', ayahs: hit }); return; }
    let cancelled = false;
    setState({ status: 'loading', ayahs: [] });
    fetchSurah(surah)
      .then(list => {
        memory.set(`${edition}:${surah}`, list);
        if (!cancelled) setState({ status: 'ok', ayahs: list });
      })
      .catch(() => !cancelled && setState({ status: 'error', ayahs: [] }));
    return () => { cancelled = true; };
  }, [surah, attempt, edition]);

  const retry = useCallback(() => setAttempt(a => a + 1), []);
  return { ...state, retry };
}
