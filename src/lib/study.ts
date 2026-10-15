/**
 * Study tools shared by web and mobile: jumping by juz / hizb / page, highlights + notes, the "what comes next?"
 * self-test, and the weekly review calendar.
 * (No imports on purpose, so this file can be unit-tested with plain Node.)
 */

// ---------- jump by juz / hizb ----------

/** Where each of the 60 hizb begins: [surah, ayah], hizb 1 first (juz n starts at hizb 2n-1). From the AlQuran Cloud data. */
export const HIZB_STARTS: [number, number][] = [
  [1, 1], [2, 75], [2, 142], [2, 203], [2, 253], [3, 15], [3, 93], [3, 171], [4, 24], [4, 88],
  [4, 148], [5, 27], [5, 82], [6, 36], [6, 111], [7, 1], [7, 88], [7, 171], [8, 41], [9, 34],
  [9, 93], [10, 26], [11, 6], [11, 84], [12, 53], [13, 19], [15, 1], [16, 51], [17, 1], [17, 99],
  [18, 75], [20, 1], [21, 1], [22, 1], [23, 1], [24, 21], [25, 21], [26, 111], [27, 56], [28, 51],
  [29, 46], [31, 22], [33, 31], [34, 24], [36, 28], [37, 145], [39, 32], [40, 41], [41, 47], [43, 24],
  [46, 1], [48, 18], [51, 31], [55, 1], [58, 1], [62, 1], [67, 1], [72, 1], [78, 1], [87, 1],
];

/** Hizb (1..60) that holds this ayah. */
export function hizbOf(surah: number, ayah: number): number {
  let h = 1;
  for (let i = 0; i < HIZB_STARTS.length; i++) {
    const [s, a] = HIZB_STARTS[i];
    if (s < surah || (s === surah && a <= ayah)) h = i + 1;
    else break;
  }
  return h;
}

/** Juz (1..30) that holds this ayah. */
export const juzOf = (surah: number, ayah: number): number => Math.ceil(hizbOf(surah, ayah) / 2);

// ---------- highlights and notes ----------

export const HIGHLIGHT_COLORS = ['yellow', 'green', 'blue', 'pink'] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

export const markKey = (surah: number, ayah: number) => `${surah}:${ayah}`;

export interface Annotation {
  color?: HighlightColor;
  note?: string;
}
export type Annotations = Record<string, Annotation>;

/** Sets (or clears, with undefined) the colour and/or note of an ayah; an annotation with neither is removed. */
export function annotate(all: Annotations, surah: number, ayah: number, patch: { color?: HighlightColor | null; note?: string | null }): Annotations {
  const key = markKey(surah, ayah);
  const next: Annotation = { ...all[key] };
  if ('color' in patch) { if (patch.color) next.color = patch.color; else delete next.color; }
  if ('note' in patch) { const n = patch.note?.trim(); if (n) next.note = n; else delete next.note; }
  const rest = { ...all };
  if (next.color || next.note) rest[key] = next;
  else delete rest[key];
  return rest;
}

/** Annotated ayahs, newest surah/ayah order, for a "my notes" list. */
export function annotationList(all: Annotations): { surah: number; ayah: number; color?: HighlightColor; note?: string }[] {
  return Object.entries(all)
    .map(([k, v]) => { const [s, a] = k.split(':').map(Number); return { surah: s, ayah: a, ...v }; })
    .sort((x, y) => x.surah - y.surah || x.ayah - y.ayah);
}

// ---------- self-test: "what comes next?" ----------

export interface Mistake {
  /** Times asked / times missed. */
  seen: number;
  missed: number;
  last: string;
}
export type Mistakes = Record<string, Mistake>;

export interface TestRange {
  surah: number;
  from: number;
  to: number;
}

/** Records one answer for the ayah that was hidden. */
export function recordAnswer(all: Mistakes, surah: number, ayah: number, correct: boolean, today: string): Mistakes {
  const key = markKey(surah, ayah);
  const old = all[key] ?? { seen: 0, missed: 0, last: today };
  return { ...all, [key]: { seen: old.seen + 1, missed: old.missed + (correct ? 0 : 1), last: today } };
}

/** The hardest ayahs first (highest miss rate, then most misses). */
export function weakest(all: Mistakes, limit = 10): { surah: number; ayah: number; seen: number; missed: number }[] {
  return Object.entries(all)
    .filter(([, m]) => m.missed > 0)
    .map(([k, m]) => { const [s, a] = k.split(':').map(Number); return { surah: s, ayah: a, seen: m.seen, missed: m.missed }; })
    .sort((x, y) => y.missed / y.seen - x.missed / x.seen || y.missed - x.missed)
    .slice(0, limit);
}

/**
 * Picks the ayah to show as the prompt (the hidden one is the next ayah). Ayahs missed before are twice as likely.
 * `rng` returns [0, 1) and is injectable so tests are deterministic. Needs a range of at least two ayahs.
 */
export function pickPrompt(range: TestRange, all: Mistakes, rng: () => number = Math.random): number {
  const last = range.to - 1; // the prompt can be any ayah but the last of the range
  if (last < range.from) return range.from;
  let total = 0;
  const weights: number[] = [];
  for (let a = range.from; a <= last; a++) {
    const m = all[markKey(range.surah, a + 1)];
    const w = m && m.missed > 0 ? 3 : 1;
    weights.push(w);
    total += w;
  }
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return range.from + i;
  }
  return last;
}

export interface TestScore {
  asked: number;
  correct: number;
  percent: number;
}
export const scoreOf = (asked: number, correct: number): TestScore => ({ asked, correct, percent: asked ? Math.round((correct / asked) * 100) : 0 });

// ---------- weekly review calendar ----------

export interface CalendarDay {
  day: string;
  /** Cards due on this day (the first day also counts everything overdue). */
  count: number;
  isToday: boolean;
}

/** The next `days` days (starting today) with how many Leitner cards fall due on each; overdue cards count today. */
export function weekCalendar(cards: { due: string }[], today: string, addDays: (day: string, n: number) => string, days = 7): CalendarDay[] {
  const out: CalendarDay[] = [];
  for (let i = 0; i < days; i++) {
    const day = addDays(today, i);
    const count = cards.filter(c => (i === 0 ? c.due <= day : c.due === day)).length;
    out.push({ day, count, isToday: i === 0 });
  }
  return out;
}
