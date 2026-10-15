/**
 * Whole-surah recitations: one MP3 per surah (instead of one per ayah), played back to back for a continuous flow.
 * Files come from the free mp3quran.net CDN; every one of the 114 files per reciter was checked with
 * `node scripts/check-surah-reciters.mjs` (which also measured `mb`, the size of the whole Quran in megabytes).
 * (No imports on purpose, so this file can be unit-tested with plain Node.)
 */

export interface SurahReciter {
  /** Short key; the reciter id used by the app is `surah:<key>`. */
  key: string;
  ar: string;
  en: string;
  /** Folder URL; the file is `<base><surah>.mp3`. */
  base: string;
  /** File names are zero padded to three digits ("001.mp3"). */
  pad: boolean;
  /** Size of all 114 surahs in megabytes (measured). */
  mb: number;
}

export const SURAH_PREFIX = 'surah:';

export const SURAH_RECITERS: SurahReciter[] = [
  { key: 'maher-muaiqly', ar: 'ماهر المعيقلي', en: 'Maher Al-Muaiqly', base: 'https://cdn.mp3quran.net/audio/maher-muaiqly/r1/', pad: true, mb: 676 },
  { key: 'saad-ghamdi', ar: 'سعد الغامدي', en: 'Saad Al-Ghamdi', base: 'https://cdn.mp3quran.net/audio/saad-ghamdi/r1/', pad: true, mb: 1022 },
  { key: 'abdulrahman-sudais', ar: 'عبد الرحمن السديس', en: 'Abdulrahman As-Sudais', base: 'https://cdn.mp3quran.net/audio/abdulrahman-sudais/r1/', pad: true, mb: 1166 },
  { key: 'saud-shuraim', ar: 'سعود الشريم', en: 'Saud Ash-Shuraim', base: 'https://cdn.mp3quran.net/audio/saud-shuraim/r1/', pad: true, mb: 1004 },
  { key: 'alafasy', ar: 'مشاري العفاسي', en: 'Mishary Alafasy', base: 'https://cdn.mp3quran.net/audio/mishary-alafasy/r1/', pad: true, mb: 1638 },
  { key: 'husary', ar: 'محمود خليل الحصري', en: 'Mahmoud Al-Husary', base: 'https://cdn.mp3quran.net/audio/mahmoud-husary/r1/', pad: true, mb: 2356 },
  { key: 'husary-mujawwad', ar: 'محمود خليل الحصري (مجوّد)', en: 'Mahmoud Al-Husary (Mujawwad)', base: 'https://cdn.mp3quran.net/audio/mahmoud-husary/r2/', pad: true, mb: 2564 },
  { key: 'abdulbasit-murattal', ar: 'عبد الباسط عبد الصمد (مرتّل)', en: 'Abdul Basit (Murattal)', base: 'https://cdn.mp3quran.net/audio/abdulbasit-abdulsamad/r3/', pad: true, mb: 428 },
  { key: 'abdulbasit-mujawwad', ar: 'عبد الباسط عبد الصمد (مجوّد)', en: 'Abdul Basit (Mujawwad)', base: 'https://cdn.mp3quran.net/audio/abdulbasit-abdulsamad/r1/', pad: true, mb: 3331 },
  { key: 'minshawi', ar: 'محمد صديق المنشاوي', en: 'Al-Minshawi', base: 'https://cdn.mp3quran.net/audio/muhammad-minshawi/r1/', pad: true, mb: 1593 },
  { key: 'minshawi-mujawwad', ar: 'محمد صديق المنشاوي (مجوّد)', en: 'Al-Minshawi (Mujawwad)', base: 'https://cdn.mp3quran.net/audio/muhammad-minshawi/r2/', pad: true, mb: 4583 },
  { key: 'ali-hudhaifi', ar: 'علي الحذيفي', en: 'Ali Al-Hudhaifi', base: 'https://cdn.mp3quran.net/audio/ali-hudhaifi/r1/', pad: true, mb: 824 },
  { key: 'salah-budair', ar: 'صلاح البدير', en: 'Salah Al-Budair', base: 'https://cdn.mp3quran.net/audio/salah-budair/r1/', pad: true, mb: 2969 },
  { key: 'hani-rifai', ar: 'هاني الرفاعي', en: 'Hani Ar-Rifai', base: 'https://cdn.mp3quran.net/audio/hani-rifai/r1/', pad: true, mb: 1413 },
  { key: 'yasser-dosari', ar: 'ياسر الدوسري', en: 'Yasser Ad-Dosari', base: 'https://cdn.mp3quran.net/audio/yasser-dosari/r1/', pad: true, mb: 1373 },
  { key: 'nasser-qatami', ar: 'ناصر القطامي', en: 'Nasser Al-Qatami', base: 'https://cdn.mp3quran.net/audio/nasser-qatami/r1/', pad: true, mb: 1126 },
  { key: 'ahmad-ajmi', ar: 'أحمد العجمي', en: 'Ahmad Al-Ajmi', base: 'https://cdn.mp3quran.net/audio/ahmad-ajmi/r1/', pad: true, mb: 1761 },
  { key: 'abubakr-shatri', ar: 'أبو بكر الشاطري', en: 'Abu Bakr Ash-Shatri', base: 'https://cdn.mp3quran.net/audio/abubakr-shatri/r1/', pad: true, mb: 1432 },
  { key: 'khalid-qahtani', ar: 'خالد القحطاني', en: 'Khalid Al-Qahtani', base: 'https://cdn.mp3quran.net/audio/khalid-qahtani/r1/', pad: true, mb: 1516 },
  { key: 'muhammad-tablawi', ar: 'محمد الطبلاوي', en: 'Mohamed Al-Tablawi', base: 'https://cdn.mp3quran.net/audio/muhammad-tablawi/r1/', pad: true, mb: 1689 },
  { key: 'muhammad-ayyub', ar: 'محمد أيوب', en: 'Muhammad Ayyub', base: 'https://cdn.mp3quran.net/audio/muhammad-ayyub/r1/', pad: true, mb: 1338 },
  { key: 'muhammad-jibreel', ar: 'محمد جبريل', en: 'Muhammad Jibreel', base: 'https://cdn.mp3quran.net/audio/muhammad-jibreel/r1/', pad: true, mb: 1351 },
  { key: 'mahmoud-banna', ar: 'محمود علي البنا', en: 'Mahmoud Ali Al-Banna', base: 'https://cdn.mp3quran.net/audio/mahmoud-banna/r1/', pad: true, mb: 1486 },
  { key: 'mustafa-ismail', ar: 'مصطفى إسماعيل', en: 'Mustafa Ismail', base: 'https://cdn.mp3quran.net/audio/mustafa-ismail/r1/', pad: true, mb: 1580 },
  { key: 'abdulaziz-zahrani', ar: 'عبد العزيز الزهراني', en: 'Abdulaziz Az-Zahrani', base: 'https://cdn.mp3quran.net/audio/abdulaziz-zahrani/r1/', pad: true, mb: 1760 },
  { key: 'salah-bukhatir', ar: 'صلاح بخاطر', en: 'Salah Bukhatir', base: 'https://cdn.mp3quran.net/audio/salah-bukhatir/r1/', pad: true, mb: 1298 },
  { key: 'ibrahim-akhdar', ar: 'إبراهيم الأخضر', en: 'Ibrahim Al-Akhdar', base: 'https://cdn.mp3quran.net/audio/ibrahim-akhdar/r1/', pad: true, mb: 692 },
  { key: 'ali-jaber', ar: 'علي جابر', en: 'Ali Jaber', base: 'https://cdn.mp3quran.net/audio/ali-jaber/r1/', pad: true, mb: 2129 },
];

export const isSurahReciterId = (id: string) => id.startsWith(SURAH_PREFIX);

export const surahReciterOf = (id: string): SurahReciter | undefined =>
  isSurahReciterId(id) ? SURAH_RECITERS.find(r => r.key === id.slice(SURAH_PREFIX.length)) : undefined;

/** URL of the whole-surah file, or null when `id` is not a whole-surah reciter. */
export function surahAudioUrl(id: string, surah: number): string | null {
  const r = surahReciterOf(id);
  if (!r) return null;
  return `${r.base}${r.pad ? String(surah).padStart(3, '0') : surah}.mp3`;
}
