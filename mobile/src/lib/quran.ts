import { cachedJson } from '@/lib/offline';

const BASE = 'https://api.alquran.cloud/v1';

export const surahTextUrl = (n: number) => `${BASE}/surah/${n}/editions/quran-uthmani,en.sahih`;

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: 'Meccan' | 'Medinan';
}

export interface Ayah {
  number: number;
  ar: string;
  en: string;
}

export interface Reciter {
  id: string;
  ar: string;
  en: string;
}

// EveryAyah folder names; free per-ayah MP3 recitations.
export const RECITERS: Reciter[] = [
  { id: 'Alafasy_128kbps', ar: 'مشاري العفاسي', en: 'Mishary Alafasy' },
  { id: 'Abdul_Basit_Murattal_192kbps', ar: 'عبد الباسط عبد الصمد', en: 'Abdul Basit (Murattal)' },
  { id: 'Husary_128kbps', ar: 'محمود خليل الحصري', en: 'Mahmoud Al-Husary' },
  { id: 'Minshawy_Murattal_128kbps', ar: 'محمد صديق المنشاوي', en: 'Al-Minshawi (Murattal)' },
  { id: 'Abdurrahmaan_As-Sudais_192kbps', ar: 'عبد الرحمن السديس', en: 'Abdurrahman As-Sudais' },
  { id: 'Saood_ash-Shuraym_128kbps', ar: 'سعود الشريم', en: 'Saud Ash-Shuraim' },
  { id: 'Maher_AlMuaiqly_128kbps', ar: 'ماهر المعيقلي', en: 'Maher Al-Muaiqly' },
  { id: 'Abu_Bakr_Ash-Shaatree_128kbps', ar: 'أبو بكر الشاطري', en: 'Abu Bakr Ash-Shatri' },
  { id: 'Hudhaify_128kbps', ar: 'علي الحذيفي', en: 'Ali Al-Hudhaify' },
  { id: 'Muhammad_Ayyoub_128kbps', ar: 'محمد أيوب', en: 'Muhammad Ayyub' },
];

const pad = (n: number, l: number) => String(n).padStart(l, '0');

export const audioUrl = (reciter: string, surah: number, ayah: number) =>
  `https://everyayah.com/data/${reciter}/${pad(surah, 3)}${pad(ayah, 3)}.mp3`;

export async function fetchSurahs(): Promise<Surah[]> {
  return (await cachedJson<{ data: Surah[] }>(`${BASE}/surah`)).data;
}

export async function fetchSurah(n: number): Promise<Ayah[]> {
  const json = await cachedJson<{ data: { ayahs: { numberInSurah: number; text: string }[] }[] }>(surahTextUrl(n));
  const [ar, en] = json.data;
  return ar.ayahs.map((a, i) => ({
    number: a.numberInSurah,
    ar: a.text.replace(/^﻿/, ''),
    en: en.ayahs[i].text,
  }));
}

export interface Tafsir {
  id: number;
  ar: string;
  en: string;
  dir: 'rtl' | 'ltr';
}

// Quran.com tafsir resource ids (free, CORS-enabled).
export const TAFSIRS: Tafsir[] = [
  { id: 16, ar: 'التفسير الميسر', en: 'Al-Muyassar (Arabic)', dir: 'rtl' },
  { id: 91, ar: 'تفسير السعدي', en: 'As-Saadi (Arabic)', dir: 'rtl' },
  { id: 14, ar: 'تفسير ابن كثير', en: 'Ibn Kathir (Arabic)', dir: 'rtl' },
  { id: 169, ar: 'ابن كثير (إنجليزي)', en: 'Ibn Kathir (English)', dir: 'ltr' },
];

const tafsirCache = new Map<string, string>();

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

// The API returns light HTML; reduce it to plain text.
function htmlToText(html: string) {
  return html
    .replace(/<\/(p|h\d|div|li)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:amp|lt|gt|quot|nbsp|#39);/g, m => ENTITIES[m] ?? m)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function fetchTafsir(tafsirId: number, surah: number, ayah: number): Promise<string> {
  const key = `${tafsirId}:${surah}:${ayah}`;
  const hit = tafsirCache.get(key);
  if (hit !== undefined) return hit;
  const json = await cachedJson<{ tafsir: { text: string } }>(`https://api.quran.com/api/v4/tafsirs/${tafsirId}/by_ayah/${surah}:${ayah}`);
  const text = htmlToText(json.tafsir.text);
  tafsirCache.set(key, text);
  return text;
}

const AR_DIACRITICS = /[ً-ٰٟۖ-ۭـ]/g;
export const isArabic = (s: string) => /[؀-ۿ]/.test(s);

/** Strip diacritics and unify letter variants so typed Arabic matches surah names. */
export const normalize = (s: string) =>
  s.normalize('NFD').replace(AR_DIACRITICS, '').replace(/[آأإٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLowerCase();

export interface SearchMatch {
  surah: number;
  ayah: number;
  text: string;
}

export interface SearchResult {
  count: number;
  matches: SearchMatch[];
}

// Full-text search over every ayah. Arabic queries hit the diacritic-free text.
export async function searchQuran(query: string): Promise<SearchResult> {
  const ar = isArabic(query);
  const q = ar ? query.replace(AR_DIACRITICS, '') : query;
  const edition = ar ? 'quran-simple-clean' : 'en.sahih';
  const r = await fetch(`${BASE}/search/${encodeURIComponent(q)}/all/${edition}`);
  if (r.status === 404) return { count: 0, matches: [] }; // API answers 404 when nothing matches
  if (!r.ok) throw new Error('Search failed');
  const { count, matches } = (await r.json()).data;
  return {
    count,
    matches: matches.map((m: { surah: { number: number }; numberInSurah: number; text: string }) => ({
      surah: m.surah.number,
      ayah: m.numberInSurah,
      text: m.text.replace(/^﻿/, ''),
    })),
  };
}
