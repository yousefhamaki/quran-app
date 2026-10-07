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
  /** Seconds of silence between ayahs (0 = normal playback). Local to this device. */
  gapSeconds: number;
  setGapSeconds: (seconds: number) => void;
  /** How many times each ayah plays before moving on: 1 = once (off), 0 = repeat forever. Local to this device. */
  repeatTimes: number;
  setRepeatTimes: (times: number) => void;
  /** Memorize mode hides the Arabic text so the user can recite from memory. Local to this device. */
  memorize: boolean;
  setMemorize: (on: boolean) => void;
  /** When a surah finishes during continuous play, keep going with the next surah. Local to this device. */
  autoNextSurah: boolean;
  setAutoNextSurah: (on: boolean) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);
const KEY = 'quran.settings';

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULT_SETTINGS, ...loadJSON<Partial<Settings>>(KEY, {}) }));

  const [pinned, setPinned] = useState<string[]>(() => loadJSON<string[]>('quran.pinnedReciters', []).filter(id => RECITERS.some(r => r.id === id)));
  useEffect(() => saveJSON('quran.pinnedReciters', pinned), [pinned]);
  const [gapSeconds, setGapState] = useState<number>(() => {
    const v = Number(loadJSON<number>('quran.gapSeconds', 0));
    return Number.isFinite(v) ? Math.min(60, Math.max(0, Math.round(v))) : 0;
  });
  const setGapSeconds = useCallback((s: number) => { setGapState(s); saveJSON('quran.gapSeconds', s); }, []);
  const [repeatTimes, setRepeatState] = useState<number>(() => {
    const v = Number(loadJSON<number>('quran.repeatTimes', 1));
    return Number.isInteger(v) && v >= 0 && v <= 50 ? v : 1;
  });
  const setRepeatTimes = useCallback((n: number) => { setRepeatState(n); saveJSON('quran.repeatTimes', n); }, []);
  const [memorize, setMemorizeState] = useState<boolean>(() => loadJSON<boolean>('quran.memorize', false) === true);
  const setMemorize = useCallback((on: boolean) => { setMemorizeState(on); saveJSON('quran.memorize', on); }, []);
  const [autoNextSurah, setAutoNextState] = useState<boolean>(() => loadJSON<boolean>('quran.autoNextSurah', false) === true);
  const setAutoNextSurah = useCallback((on: boolean) => { setAutoNextState(on); saveJSON('quran.autoNextSurah', on); }, []);
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

  const value = useMemo(() => ({ settings, update, replace, pinned, togglePin, gapSeconds, setGapSeconds, repeatTimes, setRepeatTimes, memorize, setMemorize, autoNextSurah, setAutoNextSurah, t }), [settings, update, replace, pinned, togglePin, gapSeconds, setGapSeconds, repeatTimes, setRepeatTimes, memorize, setMemorize, autoNextSurah, setAutoNextSurah, t]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
