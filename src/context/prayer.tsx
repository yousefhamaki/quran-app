import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadJSON, saveJSON } from '@/lib/storage';
import { hijriOf, type HijriDate } from '@/lib/hijri';
import { lookupPlace } from '@/lib/place';
import { IQAMA_DEFAULTS, nextPrayer, timesFor, type DayTimes, type IqamaMinutes, type Location, type MadhabId, type MethodId, type Next } from '@/lib/prayer';

interface Stored {
  loc: Location | null;
  method: MethodId;
  madhab: MadhabId;
  /** Days added to the calculated Hijri date, to match the local moon sighting. */
  hijriAdjust: number;
  /** Minutes from each adhan to its iqama. */
  iqama: IqamaMinutes;
}

export type LocateResult = 'ok' | 'denied' | 'unsupported';

interface PrayerContextValue extends Stored {
  /** A clock that ticks every 30 s, for countdowns. */
  now: Date;
  times: DayTimes | null;
  next: Next | null;
  hijri: HijriDate;
  setMethod: (m: MethodId) => void;
  setMadhab: (m: MadhabId) => void;
  setHijriAdjust: (n: number) => void;
  setIqama: (prayer: keyof IqamaMinutes, minutes: number) => void;
  setLocation: (loc: Location) => void;
  /** Ask the browser for the current position (and look up the name of the place in `lang`). */
  locate: (lang?: 'ar' | 'en') => Promise<LocateResult>;
}

const PrayerContext = createContext<PrayerContextValue | null>(null);
const KEY = 'quran.prayer';
const DEFAULT: Stored = { loc: null, method: 'MuslimWorldLeague', madhab: 'shafi', hijriAdjust: 0, iqama: IQAMA_DEFAULTS };

export function PrayerProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Stored>(() => { const saved = loadJSON<Partial<Stored>>(KEY, {}); return { ...DEFAULT, ...saved, iqama: { ...IQAMA_DEFAULTS, ...saved.iqama } }; });
  const [now, setNow] = useState(() => new Date());

  useEffect(() => saveJSON(KEY, data), [data]);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const setMethod = useCallback((method: MethodId) => setData(d => ({ ...d, method })), []);
  const setMadhab = useCallback((madhab: MadhabId) => setData(d => ({ ...d, madhab })), []);
  const setHijriAdjust = useCallback((n: number) => setData(d => ({ ...d, hijriAdjust: Math.max(-2, Math.min(2, n)) })), []);
  const setIqama = useCallback((prayer: keyof IqamaMinutes, minutes: number) => setData(d => ({ ...d, iqama: { ...d.iqama, [prayer]: Math.max(0, Math.min(90, Math.round(minutes))) } })), []);
  const setLocation = useCallback((loc: Location) => setData(d => ({ ...d, loc })), []);

  const locate = useCallback(
    (lang: 'ar' | 'en' = 'en') =>
      new Promise<LocateResult>(resolve => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) { resolve('unsupported'); return; }
        navigator.geolocation.getCurrentPosition(
          pos => {
            const { latitude: lat, longitude: lng } = pos.coords;
            setData(d => ({ ...d, loc: { lat, lng } }));
            resolve('ok');
            // The name is only a label: look it up afterwards and attach it if the position is still the same.
            void lookupPlace(lat, lng, lang).then(name => {
              if (name) setData(d => (d.loc && d.loc.lat === lat && d.loc.lng === lng ? { ...d, loc: { ...d.loc, name } } : d));
            });
          },
          () => resolve('denied'),
          { enableHighAccuracy: false, timeout: 15_000, maximumAge: 10 * 60_000 },
        );
      }),
    [],
  );

  const value = useMemo<PrayerContextValue>(() => {
    const { loc, method, madhab } = data;
    return {
      ...data,
      now,
      times: loc ? timesFor(loc, now, method, madhab) : null,
      next: loc ? nextPrayer(loc, now, method, madhab) : null,
      hijri: hijriOf(now, data.hijriAdjust),
      setMethod,
      setMadhab,
      setHijriAdjust,
      setIqama,
      setLocation,
      locate,
    };
  }, [data, now, setMethod, setMadhab, setHijriAdjust, setIqama, setLocation, locate]);

  return <PrayerContext.Provider value={value}>{children}</PrayerContext.Provider>;
}

export function usePrayer() {
  const ctx = useContext(PrayerContext);
  if (!ctx) throw new Error('usePrayer must be used inside <PrayerProvider>');
  return ctx;
}
