// Run with: node --test scripts/lib.test.ts   (or: npm run test:lib)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseTajweed, plainWords, tajweedColor, wordText } from '../src/lib/tajweed.ts';
import { activeWordAt, estimateSegments, normalizeSegments, wordWeight } from '../src/lib/wordtiming.ts';
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
