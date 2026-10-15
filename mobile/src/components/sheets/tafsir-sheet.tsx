import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { CheckCircle2, ChevronLeft, ChevronRight, CloudDownload } from 'lucide-react-native';
import { Chips } from '@/components/chips';
import { Sheet } from '@/components/sheet';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { TAFSIRS, downloadTafsir, fetchTafsir, isTafsirOffline } from '@/lib/quran';
import { useAyahs } from '@/hooks/use-ayahs';
import { useSettings } from '@/context/settings';
import { useSurahs } from '@/context/surahs';
import { useUI } from '@/context/ui';

type State = { state: 'loading' | 'error' } | { state: 'ok'; text: string };

/** Dedicated tafsir reader: pick a source with one tap, step through ayahs without closing. */
export function TafsirSheet() {
  const { tafsir: target, setTafsir } = useUI();
  const { settings, update, t, isRTL } = useSettings();
  const { byNumber } = useSurahs();
  const { ayahs } = useAyahs(target?.surah ?? null);
  const [result, setResult] = useState<State>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState<'idle' | 'busy' | 'failed'>('idle');
  const [savedTick, setSavedTick] = useState(0);
  const surah = target ? byNumber(target.surah) : undefined;
  const source = TAFSIRS.find(x => x.id === settings.tafsirId) ?? TAFSIRS[0];

  useEffect(() => { setSaving('idle'); }, [source.id, target?.surah]);
  const saved = !!target && (isTafsirOffline(source.id, target.surah) || savedTick < 0);
  const save = async () => {
    if (!target) return;
    setSaving('busy');
    try { await downloadTafsir(source.id, target.surah); setSaving('idle'); setSavedTick(n => n + 1); } catch { setSaving('failed'); }
  };

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    setResult({ state: 'loading' });
    fetchTafsir(source.id, target.surah, target.ayah)
      .then(text => !cancelled && setResult({ state: 'ok', text }))
      .catch(() => !cancelled && setResult({ state: 'error' }));
    return () => { cancelled = true; };
  }, [source.id, target, attempt]);

  if (!target || !surah) return null;
  const ayah = ayahs.find(a => a.number === target.ayah);
  const go = (delta: number) => {
    const n = target.ayah + delta;
    if (n >= 1 && n <= surah.numberOfAyahs) setTafsir({ surah: target.surah, ayah: n });
  };

  return (
    <Sheet
      open
      tall
      onClose={() => setTafsir(null)}
      title={t('tafsir')}
      description={`${isRTL ? surah.name : surah.englishName} · ${t('ayahOf', { i: target.ayah, n: surah.numberOfAyahs })}`}
      footer={
        <View className="flex-row items-center justify-between">
          <Button variant="ghost" className="h-11 gap-1 rounded-xl px-3" disabled={target.ayah <= 1} onPress={() => go(-1)}>
            <Icon as={ChevronLeft} className="size-5 rtl:rotate-180" />
            <Text>{t('previous')}</Text>
          </Button>
          <Button variant="ghost" className="h-11 gap-1 rounded-xl px-3" disabled={target.ayah >= surah.numberOfAyahs} onPress={() => go(1)}>
            <Text>{t('next')}</Text>
            <Icon as={ChevronRight} className="size-5 rtl:rotate-180" />
          </Button>
        </View>
      }
    >
      {ayah ? (
        <Text className="font-quran text-primary" style={{ fontSize: 26, lineHeight: 36, paddingVertical: 8, textAlign: 'right', writingDirection: 'rtl' }}>
          {ayah.ar}
        </Text>
      ) : null}

      <View className="py-3">
        <Chips
          label={t('defaultTafsir')}
          value={source.id}
          onChange={id => update({ tafsirId: id })}
          options={TAFSIRS.map(x => ({ value: x.id, label: isRTL ? x.ar : x.en }))}
        />
      </View>

      <View className="pb-3">
        {saved ? (
          <View className="flex-row items-center gap-2">
            <Icon as={CheckCircle2} className="size-4 text-primary" />
            <Text className="text-sm text-primary">{t('tafsirSaved')}</Text>
          </View>
        ) : (
          <Button variant="outline" className="h-11 self-start rounded-xl" disabled={saving === 'busy'} onPress={() => void save()}>
            <Icon as={CloudDownload} className="size-4" />
            <Text>{saving === 'busy' ? t('tafsirSaving') : t('tafsirSave')}</Text>
          </Button>
        )}
        {saving === 'failed' ? <Text accessibilityRole="alert" className="mt-2 text-sm text-destructive">{t('tafsirSaveFailed')}</Text> : null}
      </View>

      <View className="min-h-40 border-t border-border pt-4" accessibilityLiveRegion="polite">
        {result.state === 'loading' && (
          <View className="gap-3" accessibilityLabel={t('loadingTafsir')}>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/5" />
          </View>
        )}
        {result.state === 'error' && (
          <View className="items-center gap-3">
            <Text className="text-destructive">{t('error')}</Text>
            <Button variant="outline" onPress={() => setAttempt(a => a + 1)}>
              <Text>{t('retry')}</Text>
            </Button>
          </View>
        )}
        {result.state === 'ok' && (
          <Text
            className={source.dir === 'rtl' ? 'font-quran' : 'text-base'}
            style={
              source.dir === 'rtl'
                ? { fontSize: 22, lineHeight: 36, textAlign: 'right', writingDirection: 'rtl' }
                : { lineHeight: 28, textAlign: 'left', writingDirection: 'ltr' }
            }
          >
            {result.text || t('tafsirEmpty')}
          </Text>
        )}
      </View>
    </Sheet>
  );
}
