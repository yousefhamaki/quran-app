/**
 * Prayer times and Qibla, calculated on the device with the `adhan` library (no network needed).
 * Times depend on the calculation method (which authority's angles are used) and, for Asr, the madhab.
 */
import { CalculationMethod, Coordinates, Madhab, PrayerTimes, Qibla, type CalculationParameters } from 'adhan';

export interface Location {
  lat: number;
  lng: number;
  /** Optional label the user gave ("Cairo"). */
  name?: string;
}

export type MethodId =
  | 'MuslimWorldLeague'
  | 'Egyptian'
  | 'Karachi'
  | 'UmmAlQura'
  | 'Dubai'
  | 'MoonsightingCommittee'
  | 'NorthAmerica'
  | 'Kuwait'
  | 'Qatar'
  | 'Singapore'
  | 'Turkey'
  | 'Tehran';

export interface MethodInfo {
  id: MethodId;
  ar: string;
  en: string;
}

export const METHODS: MethodInfo[] = [
  { id: 'MuslimWorldLeague', ar: 'رابطة العالم الإسلامي', en: 'Muslim World League' },
  { id: 'Egyptian', ar: 'الهيئة المصرية العامة للمساحة', en: 'Egyptian General Authority of Survey' },
  { id: 'UmmAlQura', ar: 'أم القرى (مكة المكرمة)', en: 'Umm Al-Qura (Makkah)' },
  { id: 'Karachi', ar: 'جامعة العلوم الإسلامية، كراتشي', en: 'University of Islamic Sciences, Karachi' },
  { id: 'NorthAmerica', ar: 'أمريكا الشمالية (ISNA)', en: 'North America (ISNA)' },
  { id: 'Kuwait', ar: 'الكويت', en: 'Kuwait' },
  { id: 'Qatar', ar: 'قطر', en: 'Qatar' },
  { id: 'Dubai', ar: 'دبي', en: 'Dubai' },
  { id: 'Turkey', ar: 'تركيا (ديانت)', en: 'Turkey (Diyanet)' },
  { id: 'Singapore', ar: 'سنغافورة', en: 'Singapore' },
  { id: 'Tehran', ar: 'طهران', en: 'Tehran' },
  { id: 'MoonsightingCommittee', ar: 'لجنة رؤية الهلال', en: 'Moonsighting Committee' },
];

export type MadhabId = 'shafi' | 'hanafi';

/** The five prayers (plus sunrise, which is shown but is not a prayer). */
export type PrayerName = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export const PRAYERS: PrayerName[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
/** The ones people are reminded about. */
export const ADHAN_PRAYERS: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export type DayTimes = Record<PrayerName, Date>;

function params(method: MethodId, madhab: MadhabId): CalculationParameters {
  const p = CalculationMethod[method]();
  p.madhab = madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  return p;
}

/** All prayer times of the local day of `date` at `loc`. */
export function timesFor(loc: Location, date: Date, method: MethodId, madhab: MadhabId): DayTimes {
  const t = new PrayerTimes(new Coordinates(loc.lat, loc.lng), date, params(method, madhab));
  return { fajr: t.fajr, sunrise: t.sunrise, dhuhr: t.dhuhr, asr: t.asr, maghrib: t.maghrib, isha: t.isha };
}

export interface Next {
  name: PrayerName;
  at: Date;
}

/** The next prayer after `now` (sunrise is skipped); after Isha it is tomorrow's Fajr. */
export function nextPrayer(loc: Location, now: Date, method: MethodId, madhab: MadhabId): Next {
  const today = timesFor(loc, now, method, madhab);
  for (const name of ADHAN_PRAYERS) if (today[name].getTime() > now.getTime()) return { name, at: today[name] };
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12);
  return { name: 'fajr', at: timesFor(loc, tomorrow, method, madhab).fajr };
}

/** Qibla direction in degrees clockwise from true north. */
export function qiblaBearing(loc: Location): number {
  return Qibla(new Coordinates(loc.lat, loc.lng));
}

/** "Facing" helper for a compass: smallest signed angle (-180..180) to turn from `heading` to `bearing`. */
export function turnToward(heading: number, bearing: number): number {
  return ((bearing - heading + 540) % 360) - 180;
}

const KAABA = { lat: 21.4225, lng: 39.8262 };

/** Great-circle distance to the Kaaba in km. */
export function distanceToKaaba(loc: Location): number {
  const rad = Math.PI / 180;
  const dLat = (KAABA.lat - loc.lat) * rad;
  const dLng = (KAABA.lng - loc.lng) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(loc.lat * rad) * Math.cos(KAABA.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatTime(date: Date, locale: string): string {
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

/** "2h 05m" style countdown. */
export function countdown(ms: number): { h: number; m: number } {
  const total = Math.max(0, Math.round(ms / 60_000));
  return { h: Math.floor(total / 60), m: total % 60 };
}

// ---------- the "now" dashboard ----------

export interface PrayerWindow {
  /** The prayer that just passed (yesterday's Isha before Fajr). */
  prev: Next;
  /** The next prayer (tomorrow's Fajr after Isha). */
  next: Next;
  /** 0..1: how much of the time between `prev` and `next` has gone by. */
  elapsed: number;
}

/** The previous and next of the five prayers around `now`, and how far through that gap we are. */
export function prayerWindow(loc: Location, now: Date, method: MethodId, madhab: MadhabId): PrayerWindow {
  const next = nextPrayer(loc, now, method, madhab);
  const today = timesFor(loc, now, method, madhab);
  let prev: Next | null = null;
  for (const name of ADHAN_PRAYERS) if (today[name].getTime() <= now.getTime()) prev = { name, at: today[name] };
  if (!prev) {
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12);
    prev = { name: 'isha', at: timesFor(loc, yesterday, method, madhab).isha };
  }
  const span = next.at.getTime() - prev.at.getTime();
  const elapsed = span > 0 ? Math.min(1, Math.max(0, (now.getTime() - prev.at.getTime()) / span)) : 0;
  return { prev, next, elapsed };
}

/** The four prayers shown in the corners around the countdown: every prayer except the next one, in day order. */
export function cornerPrayers(next: PrayerName): PrayerName[] {
  return ADHAN_PRAYERS.filter(p => p !== next);
}

/** "1:47:50" countdown (hours without padding, minutes and seconds padded). */
export function formatHMS(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ---------- the "times" list: iqama, ishraq, night ----------

/** Minutes between the adhan and the iqama (the call to start the congregational prayer), by prayer. */
export type IqamaMinutes = Record<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', number>;

/** Typical gaps; the user can change them. */
export const IQAMA_DEFAULTS: IqamaMinutes = { fajr: 25, dhuhr: 20, asr: 20, maghrib: 5, isha: 20 };

export const addMinutes = (date: Date, minutes: number): Date => new Date(date.getTime() + minutes * 60_000);

/** When voluntary prayer is allowed again after sunrise (about 20 minutes later). */
export const ishraqAt = (sunrise: Date): Date => addMinutes(sunrise, 20);

export interface NightTimes {
  /** Middle of the night: halfway between Maghrib and the next Fajr. */
  midnight: Date;
  /** Start of the last third of the night. */
  lastThird: Date;
}

/** The night that begins with Maghrib of `date`. */
export function nightTimes(loc: Location, date: Date, method: MethodId, madhab: MadhabId): NightTimes {
  const today = timesFor(loc, date, method, madhab);
  const tomorrow = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 12);
  const fajr = timesFor(loc, tomorrow, method, madhab).fajr;
  const span = fajr.getTime() - today.maghrib.getTime();
  return { midnight: new Date(today.maghrib.getTime() + span / 2), lastThird: new Date(today.maghrib.getTime() + (span * 2) / 3) };
}
