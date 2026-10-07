import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RECITERS, type Surah } from '@/lib/quran';
import { formatBytes } from '@/lib/offline';
import { useDownloads } from '@/context/downloads';
import { useSettings } from '@/context/settings';

/** Manage everything saved for offline use (Settings → Offline). */
export function DownloadsList({ surahs }: { surahs: Surah[] }) {
  const { records, remove } = useDownloads();
  const { settings, t } = useSettings();
  const [confirmAll, setConfirmAll] = useState(false);
  const ar = settings.lang === 'ar';
  const total = records.reduce((sum, d) => sum + d.bytes, 0);
  const sorted = [...records].sort((a, b) => a.surah - b.surah);

  const clearAll = async () => {
    for (const d of records) await remove(d.surah, d.reciter, d.ayahs);
    setConfirmAll(false);
  };

  if (records.length === 0) return <p className="text-sm text-muted-foreground">{t('offlineEmpty')}</p>;

  return (
    <div className="space-y-3">
      <ul className="space-y-1">
        {sorted.map(d => {
          const s = surahs.find(x => x.number === d.surah);
          const r = RECITERS.find(x => x.id === d.reciter);
          return (
            <li key={`${d.surah}:${d.reciter}`} className="flex items-center gap-2 rounded-xl bg-muted px-3 py-1">
              <div className="min-w-0 flex-1 py-1.5">
                <p className="truncate text-sm font-medium">{s ? (ar ? s.name : s.englishName) : `#${d.surah}`}</p>
                <p className="truncate text-xs text-muted-foreground">{r ? (ar ? r.ar : r.en) : d.reciter} · <bdi>{formatBytes(d.bytes)}</bdi></p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={`${t('removeDownload')}: ${s ? (ar ? s.name : s.englishName) : d.surah}`}
                onClick={() => void remove(d.surah, d.reciter, d.ayahs)}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{t('offlineTotal')}: <bdi className="font-medium tabular-nums text-foreground">{formatBytes(total)}</bdi></span>
        <Button variant="outline" size="sm" className="h-11 rounded-xl px-4 text-destructive hover:text-destructive" onClick={() => setConfirmAll(true)}>
          {t('removeAll')}
        </Button>
      </div>

      <AlertDialog open={confirmAll} onOpenChange={setConfirmAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('removeAll')}</AlertDialogTitle>
            <AlertDialogDescription>{t('removeAllConfirm', { n: records.length })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void clearAll()}>{t('removeAll')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
