/**
 * Tajweed text from Quran.com looks like:
 *   قُلْ هُوَ <tajweed class=ham_wasl>ٱ</tajweed>للَّهُ أَحَ<tajweed class=qalaqah>د</tajweed>ٌ <span class=end>١</span>
 * parseTajweed turns it into words, each made of chunks that carry an optional rule class.
 * (No imports on purpose, so this file can be unit-tested with plain Node.)
 */

export interface Chunk {
  text: string;
  /** Tajweed rule, e.g. "qalaqah". Undefined = no special rule. */
  cls?: string;
}
export type Word = Chunk[];

// Opening tag | closing tag | verse-end number | plain text | any other stray "<".
const TOKEN = /<tajweed class=([a-z_]+)>|<\/tajweed>|<span class=end>[^<]*<\/span>|([^<]+)|</g;

function addText(words: Word[], text: string, cls?: string) {
  for (const part of text.split(/(\s+)/)) {
    if (!part) continue;
    if (/^\s+$/.test(part)) {
      if (words[words.length - 1].length > 0) words.push([]);
    } else {
      words[words.length - 1].push({ text: part, cls });
    }
  }
}

/**
 * Splits tajweed markup into words (the verse-end number is dropped).
 * Tags can be nested (a silent letter inside a madd), so the rule of a piece of text is the innermost open tag.
 */
export function parseTajweed(markup: string): Word[] {
  const words: Word[] = [[]];
  const open: string[] = [];
  for (const match of markup.matchAll(TOKEN)) {
    if (match[1] !== undefined) open.push(match[1]);
    else if (match[0] === '</tajweed>') open.pop();
    else if (match[2] !== undefined) addText(words, match[2], open[open.length - 1]);
    // <span class=end> and stray "<" are skipped: the app draws its own ornamental verse number.
  }
  return mergeSignsOnly(words.filter(w => w.length > 0));
}

const LETTER = /[ء-يٮ-ۓ]/;

/**
 * Pause signs and section ornaments (۞ ۩ ۖ …) that stand alone are not words: Quran.com's numbering
 * (and so its timestamps) skips them. Fold them into a neighbouring word so the indexes line up.
 */
function mergeSignsOnly(words: Word[]): Word[] {
  const out: Word[] = [];
  let pending: Chunk[] = []; // signs seen before the first real word
  for (const word of words) {
    const hasLetter = word.some(c => LETTER.test(c.text));
    if (hasLetter) {
      out.push(pending.length ? [...pending, ...word] : word);
      pending = [];
    } else if (out.length) {
      out[out.length - 1] = [...out[out.length - 1], ...word];
    } else {
      pending = [...pending, ...word];
    }
  }
  if (pending.length && out.length === 0) out.push(pending);
  return out;
}

/** Plain text split into words (used when no tajweed markup is available). */
export function plainWords(text: string): Word[] {
  const words: Word[] = [[]];
  addText(words, text);
  return mergeSignsOnly(words.filter(w => w.length > 0));
}

export const wordText = (word: Word) => word.map(c => c.text).join('');

export interface TajweedRule {
  cls: string;
  ar: string;
  en: string;
  /** Colours that keep ≥ 3:1 contrast on the light / dark page background. */
  light: string;
  dark: string;
}

/** Rule names and their colours (also used for the legend in Settings). */
export const TAJWEED_RULES: TajweedRule[] = [
  { cls: 'madda_normal', ar: 'مد طبيعي', en: 'Natural madd (2)', light: '#1d6fd1', dark: '#6fb0ff' },
  { cls: 'madda_permissible', ar: 'مد جائز', en: 'Permissible madd (2, 4, 6)', light: '#4a4fd6', dark: '#9aa0ff' },
  { cls: 'madda_necessary', ar: 'مد لازم', en: 'Necessary madd (6)', light: '#1a2fb0', dark: '#7f8cff' },
  { cls: 'madda_obligatory', ar: 'مد واجب', en: 'Obligatory madd (4–5)', light: '#2a4cc4', dark: '#8aa3ff' },
  { cls: 'ghunnah', ar: 'غنة', en: 'Ghunnah (nasal)', light: '#d9650b', dark: '#ff9d4d' },
  { cls: 'qalaqah', ar: 'قلقلة', en: 'Qalqalah (echo)', light: '#c8102e', dark: '#ff7a8a' },
  { cls: 'ikhfa', ar: 'إخفاء', en: 'Ikhfa (hiding)', light: '#8a1fa3', dark: '#d58bf0' },
  { cls: 'ikhfa_shafawi', ar: 'إخفاء شفوي', en: 'Ikhfa shafawi', light: '#b3128f', dark: '#f08ad4' },
  { cls: 'idgham_ghunnah', ar: 'إدغام بغنة', en: 'Idgham with ghunnah', light: '#2a8a1f', dark: '#7fdc6f' },
  { cls: 'idgham_wo_ghunnah', ar: 'إدغام بلا غنة', en: 'Idgham without ghunnah', light: '#1b7f6b', dark: '#6fd9c1' },
  { cls: 'idgham_shafawi', ar: 'إدغام شفوي', en: 'Idgham shafawi', light: '#3f8f12', dark: '#9be06b' },
  { cls: 'idgham_mutajanisayn', ar: 'إدغام متجانسين', en: 'Idgham mutajanisayn', light: '#6b7f1a', dark: '#c4d96b' },
  { cls: 'idgham_mutaqaribayn', ar: 'إدغام متقاربين', en: 'Idgham mutaqaribayn', light: '#7a6a12', dark: '#dccb6b' },
  { cls: 'iqlab', ar: 'إقلاب', en: 'Iqlab (conversion)', light: '#0f7fa8', dark: '#6fd0f5' },
  { cls: 'ham_wasl', ar: 'همزة وصل', en: 'Hamzat wasl (not pronounced)', light: '#8a8a8a', dark: '#9a9a9a' },
  { cls: 'laam_shamsiyah', ar: 'لام شمسية', en: 'Lam shamsiyah', light: '#8a8a8a', dark: '#9a9a9a' },
  { cls: 'slnt', ar: 'حرف صامت', en: 'Silent letter', light: '#8a8a8a', dark: '#9a9a9a' },
];

const BY_CLASS = new Map(TAJWEED_RULES.map(r => [r.cls, r]));

export function tajweedColor(cls: string | undefined, dark: boolean): string | undefined {
  const rule = cls ? BY_CLASS.get(cls) : undefined;
  return rule ? (dark ? rule.dark : rule.light) : undefined;
}
