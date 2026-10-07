import { View } from 'react-native';
import { ArrowDownToLine, CircleCheck, Trash2, X } from 'lucide-react-native';
import { Sheet } from '@/components/sheet';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Progress } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { RECITERS } from '@/lib/quran';
import { estimateBytes, formatBytes, offlineSupported } from '@/lib/offline';
import { useDownloads } from '@/context/downloads';
import { useSettings } from '@/context/settings';
import { useSurahs } from '@/context/surahs';
import { useUI } from '@/context/ui';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-4">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="text-sm font-medium">{value}</Text>
    </View>
  );
}

/** Download one surah (text + audio for the saved reciter) for offline listening. */
export function DownloadSheet() {
  const { download, setDownload } = useUI();
  const { settings, t, isRTL } = useSettings();
  const { records, job, start, cancel, remove } = useDownloads();
  const { byNumber } = useSurahs();
  const surah = download ? byNumber(download) : undefined;
  if (!download || !surah) return null;

  const reciter = RECITERS.find(r => r.id === settings.reciter) ?? RECITERS[0];
  const record = records.find(d => d.surah === surah.number && d.reciter === reciter.id) ?? null;
  const running = job && job.surah === surah.number && job.reciter === reciter.id ? job : null;
  const otherRunning = job !== null && !running;
  const pct = running && running.total > 0 ? Math.round((running.done / running.total) * 100) : 0;

  return (
    <Sheet
      open
      onClose={() => setDownload(null)}
      quranTitle={false}
      title={t('offlineTitle')}
      description={`${isRTL ? surah.name : surah.englishName} · ${surah.numberOfAyahs} ${t('ayahs')}`}
    >
      <View className="gap-5 pb-2">
        <View className="gap-2 rounded-2xl bg-muted p-4">
          <Row label={t('reciter')} value={isRTL ? reciter.ar : reciter.en} />
          <Row
            label={record ? t('offlineSize') : t('offlineEstimate')}
            value={record ? formatBytes(record.bytes) : `≈ ${formatBytes(estimateBytes(surah.numberOfAyahs))}`}
          />
        </View>

        {!offlineSupported && <Text className="text-sm text-destructive">{t('offlineUnsupported')}</Text>}

        {running && (
          <View className="gap-2" accessibilityLiveRegion="polite">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm">{t('downloading')}</Text>
              <Text className="text-sm text-muted-foreground">{running.done}/{running.total} · {pct}%</Text>
            </View>
            <Progress value={pct} />
            <Button variant="outline" className="h-11 rounded-xl" onPress={cancel}>
              <Icon as={X} className="size-4" />
              <Text>{t('cancel')}</Text>
            </Button>
          </View>
        )}

        {!running && record && (
          <View className="gap-3">
            <View className="flex-row items-center gap-2">
              <Icon as={CircleCheck} className="size-5 text-primary" />
              <Text className="text-sm font-medium text-primary">{t('offlineReady')}</Text>
            </View>
            <Button variant="outline" className="h-11 rounded-xl" onPress={() => void remove(surah.number, reciter.id)}>
              <Icon as={Trash2} className="size-4 text-destructive" />
              <Text className="text-destructive">{t('removeDownload')}</Text>
            </Button>
          </View>
        )}

        {!running && !record && (
          <Button
            size="lg"
            className="h-12 rounded-xl"
            disabled={!offlineSupported || otherRunning}
            onPress={() => void start(surah.number, surah.numberOfAyahs, reciter.id)}
          >
            <Icon as={ArrowDownToLine} className="size-5 text-primary-foreground" />
            <Text className="text-base">{t('downloadSurah')}</Text>
          </Button>
        )}
        {otherRunning && <Text className="text-xs text-muted-foreground">{t('downloadBusy')}</Text>}

        <Text className="text-xs text-muted-foreground">{t('offlineHint')}</Text>
      </View>
    </Sheet>
  );
}
