import { ArrowDownToLine, CircleCheck, Trash2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { RECITERS, type Surah } from '@/lib/quran';
import { estimateBytes, formatBytes, offlineSupported } from '@/lib/offline';
import { useDownloads } from '@/context/downloads';
import { useSettings } from '@/context/settings';

interface Props {
  surah: Surah;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Download one surah (text + audio for the saved reciter) for offline listening. */
export function DownloadSheet({ surah, open, onOpenChange }: Props) {
  const { settings, t } = useSettings();
  const { records, job, start, cancel, remove } = useDownloads();
  const ar = settings.lang === 'ar';
  const reciter = RECITERS.find(r => r.id === settings.reciter) ?? RECITERS[0];
  const record = records.find(d => d.surah === surah.number && d.reciter === reciter.id) ?? null;
  const running = job && job.surah === surah.number && job.reciter === reciter.id ? job : null;
  const otherRunning = job !== null && !running;
  const pct = running && running.total > 0 ? Math.round((running.done / running.total) * 100) : 0;
  const reciterName = ar ? reciter.ar : reciter.en;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] w-full max-w-3xl gap-0 overflow-y-auto rounded-t-3xl p-0 [&>*]:shrink-0">
        <SheetHeader className="px-5 pt-5 pb-3 text-start">
          <SheetTitle className="font-display text-2xl">{t('offlineTitle')}</SheetTitle>
          <SheetDescription className={cn(ar && 'font-quran text-base')}>
            {ar ? surah.name : surah.englishName} · {surah.numberOfAyahs} {t('ayahs')}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <dl className="space-y-2 rounded-2xl bg-muted p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t('reciter')}</dt>
              <dd className="font-medium">{reciterName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{record ? t('offlineSize') : t('offlineEstimate')}</dt>
              <dd dir="ltr" className="font-medium tabular-nums">{record ? formatBytes(record.bytes) : `≈ ${formatBytes(estimateBytes(surah.numberOfAyahs))}`}</dd>
            </div>
          </dl>

          {!offlineSupported && <p role="alert" className="text-sm text-destructive">{t('offlineUnsupported')}</p>}

          {running && (
            <div className="space-y-2" aria-live="polite">
              <div className="flex items-center justify-between text-sm">
                <span>{t('downloading')}</span>
                <span className="tabular-nums text-muted-foreground">{running.done}/{running.total} · {pct}%</span>
              </div>
              <Progress value={pct} aria-label={t('downloading')} />
              <Button variant="outline" className="h-11 w-full gap-2 rounded-xl" onClick={cancel}>
                <X className="size-4" aria-hidden /> {t('cancel')}
              </Button>
            </div>
          )}

          {!running && record && (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-medium text-primary">
                <CircleCheck className="size-5" aria-hidden /> {t('offlineReady')}
              </p>
              <Button
                variant="outline"
                className="h-11 w-full gap-2 rounded-xl text-destructive hover:text-destructive"
                onClick={() => void remove(surah.number, reciter.id, surah.numberOfAyahs)}
              >
                <Trash2 className="size-4" aria-hidden /> {t('removeDownload')}
              </Button>
            </div>
          )}

          {!running && !record && (
            <Button
              className="h-12 w-full gap-2 rounded-xl text-base"
              disabled={!offlineSupported || otherRunning}
              onClick={() => void start(surah.number, surah.numberOfAyahs, reciter.id)}
            >
              <ArrowDownToLine className="size-5" aria-hidden /> {t('downloadSurah')}
            </Button>
          )}
          {otherRunning && <p className="text-xs text-muted-foreground">{t('downloadBusy')}</p>}

          <p className="text-xs text-muted-foreground">{t('offlineHint')}</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
