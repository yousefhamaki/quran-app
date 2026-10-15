import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadJSON, saveJSON } from '@/lib/storage';
import {
  TOTAL_AYAHS,
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
import { fetchSurah, fetchSurahs } from '@/lib/quran';
import { usePlayer } from '@/context/player';
import { useSettings } from '@/context/settings';

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

function useToday() {
  const [today, setToday] = useState(() => dateString());
  useEffect(() => {
    const refresh = () => setToday(prev => { const now = dateString(); return now === prev ? prev : now; });
    const id = setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  return today;
}

export function HabitProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Stored>(() => ({ ...DEFAULT, ...loadJSON<Partial<Stored>>(KEY, {}) }));
  const today = useToday();
  const { isPlaying } = usePlayer();
  const { t } = useSettings();

  useEffect(() => saveJSON(KEY, data), [data]);

  const recordRead = useCallback(() => {
    setData(d => {
      const days = recordDay(d.days, dateString());
      return days === d.days ? d : { ...d, days };
    });
  }, []);

  // Listening counts as reading.
  useEffect(() => { if (isPlaying) recordRead(); }, [isPlaying, today, recordRead]);

  // Browser reminder: only fires while the app is open (a web page cannot wake itself up).
  const { enabled, hour, minute } = data.reminder;
  useEffect(() => {
    if (!enabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const at = new Date();
    at.setHours(hour, minute, 0, 0);
    if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1);
    const id = setTimeout(async () => {
      const ref = dailyAyah(dateString());
      let body = t('reminderBodyFallback');
      try { body = (await fetchSurah(ref.surah)).find(a => a.number === ref.ayah)?.ar ?? body; } catch { /* offline: generic text */ }
      new Notification(t('reminderTitle'), { body, tag: 'daily-ayah', lang: 'ar' });
      setData(d => ({ ...d })); // re-arm for tomorrow
    }, at.getTime() - Date.now());
    return () => clearTimeout(id);
  }, [enabled, hour, minute, t, data]);

  // Khatmah reminder (browser, only while the app is open): today's portion of the khatmah.
  const kr = data.khatmahReminder;
  useEffect(() => {
    if (!kr.enabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const at = new Date();
    at.setHours(kr.hour, kr.minute, 0, 0);
    if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1);
    const id = setTimeout(async () => {
      let body = t('khatmahReminderFallback');
      const k = data.khatmah;
      if (k && k.read < TOTAL_AYAHS) {
        const p = plannedPortion(k, khatmahStats(k, dateString()).day);
        if (p) {
          try {
            const names = await fetchSurahs();
            const name = (n: number) => names.find(s => s.number === n)?.name ?? `#${n}`;
            body = t('khatmahReminderBody', { from: `${name(p.from.surah)} ${p.from.ayah}`, to: `${name(p.to.surah)} ${p.to.ayah}`, n: p.count });
          } catch { /* offline: generic text */ }
        }
      }
      new Notification(t('khatmahReminderTitle'), { body, tag: 'khatmah', lang: 'ar' });
      setData(d => ({ ...d })); // re-arm for tomorrow
    }, at.getTime() - Date.now());
    return () => clearTimeout(id);
  }, [kr.enabled, kr.hour, kr.minute, t, data]);

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
      recordRead,
      startKhatmah,
      finishToday,
      readExtra,
      removeKhatmah,
      setReminder,
    }),
    [data, today, recordRead, startKhatmah, finishToday, readExtra, removeKhatmah, setReminder, setKhatmahReminder],
  );
  return <HabitContext.Provider value={value}>{children}</HabitContext.Provider>;
}

export function useHabit() {
  const ctx = useContext(HabitContext);
  if (!ctx) throw new Error('useHabit must be used inside <HabitProvider>');
  return ctx;
}
