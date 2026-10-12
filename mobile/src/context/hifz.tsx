import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { loadJSON, saveJSON } from '@/lib/storage';
import {
  completeLearn,
  createPlan,
  dateString,
  dueCards,
  learnTask,
  planStats,
  rateCard,
  upcoming,
  type Card,
  type Plan,
  type PlanStats,
  type Portion,
  type Rating,
} from '@/lib/hifz';

interface HifzContextValue {
  plan: Plan | null;
  /** Today's date, kept current across midnight. */
  today: string;
  /** New portion to learn today, if any. */
  learn: Portion | null;
  /** Cards to review today. */
  due: Card[];
  stats: PlanStats | null;
  coming: { due: string; count: number }[];
  create: (args: { surah: number; total: number; start: number; pace: number }) => void;
  markLearned: () => void;
  rate: (cardId: string, rating: Rating) => void;
  remove: () => void;
}

const HifzContext = createContext<HifzContextValue | null>(null);
const KEY = 'quran.hifz';

/** Keeps "today" correct when the app stays open past midnight or comes back to the foreground. */
function useToday() {
  const [today, setToday] = useState(() => dateString());
  useEffect(() => {
    const refresh = () => setToday(prev => { const now = dateString(); return now === prev ? prev : now; });
    const id = setInterval(refresh, 60_000);
    const sub = AppState.addEventListener('change', state => state === 'active' && refresh());
    return () => { clearInterval(id); sub.remove(); };
  }, []);
  return today;
}

export function HifzProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan | null>(() => loadJSON<Plan | null>(KEY, null));
  const today = useToday();

  useEffect(() => saveJSON(KEY, plan), [plan]);

  const create = useCallback<HifzContextValue['create']>(args => setPlan(createPlan({ ...args, today: dateString() })), []);
  const markLearned = useCallback(() => setPlan(p => (p ? completeLearn(p, dateString()) : p)), []);
  const rate = useCallback<HifzContextValue['rate']>((id, rating) => setPlan(p => (p ? rateCard(p, id, rating, dateString()) : p)), []);
  const remove = useCallback(() => setPlan(null), []);

  const value = useMemo<HifzContextValue>(
    () => ({
      plan,
      today,
      learn: plan ? learnTask(plan, today) : null,
      due: plan ? dueCards(plan, today) : [],
      stats: plan ? planStats(plan, today) : null,
      coming: plan ? upcoming(plan, today) : [],
      create,
      markLearned,
      rate,
      remove,
    }),
    [plan, today, create, markLearned, rate, remove],
  );
  return <HifzContext.Provider value={value}>{children}</HifzContext.Provider>;
}

export function useHifz() {
  const ctx = useContext(HifzContext);
  if (!ctx) throw new Error('useHifz must be used inside <HifzProvider>');
  return ctx;
}
