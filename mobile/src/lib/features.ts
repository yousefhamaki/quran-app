/**
 * An index of the app's features and settings, for the "search features" box on the More screen.
 * Typing "download", "sleep" or "تحميل" finds the screen or sheet that holds it, so nothing has to be hunted for.
 * (No imports on purpose, so this file can be unit-tested with plain Node.)
 */

/** Where a feature lives. The screens decide how to open each kind. */
export type FeatureTarget =
  | { kind: 'page'; page: 'daily' | 'prayer' | 'plan' | 'calendar' | 'adhkar'; param?: string }
  | { kind: 'quran' }
  /** The general settings (theme, language, audio defaults, downloads). */
  | { kind: 'settings' }
  /** The Mushaf settings of the reader (view, text, reading options). */
  | { kind: 'mushafSettings' }
  /** The download queue (surahs, juz, whole Quran). */
  | { kind: 'downloads' }
  /** The player sheet (repeat, pause, speed, sleep…); the general settings when nothing is playing. */
  | { kind: 'player' }
  | { kind: 'account' }
  | { kind: 'setup' };

export interface Feature {
  id: string;
  ar: string;
  en: string;
  /** One line that says what it does. */
  hintAr: string;
  hintEn: string;
  /** Extra words people may type (both languages). */
  keywords: string;
  target: FeatureTarget;
}

export const FEATURES: Feature[] = [
  // ---- Quran and reading
  { id: 'mushaf-view', ar: 'عرض المصحف', en: 'Mushaf view', hintAr: 'اقرأ صفحة بصفحة', hintEn: 'Read page by page', keywords: 'mushaf page pages مصحف صفحة صفحات landscape أفقي', target: { kind: 'mushafSettings' } },
  { id: 'text-size', ar: 'حجم النص', en: 'Text size', hintAr: 'كبّر أو صغّر خط الآيات', hintEn: 'Make the ayahs larger or smaller', keywords: 'font size zoom خط حجم تكبير', target: { kind: 'mushafSettings' } },
  { id: 'wide-font', ar: 'خط القرآن العريض', en: 'Wide Quran font', hintAr: 'خط عريض لعرض الآيات', hintEn: 'A wide font for the ayahs', keywords: 'font wide خط عريض', target: { kind: 'mushafSettings' } },
  { id: 'translation', ar: 'إظهار الترجمة', en: 'Show translation', hintAr: 'ترجمة معاني الآيات', hintEn: 'Show the translation under each ayah', keywords: 'translation english ترجمة', target: { kind: 'mushafSettings' } },
  { id: 'tajweed', ar: 'ألوان التجويد', en: 'Tajweed colours', hintAr: 'تلوين الحروف حسب الأحكام', hintEn: 'Colour letters by tajweed rule', keywords: 'tajweed colours colors rules تجويد ألوان أحكام', target: { kind: 'mushafSettings' } },
  { id: 'word-highlight', ar: 'تمييز الكلمة أثناء التشغيل', en: 'Word highlight', hintAr: 'يتتبع الكلمة التي يقرؤها القارئ', hintEn: 'Follows the word being recited', keywords: 'word highlight follow كلمة تمييز تتبع', target: { kind: 'mushafSettings' } },
  { id: 'tafsir', ar: 'التفسير', en: 'Tafsir', hintAr: 'اختر كتاب التفسير الافتراضي', hintEn: 'Choose the default tafsir', keywords: 'tafsir tafseer explanation تفسير شرح', target: { kind: 'mushafSettings' } },
  { id: 'memorize-mode', ar: 'وضع الحفظ', en: 'Memorize mode', hintAr: 'إخفاء الآيات لتسمّعها من حفظك', hintEn: 'Hide the ayahs to recite from memory', keywords: 'memorize hide recite hifz حفظ إخفاء تسميع', target: { kind: 'mushafSettings' } },
  { id: 'continue', ar: 'تابع القراءة', en: 'Continue reading', hintAr: 'ارجع إلى آخر موضع قرأته', hintEn: 'Go back to where you stopped', keywords: 'resume last continue read آخر متابعة قراءة', target: { kind: 'quran' } },

  // ---- Audio
  { id: 'reciter', ar: 'القارئ الافتراضي', en: 'Default reciter', hintAr: 'اختر القارئ وثبّت المفضلين', hintEn: 'Choose and pin your reciters', keywords: 'reciter sheikh voice pin favourite favorite قارئ شيخ صوت تثبيت مفضل', target: { kind: 'settings' } },
  { id: 'repeat', ar: 'تكرار الآية', en: 'Repeat ayah', hintAr: 'كرّر كل آية عددًا من المرات', hintEn: 'Play each ayah several times', keywords: 'repeat loop تكرار', target: { kind: 'player' } },
  { id: 'pause-between', ar: 'مهلة بين الآيات', en: 'Pause between ayahs', hintAr: 'صمت لتكرر الآية بنفسك', hintEn: 'Silence so you can repeat it yourself', keywords: 'pause gap silence your turn مهلة صمت فاصل', target: { kind: 'player' } },
  { id: 'speed', ar: 'سرعة التشغيل', en: 'Playback speed', hintAr: 'أبطئ أو أسرع التلاوة', hintEn: 'Slower or faster recitation', keywords: 'speed tempo سرعة', target: { kind: 'player' } },
  { id: 'sleep-timer', ar: 'مؤقّت النوم', en: 'Sleep timer', hintAr: 'يوقف التشغيل بعد وقت محدد', hintEn: 'Stops playing after a set time', keywords: 'sleep timer stop night نوم مؤقت إيقاف', target: { kind: 'player' } },
  { id: 'auto-next', ar: 'الانتقال إلى السورة التالية', en: 'Auto next surah', hintAr: 'يكمل مع السورة التالية تلقائيًا', hintEn: 'Keeps going with the next surah', keywords: 'next surah continuous auto تلقائي تالية متواصل', target: { kind: 'player' } },
  { id: 'range-loop', ar: 'تكرار مقطع', en: 'Repeat a range', hintAr: 'كرّر آيات من كذا إلى كذا', hintEn: 'Loop ayahs 5 to 9 as one block', keywords: 'range loop block مقطع تكرار', target: { kind: 'quran' } },

  // ---- Downloads
  { id: 'download', ar: 'تحميل السور', en: 'Download surahs', hintAr: 'اختر سورًا أو جزءًا', hintEn: 'Pick surahs or a juz', keywords: 'download offline save juz تحميل بدون إنترنت جزء حفظ', target: { kind: 'downloads' } },
  { id: 'download-all', ar: 'تحميل القرآن كاملًا', en: 'Download the whole Quran', hintAr: 'القرآن كله دفعة واحدة', hintEn: 'The whole Quran in one go', keywords: 'whole full quran all download offline كامل كله تحميل', target: { kind: 'downloads' } },

  // ---- Daily habit
  { id: 'khatmah', ar: 'الختمة', en: 'Khatmah planner', hintAr: 'اختم القرآن في عدد أيام تختاره', hintEn: 'Finish the Quran in N days', keywords: 'khatmah khatm plan finish ختمة ختم خطة', target: { kind: 'page', page: 'daily', param: 'khatmah' } },
  { id: 'khatmah-reminder', ar: 'تذكير الختمة', en: 'Khatmah reminder', hintAr: 'إشعار يومي بورد الختمة', hintEn: 'A daily notification with the portion', keywords: 'khatmah reminder notification تذكير إشعار ختمة', target: { kind: 'page', page: 'daily', param: 'khatmah' } },
  { id: 'completed', ar: 'الختمات المكتملة', en: 'Completed khatmahs', hintAr: 'سجل ختماتك', hintEn: 'Your finished khatmahs', keywords: 'completed history finished مكتملة سجل', target: { kind: 'page', page: 'daily', param: 'completed' } },
  { id: 'streak', ar: 'المواظبة على القراءة', en: 'Reading streak', hintAr: 'أيام القراءة المتتالية', hintEn: 'Days in a row you read', keywords: 'streak days habit مواظبة أيام متتالية', target: { kind: 'page', page: 'daily', param: 'reading' } },
  { id: 'ayah-of-day', ar: 'آية اليوم', en: 'Ayah of the day', hintAr: 'آية جديدة كل يوم', hintEn: 'A new ayah every day', keywords: 'ayah day daily آية اليوم يومية', target: { kind: 'page', page: 'daily', param: 'reading' } },
  { id: 'daily-reminder', ar: 'التذكير اليومي', en: 'Daily reminder', hintAr: 'إشعار بآية اليوم', hintEn: 'A notification with the ayah of the day', keywords: 'reminder notification daily تذكير إشعار', target: { kind: 'page', page: 'daily', param: 'reading' } },
  { id: 'widget', ar: 'أداة الشاشة الرئيسية', en: 'Home-screen widget', hintAr: 'آية اليوم على الشاشة الرئيسية', hintEn: 'Ayah of the day on your home screen', keywords: 'widget home screen أداة ويدجت الشاشة الرئيسية', target: { kind: 'page', page: 'daily', param: 'reading' } },

  // ---- Memorization
  { id: 'hifz-plan', ar: 'خطة الحفظ', en: 'Memorization plan', hintAr: 'ما تحفظه وتراجعه اليوم', hintEn: 'What to learn and review today', keywords: 'hifz memorize plan review spaced حفظ خطة مراجعة', target: { kind: 'page', page: 'plan' } },

  // ---- Prayer and calendar
  { id: 'prayer-times', ar: 'مواقيت الصلاة', en: 'Prayer times', hintAr: 'العد التنازلي للصلاة القادمة', hintEn: 'Countdown to the next prayer', keywords: 'prayer times salah salat adhan countdown صلاة مواقيت أذان عد تنازلي', target: { kind: 'page', page: 'prayer', param: 'now' } },
  { id: 'times-table', ar: 'جدول المواقيت', en: 'Times table', hintAr: 'الفجر والشروق والإقامة ومنتصف الليل', hintEn: 'Fajr, sunrise, iqama, middle of the night', keywords: 'table iqama sunrise midnight last third جدول إقامة شروق منتصف الليل ثلث', target: { kind: 'page', page: 'prayer', param: 'times' } },
  { id: 'qibla', ar: 'القبلة', en: 'Qibla', hintAr: 'اتجاه الكعبة', hintEn: 'Direction of the Kaaba', keywords: 'qibla compass direction kaaba قبلة بوصلة اتجاه كعبة', target: { kind: 'page', page: 'prayer', param: 'qibla' } },
  { id: 'prayer-notifications', ar: 'إشعارات الصلاة والأذان', en: 'Prayer notifications and adhan', hintAr: 'تذكير قبل الصلاة وأذان عند دخول الوقت', hintEn: 'A reminder before and the adhan at prayer time', keywords: 'adhan azan notification reminder before أذان إشعار تذكير قبل الصلاة', target: { kind: 'page', page: 'prayer', param: 'settings' } },
  { id: 'iqama', ar: 'أوقات الإقامة', en: 'Iqama times', hintAr: 'الدقائق بين الأذان والإقامة', hintEn: 'Minutes between the adhan and the iqama', keywords: 'iqama iqamah إقامة', target: { kind: 'page', page: 'prayer', param: 'settings' } },
  { id: 'prayer-method', ar: 'طريقة حساب المواقيت والموقع', en: 'Calculation method and location', hintAr: 'اختر الطريقة والمذهب وموقعك', hintEn: 'Choose the method, madhab and your location', keywords: 'method madhab location gps hanafi طريقة مذهب موقع حنفي', target: { kind: 'page', page: 'prayer', param: 'settings' } },
  { id: 'hijri', ar: 'التقويم الهجري', en: 'Hijri calendar', hintAr: 'التاريخ الهجري والمناسبات', hintEn: 'Hijri date and occasions', keywords: 'hijri islamic calendar date ramadan هجري تقويم تاريخ رمضان', target: { kind: 'page', page: 'calendar' } },

  // ---- Remembrance
  { id: 'adhkar', ar: 'الأذكار والأدعية', en: 'Adhkar and duas', hintAr: 'الصباح والمساء وبعد الصلاة والنوم', hintEn: 'Morning, evening, after prayer, sleep', keywords: 'adhkar azkar dhikr dua supplication أذكار دعاء الصباح المساء', target: { kind: 'page', page: 'adhkar' } },
  { id: 'khatm-dua', ar: 'دعاء ختم القرآن', en: 'Dua for completing the Quran', hintAr: 'ادعُ بعد أن تُتمّ ختمتك', hintEn: 'Make dua after finishing the Quran', keywords: 'khatm dua complete finish ختم دعاء', target: { kind: 'page', page: 'adhkar', param: 'khatm' } },

  // ---- App
  { id: 'theme', ar: 'المظهر (فاتح / داكن)', en: 'Theme (light / dark)', hintAr: 'الوضع الداكن والفاتح', hintEn: 'Light or dark mode', keywords: 'theme dark light mode night مظهر داكن فاتح ليلي', target: { kind: 'settings' } },
  { id: 'language', ar: 'اللغة', en: 'Language', hintAr: 'العربية أو الإنجليزية', hintEn: 'Arabic or English', keywords: 'language arabic english لغة عربي إنجليزي', target: { kind: 'settings' } },
  { id: 'account', ar: 'الحساب والمزامنة', en: 'Account and sync', hintAr: 'احفظ تقدمك على كل أجهزتك', hintEn: 'Keep your progress on all your devices', keywords: 'account login sync backup حساب تسجيل مزامنة نسخ', target: { kind: 'account' } },
  { id: 'setup', ar: 'دليل البدء', en: 'Setup guide', hintAr: 'اللغة والقارئ والمواقيت والهدف', hintEn: 'Language, reciter, prayer times and goal', keywords: 'setup guide onboarding welcome start إعداد دليل بدء ترحيب', target: { kind: 'setup' } },
];

const DIACRITICS = /[ً-ٰٟۖ-ۭـ]/g;

/** Lower-case, strip Arabic marks and unify letter shapes, so "تحميل" matches "تَحْمِيل" and "أذكار" matches "اذكار". */
export function normalizeQuery(s: string): string {
  return s
    .normalize('NFKD')
    .replace(DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .trim();
}

const haystackCache = new Map<string, string>();
const haystack = (f: Feature) => {
  let h = haystackCache.get(f.id);
  if (!h) { h = normalizeQuery(`${f.ar} ${f.en} ${f.hintAr} ${f.hintEn} ${f.keywords}`); haystackCache.set(f.id, h); }
  return h;
};

/** Features that match every word of `query`, best matches (title hits) first. */
export function searchFeatures(query: string, limit = 8): Feature[] {
  const words = normalizeQuery(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const scored: { f: Feature; score: number }[] = [];
  for (const f of FEATURES) {
    const h = haystack(f);
    if (!words.every(w => h.includes(w))) continue;
    const title = normalizeQuery(`${f.ar} ${f.en}`);
    const score = words.reduce((sum, w) => sum + (title.includes(w) ? 3 : 1) + (title.startsWith(w) ? 1 : 0), 0);
    scored.push({ f, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map(x => x.f);
}
