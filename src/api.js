const BASE = 'https://api.alquran.cloud/v1';

// EveryAyah folder names; free per-ayah MP3 recitations.
export const RECITERS = [
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

const pad = (n, l) => String(n).padStart(l, '0');
export const audioUrl = (reciter, surah, ayah) =>
  `https://everyayah.com/data/${reciter}/${pad(surah, 3)}${pad(ayah, 3)}.mp3`;

export async function fetchSurahs() {
  const r = await fetch(`${BASE}/surah`);
  if (!r.ok) throw new Error('Failed to load surahs');
  return (await r.json()).data;
}

export async function fetchSurah(n) {
  const r = await fetch(`${BASE}/surah/${n}/editions/quran-uthmani,en.sahih`);
  if (!r.ok) throw new Error('Failed to load surah');
  const [ar, en] = (await r.json()).data;
  return ar.ayahs.map((a, i) => ({
    number: a.numberInSurah,
    ar: a.text.replace(/^﻿/, ''),
    en: en.ayahs[i].text,
  }));
}

// Quran.com tafsir resource ids (free, CORS-enabled).
export const TAFSIRS = [
  { id: 16, ar: 'التفسير الميسر', en: 'Al-Muyassar (Arabic)', dir: 'rtl' },
  { id: 91, ar: 'تفسير السعدي', en: 'As-Saadi (Arabic)', dir: 'rtl' },
  { id: 14, ar: 'تفسير ابن كثير', en: 'Ibn Kathir (Arabic)', dir: 'rtl' },
  { id: 169, ar: 'ابن كثير (إنجليزي)', en: 'Ibn Kathir (English)', dir: 'ltr' },
];

const tafsirCache = new Map();

// The API returns light HTML; reduce it to plain text so it is safe to render.
function htmlToText(html) {
  const withBreaks = html.replace(/<\/(p|h\d|div|li)>|<br\s*\/?>/gi, '\n');
  const text = new DOMParser().parseFromString(withBreaks, 'text/html').body.textContent || '';
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

export async function fetchTafsir(tafsirId, surah, ayah) {
  const key = `${tafsirId}:${surah}:${ayah}`;
  if (tafsirCache.has(key)) return tafsirCache.get(key);
  const r = await fetch(`https://api.quran.com/api/v4/tafsirs/${tafsirId}/by_ayah/${surah}:${ayah}`);
  if (!r.ok) throw new Error('Failed to load tafsir');
  const text = htmlToText((await r.json()).tafsir.text);
  tafsirCache.set(key, text);
  return text;
}
