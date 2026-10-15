import { loadJSON, saveJSON } from '@/lib/storage';
import { cachedFetch } from '@/lib/offline';
import { SURAH_RECITERS, isSurahReciterId, surahAudioUrl } from '@/lib/surah-reciters';
import { parseTajweed, type Word } from '@/lib/tajweed';
import { QURAN_COM_RECITATION, normalizeSegments, type WordSegment } from '@/lib/wordtiming';

const BASE = 'https://api.alquran.cloud/v1';

export interface Translation {
  /** AlQuran Cloud edition id. */
  id: string;
  name: string;
  /** The language written in its own script. */
  native: string;
  dir: 'ltr' | 'rtl';
}

export const TRANSLATIONS: Translation[] = [
  { id: 'en.sahih', name: 'English (Sahih International)', native: 'English', dir: 'ltr' },
  { id: 'ur.jalandhry', name: 'Urdu (Jalandhry)', native: 'اردو', dir: 'rtl' },
  { id: 'fr.hamidullah', name: 'French (Hamidullah)', native: 'Français', dir: 'ltr' },
  { id: 'id.indonesian', name: 'Indonesian (Ministry of Religion)', native: 'Bahasa Indonesia', dir: 'ltr' },
  { id: 'tr.diyanet', name: 'Turkish (Diyanet)', native: 'Türkçe', dir: 'ltr' },
];

let translationEdition = 'en.sahih';
/** The translation fetched with every surah. Set by the settings; the fetch layer reads it. */
export const setTranslationEdition = (id: string) => { if (TRANSLATIONS.some(x => x.id === id)) translationEdition = id; };
export const getTranslationEdition = () => translationEdition;
export const translationDir = (id: string): 'ltr' | 'rtl' => TRANSLATIONS.find(x => x.id === id)?.dir ?? 'ltr';

export const surahTextUrl = (n: number) => `${BASE}/surah/${n}/editions/quran-uthmani,${translationEdition}`;

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
  /** 'surah' = one file per whole surah (played back to back); otherwise one file per ayah. */
  kind?: 'surah';
}

// EveryAyah folder names; free per-ayah MP3 recitations.
const AYAH_RECITERS: Reciter[] = [
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
  { id: 'Hani_Rifai_192kbps', ar: 'هاني الرفاعي', en: 'Hani Ar-Rifai' },
  { id: 'Abdullah_Basfar_192kbps', ar: 'عبد الله بصفر', en: 'Abdullah Basfar' },
  { id: 'Salah_Al_Budair_128kbps', ar: 'صلاح البدير', en: 'Salah Al-Budair' },
  { id: 'Yasser_Ad-Dussary_128kbps', ar: 'ياسر الدوسري', en: 'Yasser Ad-Dosari' },
  { id: 'Nasser_Alqatami_128kbps', ar: 'ناصر القطامي', en: 'Nasser Al-Qatami' },
  { id: 'Muhammad_Jibreel_128kbps', ar: 'محمد جبريل', en: 'Muhammad Jibreel' },
  { id: 'Khaalid_Abdullaah_al-Qahtaanee_192kbps', ar: 'خالد القحطاني', en: 'Khalid Al-Qahtani' },
  { id: 'Salaah_AbdulRahman_Bukhatir_128kbps', ar: 'صلاح بخاطر', en: 'Salah Bukhatir' },
  { id: 'Muhsin_Al_Qasim_192kbps', ar: 'محسن القاسم', en: 'Muhsin Al-Qasim' },
  { id: 'Ghamadi_40kbps', ar: 'سعد الغامدي', en: 'Saad Al-Ghamdi' },
  { id: 'Ali_Jaber_64kbps', ar: 'علي جابر', en: 'Ali Jaber' },
  { id: 'Fares_Abbad_64kbps', ar: 'فارس عباد', en: 'Fares Abbad' },
  { id: 'Ayman_Sowaid_64kbps', ar: 'أيمن سويد', en: 'Ayman Sowaid' },
  { id: 'Abdul_Basit_Mujawwad_128kbps', ar: 'عبد الباسط عبد الصمد (مجوّد)', en: 'Abdul Basit (Mujawwad)' },
  { id: 'Minshawy_Mujawwad_192kbps', ar: 'محمد صديق المنشاوي (مجوّد)', en: 'Al-Minshawi (Mujawwad)' },
  { id: 'Husary_128kbps_Mujawwad', ar: 'محمود خليل الحصري (مجوّد)', en: 'Mahmoud Al-Husary (Mujawwad)' },
  { id: 'Husary_Muallim_128kbps', ar: 'محمود خليل الحصري (المعلّم)', en: 'Mahmoud Al-Husary (Muallim)' },
];

/** Lower-bitrate copies of popular reciters: about half the data, for slow connections and small phones. */
const LITE_RECITERS: Reciter[] = [
  { id: 'Alafasy_64kbps', ar: 'مشاري العفاسي · 64 كيلوبت', en: 'Mishary Alafasy · 64 kbps' },
  { id: 'Husary_64kbps', ar: 'محمود خليل الحصري · 64 كيلوبت', en: 'Mahmoud Al-Husary · 64 kbps' },
  { id: 'Hudhaify_64kbps', ar: 'علي الحذيفي · 64 كيلوبت', en: 'Ali Al-Hudhaify · 64 kbps' },
  { id: 'Abdul_Basit_Murattal_64kbps', ar: 'عبد الباسط عبد الصمد · 64 كيلوبت', en: 'Abdul Basit (Murattal) · 64 kbps' },
  { id: 'Abdurrahmaan_As-Sudais_64kbps', ar: 'عبد الرحمن السديس · 64 كيلوبت', en: 'Abdurrahman As-Sudais · 64 kbps' },
  { id: 'Saood_ash-Shuraym_64kbps', ar: 'سعود الشريم · 64 كيلوبت', en: 'Saud Ash-Shuraim · 64 kbps' },
  { id: 'Maher_AlMuaiqly_64kbps', ar: 'ماهر المعيقلي · 64 كيلوبت', en: 'Maher Al-Muaiqly · 64 kbps' },
  { id: 'Abu_Bakr_Ash-Shaatree_64kbps', ar: 'أبو بكر الشاطري · 64 كيلوبت', en: 'Abu Bakr Ash-Shatri · 64 kbps' },
  { id: 'Muhammad_Ayyoub_64kbps', ar: 'محمد أيوب · 64 كيلوبت', en: 'Muhammad Ayyub · 64 kbps' },
];

/** Whole-surah recitations (one file per surah), shown after the ayah-by-ayah ones. */
const SURAH_KIND_RECITERS: Reciter[] = SURAH_RECITERS.map(r => ({
  id: `surah:${r.key}`,
  ar: `${r.ar} · سورة كاملة`,
  en: `${r.en} · full surah`,
  kind: 'surah',
}));

export const RECITERS: Reciter[] = [...AYAH_RECITERS, ...LITE_RECITERS, ...SURAH_KIND_RECITERS];

export const isSurahReciter = isSurahReciterId;

/** Reciter used for ayah-level features (repeat, range loop, memorize) when the chosen one plays whole surahs. */
export const AYAH_FALLBACK_RECITER = 'Alafasy_128kbps';

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

export const audioUrl = (reciter: string, surah: number, ayah: number): string =>
  surahAudioUrl(reciter, surah) ?? `https://everyayah.com/data/${reciter}/${pad(surah, 3)}${pad(ayah, 3)}.mp3`;

export async function fetchSurahs(): Promise<Surah[]> {
  const r = await cachedFetch(`${BASE}/surah`);
  return (await r.json()).data;
}

export async function fetchSurah(n: number): Promise<Ayah[]> {
  const r = await cachedFetch(surahTextUrl(n));
  const [ar, en] = (await r.json()).data;
  return ar.ayahs.map((a: { numberInSurah: number; text: string }, i: number) => ({
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

// The API returns light HTML; reduce it to plain text so it is safe to render.
function htmlToText(html: string) {
  const withBreaks = html.replace(/<\/(p|h\d|div|li)>|<br\s*\/?>/gi, '\n');
  const text = new DOMParser().parseFromString(withBreaks, 'text/html').body.textContent || '';
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

export async function fetchTafsir(tafsirId: number, surah: number, ayah: number): Promise<string> {
  const key = `${tafsirId}:${surah}:${ayah}`;
  const hit = tafsirCache.get(key);
  if (hit !== undefined) return hit;
  if (isTafsirOffline(tafsirId, surah)) {
    const text = fromChapter(await loadChapterTafsir(tafsirId, surah), ayah);
    if (text !== undefined) { tafsirCache.set(key, text); return text; }
  }
  const r = await cachedFetch(`https://api.quran.com/api/v4/tafsirs/${tafsirId}/by_ayah/${surah}:${ayah}`);
  const text = htmlToText((await r.json()).tafsir.text);
  tafsirCache.set(key, text);
  return text;
}

// ---------- offline tafsir: a whole surah's explanations in one request ----------

const chapterTafsir = new Map<string, Map<number, string>>();
const OFFLINE_KEY = 'quran.tafsirOffline';

/** Tafsir downloads the user asked for, as "tafsirId:surah". */
const offlineList = (): string[] => loadJSON<string[]>(OFFLINE_KEY, []);
export const isTafsirOffline = (tafsirId: number, surah: number) => offlineList().includes(`${tafsirId}:${surah}`);

/** The explanation of ayah `n` from a surah's chapter map; ayahs the source explains together share the nearest earlier entry. */
function fromChapter(map: Map<number, string>, n: number): string | undefined {
  for (let a = n; a >= 1; a--) { const hit = map.get(a); if (hit !== undefined) return hit; }
  return undefined;
}

async function loadChapterTafsir(tafsirId: number, surah: number): Promise<Map<number, string>> {
  const key = `${tafsirId}:${surah}`;
  const hit = chapterTafsir.get(key);
  if (hit) return hit;
  const res = await cachedFetch(`https://api.quran.com/api/v4/tafsirs/${tafsirId}/by_chapter/${surah}?per_page=300`);
  const json = (await res.json()) as { tafsirs: { verse_key: string; text: string }[] };
  const map = new Map<number, string>();
  for (const x of json.tafsirs) map.set(Number(x.verse_key.split(':')[1]), htmlToText(x.text));
  chapterTafsir.set(key, map);
  return map;
}

/** Saves one surah's tafsir for offline reading (the response is kept by the same cache as the surah text). */
export async function downloadTafsir(tafsirId: number, surah: number): Promise<void> {
  await loadChapterTafsir(tafsirId, surah);
  const list = offlineList();
  if (!list.includes(`${tafsirId}:${surah}`)) saveJSON(OFFLINE_KEY, [...list, `${tafsirId}:${surah}`]);
}

// ---------- word meanings (Quran.com word-by-word) ----------

export interface WordMeaning {
  text: string;
  translation: string;
  transliteration: string;
  /** URL of the recording of this single word, when Quran.com has one. */
  audio: string | null;
}

const meaningMemory = new Map<number, WordMeaning[][]>();

/** Meaning and transliteration of every word of a surah. Index 0 = ayah 1, then word by word. */
export async function fetchWordMeanings(surah: number): Promise<WordMeaning[][]> {
  const hit = meaningMemory.get(surah);
  if (hit) return hit;
  const url = `https://api.quran.com/api/v4/verses/by_chapter/${surah}?words=true&word_fields=text_uthmani&per_page=300&language=en`;
  const res = await cachedFetch(url);
  const json = (await res.json()) as { verses: { verse_number: number; words: { char_type_name: string; text: string; text_uthmani?: string; translation?: { text: string }; transliteration?: { text: string }; audio_url?: string | null }[] }[] };
  const out: WordMeaning[][] = [];
  for (const v of json.verses) {
    out[v.verse_number - 1] = v.words
      .filter(w => w.char_type_name === 'word')
      .map(w => ({
        text: w.text_uthmani ?? w.text,
        translation: w.translation?.text ?? '',
        transliteration: w.transliteration?.text ?? '',
        audio: w.audio_url ? `https://audio.qurancdn.com/${w.audio_url}` : null,
      }));
  }
  meaningMemory.set(surah, out);
  return out;
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

/**
 * Every ayah of a surah split into words, with tajweed rules attached to the letters.
 * Index 0 = ayah 1. Cached on the device after the first load.
 */
export async function fetchSurahWords(surah: number): Promise<Word[][]> {
  const hit = wordsMemory.get(surah);
  if (hit) return hit;
  const res = await cachedFetch(`https://api.quran.com/api/v4/quran/verses/uthmani_tajweed?chapter_number=${surah}`);
  const { verses } = (await res.json()) as { verses: { verse_key: string; text_uthmani_tajweed: string }[] };
  const words: Word[][] = [];
  for (const v of verses) words[Number(v.verse_key.split(':')[1]) - 1] = parseTajweed(v.text_uthmani_tajweed);
  wordsMemory.set(surah, words);
  return words;
}

const segmentsMemory = new Map<string, Map<number, WordSegment[]>>();

/**
 * Exact word timestamps (ms) for each ayah of a surah, or null if Quran.com has none for this reciter
 * (the caller then estimates from word length).
 */
export async function fetchWordSegments(reciter: string, surah: number): Promise<Map<number, WordSegment[]> | null> {
  const id = QURAN_COM_RECITATION[reciter];
  if (!id) return null;
  const key = `${id}:${surah}`;
  const hit = segmentsMemory.get(key);
  if (hit) return hit;
  const res = await cachedFetch(`https://api.quran.com/api/v4/recitations/${id}/by_chapter/${surah}?fields=segments&per_page=300`);
  const { audio_files } = (await res.json()) as { audio_files: { verse_key: string; segments: unknown }[] };
  const map = new Map<number, WordSegment[]>();
  for (const f of audio_files) map.set(Number(f.verse_key.split(':')[1]), normalizeSegments(f.segments));
  segmentsMemory.set(key, map);
  return map;
}

/** Average size of one ayah's MP3 at 128 kbps (measured over the whole Quran: about 1.6 GB for 6,236 ayahs). */
const AYAH_BYTES_128 = 267 * 1024;

/** Rough size of downloading `ayahs` ayahs (of a whole-surah reciter: the same share of its measured total). */
export function estimateReciterBytes(reciterId: string, ayahs: number): number {
  const surahReciter = SURAH_RECITERS.find(r => `surah:${r.key}` === reciterId);
  if (surahReciter) return Math.round((surahReciter.mb * 1048576 * ayahs) / 6236);
  const kbps = Number(/(\d+)kbps/i.exec(reciterId)?.[1] ?? 128);
  return Math.round(ayahs * AYAH_BYTES_128 * (kbps / 128));
}
