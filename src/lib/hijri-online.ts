import { getHijriTable, setHijriTable, type HijriTable } from '@/lib/hijri';
import { loadJSON, saveJSON } from '@/lib/storage';

/**
 * Keeps the real Hijri dates up to date. The calculated calendar can be a day or two off, so whenever the app is
 * online it asks AlAdhan (Umm al-Qura based) for the dates of this Gregorian month and the next one, and keeps them on
 * the device. It asks again when the table does not cover today, when it is more than a week old, and in the last days
 * of the month so the next month is there before it starts. Offline, the saved dates (or the calculation) are used.
 */

const KEY = 'quran.hijriTable';
const KEEP_DAYS = 120;
const WEEK = 7 * 24 * 3600 * 1000;

interface Saved {
  fetchedAt: number;
  days: HijriTable;
}

const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Loads the saved dates (call once at start-up so the right date shows before any network call). */
export function loadSavedHijri() {
  const saved = loadJSON<Saved | null>(KEY, null);
  if (saved?.days) setHijriTable(saved.days);
}

interface ApiDay {
  gregorian: { date: string };
  hijri: { day: string; year: string; month: { number: number } };
}

async function fetchMonth(year: number, month: number, signal?: AbortSignal): Promise<HijriTable> {
  const res = await fetch(`https://api.aladhan.com/v1/gToHCalendar/${month}/${year}`, { signal });
  if (!res.ok) throw new Error(`hijri ${res.status}`);
  const json = (await res.json()) as { data: ApiDay[] };
  const out: HijriTable = {};
  for (const x of json.data) {
    const [d, m, y] = x.gregorian.date.split('-').map(Number);
    out[`${y}-${pad(m)}-${pad(d)}`] = [Number(x.hijri.year), x.hijri.month.number, Number(x.hijri.day)];
  }
  return out;
}

/** True when the saved table is missing something the screens are about to need. */
export function needsHijriRefresh(now: Date, fetchedAt: number): boolean {
  const table = getHijriTable();
  if (!table[isoOf(now)]) return true;
  if (now.getTime() - fetchedAt > WEEK) return true;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const nearEnd = daysInMonth - now.getDate() <= 4;
  const tomorrowNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nearEnd && !table[isoOf(tomorrowNextMonth)];
}

let running = false;

/** Fetches what is needed. Resolves true when the table changed. Never throws (offline just keeps what is saved). */
export async function refreshHijri(now: Date = new Date()): Promise<boolean> {
  if (running) return false;
  const saved = loadJSON<Saved | null>(KEY, null);
  if (saved?.days && Object.keys(getHijriTable()).length === 0) setHijriTable(saved.days);
  if (!needsHijriRefresh(now, saved?.fetchedAt ?? 0)) return false;
  running = true;
  try {
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const [a, b] = await Promise.all([fetchMonth(now.getFullYear(), now.getMonth() + 1), fetchMonth(next.getFullYear(), next.getMonth() + 1)]);
    const merged: HijriTable = { ...(saved?.days ?? {}), ...a, ...b };
    // Keep it small: drop dates more than about four months ago.
    const cutoff = isoOf(new Date(now.getTime() - KEEP_DAYS * 24 * 3600 * 1000));
    for (const k of Object.keys(merged)) if (k < cutoff) delete merged[k];
    setHijriTable(merged);
    saveJSON(KEY, { fetchedAt: now.getTime(), days: merged } satisfies Saved);
    return true;
  } catch {
    return false;
  } finally {
    running = false;
  }
}
