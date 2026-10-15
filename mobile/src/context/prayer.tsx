import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { loadJSON, saveJSON } from '@/lib/storage';
import { hijriOf, type HijriDate } from '@/lib/hijri';
import { IQAMA_DEFAULTS, nextPrayer, timesFor, type DayTimes, type IqamaMinutes, type Location as Place, type MadhabId, type MethodId, type Next, type PrayerName } from '@/lib/prayer';
import { syncAdhan, type ReminderResult } from '@/lib/reminders';
import { useSettings } from '@/context/settings';
import type { TKey } from '@/lib/i18n';

interface Stored {
  loc: Place | null;
  method: MethodId;
  madhab: MadhabId;
  /** Days added to the calculated Hijri date, to match the local moon sighting. */
  hijriAdjust: number;
  /** Minutes from each adhan to its iqama. */
  iqama: IqamaMinutes;
  /** Notify at each prayer time (with the adhan sound). */
  adhan: boolean;
  /** Also remind a few minutes before each prayer. */
  before: boolean;
  beforeMinutes: number;
}

export type LocateResult = 'ok' | 'denied' | 'unavailable';

interface PrayerContextValue extends Stored {
  /** A clock that ticks every 30 s, for countdowns. */
  now: Date;
  times: DayTimes | null;
  next: Next | null;
  hijri: HijriDate;
  adhanStatus: ReminderResult | null;
  setMethod: (m: MethodId) => void;
  setMadhab: (m: MadhabId) => void;
  setHijriAdjust: (n: number) => void;
  setIqama: (prayer: keyof IqamaMinutes, minutes: number) => void;
  setLocation: (loc: Place) => void;
  setAdhan: (on: boolean) => void;
  setBefore: (on: boolean) => void;
  setBeforeMinutes: (n: number) => void;
  /** Ask the device for the current position. */
  locate: (lang?: 'ar' | 'en') => Promise<LocateResult>;
}

const PrayerContext = createContext<PrayerContextValue | null>(null);
const KEY = 'quran.prayer';
const DEFAULT: Stored = { loc: null, method: 'MuslimWorldLeague', madhab: 'shafi', hijriAdjust: 0, iqama: IQAMA_DEFAULTS, adhan: false, before: true, beforeMinutes: 10 };

export const PRAYER_KEYS: Record<PrayerName, TKey> = {
  fajr: 'prayerFajr',
  sunrise: 'prayerSunrise',
  dhuhr: 'prayerDhuhr',
  asr: 'prayerAsr',
  maghrib: 'prayerMaghrib',
  isha: 'prayerIsha',
};

export function PrayerProvider({ children }: { children: ReactNode }) {
  const { t } = useSettings();
  const [data, setData] = useState<Stored>(() => { const saved = loadJSON<Partial<Stored>>(KEY, {}); return { ...DEFAULT, ...saved, iqama: { ...IQAMA_DEFAULTS, ...saved.iqama } }; });
  const [now, setNow] = useState(() => new Date());
  const [adhanStatus, setAdhanStatus] = useState<ReminderResult | null>(null);

  useEffect(() => saveJSON(KEY, data), [data]);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    const sub = AppState.addEventListener('change', s => s === 'active' && setNow(new Date()));
    return () => { clearInterval(id); sub.remove(); };
  }, []);

  const setMethod = useCallback((method: MethodId) => setData(d => ({ ...d, method })), []);
  const setMadhab = useCallback((madhab: MadhabId) => setData(d => ({ ...d, madhab })), []);
  const setHijriAdjust = useCallback((n: number) => setData(d => ({ ...d, hijriAdjust: Math.max(-2, Math.min(2, n)) })), []);
  const setIqama = useCallback((prayer: keyof IqamaMinutes, minutes: number) => setData(d => ({ ...d, iqama: { ...d.iqama, [prayer]: Math.max(0, Math.min(90, Math.round(minutes))) } })), []);
  const setLocation = useCallback((loc: Place) => setData(d => ({ ...d, loc })), []);
  const setAdhan = useCallback((adhan: boolean) => setData(d => ({ ...d, adhan })), []);
  const setBefore = useCallback((before: boolean) => setData(d => ({ ...d, before })), []);
  const setBeforeMinutes = useCallback((beforeMinutes: number) => setData(d => ({ ...d, beforeMinutes })), []);

  const locate = useCallback(async (_lang?: 'ar' | 'en'): Promise<LocateResult> => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) return 'denied';
      const pos = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      const { latitude: lat, longitude: lng } = pos.coords;
      setData(d => ({ ...d, loc: { lat, lng } }));
      // The name is only a label: look it up afterwards (best effort) and attach it if the position is still the same.
      void Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
        .then(([place]) => {
          const name = place?.city || place?.subregion || place?.district || place?.region;
          if (name) setData(d => (d.loc && d.loc.lat === lat && d.loc.lng === lng ? { ...d, loc: { ...d.loc, name } } : d));
        })
        .catch(() => {});
      return 'ok';
    } catch {
      return 'unavailable';
    }
  }, []);

  // Keep the next week of prayer notifications up to date (on change, and each day the app is opened).
  const { adhan, loc, method, madhab, before, beforeMinutes } = data;
  const names = {
    fajr: t('prayerFajr'), sunrise: t('prayerSunrise'), dhuhr: t('prayerDhuhr'), asr: t('prayerAsr'), maghrib: t('prayerMaghrib'), isha: t('prayerIsha'),
  };
  const nameKey = Object.values(names).join('|');
  const channelName = t('adhanHeading');
  const soonChannelName = t('adhanBeforeLabel');
  const soonBody = t('adhanSoonBody');
  const day = now.toDateString();
  useEffect(() => {
    let cancelled = false;
    void syncAdhan({
      enabled: adhan, loc, method, madhab, beforeMinutes: before ? beforeMinutes : 0, channelName, soonChannelName, names,
      body: name => t('adhanBody', { name }),
      soonTitle: (name, n) => t('adhanSoonTitle', { name, n }),
      soonBody,
    })
      .then(r => !cancelled && setAdhanStatus(r.result))
      .catch(() => !cancelled && setAdhanStatus(null));
    return () => { cancelled = true; };
    // `names` is derived from `nameKey`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adhan, loc, method, madhab, before, beforeMinutes, channelName, soonChannelName, soonBody, nameKey, day]);

  const value = useMemo<PrayerContextValue>(
    () => ({
      ...data,
      now,
      times: loc ? timesFor(loc, now, method, madhab) : null,
      next: loc ? nextPrayer(loc, now, method, madhab) : null,
      hijri: hijriOf(now, data.hijriAdjust),
      adhanStatus,
      setMethod,
      setMadhab,
      setHijriAdjust,
      setIqama,
      setLocation,
      setAdhan,
      setBefore,
      setBeforeMinutes,
      locate,
    }),
    [data, now, loc, method, madhab, adhanStatus, setMethod, setMadhab, setHijriAdjust, setIqama, setLocation, setAdhan, setBefore, setBeforeMinutes, locate],
  );

  return <PrayerContext.Provider value={value}>{children}</PrayerContext.Provider>;
}

export function usePrayer() {
  const ctx = useContext(PrayerContext);
  if (!ctx) throw new Error('usePrayer must be used inside <PrayerProvider>');
  return ctx;
}
