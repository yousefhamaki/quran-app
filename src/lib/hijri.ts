/**
 * Hijri (Islamic) calendar. Without data it is calculated with the tabular civil algorithm, which can be a day or two
 * off the real calendar (real months start with the moon sighting or the Umm al-Qura table). When the app has been
 * online it holds the real dates for the current and next month (see `setHijriTable`) and those win.
 * Every function also takes an `adjust` in days (-2..+2) the user can set to match their country.
 * (No imports on purpose, so this file can be unit-tested with plain Node.)
 */

export interface HijriDate {
  year: number;
  /** 1..12 (9 = Ramadan) */
  month: number;
  day: number;
}

export const HIJRI_MONTHS_AR = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
export const HIJRI_MONTHS_EN = ['Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Shaban', 'Ramadan', 'Shawwal', 'Dhu al-Qadah', 'Dhu al-Hijjah'];
export const RAMADAN = 9;

const EPOCH = 1948440; // Julian day number of 1 Muharram 1 AH (civil)

/** Julian day number of a Gregorian date (month 1..12). */
function gregorianToJdn(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

function jdnToGregorian(jdn: number): { y: number; m: number; d: number } {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return { y: 100 * b + d - 4800 + Math.floor(m / 10), m: m + 3 - 12 * Math.floor(m / 10), d: e - Math.floor((153 * m + 2) / 5) + 1 };
}

const isLeap = (year: number) => (14 + 11 * year) % 30 < 11;

export function monthLength(year: number, month: number): number {
  if (month === 12) return isLeap(year) ? 30 : 29;
  return month % 2 === 1 ? 30 : 29;
}

function hijriToJdn(year: number, month: number, day: number): number {
  return day + Math.ceil(29.5 * (month - 1)) + (year - 1) * 354 + Math.floor((3 + 11 * year) / 30) + EPOCH - 1;
}

function jdnToHijri(jdn: number): HijriDate {
  const year = Math.floor((30 * (jdn - EPOCH) + 10646) / 10631);
  const month = Math.min(12, Math.ceil((jdn - (29 + hijriToJdn(year, 1, 1))) / 29.5) + 1);
  const day = jdn - hijriToJdn(year, month, 1) + 1;
  return { year, month, day };
}

// ---------- real dates from the network ----------

const pad2 = (n: number) => String(n).padStart(2, '0');
const isoOf = (g: { y: number; m: number; d: number }) => `${g.y}-${pad2(g.m)}-${pad2(g.d)}`;

/** Gregorian "YYYY-MM-DD" → [hijri year, month, day], as published by an official calendar. */
export type HijriTable = Record<string, [number, number, number]>;
let table: HijriTable = {};

/** Replaces the known real dates (an empty table goes back to the calculated calendar). */
export function setHijriTable(next: HijriTable) {
  table = next;
}
export const getHijriTable = (): HijriTable => table;

/** Hijri date of a Gregorian calendar day (month 1..12). `adjust` shifts the result by whole days. */
export function toHijri(y: number, m: number, d: number, adjust = 0): HijriDate {
  const jdn = gregorianToJdn(y, m, d) + adjust;
  const known = table[isoOf(jdnToGregorian(jdn))];
  return known ? { year: known[0], month: known[1], day: known[2] } : jdnToHijri(jdn);
}

/** First Gregorian day (as a Julian day number) and length of a Hijri month, when the table knows them. */
function knownMonth(year: number, month: number): { start: number; length: number } | null {
  let start: number | null = null;
  let last = 0;
  for (const [iso, [hy, hm, hd]] of Object.entries(table)) {
    if (hy !== year || hm !== month) continue;
    if (hd === 1) { const [y, m, d] = iso.split('-').map(Number); start = gregorianToJdn(y, m, d); }
    if (hd > last) last = hd;
  }
  if (start === null) return null;
  // The month has 29 or 30 days: it is only certain when the table reaches day 29, or day 30.
  const length = last === 30 ? 30 : last === 29 ? 29 : monthLength(year, month);
  return { start, length };
}

/** Gregorian calendar day (month 1..12) of a Hijri date. */
export function fromHijri(year: number, month: number, day: number, adjust = 0): { y: number; m: number; d: number } {
  const known = knownMonth(year, month);
  const jdn = known ? known.start + day - 1 : hijriToJdn(year, month, day);
  return jdnToGregorian(jdn - adjust);
}

/** Hijri date of a JS Date's local day. */
export function hijriOf(date: Date, adjust = 0): HijriDate {
  return toHijri(date.getFullYear(), date.getMonth() + 1, date.getDate(), adjust);
}

export interface CalendarCell {
  /** Hijri day 1..30 */
  day: number;
  /** Gregorian local date as "YYYY-MM-DD" */
  iso: string;
  /** 0 = Sunday .. 6 = Saturday */
  weekday: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Every day of a Hijri month with its Gregorian date. */
export function monthDays(year: number, month: number, adjust = 0): CalendarCell[] {
  const length = knownMonth(year, month)?.length ?? monthLength(year, month);
  return Array.from({ length }, (_, i) => {
    const g = fromHijri(year, month, i + 1, adjust);
    return { day: i + 1, iso: `${g.y}-${pad(g.m)}-${pad(g.d)}`, weekday: new Date(g.y, g.m - 1, g.d).getDay() };
  });
}

/** The previous/next Hijri month of (year, month). */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** Notable days to mark in the calendar (month, day) → key for a label. */
export const OCCASIONS: { month: number; day: number; ar: string; en: string }[] = [
  { month: 1, day: 1, ar: 'رأس السنة الهجرية', en: 'Islamic New Year' },
  { month: 1, day: 10, ar: 'يوم عاشوراء', en: 'Day of Ashura' },
  { month: 3, day: 12, ar: 'المولد النبوي (على قول)', en: 'Mawlid (by some)' },
  { month: 7, day: 27, ar: 'الإسراء والمعراج (على قول)', en: 'Isra and Miraj (by some)' },
  { month: 8, day: 15, ar: 'النصف من شعبان', en: 'Mid-Shaban' },
  { month: 9, day: 1, ar: 'أول رمضان', en: 'First of Ramadan' },
  { month: 9, day: 27, ar: 'ليلة القدر (يُلتمس في الوتر)', en: 'Laylat al-Qadr (sought in the odd nights)' },
  { month: 10, day: 1, ar: 'عيد الفطر', en: 'Eid al-Fitr' },
  { month: 12, day: 9, ar: 'يوم عرفة', en: 'Day of Arafah' },
  { month: 12, day: 10, ar: 'عيد الأضحى', en: 'Eid al-Adha' },
];
