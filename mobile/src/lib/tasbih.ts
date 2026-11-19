/**
 * Tasbih counter: the dhikrs to count, and the pure state transitions (tap, reset, per-day totals).
 * (No imports on purpose, so this file can be unit-tested with plain Node.)
 */

export interface TasbihDhikr {
  id: string;
  ar: string;
  en: string;
  /** The usual count for this dhikr (0 = no limit). */
  target: number;
}

export const DHIKRS: TasbihDhikr[] = [
  { id: 'subhanallah', ar: 'سُبْحَانَ ٱللَّهِ', en: 'SubhanAllah', target: 33 },
  { id: 'alhamdulillah', ar: 'ٱلْحَمْدُ لِلَّهِ', en: 'Alhamdulillah', target: 33 },
  { id: 'allahuakbar', ar: 'ٱللَّهُ أَكْبَرُ', en: 'Allahu Akbar', target: 34 },
  { id: 'tahlil', ar: 'لَا إِلَٰهَ إِلَّا ٱللَّهُ', en: 'La ilaha illa Allah', target: 100 },
  { id: 'istighfar', ar: 'أَسْتَغْفِرُ ٱللَّهَ', en: 'Astaghfirullah', target: 100 },
  { id: 'salawat', ar: 'ٱللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ', en: 'Salawat on the Prophet ﷺ', target: 100 },
  { id: 'hawqala', ar: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِٱللَّهِ', en: 'La hawla wa la quwwata illa billah', target: 100 },
  { id: 'free', ar: 'عدّاد حر', en: 'Free counter', target: 0 },
];

/** Targets offered in the picker (0 = no limit). */
export const TARGETS = [33, 99, 100, 1000, 0];

export interface DhikrCount {
  /** Count in the current round. */
  count: number;
  /** Rounds completed (the count reached the target). */
  laps: number;
}

export interface TasbihState {
  active: string;
  items: Record<string, DhikrCount>;
  /** Target the user picked per dhikr (falls back to the dhikr's usual target). */
  targets: Record<string, number>;
  /** Taps per day ("2026-11-19" → n). */
  days: Record<string, number>;
  vibrate: boolean;
}

export const DEFAULT_TASBIH: TasbihState = { active: 'subhanallah', items: {}, targets: {}, days: {}, vibrate: true };

const MAX_DAYS = 60;

export const dhikrById = (id: string): TasbihDhikr => DHIKRS.find(d => d.id === id) ?? DHIKRS[0];

export function targetOf(state: TasbihState, id: string): number {
  const t = state.targets[id];
  return typeof t === 'number' && t >= 0 ? t : dhikrById(id).target;
}

export const countOf = (state: TasbihState, id: string): DhikrCount => state.items[id] ?? { count: 0, laps: 0 };

/** One tap on the active dhikr. Reaching the target finishes a round and starts the next from zero. */
export function tap(state: TasbihState, today: string): { state: TasbihState; finishedRound: boolean } {
  const id = state.active;
  const target = targetOf(state, id);
  const cur = countOf(state, id);
  let count = cur.count + 1;
  let laps = cur.laps;
  let finishedRound = false;
  if (target > 0 && count >= target) {
    count = 0;
    laps += 1;
    finishedRound = true;
  }
  const days = { ...state.days, [today]: (state.days[today] ?? 0) + 1 };
  const keys = Object.keys(days).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_DAYS))) delete days[k];
  return { state: { ...state, items: { ...state.items, [id]: { count, laps } }, days }, finishedRound };
}

/** Take one tap back (a mistaken tap). Never goes below zero and never undoes a finished round. */
export function undo(state: TasbihState, today: string): TasbihState {
  const id = state.active;
  const cur = countOf(state, id);
  if (cur.count <= 0) return state;
  const days = { ...state.days, [today]: Math.max(0, (state.days[today] ?? 0) - 1) };
  return { ...state, items: { ...state.items, [id]: { ...cur, count: cur.count - 1 } }, days };
}

export function reset(state: TasbihState): TasbihState {
  return { ...state, items: { ...state.items, [state.active]: { count: 0, laps: 0 } } };
}

export function select(state: TasbihState, id: string): TasbihState {
  return { ...state, active: dhikrById(id).id };
}

export function setTarget(state: TasbihState, id: string, target: number): TasbihState {
  const cur = countOf(state, id);
  // A smaller target must not leave the count past it.
  const count = target > 0 && cur.count >= target ? 0 : cur.count;
  return { ...state, targets: { ...state.targets, [id]: target }, items: { ...state.items, [id]: { ...cur, count } } };
}

/** The total counted this round and in finished rounds of the active dhikr. */
export function totalOf(state: TasbihState, id: string): number {
  const c = countOf(state, id);
  const target = targetOf(state, id);
  return c.laps * target + c.count;
}

/** Fix whatever was saved (old versions, hand-edited storage) so the screen can trust it. */
export function normalizeTasbih(raw: unknown): TasbihState {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<TasbihState>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  const items: Record<string, DhikrCount> = {};
  for (const [k, v] of Object.entries(r.items ?? {})) items[k] = { count: num((v as DhikrCount)?.count), laps: num((v as DhikrCount)?.laps) };
  const targets: Record<string, number> = {};
  for (const [k, v] of Object.entries(r.targets ?? {})) targets[k] = num(v);
  const days: Record<string, number> = {};
  for (const [k, v] of Object.entries(r.days ?? {})) days[k] = num(v);
  return { active: dhikrById(String(r.active ?? '')).id, items, targets, days, vibrate: r.vibrate !== false };
}
