/**
 * Preferences for the Mushaf view (page-by-page reading). Local to the device.
 * (No imports on purpose, so this file can be unit-tested with plain Node.)
 */

/** How the Quran is shown: the ayah list with tools, or a mushaf you flip page by page. */
export type MushafView = 'list' | 'mushaf1' | 'mushaf2';
export type MushafAlign = 'center' | 'start';
export type SurahNameStyle = 'plain' | 'ornate';
export type NumberColor = 'gold' | 'red' | 'blue' | 'green' | 'gray';

export interface MushafPrefs {
  view: MushafView;
  align: MushafAlign;
  /** Let the phone rotate to landscape while reading the mushaf (phone app only). */
  allowLandscape: boolean;
  surahName: SurahNameStyle;
  /** Colour of the ayah-number markers. */
  numberColor: NumberColor;
  /** Use a wide Arabic font (Scheherazade New) for the ayahs. */
  wide: boolean;
}

export const DEFAULT_MUSHAF: MushafPrefs = {
  view: 'list',
  align: 'center',
  allowLandscape: false,
  surahName: 'ornate',
  numberColor: 'gold',
  wide: false,
};

/** Colours for ayah numbers; readable on both the light and the dark theme. */
export const NUMBER_COLORS: Record<NumberColor, { light: string; dark: string }> = {
  gold: { light: '#8a6410', dark: '#e0b65a' },
  red: { light: '#b3261e', dark: '#ff8a80' },
  blue: { light: '#1f5fbf', dark: '#8ab4ff' },
  green: { light: '#1b7a3d', dark: '#7bd88f' },
  gray: { light: '#5f6b66', dark: '#b4c0ba' },
};

export const NUMBER_COLOR_ORDER: NumberColor[] = ['red', 'gray', 'blue', 'green', 'gold'];

/** Text size range of the ayahs, in px, and its default. */
export const FONT_MIN = 20;
export const FONT_MAX = 56;
export const FONT_STEP = 2;
export const FONT_DEFAULT = 32;

/** Validates stored preferences (anything unknown falls back to the default). */
export function normalizeMushaf(raw: Partial<MushafPrefs> | null | undefined): MushafPrefs {
  const r = raw ?? {};
  const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(value as T) ? (value as T) : fallback);
  return {
    view: pick(r.view, ['list', 'mushaf1', 'mushaf2'] as const, DEFAULT_MUSHAF.view),
    align: pick(r.align, ['center', 'start'] as const, DEFAULT_MUSHAF.align),
    allowLandscape: r.allowLandscape === true,
    surahName: pick(r.surahName, ['plain', 'ornate'] as const, DEFAULT_MUSHAF.surahName),
    numberColor: pick(r.numberColor, ['gold', 'red', 'blue', 'green', 'gray'] as const, DEFAULT_MUSHAF.numberColor),
    wide: r.wide === true,
  };
}

/** One step up (+1) or down (-1) in text size, kept within the range. */
export const stepFont = (size: number, direction: 1 | -1): number => Math.min(FONT_MAX, Math.max(FONT_MIN, size + direction * FONT_STEP));

// ---------- the four text sizes ----------

/** The Quran text comes in four sizes only. */
export type TextSize = 'small' | 'normal' | 'big' | 'huge';
export const TEXT_SIZES: TextSize[] = ['small', 'normal', 'big', 'huge'];

/** Each size relative to "normal". */
const TEXT_SIZE_SCALE: Record<TextSize, number> = { small: 0.8, normal: 1, big: 1.25, huge: 1.55 };

/** Pixel size of a text size, given the size of "normal" on this platform (even numbers only). */
export const fontSizeFor = (size: TextSize, normalPx: number): number => Math.round((normalPx * TEXT_SIZE_SCALE[size]) / 2) * 2;

/** The text size closest to a stored pixel size (older versions saved any number between 20 and 56). */
export function textSizeOf(px: number, normalPx: number): TextSize {
  let best: TextSize = 'normal';
  let distance = Infinity;
  for (const size of TEXT_SIZES) {
    const d = Math.abs(fontSizeFor(size, normalPx) - px);
    if (d < distance) { best = size; distance = d; }
  }
  return best;
}

/** A stored pixel size moved onto one of the four sizes. */
export const snapFontSize = (px: number, normalPx: number): number => fontSizeFor(textSizeOf(Number(px) || normalPx, normalPx), normalPx);
