import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { dictionaries, type Lang, type TKey } from '@/lib/i18n';
import { RECITERS, TAFSIRS } from '@/lib/quran';
import { loadJSON, saveJSON } from '@/lib/storage';

export interface Settings {
  lang: Lang;
  reciter: string;
  tafsirId: number;
  speed: number;
  fontSize: number;
  showTranslation: boolean;
  continuous: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  lang: 'ar',
  reciter: RECITERS[0].id,
  tafsirId: TAFSIRS[0].id,
  speed: 1,
  fontSize: 32,
  showTranslation: true,
  continuous: true,
};

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  /** Replace everything at once (used when syncing from the server). */
  replace: (next: Settings) => void;
  /** Reciters the user pinned; shown first everywhere. Local to this device. */
  pinned: string[];
  togglePin: (reciterId: string) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);
const KEY = 'quran.settings';

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULT_SETTINGS, ...loadJSON<Partial<Settings>>(KEY, {}) }));

  const [pinned, setPinned] = useState<string[]>(() => loadJSON<string[]>('quran.pinnedReciters', []).filter(id => RECITERS.some(r => r.id === id)));
  useEffect(() => saveJSON('quran.pinnedReciters', pinned), [pinned]);
  const togglePin = useCallback((id: string) => setPinned(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id])), []);

  useEffect(() => {
    saveJSON(KEY, settings);
    document.documentElement.lang = settings.lang;
    document.documentElement.dir = settings.lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.style.setProperty('--ayah-size', `${settings.fontSize}px`);
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => setSettings(s => ({ ...s, ...patch })), []);
  const replace = useCallback((next: Settings) => setSettings({ ...DEFAULT_SETTINGS, ...next }), []);

  const t = useCallback<SettingsContextValue['t']>(
    (key, vars) => {
      let text: string = dictionaries[settings.lang][key];
      if (vars) for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, String(v));
      return text;
    },
    [settings.lang],
  );

  const value = useMemo(() => ({ settings, update, replace, pinned, togglePin, t }), [settings, update, replace, pinned, togglePin, t]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
