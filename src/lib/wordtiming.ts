/**
 * Which word of an ayah is being recited at a given moment.
 * Quran.com publishes exact word timestamps for many reciters ("segments"); for the others we estimate
 * from word length. (No imports on purpose, so this file can be unit-tested with plain Node.)
 */

/** Words [from, to) are being recited between `start` and `end` (milliseconds into the ayah audio). */
export interface WordSegment {
  from: number;
  to: number;
  start: number;
  end: number;
}

/** Quran.com sends [from, to, start, end]; some reciters send the numbers as strings. */
export function normalizeSegments(raw: unknown): WordSegment[] {
  if (!Array.isArray(raw)) return [];
  const out: WordSegment[] = [];
  for (const item of raw) {
    if (!Array.isArray(item) || item.length < 4) continue;
    const [from, to, start, end] = item.map(Number);
    if ([from, to, start, end].every(Number.isFinite) && end >= start && to > from) out.push({ from, to, start, end });
  }
  return out.sort((a, b) => a.start - b.start);
}

/**
 * Index of the word to highlight at `ms`, or -1 before the first word.
 * Between two words (a short pause) the previous word stays highlighted, so the highlight never flickers.
 */
export function activeWordAt(segments: WordSegment[], ms: number): number {
  let active = -1;
  for (const s of segments) {
    if (ms >= s.start) active = s.from;
    else break;
  }
  return active;
}

const ARABIC_LETTER = /[ء-يٮ-ۓٱ-ۓ]/g;

/** Relative time a word takes to recite: roughly its number of letters (marks and signs excluded). */
export function wordWeight(text: string): number {
  return Math.max(1, (text.match(ARABIC_LETTER) ?? []).length);
}

/**
 * Splits the recitation time across the words in proportion to their length. Used for reciters without
 * published timestamps; it is an approximation, so the highlight can drift by a fraction of a second.
 */
export function estimateSegments(words: string[], durationMs: number): WordSegment[] {
  if (words.length === 0 || !(durationMs > 0)) return [];
  const lead = durationMs * 0.04; // a little silence before the first word
  const tail = durationMs * 0.04;
  const speech = Math.max(1, durationMs - lead - tail);
  const weights = words.map(wordWeight);
  const total = weights.reduce((a, b) => a + b, 0);
  let cursor = lead;
  return weights.map((w, i) => {
    const span = (w / total) * speech;
    const seg = { from: i, to: i + 1, start: Math.round(cursor), end: Math.round(cursor + span) };
    cursor += span;
    return seg;
  });
}

/** Reciter id (EveryAyah folder) → Quran.com recitation id, for the reciters whose word timings are published. */
export const QURAN_COM_RECITATION: Record<string, number> = {
  Alafasy_128kbps: 7,
  Abdul_Basit_Murattal_192kbps: 2,
  Husary_128kbps: 6,
  Minshawy_Murattal_128kbps: 9,
  Mohammad_al_Tablaway_128kbps: 11,
  'Abdurrahmaan_As-Sudais_192kbps': 3,
  'Saood_ash-Shuraym_128kbps': 10,
  'Abu_Bakr_Ash-Shaatree_128kbps': 4,
};
