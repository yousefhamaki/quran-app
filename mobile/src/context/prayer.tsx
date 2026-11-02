import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { loadJSON, saveJSON } from '@/lib/storage';
import { hijriOf, type HijriDate } from '@/lib/hijri';
import { loadSavedHijri, refreshHijri } from '@/lib/hijri-online';
import { DEFAULT_ALERTS, IQAMA_DEFAULTS, NO_TUNE, TUNE_LIMIT, countryMethod, distanceKm, nextPrayer, normalizeAlerts, normalizeTune, setPrayerTune, timesFor, type AlertKey, type Tune, type DayTimes, type IqamaMinutes, type Location as Place, type MadhabId, type MethodId, type Next, type PrayerName } from '@/lib/prayer';
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
  /** Which prayers (and extras) notify. */
  alerts: Record<AlertKey, boolean>;
  /** The calculation method follows the country of the detected location (on by default). */
  methodAuto: boolean;
  /** ISO country code of the detected location. */
  country: string | null;
  /** Minutes added to or taken from each prayer, to match a local timetable. */
  tune: Tune;
  /** Version of the saved settings (to move older installs to new defaults once). */
  v: number;
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
  setAlert: (key: AlertKey, on: boolean) => void;
  /** Pick a calculation method (turns the automatic choice off) or go back to the automatic one. */
  chooseMethod: (method: MethodId | 'auto') => void;
  setTune: (prayer: keyof Tune, minutes: number) => void;
  /** The method chosen by hand, whatever is in use (`method` is the one in use). */
  selectedMethod: MethodId;
  /** Where the position stands: allowed, refused, or not asked yet. */
  locationStatus: 'granted' | 'denied' | 'unknown';
  /** Look the position up again (silently, no prompt unless `ask`). */
  refreshLocation: (ask?: boolean) => Promise<void>;
  /** Ask the device for the current position. */
  locate: (lang?: 'ar' | 'en') => Promise<LocateResult>;
}

const PrayerContext = createContext<PrayerContextValue | null>(null);
const KEY = 'quran.prayer';
const DEFAULT: Stored = { loc: null, method: 'MuslimWorldLeague', madhab: 'shafi', hijriAdjust: 0, iqama: IQAMA_DEFAULTS, adhan: true, before: true, beforeMinutes: 10, alerts: DEFAULT_ALERTS, methodAuto: true, country: null, tune: NO_TUNE, v: 2 };

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
  const [data, setData] = useState<Stored>(() => {
    const saved = loadJSON<Partial<Stored>>(KEY, {});
    const next: Stored = { ...DEFAULT, ...saved, iqama: { ...IQAMA_DEFAULTS, ...saved.iqama }, alerts: normalizeAlerts(saved.alerts), tune: normalizeTune(saved.tune) };
    // Older installs had the prayer notifications off by default: move them to the new defaults once.
    if ((saved.v ?? 1) < 2) { next.adhan = true; next.methodAuto = true; next.v = 2; }
    return next;
  });
  // The calculation method follows the country; the minute adjustments apply to every time that is shown or scheduled.
  const effectiveMethod: MethodId = data.methodAuto ? countryMethod(data.country) : data.method;
  setPrayerTune(data.tune);
  const [hijriVersion, setHijriVersion] = useState(() => { loadSavedHijri(); return 0; });
  const [locationStatus, setLocationStatus] = useState<'granted' | 'denied' | 'unknown'>('unknown');
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
  const chooseMethod = useCallback((m: MethodId | 'auto') => setData(d => (m === 'auto' ? { ...d, methodAuto: true } : { ...d, method: m, methodAuto: false })), []);
  const setTune = useCallback((prayer: keyof Tune, minutes: number) => setData(d => ({ ...d, tune: { ...d.tune, [prayer]: Math.max(-TUNE_LIMIT, Math.min(TUNE_LIMIT, Math.round(minutes))) } })), []);
  const setAlert = useCallback((key: AlertKey, on: boolean) => setData(d => ({ ...d, alerts: { ...d.alerts, [key]: on } })), []);

  /** The name of the place and its country are only labels: look them up afterwards (best effort) for that position. */
  const describePlace = useCallback((lat: number, lng: number) => {
    void Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
      .then(([place]) => {
        const name = place?.city || place?.subregion || place?.district || place?.region;
        const country = place?.isoCountryCode ?? null;
        setData(d => (d.loc && d.loc.lat === lat && d.loc.lng === lng ? { ...d, country: country ?? d.country, loc: name ? { ...d.loc, name } : d.loc } : d));
      })
      .catch(() => {});
  }, []);

  const locate = useCallback(async (_lang?: 'ar' | 'en'): Promise<LocateResult> => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) { setLocationStatus('denied'); return 'denied'; }
      const pos = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      const { latitude: lat, longitude: lng } = pos.coords;
      setData(d => ({ ...d, loc: { lat, lng } }));
      setLocationStatus('granted');
      describePlace(lat, lng);
      return 'ok';
    } catch {
      return 'unavailable';
    }
  }, []);

  /**
   * The position follows the phone: no setting to touch. When the app opens (and now and then while it is open) the
   * position is read again silently and replaces the saved one if it moved more than a few kilometres. `ask` shows the
   * system permission prompt (used once, when there is no position yet).
   */
  const refreshLocation = useCallback(async (ask = false) => {
    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted && ask && perm.canAskAgain) perm = await Location.requestForegroundPermissionsAsync();
      setLocationStatus(perm.granted ? 'granted' : perm.canAskAgain ? 'unknown' : 'denied');
      if (!perm.granted) return;
      const pos = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      if (!pos) return;
      const { latitude: lat, longitude: lng } = pos.coords;
      let moved = false;
      setData(d => {
        moved = !d.loc || distanceKm(d.loc, { lat, lng }) > 5;
        return moved ? { ...d, loc: { lat, lng } } : d;
      });
      // A new place (or one saved without its country) gets its name and country.
      if (moved || data.country === null) describePlace(lat, lng);
    } catch {
      /* no position right now: keep the saved one */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [describePlace]);

  useEffect(() => {
    let last = 0;
    const run = (ask: boolean) => { if (Date.now() - last > 20 * 60_000) { last = Date.now(); void refreshLocation(ask); } };
    // Ask once only when there is no position yet and the first-run setup is over.
    run(!data.loc && loadJSON<boolean>('quran.onboarded', false) === true);
    const sub = AppState.addEventListener('change', s => s === 'active' && run(false));
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The real Hijri dates: from the network when online, refreshed on a new day and when the app comes back.
  const todayKey = now.toDateString();
  useEffect(() => {
    let cancelled = false;
    const run = () => void refreshHijri().then(changed => { if (changed && !cancelled) setHijriVersion(v => v + 1); });
    run();
    const sub = AppState.addEventListener('change', s => s === 'active' && run());
    return () => { cancelled = true; sub.remove(); };
  }, [todayKey]);

  // Keep the next week of prayer notifications up to date (on change, and each day the app is opened).
  const { adhan, loc, madhab, before, beforeMinutes, alerts } = data;
  const method = effectiveMethod;
  const tuneKey = JSON.stringify(data.tune);
  const alertsKey = JSON.stringify(alerts);
  const extras = {
    sunrise: { title: t('alertSunriseTitle'), body: t('alertSunriseBody') },
    ishraq: { title: t('alertIshraqTitle'), body: t('alertIshraqBody') },
    qiyam: { title: t('alertQiyamTitle'), body: t('alertQiyamBody') },
  };
  const extraChannelName = t('alertExtraChannel');
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
      enabled: adhan, loc, method, madhab, beforeMinutes: before ? beforeMinutes : 0, channelName, soonChannelName, names, alerts, extras, extraChannelName,
      body: name => t('adhanBody', { name }),
      soonTitle: (name, n) => t('adhanSoonTitle', { name, n }),
      soonBody,
    })
      .then(r => !cancelled && setAdhanStatus(r.result))
      .catch(() => !cancelled && setAdhanStatus(null));
    return () => { cancelled = true; };
    // `names` is derived from `nameKey`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adhan, loc, method, madhab, before, beforeMinutes, channelName, soonChannelName, soonBody, nameKey, day, alertsKey, extraChannelName, tuneKey]);

  const value = useMemo<PrayerContextValue>(
    () => ({
      ...data,
      method: effectiveMethod,
      selectedMethod: data.method,
      locationStatus,
      refreshLocation,
      chooseMethod,
      setTune,
      now,
      times: loc ? timesFor(loc, now, method, madhab) : null,
      next: loc ? nextPrayer(loc, now, method, madhab) : null,
      hijri: hijriOf(now, data.hijriAdjust),
      adhanStatus,
      setMethod,
      setAlert,
      setMadhab,
      setHijriAdjust,
      setIqama,
      setLocation,
      setAdhan,
      setBefore,
      setBeforeMinutes,
      locate,
    }),
    [data, now, loc, method, madhab, adhanStatus, hijriVersion, locationStatus, refreshLocation, chooseMethod, setTune, effectiveMethod, setMethod, setMadhab, setHijriAdjust, setIqama, setLocation, setAdhan, setBefore, setBeforeMinutes, setAlert, locate],
  );

  return <PrayerContext.Provider value={value}>{children}</PrayerContext.Provider>;
}

export function usePrayer() {
  const ctx = useContext(PrayerContext);
  if (!ctx) throw new Error('usePrayer must be used inside <PrayerProvider>');
  return ctx;
}
