import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { audioUrl, surahTextUrl } from '@/lib/quran';
import { downloadSurah, getDownloads, removeDownload, type DownloadRecord } from '@/lib/offline';
import { useSettings } from '@/context/settings';

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
  remove: (surah: number, reciter: string, ayahCount: number) => Promise<void>;
}

const DownloadsContext = createContext<DownloadsContextValue | null>(null);

const urlsFor = (reciter: string, surah: number, count: number) =>
  Array.from({ length: count }, (_, i) => audioUrl(reciter, surah, i + 1));

export function DownloadsProvider({ children }: { children: ReactNode }) {
  const { t } = useSettings();
  const [records, setRecords] = useState<DownloadRecord[]>(getDownloads);
  const [job, setJob] = useState<Job | null>(null);
  const abort = useRef<AbortController | null>(null);

  const has = useCallback((s: number, r: string) => records.some(d => d.surah === s && d.reciter === r), [records]);
  const hasAny = useCallback((s: number) => records.some(d => d.surah === s), [records]);

  const start = useCallback(
    async (surah: number, ayahCount: number, reciter: string) => {
      if (abort.current) return; // one download at a time
      const controller = new AbortController();
      abort.current = controller;
      setJob({ surah, reciter, done: 0, total: ayahCount });
      try {
        await downloadSurah({
          surah,
          reciter,
          textUrl: surahTextUrl(surah),
          audioUrls: urlsFor(reciter, surah, ayahCount),
          signal: controller.signal,
          onProgress: (done, total) => setJob({ surah, reciter, done, total }),
        });
        setRecords(getDownloads());
        toast.success(t('downloadDone'));
      } catch {
        if (!controller.signal.aborted) toast.error(t('downloadFailed'));
      } finally {
        abort.current = null;
        setJob(null);
      }
    },
    [t],
  );

  const cancel = useCallback(() => abort.current?.abort(), []);

  const remove = useCallback(async (surah: number, reciter: string, ayahCount: number) => {
    await removeDownload(surah, reciter, urlsFor(reciter, surah, ayahCount));
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
