import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { loadJSON, saveJSON } from '@/lib/storage';
import {
  archiveKhatmah,
  completedList,
  plannedPortion,
  type CompletedKhatmah,
  addRead,
  createKhatmah,
  currentStreak,
  dailyAyah,
  dateString,
  khatmahStats,
  lastWeek,
  longestStreak,
  markToday,
  recordDay,
  type Khatmah,
  type KhatmahStats,
  type Ref,
} from '@/lib/habit';
import { syncKhatmahReminder, syncReminder, type ReminderResult } from '@/lib/reminders';
import { refreshWidgets } from '@/lib/widgets';
import { usePlayer } from '@/context/player';
import { useSettings } from '@/context/settings';
import { useSurahs } from '@/context/surahs';

export interface Reminder {
  enabled: boolean;
  hour: number;
  minute: number;
}

interface Stored {
  khatmah: Khatmah | null;
  /** Finished khatmahs that were replaced by a new one (the current finished one is not in here yet). */
  history: CompletedKhatmah[];
  days: string[];
  reminder: Reminder;
  /** A second, separate reminder with the khatmah's portion for the day. */
  khatmahReminder: Reminder;
}

interface HabitContextValue {
  today: string;
  khatmah: Khatmah | null;
  stats: KhatmahStats | null;
  streak: number;
  longest: number;
  week: { day: string; read: boolean }[];
  readToday: boolean;
  ayahOfDay: Ref;
  reminder: Reminder;
  /** Outcome of the last attempt to schedule the reminder ('denied' = the user blocked notifications). */
  reminderStatus: ReminderResult | null;
  /** Same for the khatmah reminder. */
  khatmahReminderStatus: ReminderResult | null;
  /** Count today as a day of reading (keeps the streak alive). */
  recordRead: () => void;
  startKhatmah: (days: number) => void;
  /** "I read today's portion". */
  finishToday: () => void;
  readExtra: (ayahs: number) => void;
  removeKhatmah: () => void;
  setReminder: (r: Reminder) => void;
  /** Finished khatmahs, newest first. */
  completed: CompletedKhatmah[];
  khatmahReminder: Reminder;
  setKhatmahReminder: (r: Reminder) => void;
}

const HabitContext = createContext<HabitContextValue | null>(null);
const KEY = 'quran.habit';
const DEFAULT: Stored = { khatmah: null, history: [], days: [], reminder: { enabled: false, hour: 20, minute: 0 }, khatmahReminder: { enabled: false, hour: 9, minute: 0 } };

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

export function HabitProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Stored>(() => ({ ...DEFAULT, ...loadJSON<Partial<Stored>>(KEY, {}) }));
  const [reminderStatus, setReminderStatus] = useState<ReminderResult | null>(null);
  const [khatmahReminderStatus, setKhatmahReminderStatus] = useState<ReminderResult | null>(null);
  const today = useToday();
  const { isPlaying } = usePlayer();
  const { t, isRTL } = useSettings();
  const { byNumber } = useSurahs();

  useEffect(() => saveJSON(KEY, data), [data]);

  const recordRead = useCallback(() => {
    setData(d => {
      const days = recordDay(d.days, dateString());
      return days === d.days ? d : { ...d, days };
    });
  }, []);

  // Listening counts as reading.
  useEffect(() => { if (isPlaying) recordRead(); }, [isPlaying, today, recordRead]);

  // Widgets show the ayah of the day: refresh them whenever the day changes or the app opens.
  useEffect(() => { void refreshWidgets(); }, [today]);

  // (Re)schedule the next two weeks of reminders: on change, on a new day and each time the app opens.
  const { enabled, hour, minute } = data.reminder;
  const title = t('reminderTitle');
  const fallback = t('reminderBodyFallback');
  useEffect(() => {
    let cancelled = false;
    syncReminder({ enabled, hour, minute, title, fallback })
      .then(r => !cancelled && setReminderStatus(r))
      .catch(() => !cancelled && setReminderStatus(null));
    return () => { cancelled = true; };
  }, [enabled, hour, minute, title, fallback, today]);

  // The khatmah reminder: a second, separate notification with the day's portion.
  const kr = data.khatmahReminder;
  const khatmahSig = data.khatmah ? `${data.khatmah.startDate}:${data.khatmah.days}:${data.khatmah.read}` : '';
  const kTitle = t('khatmahReminderTitle');
  const kFallback = t('khatmahReminderFallback');
  useEffect(() => {
    let cancelled = false;
    const name = (n: number) => { const s = byNumber(n); return s ? (isRTL ? s.name : s.englishName) : `#${n}`; };
    syncKhatmahReminder({
      enabled: kr.enabled, hour: kr.hour, minute: kr.minute, khatmah: data.khatmah, title: kTitle, fallback: kFallback,
      body: (from, to, n) => t('khatmahReminderBody', { from: `${name(from.surah)} ${from.ayah}`, to: `${name(to.surah)} ${to.ayah}`, n }),
    }).then(r => !cancelled && setKhatmahReminderStatus(r)).catch(() => !cancelled && setKhatmahReminderStatus(null));
    return () => { cancelled = true; };
    // data.khatmah is summarised by khatmahSig
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kr.enabled, kr.hour, kr.minute, khatmahSig, kTitle, kFallback, isRTL, today]);

  const startKhatmah = useCallback((days: number) => setData(d => ({ ...d, history: archiveKhatmah(d.history, d.khatmah), khatmah: createKhatmah({ days, today: dateString() }) })), []);
  const finishToday = useCallback(() => {
    setData(d => {
      if (!d.khatmah) return d;
      const now = dateString();
      return { ...d, khatmah: markToday(d.khatmah, now), days: recordDay(d.days, now) };
    });
  }, []);
  const readExtra = useCallback((n: number) => {
    setData(d => {
      if (!d.khatmah) return d;
      const now = dateString();
      return { ...d, khatmah: addRead(d.khatmah, n, now), days: recordDay(d.days, now) };
    });
  }, []);
  const removeKhatmah = useCallback(() => setData(d => ({ ...d, history: archiveKhatmah(d.history, d.khatmah), khatmah: null })), []);
  const setKhatmahReminder = useCallback((khatmahReminder: Reminder) => setData(d => ({ ...d, khatmahReminder })), []);
  const setReminder = useCallback((reminder: Reminder) => setData(d => ({ ...d, reminder })), []);

  const value = useMemo<HabitContextValue>(
    () => ({
      today,
      khatmah: data.khatmah,
      stats: data.khatmah ? khatmahStats(data.khatmah, today) : null,
      streak: currentStreak(data.days, today),
      longest: longestStreak(data.days),
      week: lastWeek(data.days, today),
      readToday: data.days.includes(today),
      ayahOfDay: dailyAyah(today),
      reminder: data.reminder,
      completed: completedList(data.history, data.khatmah),
      khatmahReminder: data.khatmahReminder,
      setKhatmahReminder,
      reminderStatus,
      khatmahReminderStatus,
      recordRead,
      startKhatmah,
      finishToday,
      readExtra,
      removeKhatmah,
      setReminder,
    }),
    [data, today, reminderStatus, khatmahReminderStatus, recordRead, startKhatmah, finishToday, readExtra, removeKhatmah, setReminder, setKhatmahReminder],
  );
  return <HabitContext.Provider value={value}>{children}</HabitContext.Provider>;
}

export function useHabit() {
  const ctx = useContext(HabitContext);
  if (!ctx) throw new Error('useHabit must be used inside <HabitProvider>');
  return ctx;
}
