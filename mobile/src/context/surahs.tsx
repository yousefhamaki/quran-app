import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchSurahs, type Surah } from '@/lib/quran';
import { usePlayer } from '@/context/player';

interface SurahsContextValue {
  surahs: Surah[];
  status: 'loading' | 'ok' | 'error';
  reload: () => void;
  byNumber: (n: number) => Surah | undefined;
}

const SurahsContext = createContext<SurahsContextValue | null>(null);

/** The 114-surah list, loaded once (cached on the device for offline use). */
export function SurahsProvider({ children }: { children: ReactNode }) {
  const { setSurahData } = usePlayer();
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  const reload = useCallback(() => {
    setStatus('loading');
    fetchSurahs()
      .then(list => { setSurahs(list); setSurahData(list); setStatus('ok'); })
      .catch(() => setStatus('error'));
  }, [setSurahData]);
  useEffect(reload, [reload]);

  const byNumber = useCallback((n: number) => surahs[n - 1], [surahs]);
  const value = useMemo(() => ({ surahs, status, reload, byNumber }), [surahs, status, reload, byNumber]);
  return <SurahsContext.Provider value={value}>{children}</SurahsContext.Provider>;
}

export function useSurahs() {
  const ctx = useContext(SurahsContext);
  if (!ctx) throw new Error('useSurahs must be used inside <SurahsProvider>');
  return ctx;
}
