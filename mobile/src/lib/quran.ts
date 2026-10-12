import { cachedJson } from '@/lib/offline';
import { parseTajweed, type Word } from '@/lib/tajweed';
import { QURAN_COM_RECITATION, normalizeSegments, type WordSegment } from '@/lib/wordtiming';

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
  { id: 'Mohammad_al_Tablaway_128kbps', ar: 'محمد محمود الطبلاوي', en: 'Mohamed Al-Tablawi' },
  { id: 'Abdurrahmaan_As-Sudais_192kbps', ar: 'عبد الرحمن السديس', en: 'Abdurrahman As-Sudais' },
  { id: 'Saood_ash-Shuraym_128kbps', ar: 'سعود الشريم', en: 'Saud Ash-Shuraim' },
  { id: 'MaherAlMuaiqly128kbps', ar: 'ماهر المعيقلي', en: 'Maher Al-Muaiqly' },
  { id: 'Abu_Bakr_Ash-Shaatree_128kbps', ar: 'أبو بكر الشاطري', en: 'Abu Bakr Ash-Shatri' },
  { id: 'Hudhaify_128kbps', ar: 'علي الحذيفي', en: 'Ali Al-Hudhaify' },
  { id: 'Muhammad_Ayyoub_128kbps', ar: 'محمد أيوب', en: 'Muhammad Ayyub' },
];

// Folder names that were wrong in earlier versions, mapped to the correct EveryAyah folder.
const LEGACY_RECITER_IDS: Record<string, string> = {
  Maher_AlMuaiqly_128kbps: 'MaherAlMuaiqly128kbps',
};

/** Maps a reciter id saved by an earlier version to the current one (other ids are returned unchanged). */
export const migrateReciterId = (id: string): string => LEGACY_RECITER_IDS[id] ?? id;

/** Returns a valid reciter id: migrates old names, and falls back to the default reciter for unknown ids. */
export function normalizeReciterId(id: string | undefined | null): string {
  const mapped = id ? migrateReciterId(id) : '';
  return RECITERS.some(r => r.id === mapped) ? mapped : RECITERS[0].id;
}

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

// ---------- words: tajweed colours and word-by-word timing (Quran.com) ----------

const wordsMemory = new Map<number, Word[][]>();

/** Every ayah of a surah split into words, with tajweed rules attached to the letters (index 0 = ayah 1). */
export async function fetchSurahWords(surah: number): Promise<Word[][]> {
  const hit = wordsMemory.get(surah);
  if (hit) return hit;
  const { verses } = await cachedJson<{ verses: { verse_key: string; text_uthmani_tajweed: string }[] }>(
    `https://api.quran.com/api/v4/quran/verses/uthmani_tajweed?chapter_number=${surah}`,
  );
  const words: Word[][] = [];
  for (const v of verses) words[Number(v.verse_key.split(':')[1]) - 1] = parseTajweed(v.text_uthmani_tajweed);
  wordsMemory.set(surah, words);
  return words;
}

const segmentsMemory = new Map<string, Map<number, WordSegment[]>>();

/** Exact word timestamps (ms) per ayah, or null when Quran.com has none for this reciter (the caller estimates). */
export async function fetchWordSegments(reciter: string, surah: number): Promise<Map<number, WordSegment[]> | null> {
  const id = QURAN_COM_RECITATION[reciter];
  if (!id) return null;
  const key = `${id}:${surah}`;
  const hit = segmentsMemory.get(key);
  if (hit) return hit;
  const { audio_files } = await cachedJson<{ audio_files: { verse_key: string; segments: unknown }[] }>(
    `https://api.quran.com/api/v4/recitations/${id}/by_chapter/${surah}?fields=segments&per_page=300`,
  );
  const map = new Map<number, WordSegment[]>();
  for (const f of audio_files) map.set(Number(f.verse_key.split(':')[1]), normalizeSegments(f.segments));
  segmentsMemory.set(key, map);
  return map;
}
