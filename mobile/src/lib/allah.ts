/**
 * Finds the name "Allah" (لفظ الجلالة) in Quran text so it can be coloured.
 * (No imports on purpose, so this file can be unit-tested with plain Node.)
 */

/** Red for the name of Allah; readable on both the light and the dark theme. */
export const ALLAH_COLOR = { light: '#b3261e', dark: '#ff8a80' };

/** A word with its vowel marks, tatweel and small signs removed and alef-wasla written as a plain alef. */
export const skeleton = (word: string): string =>
  word
    .replace(/[ً-ٰٟۖ-ۭـ]/g, '')
    .replace(/ٱ/g, 'ا');

// الله, with one of the attached particles ("and", "by", "to", "O"...): والله, بالله, تالله, فبالله, لله, ولله...
// (اللهم is "O Allah" and a different word, so it is left alone.)
const ALLAH = /^(?:[وف]?[بتك]?ا?لله|[وف]?لله)$/;

export const isAllahWord = (word: string): boolean => ALLAH.test(skeleton(word));

export interface Run {
  text: string;
  allah: boolean;
}

/**
 * Splits a text into plain runs and the words that are Allah's name. Only the name itself is cut out (a run keeps the
 * spaces around it), so everything else stays one piece of text.
 */
export function splitAllah(text: string): Run[] {
  const parts = text.split(/(\s+)/);
  const runs: Run[] = [];
  let plain = '';
  for (const part of parts) {
    if (part && !/^\s+$/.test(part) && isAllahWord(part)) {
      if (plain) runs.push({ text: plain, allah: false });
      plain = '';
      runs.push({ text: part, allah: true });
    } else {
      plain += part;
    }
  }
  if (plain) runs.push({ text: plain, allah: false });
  return runs;
}
