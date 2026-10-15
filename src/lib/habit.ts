/**
 * Daily-habit helpers: a khatmah (finish the whole Quran in N days) planner, a reading streak and the ayah of the day.
 * Days are plain local dates ("2026-10-15"); ayahs are counted across the whole Quran (index 0 = Al-Fatiha 1:1).
 * (No imports on purpose, so this file can be unit-tested with plain Node.)
 */

/** Number of ayahs in each surah, 1..114. */
export const AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227,
  93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96,
  29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17,
  19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

export const TOTAL_AYAHS = 6236;

export interface Ref {
  surah: number;
  ayah: number;
}

/** Global 0-based index → surah and ayah. Clamped to the last ayah. */
export function locate(index: number): Ref {
  let rest = Math.max(0, Math.min(TOTAL_AYAHS - 1, Math.floor(index)));
  for (let s = 0; s < AYAH_COUNTS.length; s++) {
    if (rest < AYAH_COUNTS[s]) return { surah: s + 1, ayah: rest + 1 };
    rest -= AYAH_COUNTS[s];
  }
  return { surah: 114, ayah: 6 };
}

/** Surah and ayah → global 0-based index. */
export function indexOf(surah: number, ayah: number): number {
  let n = 0;
  for (let s = 1; s < surah; s++) n += AYAH_COUNTS[s - 1];
  return n + ayah - 1;
}

// ---------- dates ----------

const pad = (n: number) => String(n).padStart(2, '0');

export function dateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return dateString(new Date(y, m - 1, d + days));
}

/** Whole days from `a` to `b` (negative if b is earlier). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

// ---------- khatmah ----------

export interface Khatmah {
  startDate: string;
  /** Days to finish the whole Quran. */
  days: number;
  /** Ayahs finished so far (a count from the start of the Quran). */
  read: number;
  finishedOn: string | null;
}

export function createKhatmah(args: { days: number; today: string; read?: number }): Khatmah {
  return {
    startDate: args.today,
    days: Math.max(1, Math.min(365, Math.round(args.days))),
    read: Math.max(0, Math.min(TOTAL_AYAHS, args.read ?? 0)),
    finishedOn: null,
  };
}

/** 1-based day of the khatmah; day 1 is the start date. Never below 1. */
export function khatmahDay(k: Khatmah, today: string): number {
  return Math.max(1, daysBetween(k.startDate, today) + 1);
}

/** Ayahs that should be finished by the end of day `day`. */
export function targetBy(k: Khatmah, day: number): number {
  if (day <= 0) return 0;
  return Math.min(TOTAL_AYAHS, Math.ceil((TOTAL_AYAHS * Math.min(day, k.days)) / k.days));
}

export interface Portion {
  from: Ref;
  to: Ref;
  count: number;
}

export interface KhatmahStats {
  day: number;
  /** 0..100 */
  percent: number;
  read: number;
  /** Ayahs left to read today to be on schedule (0 = done for today). */
  todayLeft: number;
  /** Ayahs missed from earlier days (part of todayLeft). */
  behind: number;
  /** Today's reading, from where you stopped up to today's target. null when done for today or finished. */
  portion: Portion | null;
  /** Where the next reading starts. null when the khatmah is finished. */
  next: Ref | null;
  /** Days still available, counting today (0 once the planned period has passed). */
  daysLeft: number;
  /** Ayahs per day needed from now to still finish on time. */
  perDayNow: number;
  finished: boolean;
}

export function khatmahStats(k: Khatmah, today: string): KhatmahStats {
  const day = khatmahDay(k, today);
  const finished = k.read >= TOTAL_AYAHS;
  const target = targetBy(k, day);
  const todayLeft = finished ? 0 : Math.max(0, target - k.read);
  const behind = finished ? 0 : Math.max(0, targetBy(k, day - 1) - k.read);
  const daysLeft = Math.max(0, k.days - day + 1);
  const remaining = TOTAL_AYAHS - k.read;
  let portion: Portion | null = null;
  if (todayLeft > 0) portion = { from: locate(k.read), to: locate(k.read + todayLeft - 1), count: todayLeft };
  return {
    day,
    percent: Math.min(100, (k.read / TOTAL_AYAHS) * 100),
    read: k.read,
    todayLeft,
    behind,
    portion,
    next: finished ? null : locate(k.read),
    daysLeft,
    perDayNow: finished ? 0 : Math.ceil(remaining / Math.max(1, daysLeft)),
    finished,
  };
}

/** "I read today's portion": catches up to today's target (and a bit more if you had read ahead). */
export function markToday(k: Khatmah, today: string): Khatmah {
  const read = Math.max(k.read, targetBy(k, khatmahDay(k, today)));
  return { ...k, read, finishedOn: read >= TOTAL_AYAHS ? k.finishedOn ?? today : null };
}

/** Adds `n` ayahs of reading beyond the target (e.g. you read extra). */
export function addRead(k: Khatmah, n: number, today: string): Khatmah {
  const read = Math.max(0, Math.min(TOTAL_AYAHS, k.read + Math.round(n)));
  return { ...k, read, finishedOn: read >= TOTAL_AYAHS ? k.finishedOn ?? today : null };
}

/** Rough page count for an ayah count (the Quran has 604 pages). */
export function approxPages(ayahs: number): number {
  return Math.max(1, Math.round((ayahs * 604) / TOTAL_AYAHS));
}

// ---------- reading streak ----------

const KEEP_DAYS = 400;

/** Adds `today` to the list of days with reading. Keeps it sorted, unique and short. */
export function recordDay(days: string[], today: string): string[] {
  if (days.includes(today)) return days;
  return [...days, today].sort().slice(-KEEP_DAYS);
}

/** Consecutive days of reading. Still alive if you read yesterday but not yet today. */
export function currentStreak(days: string[], today: string): number {
  const set = new Set(days);
  let day = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(day)) { n++; day = addDays(day, -1); }
  return n;
}

export function longestStreak(days: string[]): number {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && daysBetween(sorted[i - 1], sorted[i]) === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

/** The last 7 days (oldest first) with whether you read on each. */
export function lastWeek(days: string[], today: string): { day: string; read: boolean }[] {
  const set = new Set(days);
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6);
    return { day, read: set.has(day) };
  });
}

// ---------- ayah of the day ----------

/** A hand-picked set of well-known, comforting ayahs. One per day, rotating. */
export const DAILY_AYAHS: [number, number][] = [
  [1, 5], [2, 45], [2, 152], [2, 153], [2, 186], [2, 255], [2, 286], [3, 8], [3, 139], [3, 159],
  [3, 173], [4, 28], [5, 8], [6, 162], [7, 56], [8, 46], [9, 40], [10, 62], [11, 88], [12, 87],
  [13, 28], [14, 7], [15, 99], [16, 90], [17, 80], [18, 10], [20, 114], [21, 87], [23, 118], [24, 35],
  [25, 63], [29, 69], [31, 17], [33, 41], [39, 53], [40, 60], [41, 34], [49, 13], [51, 56], [55, 13],
  [57, 4], [59, 22], [64, 11], [65, 3], [93, 5], [94, 5], [94, 6], [103, 3], [112, 1], [113, 1],
];

/** The ayah for `day`: same ayah all day, a different one tomorrow. */
export function dailyAyah(day: string): Ref {
  const n = daysBetween('2024-01-01', day);
  const [surah, ayah] = DAILY_AYAHS[((n % DAILY_AYAHS.length) + DAILY_AYAHS.length) % DAILY_AYAHS.length];
  return { surah, ayah };
}

// ---------- completed khatmahs (history) ----------

export interface CompletedKhatmah {
  startDate: string;
  finishedOn: string;
  /** The number of days it was planned for. */
  days: number;
}

/** Adds a finished khatmah to the history (once; unfinished ones are ignored). */
export function archiveKhatmah(history: CompletedKhatmah[], k: Khatmah | null): CompletedKhatmah[] {
  if (!k || !k.finishedOn) return history;
  const entry: CompletedKhatmah = { startDate: k.startDate, finishedOn: k.finishedOn, days: k.days };
  if (history.some(h => h.startDate === entry.startDate && h.finishedOn === entry.finishedOn)) return history;
  return [...history, entry].sort((a, b) => a.finishedOn.localeCompare(b.finishedOn));
}

/** All completed khatmahs, newest first. A finished khatmah that is still on screen counts too. */
export function completedList(history: CompletedKhatmah[], current: Khatmah | null): CompletedKhatmah[] {
  return [...archiveKhatmah(history, current)].reverse();
}

/** Days it really took (the start day counts as day 1). */
export const takenDays = (c: CompletedKhatmah): number => Math.max(1, daysBetween(c.startDate, c.finishedOn) + 1);

/** Positive = finished that many days before the plan, negative = after. */
export const daysEarly = (c: CompletedKhatmah): number => c.days - takenDays(c);

/**
 * What to read on day number `day` of the khatmah (1-based), assuming everything up to the day before was read on
 * schedule (or `read` ayahs are done, whichever is more). Used for the reminder text of upcoming days.
 */
export function plannedPortion(k: Khatmah, day: number, read: number = k.read): Portion | null {
  const start = Math.max(read, targetBy(k, day - 1));
  const end = targetBy(k, day);
  if (day < 1 || end <= start) return null;
  return { from: locate(start), to: locate(end - 1), count: end - start };
}
