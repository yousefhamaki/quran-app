import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DownloadResumable } from 'expo-file-system/legacy';
import { audioUrl, surahTextUrl } from '@/lib/quran';
import { downloadSurah, getDownloads, removeDownload, type DownloadRecord } from '@/lib/offline';
import { useSettings } from '@/context/settings';
import { useToast } from '@/context/toast';

interface Job {
  surah: number;
  reciter: string;
  done: number;
  total: number;
}

interface DownloadsContextValue {
  records: DownloadRecord[];
  /** The download currently running, if any (one at a time). */
  job: Job | null;
  has: (surah: number, reciter: string) => boolean;
  /** Any reciter downloaded for this surah? */
  hasAny: (surah: number) => boolean;
  start: (surah: number, ayahCount: number, reciter: string) => Promise<void>;
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

  const start = useCallback(
    async (surah: number, ayahCount: number, reciter: string) => {
      if (running.current) return; // one download at a time
      running.current = true;
      cancelled.current = false;
      setJob({ surah, reciter, done: 0, total: ayahCount });
      try {
        await downloadSurah({
          surah,
          reciter,
          textUrl: surahTextUrl(surah),
          audioUrls: Array.from({ length: ayahCount }, (_, i) => audioUrl(reciter, surah, i + 1)),
          isCancelled: () => cancelled.current,
          track: task => tasks.current.add(task),
          onProgress: (done, total) => setJob({ surah, reciter, done, total }),
        });
        setRecords(getDownloads());
        toast.success(t('downloadDone'));
      } catch {
        if (!cancelled.current) toast.error(t('downloadFailed'));
      } finally {
        tasks.current.clear();
        running.current = false;
        setJob(null);
      }
    },
    [t, toast],
  );

  const cancel = useCallback(() => {
    cancelled.current = true;
    tasks.current.forEach(task => void task.cancelAsync().catch(() => {}));
  }, []);

  const remove = useCallback(async (surah: number, reciter: string) => {
    await removeDownload(surah, reciter);
    setRecords(getDownloads());
  }, []);

  const value = useMemo(() => ({ records, job, has, hasAny, start, cancel, remove }), [records, job, has, hasAny, start, cancel, remove]);
  return <DownloadsContext.Provider value={value}>{children}</DownloadsContext.Provider>;
}

export function useDownloads() {
  const ctx = useContext(DownloadsContext);
  if (!ctx) throw new Error('useDownloads must be used inside <DownloadsProvider>');
  return ctx;
}
