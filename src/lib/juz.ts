/**
 * The 30 juz' (parts) of the Quran and which surahs they touch.
 * Downloads work per surah, so "download juz 30" means every surah that has any ayah in juz 30.
 * (No imports on purpose, so this file can be unit-tested with plain Node.)
 */

/** Where each juz begins: [surah, ayah], juz 1 first. */
export const JUZ_STARTS: [number, number][] = [
  [1, 1], [2, 142], [2, 253], [3, 93], [4, 24], [4, 148], [5, 82], [6, 111], [7, 88], [8, 41],
  [9, 93], [11, 6], [12, 53], [15, 1], [17, 1], [18, 75], [21, 1], [23, 1], [25, 21], [27, 56],
  [29, 46], [33, 31], [36, 28], [39, 32], [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1],
];

/** Surah numbers that have at least one ayah in juz `n` (1..30), in order. */
export function juzSurahs(n: number): number[] {
  if (n < 1 || n > 30) return [];
  const [firstSurah] = JUZ_STARTS[n - 1];
  // The next juz may begin in the middle of a surah: that surah still belongs to this juz.
  const next = n < 30 ? JUZ_STARTS[n] : null;
  const last = next ? (next[1] === 1 ? next[0] - 1 : next[0]) : 114;
  const list: number[] = [];
  for (let s = firstSurah; s <= last; s++) list.push(s);
  return list;
}

/** Surah numbers of several juz', de-duplicated and sorted (juz' share the surahs they split). */
export function surahsOfJuz(juz: number[]): number[] {
  const set = new Set<number>();
  for (const n of juz) for (const s of juzSurahs(n)) set.add(s);
  return [...set].sort((a, b) => a - b);
}
