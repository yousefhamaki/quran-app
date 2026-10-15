// Run with: node --test scripts/lib.test.ts   (or: npm run test:lib)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseTajweed, plainWords, tajweedColor, wordText } from '../src/lib/tajweed.ts';
import { activeWordAt, estimateSegments, normalizeSegments, wordWeight } from '../src/lib/wordtiming.ts';
import { HIZB_STARTS, annotate, annotationList, hizbOf, juzOf, pickPrompt, recordAnswer, scoreOf, weakest, weekCalendar } from '../src/lib/study.ts';
import { INTERVALS, addDays, completeLearn, createPlan, daysBetween, dueCards, learnTask, planStats, rateCard, upcoming } from '../src/lib/hifz.ts';

// ---------------------------------------------------------------- tajweed
test('parseTajweed splits an ayah into words and keeps rule classes', () => {
  // Real text of 112:4 from the Quran.com API.
  const markup =
    'وَلَمْ يَك<tajweed class=idgham_wo_ghunnah>ُن ل</tajweed>َّهُ<tajweed class=madda_normal>ۥ</tajweed> كُفُوًا أَحَ<tajweed class=qalaqah>د</tajweed>ُۢ <span class=end>٤</span>';
  const words = parseTajweed(markup);
  assert.equal(words.length, 5, 'five words, like the five timing segments Quran.com publishes for 112:4');
  assert.equal(wordText(words[1]), 'يَكُن');
  assert.equal(wordText(words[2]), 'لَّهُۥ');
  assert.deepEqual(
    words[1].map(c => c.cls),
    [undefined, 'idgham_wo_ghunnah'],
  );
  assert.ok(words[4].some(c => c.cls === 'qalaqah'));
  assert.ok(!words.flat().some(c => c.text.includes('٤')), 'the verse-end number is dropped');
});

test('parseTajweed copes with nested tags and a stray closing tag (real data from 2:190)', () => {
  const markup =
    '<tajweed class=madda_obligatory>ُوٓ<tajweed class=slnt>اْ</tajweed>‌ۚ</tajweed> إِنَّ';
  const words = parseTajweed(markup);
  assert.equal(words.length, 2);
  assert.ok(!words.flat().some(c => c.text.includes('<') || c.text.includes('tajweed')), 'no markup leaks into the text');
  assert.ok(words[0].some(c => c.cls === 'slnt'), 'the inner rule wins for its own letters');
  assert.ok(words[0].some(c => c.cls === 'madda_obligatory'));
  assert.equal(parseTajweed('بت</tajweed> ا</tajweed>').length, 2, 'stray closing tags are ignored');
});

test('parseTajweed handles plain text and empty input', () => {
  assert.equal(parseTajweed('').length, 0);
  assert.equal(plainWords('قُلْ هُوَ  ٱللَّهُ أَحَدٌ').length, 4);
});

test('tajweedColor has separate light and dark colours and ignores unknown rules', () => {
  assert.notEqual(tajweedColor('qalaqah', false), tajweedColor('qalaqah', true));
  assert.equal(tajweedColor('nope', false), undefined);
  assert.equal(tajweedColor(undefined, true), undefined);
});

// ------------------------------------------------------------ word timing
test('normalizeSegments accepts numbers and numeric strings (Sudais sends strings)', () => {
  const segs = normalizeSegments([['0', '1', '100', '500'], [1, 2, 510, 910], ['bad'], null]);
  assert.deepEqual(segs, [
    { from: 0, to: 1, start: 100, end: 500 },
    { from: 1, to: 2, start: 510, end: 910 },
  ]);
  assert.deepEqual(normalizeSegments(undefined), []);
});

test('activeWordAt follows the recitation and never flickers in pauses', () => {
  const segs = normalizeSegments([[0, 1, 30, 390], [1, 2, 400, 790], [2, 3, 800, 1640]]);
  assert.equal(activeWordAt(segs, 0), -1, 'before the first word');
  assert.equal(activeWordAt(segs, 30), 0);
  assert.equal(activeWordAt(segs, 395), 0, 'in the gap the previous word stays lit');
  assert.equal(activeWordAt(segs, 400), 1);
  assert.equal(activeWordAt(segs, 1639), 2);
  assert.equal(activeWordAt(segs, 99999), 2, 'after the end the last word stays lit');
});

test('estimateSegments covers the audio, in order, proportional to word length', () => {
  const words = ['قُلْ', 'هُوَ', 'ٱللَّهُ', 'أَحَدٌ'];
  const segs = estimateSegments(words, 3000);
  assert.equal(segs.length, 4);
  for (let i = 1; i < segs.length; i++) assert.ok(segs[i].start >= segs[i - 1].end - 1, 'no overlap');
  assert.ok(segs[0].start > 0 && segs[3].end < 3000, 'a little silence at both ends');
  assert.ok(wordWeight('ٱللَّهُ') > wordWeight('هُوَ'));
  assert.deepEqual(estimateSegments([], 1000), []);
  assert.deepEqual(estimateSegments(words, 0), []);
});

// ------------------------------------------------------------------ hifz
test('date helpers', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(daysBetween('2026-10-12', '2026-10-15'), 3);
  assert.equal(daysBetween('2026-10-15', '2026-10-12'), -3);
});

test('a plan hands out one new portion per day and schedules reviews', () => {
  const day1 = '2026-10-12';
  let plan = createPlan({ surah: 67, total: 30, pace: 5, today: day1 });
  assert.deepEqual(learnTask(plan, day1), { from: 1, to: 5 });
  assert.equal(dueCards(plan, day1).length, 0);

  plan = completeLearn(plan, day1);
  assert.equal(plan.nextAyah, 6);
  assert.equal(learnTask(plan, day1), null, 'only one new portion per day');
  assert.equal(dueCards(plan, day1).length, 0, 'the new card is not due the same day');

  const day2 = addDays(day1, 1);
  assert.deepEqual(learnTask(plan, day2), { from: 6, to: 10 });
  assert.equal(dueCards(plan, day2).length, 1, 'first review comes back the next day');
  assert.equal(dueCards(plan, day2)[0].from, 1);
});

test('ratings move cards between boxes using the intervals', () => {
  const today = '2026-10-12';
  let plan = completeLearn(createPlan({ surah: 1, total: 7, pace: 7, today }), today);
  const id = plan.cards[0].id;

  plan = rateCard(plan, id, 'good', '2026-10-13');
  assert.equal(plan.cards[0].box, 1);
  assert.equal(plan.cards[0].due, addDays('2026-10-13', INTERVALS[1]));

  plan = rateCard(plan, id, 'easy', '2026-10-15');
  assert.equal(plan.cards[0].box, 3, 'easy jumps two boxes');
  assert.equal(plan.cards[0].due, addDays('2026-10-15', INTERVALS[3]));

  plan = rateCard(plan, id, 'again', '2026-10-23');
  assert.equal(plan.cards[0].box, 0, 'again starts over');
  assert.equal(plan.cards[0].due, '2026-10-24');
  assert.equal(plan.cards[0].reviews, 3);

  for (let i = 0; i < 10; i++) plan = rateCard(plan, id, 'easy', '2026-11-01');
  assert.equal(plan.cards[0].box, INTERVALS.length - 1, 'capped at the last box');
});

test('missed days do not pile up new work, but overdue reviews stay due', () => {
  const start = '2026-10-12';
  let plan = completeLearn(createPlan({ surah: 67, total: 30, pace: 5, today: start }), start);
  const later = addDays(start, 10); // user disappeared for 10 days
  assert.deepEqual(learnTask(plan, later), { from: 6, to: 10 }, 'still just one portion');
  assert.equal(dueCards(plan, later).length, 1, 'the missed review is waiting');
  plan = rateCard(plan, plan.cards[0].id, 'good', later);
  assert.equal(dueCards(plan, later).length, 0);
});

test('the last portion is clamped to the end of the surah and the plan finishes', () => {
  let day = '2026-10-12';
  let plan = createPlan({ surah: 112, total: 4, pace: 3, today: day });
  plan = completeLearn(plan, day);
  day = addDays(day, 1);
  assert.deepEqual(learnTask(plan, day), { from: 4, to: 4 });
  plan = completeLearn(plan, day);
  const stats = planStats(plan, addDays(day, 1));
  assert.equal(stats.finished, true);
  assert.equal(stats.memorized, 4);
  assert.equal(stats.percent, 100);
  assert.equal(learnTask(plan, addDays(day, 2)), null);
});

test('starting in the middle of a surah and the stats / upcoming list', () => {
  const day = '2026-10-12';
  let plan = createPlan({ surah: 2, total: 286, start: 255, pace: 2, today: day });
  assert.deepEqual(learnTask(plan, day), { from: 255, to: 256 });
  plan = completeLearn(plan, day);
  const s = planStats(plan, day);
  assert.equal(s.covered, 32);
  assert.equal(s.memorized, 2);
  assert.equal(s.daysLeft, 15);
  assert.deepEqual(upcoming(plan, day), [{ due: '2026-10-13', count: 1 }]);
  assert.equal(createPlan({ surah: 1, total: 7, start: 99, pace: 0, today: day }).start, 7, 'start is clamped');
  assert.equal(createPlan({ surah: 1, total: 7, pace: 0, today: day }).pace, 1, 'pace is at least 1');
});

// ---------- habit ----------
import {
  AYAH_COUNTS, TOTAL_AYAHS, DAILY_AYAHS, locate, indexOf, createKhatmah, khatmahStats, markToday, addRead,
  recordDay, currentStreak, longestStreak, lastWeek, dailyAyah, addDays as hAddDays,
} from '../src/lib/habit.ts';

test('habit: ayah counts add up and locate/indexOf are inverse', () => {
  assert.equal(AYAH_COUNTS.length, 114);
  assert.equal(AYAH_COUNTS.reduce((a, b) => a + b, 0), TOTAL_AYAHS);
  assert.deepEqual(locate(0), { surah: 1, ayah: 1 });
  assert.deepEqual(locate(7), { surah: 2, ayah: 1 });
  assert.deepEqual(locate(TOTAL_AYAHS - 1), { surah: 114, ayah: 6 });
  for (const i of [0, 6, 7, 292, 1000, 6235]) {
    const r = locate(i);
    assert.equal(indexOf(r.surah, r.ayah), i);
  }
});

test('habit: daily ayahs all exist', () => {
  for (const [s, a] of DAILY_AYAHS) assert.ok(a >= 1 && a <= AYAH_COUNTS[s - 1], `${s}:${a}`);
  assert.deepEqual(dailyAyah('2026-10-15'), dailyAyah('2026-10-15'));
  assert.notDeepEqual(dailyAyah('2026-10-15'), dailyAyah('2026-10-16'));
});

test('habit: 30-day khatmah targets and catching up', () => {
  let k = createKhatmah({ days: 30, today: '2026-10-01' });
  let s = khatmahStats(k, '2026-10-01');
  assert.equal(s.day, 1);
  assert.equal(s.todayLeft, Math.ceil(TOTAL_AYAHS / 30));
  assert.deepEqual(s.portion?.from, { surah: 1, ayah: 1 });
  k = markToday(k, '2026-10-01');
  assert.equal(khatmahStats(k, '2026-10-01').todayLeft, 0);
  assert.equal(khatmahStats(k, '2026-10-01').portion, null);
  // skip two days: today's portion now includes the missed ones
  s = khatmahStats(k, '2026-10-04');
  assert.equal(s.day, 4);
  assert.equal(s.behind, Math.ceil(TOTAL_AYAHS * 3 / 30) - k.read);
  assert.equal(s.todayLeft, Math.ceil(TOTAL_AYAHS * 4 / 30) - k.read);
  // finish on the last day
  k = markToday(k, hAddDays('2026-10-01', 29));
  assert.equal(k.read, TOTAL_AYAHS);
  assert.ok(k.finishedOn);
  assert.equal(khatmahStats(k, hAddDays('2026-10-01', 29)).finished, true);
});

test('habit: reading ahead and past the planned period', () => {
  let k = createKhatmah({ days: 10, today: '2026-10-01' });
  k = addRead(k, 2000, '2026-10-01');
  assert.equal(khatmahStats(k, '2026-10-01').todayLeft, 0);
  assert.equal(khatmahStats(k, '2026-10-01').perDayNow, Math.ceil((TOTAL_AYAHS - 2000) / 10));
  const late = khatmahStats(createKhatmah({ days: 10, today: '2026-10-01' }), '2026-11-20');
  assert.equal(late.todayLeft, TOTAL_AYAHS);
  assert.equal(late.daysLeft, 0);
});

test('habit: streak', () => {
  let days: string[] = [];
  for (const d of ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-14', '2026-10-15']) days = recordDay(days, d);
  days = recordDay(days, '2026-10-15');
  assert.equal(days.length, 5);
  assert.equal(currentStreak(days, '2026-10-15'), 2);
  assert.equal(currentStreak(days, '2026-10-16'), 2); // yesterday still counts
  assert.equal(currentStreak(days, '2026-10-17'), 0);
  assert.equal(longestStreak(days), 3);
  assert.equal(lastWeek(days, '2026-10-15').filter(x => x.read).length, 5);
});

// ---------- juz ----------
import { JUZ_STARTS, juzSurahs, surahsOfJuz } from '../src/lib/juz.ts';

test('juz: surahs of a juz', () => {
  assert.equal(JUZ_STARTS.length, 30);
  assert.deepEqual(juzSurahs(1), [1, 2]);
  assert.deepEqual(juzSurahs(2), [2]);
  assert.deepEqual(juzSurahs(3), [2, 3]); // starts at 2:253, ends where 3:93 begins in juz 4
  assert.deepEqual(juzSurahs(30).slice(0, 3), [78, 79, 80]);
  assert.equal(juzSurahs(30).at(-1), 114);
  assert.deepEqual(juzSurahs(29).at(0), 67);
  assert.deepEqual(juzSurahs(29).at(-1), 77);
  assert.deepEqual(juzSurahs(0), []);
  // every surah belongs to at least one juz
  const all = surahsOfJuz(Array.from({ length: 30 }, (_, i) => i + 1));
  assert.equal(all.length, 114);
  assert.deepEqual(surahsOfJuz([29, 30]).length, 114 - 66);
});

// ---------- hijri ----------
import { toHijri, fromHijri, monthLength, monthDays, shiftMonth, hijriOf } from '../src/lib/hijri.ts';

test('hijri: known dates (tabular calendar is within a day of Umm al-Qura)', () => {
  // 1 Muharram 1447 was 26 or 27 June 2025; 1 Ramadan 1445 was 10 or 11 March 2024; 1 Ramadan 1447 ≈ 18 or 19 Feb 2026.
  const a = toHijri(2025, 6, 27);
  assert.ok(a.year === 1447 && a.month === 1 && a.day <= 2, JSON.stringify(a));
  const b = toHijri(2024, 3, 11);
  assert.ok(b.year === 1445 && b.month === 9 && b.day <= 2, JSON.stringify(b));
  const c = toHijri(2026, 2, 19);
  assert.ok(c.year === 1447 && c.month === 9 && c.day <= 2, JSON.stringify(c));
});

test('hijri: round trip and month lengths', () => {
  for (const [y, m, d] of [[2024, 1, 1], [2024, 2, 29], [2026, 10, 15], [2030, 12, 31], [1999, 7, 4]]) {
    const h = toHijri(y, m, d);
    assert.deepEqual(fromHijri(h.year, h.month, h.day), { y, m, d });
  }
  assert.equal(monthLength(1447, 1), 30);
  assert.equal(monthLength(1447, 2), 29);
  const days = monthDays(1447, 9);
  assert.equal(days.length, monthLength(1447, 9));
  assert.equal(days[0].day, 1);
  assert.deepEqual(shiftMonth(1447, 12, 1), { year: 1448, month: 1 });
  assert.deepEqual(shiftMonth(1447, 1, -1), { year: 1446, month: 12 });
});

test('hijri: adjust shifts by whole days', () => {
  const base = toHijri(2026, 2, 19);
  const plus = toHijri(2026, 2, 19, 1);
  assert.equal(plus.day, base.day === monthLength(base.year, base.month) ? 1 : base.day + 1);
  assert.deepEqual(hijriOf(new Date(2026, 1, 19)), base);
});

// ---------- prayer ----------
import { timesFor, nextPrayer, qiblaBearing, distanceToKaaba, turnToward, countdown } from '../src/lib/prayer.ts';

test('prayer: Makkah times are in the right order and Qibla points at the Kaaba', () => {
  const mecca = { lat: 21.4225, lng: 39.8262 };
  const day = new Date(2026, 5, 21, 12);
  const t = timesFor(mecca, day, 'UmmAlQura', 'shafi');
  const order = [t.fajr, t.sunrise, t.dhuhr, t.asr, t.maghrib, t.isha].map(d => d.getTime());
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  assert.ok(distanceToKaaba(mecca) < 1);
  // From Cairo the Qibla is south-east (~136 degrees)
  const cairo = { lat: 30.0444, lng: 31.2357 };
  const q = qiblaBearing(cairo);
  assert.ok(q > 130 && q < 142, String(q));
  assert.ok(distanceToKaaba(cairo) > 1100 && distanceToKaaba(cairo) < 1300);
  assert.equal(turnToward(350, 10), 20);
  assert.equal(turnToward(10, 350), -20);
});

test('prayer: next prayer rolls over to tomorrow after Isha', () => {
  const cairo = { lat: 30.0444, lng: 31.2357 };
  const noon = new Date(2026, 9, 15, 12, 0);
  const n1 = nextPrayer(cairo, noon, 'Egyptian', 'shafi');
  assert.ok(['dhuhr', 'asr'].includes(n1.name));
  const late = new Date(2026, 9, 15, 23, 59);
  const n2 = nextPrayer(cairo, late, 'Egyptian', 'shafi');
  assert.equal(n2.name, 'fajr');
  assert.ok(n2.at.getTime() > late.getTime());
  assert.deepEqual(countdown(125 * 60_000), { h: 2, m: 5 });
});

// ---------- adhkar ----------
import { CATEGORIES, refsLabel, totalCount } from '../src/lib/adhkar.ts';

test('adhkar: every Quran reference exists and every item has content', () => {
  for (const c of CATEGORIES) {
    assert.ok(c.items.length > 0);
    for (const i of c.items) {
      assert.ok(i.count >= 1);
      assert.ok(i.ar || i.refs?.length, `${c.id}/${i.id} has no content`);
      for (const r of i.refs ?? []) assert.ok(r.ayah >= 1 && r.ayah <= AYAH_COUNTS[r.surah - 1], `${c.id}/${i.id} ${r.surah}:${r.ayah}`);
    }
  }
  assert.equal(refsLabel([{ surah: 2, ayah: 285 }, { surah: 2, ayah: 286 }]), '2:285-286');
  assert.equal(refsLabel([{ surah: 2, ayah: 255 }]), '2:255');
  assert.equal(totalCount(CATEGORIES.find(c => c.id === 'after-prayer')!), 3 + 1 + 33 + 33 + 34 + 1 + 1);
});

// ---------- whole-surah reciters ----------
import { SURAH_RECITERS, isSurahReciterId, surahAudioUrl, surahReciterOf } from '../src/lib/surah-reciters.ts';

test('surah reciters: ids, urls and sizes', () => {
  assert.equal(SURAH_RECITERS.length, 28);
  assert.equal(new Set(SURAH_RECITERS.map(r => r.key)).size, 28, 'keys are unique');
  assert.ok(isSurahReciterId('surah:alafasy'));
  assert.ok(!isSurahReciterId('Alafasy_128kbps'));
  assert.equal(surahAudioUrl('surah:alafasy', 112), 'https://cdn.mp3quran.net/audio/mishary-alafasy/r1/112.mp3');
  assert.equal(surahAudioUrl('surah:alafasy', 1), 'https://cdn.mp3quran.net/audio/mishary-alafasy/r1/001.mp3');
  assert.equal(surahAudioUrl('Alafasy_128kbps', 1), null);
  assert.equal(surahReciterOf('surah:nope'), undefined);
  for (const r of SURAH_RECITERS) {
    assert.ok(r.base.startsWith('https://') && r.base.endsWith('/'), r.key);
    assert.ok(r.mb > 100 && r.mb < 6000, `${r.key} ${r.mb} MB`);
  }
});

// ---------- prayer dashboard ----------
import { prayerWindow, cornerPrayers, formatHMS } from '../src/lib/prayer.ts';

test('prayer window: previous, next and progress', () => {
  const cairo = { lat: 30.0444, lng: 31.2357 };
  const noon = new Date(2026, 9, 15, 15, 0);
  const w = prayerWindow(cairo, noon, 'Egyptian', 'shafi');
  assert.ok(w.prev.at.getTime() <= noon.getTime() && w.next.at.getTime() > noon.getTime());
  assert.ok(w.elapsed > 0 && w.elapsed < 1);
  // before Fajr the previous prayer is yesterday's Isha
  const night = new Date(2026, 9, 15, 2, 0);
  const wn = prayerWindow(cairo, night, 'Egyptian', 'shafi');
  assert.equal(wn.prev.name, 'isha');
  assert.equal(wn.next.name, 'fajr');
  assert.ok(wn.prev.at.getTime() < night.getTime());
  // after Isha: next is tomorrow's Fajr
  const late = prayerWindow(cairo, new Date(2026, 9, 15, 23, 50), 'Egyptian', 'shafi');
  assert.equal(late.next.name, 'fajr');
});

test('prayer corners and countdown text', () => {
  assert.deepEqual(cornerPrayers('asr'), ['fajr', 'dhuhr', 'maghrib', 'isha']);
  assert.deepEqual(cornerPrayers('fajr'), ['dhuhr', 'asr', 'maghrib', 'isha']);
  assert.equal(formatHMS(6_470_000), '1:47:50');
  assert.equal(formatHMS(59_000), '0:00:59');
  assert.equal(formatHMS(0), '0:00:00');
});

// ---------- iqama, ishraq, night ----------
import { IQAMA_DEFAULTS, addMinutes, ishraqAt, nightTimes } from '../src/lib/prayer.ts';

test('prayer: iqama, ishraq and the night', () => {
  const cairo = { lat: 30.0444, lng: 31.2357 };
  const day = new Date(2026, 9, 15, 12);
  const t = timesFor(cairo, day, 'Egyptian', 'shafi');
  assert.equal(addMinutes(t.fajr, IQAMA_DEFAULTS.fajr).getTime() - t.fajr.getTime(), 25 * 60_000);
  assert.equal(ishraqAt(t.sunrise).getTime() - t.sunrise.getTime(), 20 * 60_000);
  const n = nightTimes(cairo, day, 'Egyptian', 'shafi');
  assert.ok(n.midnight.getTime() > t.maghrib.getTime() && n.lastThird.getTime() > n.midnight.getTime());
  const tomorrowFajr = timesFor(cairo, new Date(2026, 9, 16, 12), 'Egyptian', 'shafi').fajr;
  assert.ok(n.lastThird.getTime() < tomorrowFajr.getTime());
  // the middle is really the middle
  const half = (tomorrowFajr.getTime() - t.maghrib.getTime()) / 2;
  assert.ok(Math.abs(n.midnight.getTime() - t.maghrib.getTime() - half) < 1000);
});

// ---------- completed khatmahs ----------
import { archiveKhatmah, completedList, takenDays, daysEarly, plannedPortion } from '../src/lib/habit.ts';

test('habit: history of completed khatmahs', () => {
  let k = createKhatmah({ days: 30, today: '2026-01-01' });
  assert.deepEqual(archiveKhatmah([], k), [], 'unfinished is not archived');
  k = addRead(k, TOTAL_AYAHS, '2026-01-25');
  assert.equal(k.finishedOn, '2026-01-25');
  const h1 = archiveKhatmah([], k);
  assert.equal(h1.length, 1);
  assert.equal(archiveKhatmah(h1, k).length, 1, 'archiving twice adds it once');
  assert.equal(takenDays(h1[0]), 25);
  assert.equal(daysEarly(h1[0]), 5);
  let k2 = createKhatmah({ days: 10, today: '2026-03-01' });
  k2 = addRead(k2, TOTAL_AYAHS, '2026-03-13');
  const list = completedList(h1, k2);
  assert.equal(list.length, 2);
  assert.equal(list[0].finishedOn, '2026-03-13', 'newest first');
  assert.equal(daysEarly(list[0]), -3);
});

test('habit: planned portion for reminders', () => {
  const k = createKhatmah({ days: 30, today: '2026-01-01' });
  const day1 = plannedPortion(k, 1)!;
  assert.deepEqual(day1.from, { surah: 1, ayah: 1 });
  assert.equal(day1.count, Math.ceil(TOTAL_AYAHS / 30));
  const day2 = plannedPortion(k, 2)!;
  assert.equal(indexOf(day2.from.surah, day2.from.ayah), day1.count);
  // if you are ahead, the portion starts at what you have read
  const ahead = plannedPortion(k, 2, 300)!;
  assert.equal(indexOf(ahead.from.surah, ahead.from.ayah), 300);
  assert.equal(plannedPortion(k, 2, 1000), null, 'already read past that day');
  assert.equal(plannedPortion(k, 31, TOTAL_AYAHS), null);
});

// ---------- mushaf pages ----------
import { PAGE_STARTS, TOTAL_PAGES, pageOfIndex, pageRange } from '../src/lib/mushaf.ts';

test('mushaf: 604 pages tile all 6236 ayahs', () => {
  assert.equal(PAGE_STARTS.length, TOTAL_PAGES);
  assert.equal(PAGE_STARTS[0], 0);
  for (let i = 1; i < PAGE_STARTS.length; i++) assert.ok(PAGE_STARTS[i] > PAGE_STARTS[i - 1], `page ${i + 1}`);
  let total = 0;
  for (let p = 1; p <= TOTAL_PAGES; p++) { const [a, b] = pageRange(p); total += b - a; }
  assert.equal(total, TOTAL_AYAHS);
  assert.equal(pageOfIndex(0), 1);
  assert.equal(pageOfIndex(TOTAL_AYAHS - 1), 604);
  // Ayat al-Kursi (2:255) is on page 42 of the Madinah mushaf; the opening of Al-Baqarah (2:1) on page 2
  assert.equal(pageOfIndex(indexOf(2, 255)), 42);
  assert.equal(pageOfIndex(indexOf(2, 1)), 2);
  assert.equal(pageOfIndex(indexOf(112, 1)), 604);
  for (const i of [0, 7, 1000, 3000, 6235]) { const p = pageOfIndex(i); const [a, b] = pageRange(p); assert.ok(i >= a && i < b); }
});

// ---------- mushaf preferences ----------
import { DEFAULT_MUSHAF, normalizeMushaf, stepFont, FONT_MIN, FONT_MAX } from '../src/lib/mushaf-prefs.ts';

test('mushaf prefs: validation and text size steps', () => {
  assert.deepEqual(normalizeMushaf(null), DEFAULT_MUSHAF);
  assert.deepEqual(normalizeMushaf({ view: 'mushaf2', numberColor: 'red', wide: true }), { ...DEFAULT_MUSHAF, view: 'mushaf2', numberColor: 'red', wide: true });
  assert.equal(normalizeMushaf({ view: 'nope' as never }).view, 'list');
  assert.equal(normalizeMushaf({ numberColor: 'pink' as never }).numberColor, 'gold');
  assert.equal(stepFont(32, 1), 34);
  assert.equal(stepFont(FONT_MIN, -1), FONT_MIN);
  assert.equal(stepFont(FONT_MAX, 1), FONT_MAX);
});

// ---------- feature search ----------
import { FEATURES, searchFeatures, normalizeQuery } from '../src/lib/features.ts';

test('feature search: finds features in both languages', () => {
  assert.equal(new Set(FEATURES.map(f => f.id)).size, FEATURES.length, 'ids are unique');
  assert.equal(searchFeatures('').length, 0);
  assert.equal(searchFeatures('sleep')[0].id, 'sleep-timer');
  assert.equal(searchFeatures('نوم')[0].id, 'sleep-timer');
  assert.equal(searchFeatures('تحميل')[0].kind ?? searchFeatures('تحميل')[0].target.kind, 'downloads');
  assert.ok(searchFeatures('download').some(f => f.id === 'download-all'));
  assert.equal(searchFeatures('اذكار')[0].id, 'adhkar', 'alef shapes are ignored');
  assert.equal(searchFeatures('أَذْكَار')[0].id, 'adhkar', 'diacritics are ignored');
  assert.equal(searchFeatures('qibla')[0].target.kind, 'page');
  assert.ok(searchFeatures('prayer').length >= 3);
  assert.equal(searchFeatures('zzzzz').length, 0);
  assert.equal(normalizeQuery('  ÁrAbic  ').length > 0, true);
  // every target page param is a real inner tab
  for (const f of FEATURES) if (f.target.kind === 'page' && f.target.param) {
    const ok = { daily: ['reading', 'khatmah', 'completed'], prayer: ['now', 'times', 'qibla', 'settings'], adhkar: ['khatm'] }[f.target.page as 'daily' | 'prayer' | 'adhkar'];
    assert.ok(ok?.includes(f.target.param), `${f.id}: ${f.target.page}/${f.target.param}`);
  }
});

// ---------------------------------------------------------------- study tools
test('hizb starts: 60 of them, every odd one is a juz start', () => {
  assert.equal(HIZB_STARTS.length, 60);
  JUZ_STARTS.forEach((j, i) => assert.deepEqual(HIZB_STARTS[i * 2], j, `juz ${i + 1}`));
  assert.equal(hizbOf(1, 1), 1);
  assert.equal(hizbOf(2, 74), 1);
  assert.equal(hizbOf(2, 75), 2);
  assert.equal(hizbOf(114, 6), 60);
  assert.equal(juzOf(2, 142), 2);
  assert.equal(juzOf(114, 1), 30);
});

test('annotations set, merge and clear', () => {
  let a = annotate({}, 2, 255, { color: 'green' });
  a = annotate(a, 2, 255, { note: '  Ayat al-Kursi ' });
  assert.deepEqual(a['2:255'], { color: 'green', note: 'Ayat al-Kursi' });
  a = annotate(a, 2, 255, { color: null });
  assert.deepEqual(a['2:255'], { note: 'Ayat al-Kursi' });
  a = annotate(a, 1, 1, { color: 'blue' });
  assert.deepEqual(annotationList(a).map(x => `${x.surah}:${x.ayah}`), ['1:1', '2:255']);
  a = annotate(a, 2, 255, { note: '' });
  assert.equal('2:255' in a, false);
});

test('self-test records mistakes, ranks the weakest and favours them', () => {
  let m = recordAnswer({}, 67, 3, false, '2026-10-12');
  m = recordAnswer(m, 67, 3, true, '2026-10-13');
  m = recordAnswer(m, 67, 5, false, '2026-10-13');
  assert.deepEqual(m['67:3'], { seen: 2, missed: 1, last: '2026-10-13' });
  assert.deepEqual(weakest(m).map(x => x.ayah), [5, 3]);
  const range = { surah: 67, from: 1, to: 6 };
  // Prompt 4 hides ayah 5 (missed) and prompt 2 hides ayah 3: with weights 1,3,1,3,1 a roll of 0 lands on the first.
  assert.equal(pickPrompt(range, {}, () => 0), 1);
  assert.equal(pickPrompt(range, m, () => 0.99), 5);
  assert.equal(pickPrompt({ surah: 1, from: 3, to: 3 }, {}, () => 0.5), 3);
  assert.deepEqual(scoreOf(4, 3), { asked: 4, correct: 3, percent: 75 });
});

test('weekly review calendar counts overdue cards today', () => {
  const cards = [{ due: '2026-10-10' }, { due: '2026-10-12' }, { due: '2026-10-14' }, { due: '2026-10-14' }, { due: '2026-10-30' }];
  const cal = weekCalendar(cards, '2026-10-12', addDays);
  assert.equal(cal.length, 7);
  assert.deepEqual(cal.map(d => d.count), [2, 0, 2, 0, 0, 0, 0]);
  assert.equal(cal[0].isToday, true);
});
