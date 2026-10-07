import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface Target {
  surah: number;
  ayah: number;
}

interface UIContextValue {
  settingsOpen: boolean;
  accountOpen: boolean;
  playerOpen: boolean;
  /** Ayah whose reciter/bookmark sheet is open. */
  options: Target | null;
  /** Ayah whose tafsir is open. */
  tafsir: Target | null;
  /** Surah whose download sheet is open. */
  download: number | null;
  setSettingsOpen: (open: boolean) => void;
  setAccountOpen: (open: boolean) => void;
  setPlayerOpen: (open: boolean) => void;
  setOptions: (target: Target | null) => void;
  setTafsir: (target: Target | null) => void;
  setDownload: (surah: number | null) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

/** Which sheet is open. Sheets are rendered once at the root so any screen can open them. */
export function UIProvider({ children }: { children: ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [options, setOptionsState] = useState<Target | null>(null);
  const [tafsir, setTafsirState] = useState<Target | null>(null);
  const [download, setDownloadState] = useState<number | null>(null);

  const setOptions = useCallback((t: Target | null) => setOptionsState(t), []);
  const setTafsir = useCallback((t: Target | null) => setTafsirState(t), []);
  const setDownload = useCallback((s: number | null) => setDownloadState(s), []);

  const value = useMemo(
    () => ({ settingsOpen, accountOpen, playerOpen, options, tafsir, download, setSettingsOpen, setAccountOpen, setPlayerOpen, setOptions, setTafsir, setDownload }),
    [settingsOpen, accountOpen, playerOpen, options, tafsir, download, setOptions, setTafsir, setDownload],
  );
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside <UIProvider>');
  return ctx;
}
