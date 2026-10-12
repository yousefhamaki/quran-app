/**
 * Memorization plan with spaced repetition (a simple Leitner system).
 *
 * Every day the plan hands out one new portion to learn (`pace` ayahs). Once you mark it learned it becomes a
 * card that comes back for review after 1, 2, 4, 8, 16, 32, 64 days: rating it "Good" moves it one box up,
 * "Easy" two boxes, "Again" sends it back to the first box. Days are plain local dates ("2026-10-12").
 * (No imports on purpose, so this file can be unit-tested with plain Node.)
 */

export type Rating = 'again' | 'good' | 'easy';

export interface Card {
  id: string;
  /** Ayahs from..to of the plan's surah. */
  from: number;
  to: number;
  /** Leitner box, 0 = newest. */
  box: number;
  /** Next review day. */
  due: string;
  learnedOn: string;
  reviews: number;
}

export interface Plan {
  surah: number;
  /** Number of ayahs in the surah. */
  total: number;
  /** First ayah the plan covers (usually 1). */
  start: number;
  /** New ayahs to learn per day. */
  pace: number;
  createdOn: string;
  /** Next ayah that has not been learned yet. */
  nextAyah: number;
  /** Day the last portion was learned (only one new portion per day). */
  lastLearnOn: string | null;
  cards: Card[];
}

/** Days until the next review for each box. */
export const INTERVALS = [1, 2, 4, 8, 16, 32, 64];
export const MAX_BOX = INTERVALS.length - 1;

// ---------- dates ----------

const pad = (n: number) => String(n).padStart(2, '0');

export function dateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return dateString(new Date(y, m - 1, d + days));
}

/** Whole days from `a` to `b` (negative if b is earlier). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

// ---------- plan ----------

export function createPlan(args: { surah: number; total: number; start?: number; pace: number; today: string }): Plan {
  const start = Math.min(Math.max(1, args.start ?? 1), args.total);
  return {
    surah: args.surah,
    total: args.total,
    start,
    pace: Math.max(1, Math.round(args.pace)),
    createdOn: args.today,
    nextAyah: start,
    lastLearnOn: null,
    cards: [],
  };
}

export interface Portion {
  from: number;
  to: number;
}

/** Today's new portion, or null when you already learned today or the whole surah is done. */
export function learnTask(plan: Plan, today: string): Portion | null {
  if (plan.lastLearnOn === today) return null;
  if (plan.nextAyah > plan.total) return null;
  return { from: plan.nextAyah, to: Math.min(plan.total, plan.nextAyah + plan.pace - 1) };
}

/** Marks today's portion as learned: it becomes a card due after the first interval. */
export function completeLearn(plan: Plan, today: string): Plan {
  const task = learnTask(plan, today);
  if (!task) return plan;
  const card: Card = {
    id: `${plan.surah}:${task.from}-${task.to}`,
    from: task.from,
    to: task.to,
    box: 0,
    due: addDays(today, INTERVALS[0]),
    learnedOn: today,
    reviews: 0,
  };
  return { ...plan, nextAyah: task.to + 1, lastLearnOn: today, cards: [...plan.cards, card] };
}

/** Cards to review today (including overdue ones), most overdue first. */
export function dueCards(plan: Plan, today: string): Card[] {
  return plan.cards.filter(c => c.due <= today).sort((a, b) => (a.due === b.due ? a.from - b.from : a.due < b.due ? -1 : 1));
}

export function rateCard(plan: Plan, cardId: string, rating: Rating, today: string): Plan {
  return {
    ...plan,
    cards: plan.cards.map(c => {
      if (c.id !== cardId) return c;
      const box = rating === 'again' ? 0 : Math.min(MAX_BOX, c.box + (rating === 'easy' ? 2 : 1));
      return { ...c, box, due: addDays(today, INTERVALS[box]), reviews: c.reviews + 1 };
    }),
  };
}

export interface PlanStats {
  /** Ayahs learned so far. */
  memorized: number;
  /** Ayahs the plan covers in total. */
  covered: number;
  percent: number;
  dueToday: number;
  /** True when the whole surah has been learned. */
  finished: boolean;
  /** Days until the whole surah is learned at the current pace (0 when finished). */
  daysLeft: number;
}

export function planStats(plan: Plan, today: string): PlanStats {
  const covered = plan.total - plan.start + 1;
  const memorized = plan.cards.reduce((sum, c) => sum + (c.to - c.from + 1), 0);
  const remaining = Math.max(0, plan.total - plan.nextAyah + 1);
  return {
    memorized,
    covered,
    percent: covered > 0 ? Math.round((memorized / covered) * 100) : 0,
    dueToday: dueCards(plan, today).length,
    finished: plan.nextAyah > plan.total,
    daysLeft: Math.ceil(remaining / plan.pace),
  };
}

/** The next few days that have reviews waiting (for the "coming up" list). */
export function upcoming(plan: Plan, today: string, limit = 5): { due: string; count: number }[] {
  const byDay = new Map<string, number>();
  for (const c of plan.cards) if (c.due > today) byDay.set(c.due, (byDay.get(c.due) ?? 0) + 1);
  return [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).slice(0, limit).map(([due, count]) => ({ due, count }));
}
