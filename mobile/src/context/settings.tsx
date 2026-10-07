import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Uniwind } from 'uniwind';
import { dictionaries, type Lang, type TKey } from '@/lib/i18n';
import { RECITERS, TAFSIRS } from '@/lib/quran';
import { loadJSON, saveJSON } from '@/lib/storage';

export type ThemeMode = 'light' | 'dark' | 'system';

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
  fontSize: 30,
  showTranslation: true,
  continuous: true,
};

interface SettingsContextValue {
  settings: Settings;
  isRTL: boolean;
  update: (patch: Partial<Settings>) => void;
  /** Replace everything at once (used when syncing from the server). */
  replace: (next: Settings) => void;
  /** Reciters the user pinned; shown first everywhere. Local to this device. */
  pinned: string[];
  togglePin: (reciterId: string) => void;
  /** Seconds of silence between ayahs (0 = normal playback). */
  gapSeconds: number;
  setGapSeconds: (seconds: number) => void;
  /** How many times each ayah plays: 1 = once, 0 = forever. */
  repeatTimes: number;
  setRepeatTimes: (times: number) => void;
  /** Memorize mode hides the Arabic text. */
  memorize: boolean;
  setMemorize: (on: boolean) => void;
  /** Keep going into the next surah when one finishes. */
  autoNextSurah: boolean;
  setAutoNextSurah: (on: boolean) => void;
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);
const KEY = 'quran.settings';

/** A persisted piece of device-local state. */
function useStored<T>(key: string, fallback: T, valid: (v: unknown) => boolean = () => true) {
  const [value, setValue] = useState<T>(() => {
    const v = loadJSON<T>(key, fallback);
    return valid(v) ? v : fallback;
  });
  const set = useCallback((next: T) => { setValue(next); saveJSON(key, next); }, [key]);
  return [value, set] as const;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULT_SETTINGS, ...loadJSON<Partial<Settings>>(KEY, {}) }));
  const [pinned, setPinnedState] = useState<string[]>(() => loadJSON<string[]>('quran.pinnedReciters', []).filter(id => RECITERS.some(r => r.id === id)));
  const [gapSeconds, setGapSeconds] = useStored<number>('quran.gapSeconds', 0, v => typeof v === 'number' && v >= 0 && v <= 60);
  const [repeatTimes, setRepeatTimes] = useStored<number>('quran.repeatTimes', 1, v => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 50);
  const [memorize, setMemorize] = useStored<boolean>('quran.memorize', false, v => typeof v === 'boolean');
  const [autoNextSurah, setAutoNextSurah] = useStored<boolean>('quran.autoNextSurah', false, v => typeof v === 'boolean');
  const [theme, setThemeState] = useStored<ThemeMode>('quran.theme', 'system', v => v === 'light' || v === 'dark' || v === 'system');

  useEffect(() => saveJSON(KEY, settings), [settings]);
  useEffect(() => { Uniwind.setTheme(theme); }, [theme]);

  const togglePin = useCallback((id: string) => {
    setPinnedState(p => {
      const next = p.includes(id) ? p.filter(x => x !== id) : [...p, id];
      saveJSON('quran.pinnedReciters', next);
      return next;
    });
  }, []);

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

  const value = useMemo(
    () => ({
      settings, isRTL: settings.lang === 'ar', update, replace, pinned, togglePin, gapSeconds, setGapSeconds, repeatTimes, setRepeatTimes,
      memorize, setMemorize, autoNextSurah, setAutoNextSurah, theme, setTheme: setThemeState, t,
    }),
    [settings, update, replace, pinned, togglePin, gapSeconds, setGapSeconds, repeatTimes, setRepeatTimes, memorize, setMemorize, autoNextSurah, setAutoNextSurah, theme, setThemeState, t],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
