import { useState } from 'react';
import { View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { RECITERS } from '@/lib/quran';
import { formatBytes } from '@/lib/offline';
import { useDownloads } from '@/context/downloads';
import { useSettings } from '@/context/settings';
import { useSurahs } from '@/context/surahs';

/** Manage everything saved for offline use (Settings → Offline downloads). */
export function DownloadsList() {
  const { records, remove } = useDownloads();
  const { t, isRTL } = useSettings();
  const { byNumber } = useSurahs();
  const [confirming, setConfirming] = useState(false);
  const total = records.reduce((sum, d) => sum + d.bytes, 0);
  const sorted = [...records].sort((a, b) => a.surah - b.surah);

  const clearAll = async () => {
    for (const d of records) await remove(d.surah, d.reciter);
    setConfirming(false);
  };

  if (records.length === 0) return <Text className="text-sm text-muted-foreground">{t('offlineEmpty')}</Text>;

  return (
    <View className="gap-3">
      {sorted.map(d => {
        const s = byNumber(d.surah);
        const r = RECITERS.find(x => x.id === d.reciter);
        const name = s ? (isRTL ? s.name : s.englishName) : `#${d.surah}`;
        return (
          <View key={`${d.surah}:${d.reciter}`} className="flex-row items-center gap-2 rounded-xl bg-muted ps-4">
            <View className="flex-1 py-2.5">
              <Text numberOfLines={1} className="text-sm font-medium">{name}</Text>
              <Text numberOfLines={1} className="text-xs text-muted-foreground">{r ? (isRTL ? r.ar : r.en) : d.reciter} · {formatBytes(d.bytes)}</Text>
            </View>
            <Button variant="ghost" size="icon" className="size-11" accessibilityLabel={`${t('removeDownload')}: ${name}`} onPress={() => void remove(d.surah, d.reciter)}>
              <Icon as={Trash2} className="size-4 text-muted-foreground" />
            </Button>
          </View>
        );
      })}

      {confirming ? (
        <View className="gap-3 rounded-2xl border border-destructive/40 p-4">
          <Text className="text-sm">{t('removeAllConfirm', { n: records.length })}</Text>
          <View className="flex-row justify-end gap-2">
            <Button variant="ghost" className="h-11 rounded-xl px-4" onPress={() => setConfirming(false)}>
              <Text>{t('cancel')}</Text>
            </Button>
            <Button variant="destructive" className="h-11 rounded-xl px-4" onPress={() => void clearAll()}>
              <Text className="text-white">{t('removeAll')}</Text>
            </Button>
          </View>
        </View>
      ) : (
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-sm text-muted-foreground">{t('offlineTotal')}: <Text className="text-sm font-medium">{formatBytes(total)}</Text></Text>
          <Button variant="outline" className="h-11 rounded-xl px-4" onPress={() => setConfirming(true)}>
            <Text className="text-destructive">{t('removeAll')}</Text>
          </Button>
        </View>
      )}
    </View>
  );
}
