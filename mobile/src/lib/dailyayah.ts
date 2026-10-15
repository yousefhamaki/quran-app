import { dailyAyah, type Ref } from './habit';

/** One ayah with the names of its surah. Plain `fetch` only, so widgets and reminders can use it in the background. */
export interface AyahText {
  ref: Ref;
  ar: string;
  en: string;
  surahAr: string;
  surahEn: string;
}

const BASE = 'https://api.alquran.cloud/v1';
const cache = new Map<string, AyahText>();

export async function fetchAyahText(ref: Ref): Promise<AyahText> {
  const key = `${ref.surah}:${ref.ayah}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const res = await fetch(`${BASE}/ayah/${key}/editions/quran-uthmani,en.sahih`);
  if (!res.ok) throw new Error(`ayah ${key}: ${res.status}`);
  const [ar, en] = (await res.json()).data as { text: string; surah: { name: string; englishName: string } }[];
  const value: AyahText = {
    ref,
    ar: ar.text.replace(/^﻿/, ''),
    en: en.text,
    surahAr: ar.surah.name,
    surahEn: ar.surah.englishName,
  };
  cache.set(key, value);
  return value;
}

/** The ayah of `day`, or null when it cannot be fetched (offline). */
export async function ayahOfDayText(day: string): Promise<AyahText | null> {
  try {
    return await fetchAyahText(dailyAyah(day));
  } catch {
    return null;
  }
}
