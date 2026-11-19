/**
 * The 99 Names of Allah (the list narrated by at-Tirmidhi), with a transliteration, a short English meaning
 * and a short Arabic explanation, plus the helpers the screen uses (name of the day, search).
 * (No imports on purpose, so this file can be unit-tested with plain Node.)
 */

export interface AllahName {
  /** 1..99 */
  n: number;
  ar: string;
  tr: string;
  en: string;
  /** A short explanation in Arabic. */
  meaning: string;
}

// [Arabic, transliteration, English meaning, Arabic explanation]
const RAW: [string, string, string, string][] = [
  ['الرحمن', 'Ar-Rahman', 'The Most Gracious', 'واسع الرحمة بجميع خلقه'],
  ['الرحيم', 'Ar-Rahim', 'The Most Merciful', 'الرحيم بالمؤمنين'],
  ['الملك', 'Al-Malik', 'The King', 'المالك لكل شيء'],
  ['القدوس', 'Al-Quddus', 'The Most Holy', 'المنزّه عن كل نقص'],
  ['السلام', 'As-Salam', 'The Source of Peace', 'السالم من كل عيب'],
  ['المؤمن', "Al-Mu'min", 'The Granter of Security', 'مانح الأمن لعباده'],
  ['المهيمن', 'Al-Muhaymin', 'The Guardian', 'الرقيب على كل شيء'],
  ['العزيز', 'Al-Aziz', 'The Almighty', 'الغالب الذي لا يُغلب'],
  ['الجبار', 'Al-Jabbar', 'The Compeller', 'القاهر الذي يجبر الكسر'],
  ['المتكبر', 'Al-Mutakabbir', 'The Supreme', 'المتعالي عن صفات الخلق'],
  ['الخالق', 'Al-Khaliq', 'The Creator', 'الموجِد للأشياء من العدم'],
  ['البارئ', "Al-Bari'", 'The Originator', 'المنشئ للخلق بلا مثال'],
  ['المصور', 'Al-Musawwir', 'The Fashioner', 'مصوّر الخلق كيف شاء'],
  ['الغفار', 'Al-Ghaffar', 'The Constant Forgiver', 'كثير المغفرة'],
  ['القهار', 'Al-Qahhar', 'The All-Subduer', 'الغالب على كل شيء'],
  ['الوهاب', 'Al-Wahhab', 'The Bestower', 'كثير العطاء بلا مقابل'],
  ['الرزاق', 'Ar-Razzaq', 'The Provider', 'خالق الأرزاق ومعطيها'],
  ['الفتاح', 'Al-Fattah', 'The Opener', 'فاتح أبواب الرحمة والرزق'],
  ['العليم', 'Al-Alim', 'The All-Knowing', 'المحيط علمه بكل شيء'],
  ['القابض', 'Al-Qabid', 'The Withholder', 'يقبض الرزق والأرواح بحكمته'],
  ['الباسط', 'Al-Basit', 'The Expander', 'يبسط الرزق لمن يشاء'],
  ['الخافض', 'Al-Khafid', 'The Abaser', 'يخفض من يشاء بعدله'],
  ['الرافع', "Ar-Rafi'", 'The Exalter', 'يرفع من يشاء بفضله'],
  ['المعز', "Al-Mu'izz", 'The Honorer', 'يعطي العزة لمن يشاء'],
  ['المذل', 'Al-Mudhill', 'The Humiliator', 'يُذلّ من يشاء بعدله'],
  ['السميع', "As-Sami'", 'The All-Hearing', 'يسمع كل صوت'],
  ['البصير', 'Al-Basir', 'The All-Seeing', 'يرى كل شيء'],
  ['الحكم', 'Al-Hakam', 'The Judge', 'الفاصل بين الخلق بالحق'],
  ['العدل', 'Al-Adl', 'The Utterly Just', 'المنزّه عن الظلم'],
  ['اللطيف', 'Al-Latif', 'The Subtle One', 'الرفيق بعباده الخبير بدقائق الأمور'],
  ['الخبير', 'Al-Khabir', 'The All-Aware', 'العالم ببواطن الأمور'],
  ['الحليم', 'Al-Halim', 'The Forbearing', 'لا يعاجل بالعقوبة'],
  ['العظيم', 'Al-Azim', 'The Magnificent', 'ذو العظمة والجلال'],
  ['الغفور', 'Al-Ghafur', 'The Great Forgiver', 'كثير الستر والمغفرة'],
  ['الشكور', 'Ash-Shakur', 'The Most Appreciative', 'يجازي القليل بالكثير'],
  ['العلي', 'Al-Ali', 'The Most High', 'المرتفع فوق كل شيء'],
  ['الكبير', 'Al-Kabir', 'The Most Great', 'ذو الكبرياء'],
  ['الحفيظ', 'Al-Hafiz', 'The Preserver', 'يحفظ خلقه ويحفظ أعمالهم'],
  ['المقيت', 'Al-Muqit', 'The Sustainer', 'يعطي كل مخلوق قوته'],
  ['الحسيب', 'Al-Hasib', 'The Reckoner', 'الكافي الذي يحاسب عباده'],
  ['الجليل', 'Al-Jalil', 'The Majestic', 'ذو الجلال والعظمة'],
  ['الكريم', 'Al-Karim', 'The Generous', 'كثير الخير والعطاء'],
  ['الرقيب', 'Ar-Raqib', 'The Watchful', 'المطّلع على كل شيء'],
  ['المجيب', 'Al-Mujib', 'The Responsive', 'يجيب دعاء من دعاه'],
  ['الواسع', "Al-Wasi'", 'The All-Encompassing', 'وسعت رحمته وعلمه كل شيء'],
  ['الحكيم', 'Al-Hakim', 'The All-Wise', 'يضع الأمور في مواضعها'],
  ['الودود', 'Al-Wadud', 'The Loving', 'يحب عباده ويحبونه'],
  ['المجيد', 'Al-Majid', 'The Glorious', 'ذو المجد والكرم'],
  ['الباعث', "Al-Ba'ith", 'The Resurrector', 'يبعث الخلق يوم القيامة'],
  ['الشهيد', 'Ash-Shahid', 'The Witness', 'لا يغيب عنه شيء'],
  ['الحق', 'Al-Haqq', 'The Truth', 'الثابت الذي لا شك فيه'],
  ['الوكيل', 'Al-Wakil', 'The Trustee', 'الذي يُتوكَّل عليه ويكفي'],
  ['القوي', 'Al-Qawiyy', 'The Strong', 'تام القدرة'],
  ['المتين', 'Al-Matin', 'The Firm', 'شديد القوة الذي لا يضعف'],
  ['الولي', 'Al-Wali', 'The Protecting Friend', 'ناصر المؤمنين ومتولّي أمورهم'],
  ['الحميد', 'Al-Hamid', 'The Praiseworthy', 'المستحق للحمد'],
  ['المحصي', 'Al-Muhsi', 'The Accounter', 'أحاط بكل شيء عدًّا'],
  ['المبدئ', "Al-Mubdi'", 'The Initiator', 'بدأ الخلق على غير مثال'],
  ['المعيد', "Al-Mu'id", 'The Restorer', 'يعيد الخلق بعد فنائه'],
  ['المحيي', 'Al-Muhyi', 'The Giver of Life', 'يعطي الحياة'],
  ['المميت', 'Al-Mumit', 'The Bringer of Death', 'يقبض الأرواح'],
  ['الحي', 'Al-Hayy', 'The Ever-Living', 'الحياة الكاملة التي لا تفنى'],
  ['القيوم', 'Al-Qayyum', 'The Self-Sustaining', 'القائم بنفسه المقيم لغيره'],
  ['الواجد', 'Al-Wajid', 'The Finder', 'لا يعجزه شيء ولا يفوته'],
  ['الماجد', 'Al-Maajid', 'The Noble', 'واسع الكرم والمجد'],
  ['الواحد', 'Al-Wahid', 'The One', 'المتفرد بذاته وصفاته'],
  ['الأحد', 'Al-Ahad', 'The Unique', 'الذي لا شريك له ولا مثيل'],
  ['الصمد', 'As-Samad', 'The Eternal Refuge', 'الذي تصمد إليه الخلائق في حاجاتها'],
  ['القادر', 'Al-Qadir', 'The Able', 'يقدر على كل شيء'],
  ['المقتدر', 'Al-Muqtadir', 'The Powerful', 'بالغ القدرة'],
  ['المقدم', 'Al-Muqaddim', 'The Expediter', 'يقدّم من يشاء بحكمته'],
  ['المؤخر', "Al-Mu'akhkhir", 'The Delayer', 'يؤخّر من يشاء بحكمته'],
  ['الأول', 'Al-Awwal', 'The First', 'الذي ليس قبله شيء'],
  ['الآخر', 'Al-Akhir', 'The Last', 'الذي ليس بعده شيء'],
  ['الظاهر', 'Az-Zahir', 'The Manifest', 'الذي ليس فوقه شيء'],
  ['الباطن', 'Al-Batin', 'The Hidden', 'الذي ليس دونه شيء'],
  ['الوالي', 'Al-Waali', 'The Governor', 'المتصرف في خلقه'],
  ['المتعالي', "Al-Muta'ali", 'The Supremely Exalted', 'المتنزّه عن صفات المخلوقين'],
  ['البر', 'Al-Barr', 'The Source of Goodness', 'كثير الإحسان إلى خلقه'],
  ['التواب', 'At-Tawwab', 'The Acceptor of Repentance', 'يقبل توبة التائبين'],
  ['المنتقم', 'Al-Muntaqim', 'The Avenger', 'يعاقب من يستحق العقاب'],
  ['العفو', 'Al-Afuww', 'The Pardoner', 'يمحو الذنوب ويتجاوز عنها'],
  ['الرؤوف', "Ar-Ra'uf", 'The Compassionate', 'شديد الرحمة والرفق'],
  ['مالك الملك', 'Malik-ul-Mulk', 'Owner of Sovereignty', 'يتصرف في ملكه كيف يشاء'],
  ['ذو الجلال والإكرام', 'Dhul-Jalali wal-Ikram', 'Lord of Majesty and Generosity', 'صاحب العظمة والفضل'],
  ['المقسط', 'Al-Muqsit', 'The Equitable', 'العادل في حكمه'],
  ['الجامع', "Al-Jami'", 'The Gatherer', 'يجمع الخلق ليوم الحساب'],
  ['الغني', 'Al-Ghani', 'The Self-Sufficient', 'لا يحتاج إلى أحد'],
  ['المغني', 'Al-Mughni', 'The Enricher', 'يغني من يشاء من عباده'],
  ['المانع', "Al-Mani'", 'The Preventer', 'يمنع ما يشاء بحكمته'],
  ['الضار', 'Ad-Darr', 'The Distressor', 'يقدّر الضرر لحكمة'],
  ['النافع', "An-Nafi'", 'The Benefactor', 'يقدّر النفع والخير'],
  ['النور', 'An-Nur', 'The Light', 'منوّر السماوات والأرض وهادي القلوب'],
  ['الهادي', 'Al-Hadi', 'The Guide', 'يهدي من يشاء إلى الحق'],
  ['البديع', "Al-Badi'", 'The Incomparable Originator', 'مبدع الخلق على غير مثال'],
  ['الباقي', 'Al-Baqi', 'The Everlasting', 'الدائم الذي لا يفنى'],
  ['الوارث', 'Al-Warith', 'The Inheritor', 'الباقي بعد فناء الخلق'],
  ['الرشيد', 'Ar-Rashid', 'The Guide to the Right Path', 'يرشد الخلق إلى ما فيه صلاحهم'],
  ['الصبور', 'As-Sabur', 'The Patient', 'لا يعاجل العصاة بالعقوبة'],
];

export const NAMES: AllahName[] = RAW.map(([ar, tr, en, meaning], i) => ({ n: i + 1, ar, tr, en, meaning }));

/** Day of the year, 1..366, from a plain local date ("2026-11-19"). */
export function dayOfYear(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return 1;
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;
}

/** One name per day, the same for everyone, cycling through all 99. */
export function nameOfDay(date: string): AllahName {
  return NAMES[(dayOfYear(date) - 1) % NAMES.length];
}

/** Lower-case Latin, Arabic without marks, one spelling of alef and ha. */
const fold = (s: string) =>
  s
    .toLowerCase()
    .replace(/[ً-ٰٟۖ-ۭـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/['’`\-\s]/g, '');

/** Names that match what was typed (Arabic, transliteration or English); all of them for an empty query. */
export function searchNames(query: string): AllahName[] {
  const q = fold(query);
  if (!q) return NAMES;
  const byNumber = /^\d+$/.test(query.trim()) ? Number(query.trim()) : null;
  return NAMES.filter(x => x.n === byNumber || fold(x.ar).includes(q) || fold(x.tr).includes(q) || fold(x.en).includes(q) || fold(x.meaning).includes(q));
}
