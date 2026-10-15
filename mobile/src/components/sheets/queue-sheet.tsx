import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ArrowDownToLine, Check, X } from 'lucide-react-native';
import { Sheet } from '@/components/sheet';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Progress } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { juzSurahs } from '@/lib/juz';
import { formatBytes } from '@/lib/offline';
import { RECITERS, estimateReciterBytes } from '@/lib/quran';
import { useDownloads } from '@/context/downloads';
import { useSettings } from '@/context/settings';
import { useSurahs } from '@/context/surahs';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Download several surahs, or a whole juz, as a queue (one after another, with the saved reciter). */
export function QueueSheet({ open, onClose }: Props) {
  const { settings, t, isRTL } = useSettings();
  const { surahs, byNumber } = useSurahs();
  const { has, job, startMany, cancel } = useDownloads();
  const reciter = RECITERS.find(r => r.id === settings.reciter) ?? RECITERS[0];
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const running = job !== null;

  const todo = useMemo(() => surahs.filter(s => picked.has(s.number) && !has(s.number, reciter.id)), [surahs, picked, has, reciter.id]);
  const skipped = picked.size - todo.length;
  const bytes = todo.reduce((sum, s) => sum + estimateReciterBytes(reciter.id, s.numberOfAyahs), 0);
  const big = bytes > 500 * 1048576;
  const pct = job && job.total > 0 ? Math.round((job.done / job.total) * 100) : 0;
  const nameOf = (n: number) => { const s = byNumber(n); return s ? (isRTL ? s.name : s.englishName) : `#${n}`; };

  const toggle = (n: number) => setPicked(prev => { const next = new Set(prev); if (next.has(n)) next.delete(n); else next.add(n); return next; });
  const addJuz = (juz: number) => setPicked(prev => new Set([...prev, ...juzSurahs(juz)]));

  const footer = job ? (
    <View className="gap-2" accessibilityLiveRegion="polite">
      <View className="flex-row items-center justify-between gap-3">
        <Text numberOfLines={1} className="flex-1 text-sm">{job.queue ? `${t('queueProgress', { i: job.queue.index, n: job.queue.total })} · ` : ''}{nameOf(job.surah)}</Text>
        <Text className="text-sm text-muted-foreground">{job.done}/{job.total} · {pct}%</Text>
      </View>
      <Progress value={pct} />
      <Button variant="outline" className="h-11 rounded-xl" onPress={cancel}>
        <Icon as={X} className="size-4" />
        <Text>{t('cancel')}</Text>
      </Button>
    </View>
  ) : (
    <View className="gap-2">
      {big ? <Text accessibilityRole="alert" className="rounded-xl bg-secondary p-3 text-xs text-secondary-foreground">{t('queueBigWarning', { size: formatBytes(bytes) })}</Text> : null}
      {picked.size > 0 ? (
        <Text className="text-sm text-muted-foreground">
          {t('queueSelected', { n: todo.length, size: formatBytes(bytes) })}
          {skipped > 0 ? ` · ${t('queueAlready', { n: skipped })}` : ''}
        </Text>
      ) : null}
      <Button size="lg" className="h-12 rounded-xl" disabled={todo.length === 0} onPress={() => void startMany(todo.map(s => ({ surah: s.number, ayahCount: s.numberOfAyahs })), reciter.id)}>
        <Icon as={ArrowDownToLine} className="size-5 text-primary-foreground" />
        <Text className="text-base">{t('queueStart', { n: todo.length })}</Text>
      </Button>
    </View>
  );

  return (
    <Sheet open={open} tall onClose={onClose} title={t('queueTitle')} description={`${t('queueHint')} · ${isRTL ? reciter.ar : reciter.en}`} footer={footer}>
      <View className="gap-5 pb-4">
        <Button variant="secondary" disabled={running} className="h-12 rounded-xl" onPress={() => setPicked(new Set(surahs.map(s => s.number)))}>
          <Text className="text-base">{t('queueWholeQuran')}</Text>
        </Button>
        <View className="gap-2">
          <Text className="text-sm font-medium text-muted-foreground">{t('queueJuz')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {Array.from({ length: 30 }, (_, i) => i + 1).map(n => (
              <Button key={n} variant="outline" disabled={running} className="h-11 min-w-11 rounded-full px-3" onPress={() => addJuz(n)} accessibilityLabel={`${t('queueJuz')} ${n}`}>
                <Text>{n}</Text>
              </Button>
            ))}
          </View>
        </View>

        <View className="gap-2">
          <View className="flex-row items-center justify-between gap-3">
            <Text accessibilityRole="header" className="text-sm font-medium text-muted-foreground">{t('queueSurahs')}</Text>
            <View className="flex-row gap-1">
              <Button variant="ghost" disabled={running} className="h-9 rounded-lg px-3" onPress={() => setPicked(new Set(surahs.map(s => s.number)))}>
                <Text className="text-primary">{t('queueSelectAll')}</Text>
              </Button>
              <Button variant="ghost" disabled={running || picked.size === 0} className="h-9 rounded-lg px-3" onPress={() => setPicked(new Set())}>
                <Text>{t('queueClear')}</Text>
              </Button>
            </View>
          </View>
          {surahs.map(s => {
            const on = picked.has(s.number);
            return (
              <Pressable
                key={s.number}
                disabled={running}
                onPress={() => toggle(s.number)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on, disabled: running }}
                className={cn('min-h-12 flex-row items-center gap-3 rounded-xl px-3 active:bg-accent', on ? 'bg-primary/15' : 'bg-muted', running && 'opacity-60')}
              >
                <View className={cn('size-5 items-center justify-center rounded-md border', on ? 'border-primary bg-primary' : 'border-input')}>
                  {on ? <Icon as={Check} className="size-3.5 text-primary-foreground" /> : null}
                </View>
                <Text className="w-7 text-center text-xs text-muted-foreground">{s.number}</Text>
                <Text numberOfLines={1} className="flex-1 text-sm">{isRTL ? s.name : s.englishName}</Text>
                {has(s.number, reciter.id) ? <Text className="text-xs text-primary">{t('offlineReady')}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Sheet>
  );
}
