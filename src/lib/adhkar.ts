/**
 * Adhkar (remembrances) and duas.
 *
 * Deliberately limited to two kinds of content whose wording is certain:
 *  - ayahs of the Quran (stored as references and read from the Quran text API, so they can never be mistyped), and
 *  - a few short, very well-known phrases of dhikr.
 * Long hadith supplications are NOT hand-typed here; if you want the full Hisn al-Muslim collection, import it from a
 * scholar-reviewed dataset instead of adding text by hand.
 * (No imports on purpose, so this file can be unit-tested with plain Node.)
 */

export interface AyahRef {
  surah: number;
  ayah: number;
}

export interface Dhikr {
  id: string;
  /** How many times to say it. */
  count: number;
  /** Arabic text (for phrases of dhikr). */
  ar?: string;
  /** Quran ayahs, joined in order (for Quranic items). */
  refs?: AyahRef[];
  /** What it is / when it is said. */
  titleAr: string;
  titleEn: string;
  /** English meaning (phrases only). */
  en?: string;
  /** A short note shown under the text (for example about how well-attested the wording is). */
  note?: { ar: string; en: string };
}

export interface Category {
  id: string;
  ar: string;
  en: string;
  items: Dhikr[];
}

const ayahs = (surah: number, from: number, to: number): AyahRef[] => Array.from({ length: to - from + 1 }, (_, i) => ({ surah, ayah: from + i }));

const KURSI: Dhikr = { id: 'kursi', count: 1, refs: ayahs(2, 255, 255), titleAr: 'آية الكرسي', titleEn: 'Ayat al-Kursi' };
const IKHLAS: Dhikr = { id: 'ikhlas', count: 3, refs: ayahs(112, 1, 4), titleAr: 'سورة الإخلاص', titleEn: 'Surah Al-Ikhlas' };
const FALAQ: Dhikr = { id: 'falaq', count: 3, refs: ayahs(113, 1, 5), titleAr: 'سورة الفلق', titleEn: 'Surah Al-Falaq' };
const NAS: Dhikr = { id: 'nas', count: 3, refs: ayahs(114, 1, 6), titleAr: 'سورة الناس', titleEn: 'Surah An-Nas' };

const SUBHAN: Dhikr = { id: 'subhan33', count: 33, ar: 'سُبْحَانَ اللَّهِ', titleAr: 'التسبيح', titleEn: 'Tasbih', en: 'Glory be to Allah' };
const HAMD: Dhikr = { id: 'hamd33', count: 33, ar: 'الْحَمْدُ لِلَّهِ', titleAr: 'التحميد', titleEn: 'Tahmid', en: 'All praise is for Allah' };
const AKBAR: Dhikr = { id: 'akbar34', count: 34, ar: 'اللَّهُ أَكْبَرُ', titleAr: 'التكبير', titleEn: 'Takbir', en: 'Allah is the Greatest' };
const TAWHID: Dhikr = {
  id: 'tawhid',
  count: 1,
  ar: 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
  titleAr: 'التهليل',
  titleEn: 'Tahlil',
  en: 'There is no god but Allah alone, with no partner. His is the dominion and His is the praise, and He is over all things capable.',
};

export const CATEGORIES: Category[] = [
  {
    id: 'morning',
    ar: 'أذكار الصباح',
    en: 'Morning adhkar',
    items: [
      KURSI,
      IKHLAS,
      FALAQ,
      NAS,
      { id: 'subhan-bihamdih', count: 100, ar: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', titleAr: 'التسبيح مائة مرة', titleEn: 'Tasbih, a hundred times', en: 'Glory and praise be to Allah' },
      { ...TAWHID, id: 'tawhid10', count: 10 },
    ],
  },
  {
    id: 'evening',
    ar: 'أذكار المساء',
    en: 'Evening adhkar',
    items: [
      KURSI,
      IKHLAS,
      FALAQ,
      NAS,
      { id: 'subhan-bihamdih', count: 100, ar: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', titleAr: 'التسبيح مائة مرة', titleEn: 'Tasbih, a hundred times', en: 'Glory and praise be to Allah' },
      { ...TAWHID, id: 'tawhid10', count: 10 },
    ],
  },
  {
    id: 'after-prayer',
    ar: 'أذكار بعد الصلاة',
    en: 'After the prayer',
    items: [
      { id: 'istighfar3', count: 3, ar: 'أَسْتَغْفِرُ اللَّهَ', titleAr: 'الاستغفار', titleEn: 'Seeking forgiveness', en: 'I seek forgiveness from Allah' },
      {
        id: 'salam',
        count: 1,
        ar: 'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
        titleAr: 'بعد السلام',
        titleEn: 'After the salam',
        en: 'O Allah, You are Peace and from You comes peace. Blessed are You, Owner of majesty and honour.',
      },
      SUBHAN,
      HAMD,
      AKBAR,
      TAWHID,
      KURSI,
    ],
  },
  {
    id: 'sleep',
    ar: 'أذكار النوم',
    en: 'Before sleep',
    items: [
      KURSI,
      { id: 'amanar-rasul', count: 1, refs: ayahs(2, 285, 286), titleAr: 'آخر آيتين من سورة البقرة', titleEn: 'The last two ayahs of Al-Baqarah' },
      IKHLAS,
      FALAQ,
      NAS,
      SUBHAN,
      HAMD,
      AKBAR,
      { id: 'bismika', count: 1, ar: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', titleAr: 'عند النوم', titleEn: 'When lying down', en: 'In Your name, O Allah, I die and I live' },
    ],
  },
  {
    id: 'khatm',
    ar: 'دعاء ختم القرآن',
    en: 'Dua for completing the Quran',
    items: [
      {
        id: 'khatm-dua',
        count: 1,
        ar: 'اللَّهُمَّ ارْحَمْنِي بِالْقُرْآنِ، وَاجْعَلْهُ لِي إِمَامًا وَنُورًا وَهُدًى وَرَحْمَةً. اللَّهُمَّ ذَكِّرْنِي مِنْهُ مَا نَسِيتُ، وَعَلِّمْنِي مِنْهُ مَا جَهِلْتُ، وَارْزُقْنِي تِلَاوَتَهُ آنَاءَ اللَّيْلِ وَأَطْرَافَ النَّهَارِ، وَاجْعَلْهُ لِي حُجَّةً يَا رَبَّ الْعَالَمِينَ.',
        titleAr: 'دعاء ختم القرآن',
        titleEn: 'Dua at the completion of the Quran',
        en: 'O Allah, have mercy on me through the Quran and make it for me a guide, a light, a guidance and a mercy. O Allah, remind me of what I forget of it, teach me what I do not know of it, and grant me its recitation night and day, and make it an argument in my favour, O Lord of the worlds.',
        note: {
          ar: 'يُستحب الدعاء عند ختم القرآن. هذه الصيغة مشهورة الاستعمال بين الناس وليست حديثًا ثابتًا، فيجوز الدعاء بها أو بأي دعاء آخر من قلبك.',
          en: 'Making dua when you finish the Quran is recommended by many scholars. This wording is widely used but is not an authenticated hadith, so you may use it or any dua of your own.',
        },
      },
      { id: 'khatm-fatiha', count: 1, refs: ayahs(1, 1, 7), titleAr: 'ثم ابدأ من جديد: الفاتحة', titleEn: 'Then begin again: Al-Fatiha' },
      { id: 'khatm-baqarah', count: 1, refs: ayahs(2, 1, 5), titleAr: 'وأوائل سورة البقرة', titleEn: 'and the opening of Al-Baqarah' },
      {
        id: 'khatm-kaffarah',
        count: 1,
        ar: 'سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا أَنْتَ، أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ',
        titleAr: 'عند ختام المجلس',
        titleEn: 'At the end of a gathering',
        en: 'Glory and praise be to You, O Allah. I bear witness that there is no god but You. I seek Your forgiveness and turn to You in repentance.',
      },
    ],
  },
  {
    id: 'quran-duas',
    ar: 'أدعية من القرآن',
    en: 'Duas from the Quran',
    items: [
      { id: 'd-2-127', count: 1, refs: ayahs(2, 127, 127), titleAr: 'تقبّل منا', titleEn: 'Accept from us' },
      { id: 'd-2-201', count: 1, refs: ayahs(2, 201, 201), titleAr: 'حسنة الدنيا والآخرة', titleEn: 'Good in this world and the next' },
      { id: 'd-2-286', count: 1, refs: ayahs(2, 286, 286), titleAr: 'لا تؤاخذنا', titleEn: 'Do not hold us to account' },
      { id: 'd-3-8', count: 1, refs: ayahs(3, 8, 8), titleAr: 'الثبات على الهدى', titleEn: 'Steadfast hearts' },
      { id: 'd-7-23', count: 1, refs: ayahs(7, 23, 23), titleAr: 'دعاء آدم وحواء', titleEn: 'The dua of Adam and Hawwa' },
      { id: 'd-14-40', count: 1, refs: ayahs(14, 40, 41), titleAr: 'إقامة الصلاة والمغفرة', titleEn: 'Establishing prayer and forgiveness' },
      { id: 'd-17-24', count: 1, refs: ayahs(17, 24, 24), titleAr: 'الدعاء للوالدين', titleEn: 'For parents' },
      { id: 'd-20-114', count: 1, refs: ayahs(20, 114, 114), titleAr: 'زدني علمًا', titleEn: 'Increase me in knowledge' },
      { id: 'd-21-87', count: 1, refs: ayahs(21, 87, 87), titleAr: 'دعاء يونس', titleEn: 'The dua of Yunus' },
      { id: 'd-23-118', count: 1, refs: ayahs(23, 118, 118), titleAr: 'اغفر وارحم', titleEn: 'Forgive and have mercy' },
      { id: 'd-25-74', count: 1, refs: ayahs(25, 74, 74), titleAr: 'قرة الأعين', titleEn: 'For family' },
      { id: 'd-59-10', count: 1, refs: ayahs(59, 10, 10), titleAr: 'للإخوان في الإيمان', titleEn: 'For our brothers in faith' },
    ],
  },
];

/** The ayah references of a Quranic item as a stable cache key ("2:285-286"). */
export function refsLabel(refs: AyahRef[]): string {
  if (refs.length === 0) return '';
  const first = refs[0];
  const last = refs[refs.length - 1];
  return first.ayah === last.ayah ? `${first.surah}:${first.ayah}` : `${first.surah}:${first.ayah}-${last.ayah}`;
}

/** Total number of repetitions in a category (for a "progress" indicator). */
export function totalCount(category: Category): number {
  return category.items.reduce((sum, i) => sum + i.count, 0);
}
