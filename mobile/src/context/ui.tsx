import { loadJSON } from '@/lib/storage';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface Target {
  surah: number;
  ayah: number;
}

export interface WordTarget {
  surah: number;
  ayah: number;
  index: number;
}

export type SettingsScope = 'auto' | 'mushaf' | 'general';

interface UIContextValue {
  settingsOpen: boolean;
  /** Word whose meaning sheet is open. */
  word: WordTarget | null;
  setWord: (w: WordTarget | null) => void;
  /** Which settings the gear opens: by screen (auto), or forced by the More screen. */
  settingsScope: SettingsScope;
  /** First-run setup sheet. */
  setupOpen: boolean;
  accountOpen: boolean;
  playerOpen: boolean;
  /** Ayah whose reciter/bookmark sheet is open. */
  options: Target | null;
  /** Ayah whose tafsir is open. */
  tafsir: Target | null;
  /** Surah whose download sheet is open. */
  download: number | null;
  /** Surah whose "repeat a range" sheet is open (and the ayah to start from). */
  rangeFor: number | null;
  rangeFrom: number | null;
  setSettingsOpen: (open: boolean) => void;
  setSettingsScope: (scope: SettingsScope) => void;
  setSetupOpen: (open: boolean) => void;
  setAccountOpen: (open: boolean) => void;
  setPlayerOpen: (open: boolean) => void;
  setOptions: (target: Target | null) => void;
  setTafsir: (target: Target | null) => void;
  setDownload: (surah: number | null) => void;
  setRangeFor: (surah: number | null, from?: number) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

/** Which sheet is open. Sheets are rendered once at the root so any screen can open them. */
export function UIProvider({ children }: { children: ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsScope, setSettingsScope] = useState<SettingsScope>('auto');
  const [setupOpen, setSetupOpen] = useState(() => loadJSON<boolean>('quran.onboarded', false) !== true);
  const [word, setWord] = useState<WordTarget | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [options, setOptionsState] = useState<Target | null>(null);
  const [tafsir, setTafsirState] = useState<Target | null>(null);
  const [download, setDownloadState] = useState<number | null>(null);
  const [rangeFor, setRangeForState] = useState<number | null>(null);
  const [rangeFrom, setRangeFromState] = useState<number | null>(null);

  const setOptions = useCallback((t: Target | null) => setOptionsState(t), []);
  const setTafsir = useCallback((t: Target | null) => setTafsirState(t), []);
  const setDownload = useCallback((s: number | null) => setDownloadState(s), []);
  const setRangeFor = useCallback((s: number | null, from?: number) => { setRangeForState(s); setRangeFromState(from ?? null); }, []);

  const value = useMemo(
    () => ({ settingsOpen, word, setWord, settingsScope, setupOpen, setSettingsScope, setSetupOpen, accountOpen, playerOpen, options, tafsir, download, rangeFor, rangeFrom, setSettingsOpen, setAccountOpen, setPlayerOpen, setOptions, setTafsir, setDownload, setRangeFor }),
    [settingsOpen, word, settingsScope, setupOpen, accountOpen, playerOpen, options, tafsir, download, rangeFor, rangeFrom, setOptions, setTafsir, setDownload, setRangeFor],
  );
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside <UIProvider>');
  return ctx;
}
