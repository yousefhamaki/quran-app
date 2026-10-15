import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DownloadResumable } from 'expo-file-system/legacy';
import { audioUrl, isSurahReciter, surahTextUrl } from '@/lib/quran';
import { downloadSurah, getDownloads, removeDownload, type DownloadRecord } from '@/lib/offline';
import { useSettings } from '@/context/settings';
import { useToast } from '@/context/toast';

interface Job {
  surah: number;
  reciter: string;
  done: number;
  total: number;
  /** Set while a queue of several surahs runs: which surah of how many. */
  queue?: { index: number; total: number };
}

export interface QueueItem {
  surah: number;
  ayahCount: number;
}

interface DownloadsContextValue {
  records: DownloadRecord[];
  /** The download currently running, if any (one at a time). */
  job: Job | null;
  has: (surah: number, reciter: string) => boolean;
  /** Any reciter downloaded for this surah? */
  hasAny: (surah: number) => boolean;
  start: (surah: number, ayahCount: number, reciter: string) => Promise<void>;
  /** Download several surahs one after another (already downloaded ones are skipped). */
  startMany: (items: QueueItem[], reciter: string) => Promise<void>;
  cancel: () => void;
  remove: (surah: number, reciter: string) => Promise<void>;
}

const DownloadsContext = createContext<DownloadsContextValue | null>(null);

export function DownloadsProvider({ children }: { children: ReactNode }) {
  const { t } = useSettings();
  const toast = useToast();
  const [records, setRecords] = useState<DownloadRecord[]>(getDownloads);
  const [job, setJob] = useState<Job | null>(null);
  const cancelled = useRef(false);
  const running = useRef(false);
  const tasks = useRef<Set<DownloadResumable>>(new Set());

  const has = useCallback((s: number, r: string) => records.some(d => d.surah === s && d.reciter === r), [records]);
  const hasAny = useCallback((s: number) => records.some(d => d.surah === s), [records]);

  /** Downloads one surah; returns false if it failed or was cancelled. */
  const runOne = useCallback(async (surah: number, ayahCount: number, reciter: string, queue: Job['queue']): Promise<boolean> => {
    setJob({ surah, reciter, done: 0, total: ayahCount, queue });
    try {
      await downloadSurah({
        surah,
        reciter,
        textUrl: surahTextUrl(surah),
        audioUrls: isSurahReciter(reciter) ? [audioUrl(reciter, surah, 1)] : Array.from({ length: ayahCount }, (_, i) => audioUrl(reciter, surah, i + 1)),
        isCancelled: () => cancelled.current,
        track: task => tasks.current.add(task),
        onProgress: (done, total) => setJob({ surah, reciter, done, total, queue }),
      });
      setRecords(getDownloads());
      return true;
    } catch {
      return false;
    } finally {
      tasks.current.clear();
    }
  }, []);

  const startMany = useCallback(
    async (items: QueueItem[], reciter: string) => {
      if (running.current) return; // one queue at a time
      const todo = items.filter(i => !getDownloads().some(d => d.surah === i.surah && d.reciter === reciter));
      if (todo.length === 0) return;
      running.current = true;
      cancelled.current = false;
      let ok = 0;
      try {
        for (let i = 0; i < todo.length; i++) {
          if (cancelled.current) break;
          const queue = todo.length > 1 ? { index: i + 1, total: todo.length } : undefined;
          if (await runOne(todo[i].surah, todo[i].ayahCount, reciter, queue)) ok++;
          else if (!cancelled.current) toast.error(t('downloadFailed'));
        }
        if (ok > 0 && !cancelled.current) toast.success(todo.length > 1 ? t('downloadQueueDone', { n: ok }) : t('downloadDone'));
      } finally {
        running.current = false;
        setJob(null);
      }
    },
    [runOne, t, toast],
  );

  const start = useCallback((surah: number, ayahCount: number, reciter: string) => startMany([{ surah, ayahCount }], reciter), [startMany]);

  const cancel = useCallback(() => {
    cancelled.current = true;
    tasks.current.forEach(task => void task.cancelAsync().catch(() => {}));
  }, []);

  const remove = useCallback(async (surah: number, reciter: string) => {
    await removeDownload(surah, reciter);
    setRecords(getDownloads());
  }, []);

  const value = useMemo(() => ({ records, job, has, hasAny, start, startMany, cancel, remove }), [records, job, has, hasAny, start, startMany, cancel, remove]);
  return <DownloadsContext.Provider value={value}>{children}</DownloadsContext.Provider>;
}

export function useDownloads() {
  const ctx = useContext(DownloadsContext);
  if (!ctx) throw new Error('useDownloads must be used inside <DownloadsProvider>');
  return ctx;
}
