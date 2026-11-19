/**
 * The dua of the day: one dua a day, taken word for word from Hisn al-Muslim (never reworded), the same for everyone.
 * Only chapters that are really duas to say are used (not the chapters that describe a virtue or a rule),
 * and only items short enough to read at a glance.
 * (No runtime imports on purpose, so this file can be unit-tested with plain Node: the book is passed in.)
 */
import type { HisnCategory } from './hisn';

/** Chapters of the book (by their number) that are duas for an occasion. */
export const DUA_CHAPTERS = [
  3, 4, 5, 7, 8, 9, 11, 12, 13, 14, 15, 19, 20, 21, 22, 26, 29, 34, 35, 36, 37, 40, 41, 43, 44, 46, 53, 61, 62, 64, 66, 67, 68, 69, 70,
  82, 83, 87, 89, 90, 91, 93, 95, 96, 98, 104, 106, 112, 122, 124, 125, 126, 129,
];

/** The book also writes how to do things ("he says...", "the Prophet used to...", "when one of you eats..."): those are not duas to show alone. */
const NARRATION = new Set(['قال', 'وقال', 'كان', 'وكان', 'اذا', 'واذا', 'من', 'ومن', 'ما', 'ضع', 'فليقل', 'مثل', 'لا_تقل']);
const fold = (t: string) => t.replace(/[ً-ٰٟۖ-ۭـ]/g, '').replace(/[أإآٱ]/g, 'ا');

export function isInstruction(ar: string): boolean {
  const first = fold(ar).replace(/^[\s(\[]+/, '').split(/\s+/)[0] ?? '';
  // A verb in the third person ("he says", "he begins"), but not the call "O Allah" (يا ...).
  return (/^ي/.test(first) && first !== 'يا') || NARRATION.has(first);
}

const MIN = 20;
const MAX = 420;

export interface DailyDua {
  /** The chapter of the book (its number and Arabic title). */
  chapter: number;
  title: string;
  ar: string;
  count: number;
}

/** Every dua that can be picked, in a fixed order. */
export function duaPool(book: HisnCategory[]): DailyDua[] {
  const pool: DailyDua[] = [];
  for (const id of DUA_CHAPTERS) {
    const c = book.find(x => x.id === id);
    if (!c) continue;
    for (const item of c.items) {
      const text = item.ar.trim();
      if (text.length >= MIN && text.length <= MAX && !isInstruction(text)) pool.push({ chapter: c.id, title: c.ar, ar: text, count: item.count });
    }
  }
  return pool;
}

/** Days since 1 Jan 1970 of a plain local date ("2026-11-19"). */
export function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return 0;
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** One dua per day. The days are shuffled by a fixed step so neighbouring days are not neighbouring duas of one chapter. */
export function duaOfDay(date: string, pool: DailyDua[]): DailyDua {
  const n = pool.length;
  // 37 is coprime with any pool size that is not a multiple of 37; fall back to a step of 1 if it is.
  const step = n % 37 === 0 ? 1 : 37;
  return pool[(dayNumber(date) * step) % n];
}
