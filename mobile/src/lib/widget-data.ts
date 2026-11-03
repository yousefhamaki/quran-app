import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadJSON } from './storage';
import { AYAH_COUNTS, currentStreak, dateString, khatmahStats, lastWeek, type Khatmah, type Ref } from './habit';
import { evening, morning } from './hisn';
import { HIJRI_MONTHS_AR, HIJRI_MONTHS_EN, OCCASIONS, fromHijri, hijriOf, setHijriTable, type HijriTable } from './hijri';
import { ADHAN_PRAYERS, NO_TUNE, countryMethod, formatTime, nextPrayer, normalizeTune, prayerWindow, timesFor, type Location, type MadhabId, type MethodId, type PrayerName, type Tune } from './prayer';

/**
 * Everything the home-screen widgets draw, worked out in one place for both platforms. The widgets themselves only
 * paint this snapshot (the iOS widget runs in an isolated runtime and cannot import anything), so all dates travel as
 * epoch milliseconds and all text is already in the user's language.
 */
export interface WidgetData {
  lang: 'ar' | 'en';
  /** False until the user has a location (prayer times need one). */
  ready: boolean;
  /** The moment this snapshot describes. */
  nowMs: number;
  next: { key: PrayerName; label: string; time: string; at: number; prevAt: number; elapsed: number } | null;
  /** The five prayers and sunrise of the day being shown (tomorrow once Isha has passed). */
  rows: { key: PrayerName; label: string; time: string; next: boolean }[];
  /** The four prayers around the ring, in day order, without the next one. */
  corners: { label: string; time: string }[];
  hijri: string;
  gregorian: string;
  events: { name: string; hijri: string; gregorian: string; inDays: number }[];
  text: { leftUntil: string; ayahOfDay: string; upcoming: string; setup: string; today: string; tomorrow: string; days: string; streak: string; readToday: string; notYet: string; khatmah: string; todayPortion: string; doneToday: string; noKhatmah: string; finished: string; day: string; continueReading: string; startReading: string; ayah: string; openAdhkar: string; adhkarCount: string };
  study: WidgetStudy;
}

export interface WidgetStudy {
  streak: number;
  readToday: boolean;
  /** The last seven days, oldest first. */
  week: { read: boolean; label: string }[];
  khatmah: null | { percent: number; day: number; days: number; finished: boolean; todayLeft: number; portion: string };
  resume: null | { surah: number; ayah: number; name: string; url: string; percent: number };
  adhkar: { kind: 'morning' | 'evening'; title: string; count: number; url: string };
}

export interface WidgetInputs {
  loc: Location | null;
  method: MethodId;
  madhab: MadhabId;
  tune: Tune;
  hijriAdjust: number;
  lang: 'ar' | 'en';
  days: string[];
  khatmah: Khatmah | null;
  lastRead: Ref | null;
}

const SURAH_AR = ["الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس", "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه", "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم", "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر", "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق", "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة", "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج", "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس", "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد", "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات", "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر", "المسد", "الإخلاص", "الفلق", "الناس"];
const SURAH_EN = ["Al-Fatihah", "Al-Baqarah", "Ali 'Imran", "An-Nisa", "Al-Ma'idah", "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Tawbah", "Yunus", "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr", "An-Nahl", "Al-Isra", "Al-Kahf", "Maryam", "Ta-Ha", "Al-Anbiya", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan", "Ash-Shu'ara", "An-Naml", "Al-Qasas", "Al-'Ankabut", "Ar-Rum", "Luqman", "As-Sajdah", "Al-Ahzab", "Saba", "Fatir", "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir", "Fussilat", "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah", "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf", "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqi'ah", "Al-Hadid", "Al-Mujadila", "Al-Hashr", "Al-Mumtahanah", "As-Saff", "Al-Jumu'ah", "Al-Munafiqun", "At-Taghabun", "At-Talaq", "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij", "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyamah", "Al-Insan", "Al-Mursalat", "An-Naba", "An-Nazi'at", "'Abasa", "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj", "At-Tariq", "Al-A'la", "Al-Ghashiyah", "Al-Fajr", "Al-Balad", "Ash-Shams", "Al-Layl", "Ad-Duha", "Ash-Sharh", "At-Tin", "Al-'Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-'Adiyat", "Al-Qari'ah", "At-Takathur", "Al-'Asr", "Al-Humazah", "Al-Fil", "Quraysh", "Al-Ma'un", "Al-Kawthar", "Al-Kafirun", "An-Nasr", "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas"];

const LABELS = {
  ar: { fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' },
  en: { fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' },
};
const SHORT_EN: Record<string, string> = { fajr: 'FJR', dhuhr: 'DHR', asr: 'ASR', maghrib: 'MGB', isha: 'ISH' };
const TEXT = {
  ar: { leftUntil: 'متبقٍ على', ayahOfDay: 'آية اليوم', upcoming: 'مناسبات قادمة', setup: 'افتح التطبيق لتحديد موقعك', today: 'اليوم', tomorrow: 'غداً', days: 'يوم', streak: 'يوم متتالٍ', readToday: 'قرأت اليوم ✓', notYet: 'لم تقرأ اليوم بعد', khatmah: 'الختمة', todayPortion: 'ورد اليوم', doneToday: 'أتممت ورد اليوم ✓', noKhatmah: 'ابدأ ختمة جديدة', finished: 'أتممت الختمة', day: 'اليوم', continueReading: 'أكمل القراءة', startReading: 'ابدأ القراءة', ayah: 'آية', openAdhkar: 'افتح الأذكار', adhkarCount: 'ذكر' },
  en: { leftUntil: 'left until', ayahOfDay: 'Ayah of the day', upcoming: 'Upcoming occasions', setup: 'Open the app to set your location', today: 'Today', tomorrow: 'Tomorrow', days: 'd', streak: 'day streak', readToday: 'Read today ✓', notYet: 'Not read yet today', khatmah: 'Khatmah', todayPortion: "Today's portion", doneToday: "Today's portion done ✓", noKhatmah: 'Start a khatmah', finished: 'Khatmah complete', day: 'Day', continueReading: 'Continue reading', startReading: 'Start reading', ayah: 'Ayah', openAdhkar: 'Open adhkar', adhkarCount: 'adhkar' },
};

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function hijriText(date: Date, adjust: number, lang: 'ar' | 'en'): string {
  const h = hijriOf(date, adjust);
  return `${h.day} ${(lang === 'ar' ? HIJRI_MONTHS_AR : HIJRI_MONTHS_EN)[h.month - 1]} ${h.year}`;
}

/** The next few notable Hijri days from `now` (this Hijri year and the next). */
function upcomingEvents(now: Date, adjust: number, lang: 'ar' | 'en', count: number): WidgetData['events'] {
  const today = startOfDay(now);
  const year = hijriOf(now, adjust).year;
  const found: { at: Date; name: string; month: number; day: number; hy: number }[] = [];
  for (const hy of [year, year + 1]) {
    for (const o of OCCASIONS) {
      const g = fromHijri(hy, o.month, o.day, adjust);
      const at = new Date(g.y, g.m - 1, g.d);
      if (at.getTime() >= today.getTime()) found.push({ at, name: lang === 'ar' ? o.ar : o.en, month: o.month, day: o.day, hy });
    }
  }
  found.sort((a, b) => a.at.getTime() - b.at.getTime());
  const locale = lang === 'ar' ? 'ar' : 'en-GB';
  return found.slice(0, count).map(e => ({
    name: e.name,
    hijri: `${e.day} ${(lang === 'ar' ? HIJRI_MONTHS_AR : HIJRI_MONTHS_EN)[e.month - 1]} ${e.hy}`,
    gregorian: e.at.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }),
    inDays: Math.round((e.at.getTime() - today.getTime()) / DAY),
  }));
}


const surahName = (n: number, lang: 'ar' | 'en') => (lang === 'ar' ? SURAH_AR : SURAH_EN)[n - 1] ?? '';
const TOTAL = AYAH_COUNTS.reduce((a, b) => a + b, 0);

function studyData(inputs: WidgetInputs, now: Date, afternoon: boolean): WidgetStudy {
  const { lang } = inputs;
  const today = dateString(now);
  const week = lastWeek(inputs.days, today).map(d => ({ read: d.read, label: new Date(`${d.day}T12:00:00`).toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { weekday: 'narrow' }) }));

  let khatmah: WidgetStudy['khatmah'] = null;
  let khatmahNext: Ref | null = null;
  if (inputs.khatmah) {
    const st = khatmahStats(inputs.khatmah, today);
    khatmahNext = st.next;
    let portion = '';
    if (st.portion) {
      const { from, to } = st.portion;
      portion = from.surah === to.surah ? `${surahName(from.surah, lang)} ${from.ayah}–${to.ayah}` : `${surahName(from.surah, lang)} ${from.ayah} → ${surahName(to.surah, lang)} ${to.ayah}`;
    }
    khatmah = { percent: Math.round(st.percent), day: Math.min(st.day, inputs.khatmah.days), days: inputs.khatmah.days, finished: st.finished, todayLeft: st.todayLeft, portion };
  }

  const at = inputs.lastRead ?? khatmahNext;
  const resume = at
    ? { surah: at.surah, ayah: at.ayah, name: surahName(at.surah, lang), url: `quranapp://surah/${at.surah}?ayah=${at.ayah}`, percent: Math.round(((AYAH_COUNTS.slice(0, at.surah - 1).reduce((a, b) => a + b, 0) + at.ayah) / TOTAL) * 100) }
    : null;

  const kind = afternoon ? 'evening' : 'morning';
  const set = kind === 'evening' ? evening() : morning();
  return {
    streak: currentStreak(inputs.days, today),
    readToday: inputs.days.includes(today),
    week,
    khatmah,
    resume,
    adhkar: { kind, title: lang === 'ar' ? set.ar : set.en, count: set.items.length, url: `quranapp://adhkar?c=${set.id}` },
  };
}

export function buildWidgetData(inputs: WidgetInputs, now: Date, eventCount = 7): WidgetData {
  const { lang } = inputs;
  const locale = lang === 'ar' ? 'ar' : 'en-US';
  const base = {
    lang,
    nowMs: now.getTime(),
    hijri: hijriText(now, inputs.hijriAdjust, lang),
    gregorian: now.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    events: upcomingEvents(now, inputs.hijriAdjust, lang, eventCount),
    text: TEXT[lang],
  };
  if (!inputs.loc) return { ...base, study: studyData(inputs, now, now.getHours() >= 15), ready: false, next: null, rows: [], corners: [] };

  const { loc, method, madhab, tune } = inputs;
  const win = prayerWindow(loc, now, method, madhab);
  const next = nextPrayer(loc, now, method, madhab);
  // Once the last prayer is over the list shows tomorrow's times, which start with the next Fajr.
  const shown = timesFor(loc, startOfDay(next.at).getTime() > startOfDay(now).getTime() ? next.at : now, method, madhab, tune);
  const labels = LABELS[lang];
  const rows = (['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as PrayerName[]).map(key => ({
    key,
    label: labels[key],
    time: formatTime(shown[key], locale),
    next: key === next.name,
  }));
  const corners = ADHAN_PRAYERS.filter(p => p !== next.name).map(p => ({ label: lang === 'ar' ? labels[p] : SHORT_EN[p], time: formatTime(shown[p], locale) }));
  const asr = timesFor(loc, now, method, madhab, tune).asr;
  return {
    ...base,
    study: studyData(inputs, now, now.getTime() >= asr.getTime()),
    ready: true,
    next: { key: next.name, label: labels[next.name], time: formatTime(next.at, locale), at: next.at.getTime(), prevAt: win.prev.at.getTime(), elapsed: win.elapsed },
    rows,
    corners,
  };
}

// ---------- reading what the app saved ----------

interface SavedHabit { khatmah?: Khatmah | null; days?: string[] }
interface SavedPrayer { loc?: Location | null; method?: MethodId; madhab?: MadhabId; hijriAdjust?: number; methodAuto?: boolean; country?: string | null; tune?: Partial<Tune> }
interface SavedSettings { lang?: 'ar' | 'en' }

function toInputs(prayer: SavedPrayer | null, settings: SavedSettings | null, habit: SavedHabit | null, lastRead: Ref | null): WidgetInputs {
  const p = prayer ?? {};
  const method = p.methodAuto === false ? p.method ?? 'MuslimWorldLeague' : countryMethod(p.country);
  return {
    loc: p.loc ?? null,
    method,
    madhab: p.madhab ?? 'shafi',
    tune: normalizeTune(p.tune ?? NO_TUNE),
    hijriAdjust: p.hijriAdjust ?? 0,
    lang: settings?.lang === 'en' ? 'en' : 'ar',
    days: habit?.days ?? [],
    khatmah: habit?.khatmah ?? null,
    lastRead,
  };
}

/** From the in-memory store (the app is running). */
export function inputsFromApp(): WidgetInputs {
  return toInputs(loadJSON<SavedPrayer | null>('quran.prayer', null), loadJSON<SavedSettings | null>('quran.settings', null), loadJSON<SavedHabit | null>('quran.habit', null), loadJSON<Ref | null>('quran.lastRead', null));
}

/** Straight from AsyncStorage, for the Android widget which runs without the app (and its in-memory store). */
export async function inputsFromStorage(): Promise<WidgetInputs> {
  const read = async <T,>(key: string): Promise<T | null> => {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  };
  const [prayer, settings, hijri, habit, lastRead] = await Promise.all([read<SavedPrayer>('quran.prayer'), read<SavedSettings>('quran.settings'), read<{ days?: HijriTable }>('quran.hijriTable'), read<SavedHabit>('quran.habit'), read<Ref>('quran.lastRead')]);
  if (hijri?.days) setHijriTable(hijri.days);
  return toInputs(prayer, settings, habit, lastRead);
}
