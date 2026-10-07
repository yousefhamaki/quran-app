import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, BookOpenText, ChevronUp, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react-native';
import { AppSlider } from '@/components/app-slider';
import { Chips } from '@/components/chips';
import { AutoNextSurahControl, ContinuousControl, GapControl, RepeatControl, SleepControl, formatCountdown } from '@/components/controls';
import { useOrderedReciters } from '@/components/reciter-list';
import { Field } from '@/components/section';
import { Sheet } from '@/components/sheet';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { RECITERS } from '@/lib/quran';
import { usePlayer } from '@/context/player';
import { useSettings } from '@/context/settings';
import { useSurahs } from '@/context/surahs';
import { useUI } from '@/context/ui';

const SPEEDS = [0.75, 1, 1.25, 1.5];

function formatTime(s: number) {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function PlayPause({ big }: { big?: boolean }) {
  const { t } = useSettings();
  const { isPlaying, loading, failed, toggle, gapLeft, gapPaused } = usePlayer();
  const running = isPlaying || (gapLeft !== null && !gapPaused);
  return (
    <Button size="icon" className={cn('rounded-full', big ? 'size-16' : 'size-12')} onPress={toggle} accessibilityLabel={running ? t('pause') : t('play')}>
      {loading && !running ? (
        <ActivityIndicator color="white" />
      ) : failed ? (
        <Icon as={AlertCircle} className="size-5 text-primary-foreground" />
      ) : (
        <Icon as={running ? Pause : Play} className={cn(big ? 'size-7' : 'size-5', 'fill-primary-foreground text-primary-foreground')} />
      )}
    </Button>
  );
}

/** Floating mini player; tap it for the full controls. */
export function PlayerBar() {
  const insets = useSafeAreaInsets();
  const { settings, repeatTimes, t, isRTL } = useSettings();
  const { byNumber } = useSurahs();
  const { setPlayerOpen } = useUI();
  const { playing, failed, duration, time, pass, sleep, sleepLeft, gapLeft, gapTotal, gapPaused, next, previous } = usePlayer();
  if (!playing) return null;

  const surah = byNumber(playing.surah);
  const reciter = RECITERS.find(r => r.id === playing.reciter);
  const inGap = gapLeft !== null;
  const pct = inGap ? (gapTotal > 0 ? (gapLeft / gapTotal) * 100 : 0) : duration > 0 ? Math.min(100, (time / duration) * 100) : 0;
  const atEnd = surah ? playing.ayah >= surah.numberOfAyahs : false;
  const repeatLabel = repeatTimes === 1 ? '' : ` · ${repeatTimes === 0 ? t('repeatPassForever', { i: pass }) : t('repeatPass', { i: pass, n: repeatTimes })}`;
  const sleepLabel = sleep ? `${sleep.kind === 'surah' ? t('sleepEndOfSurah') : t('sleepLeft', { time: formatCountdown(sleepLeft ?? 0) })} · ` : '';
  const subtitle = failed
    ? t('error')
    : inGap
      ? `${t('yourTurn')} · ${gapPaused ? t('gapPausedLabel') : t('gapSeconds', { n: Math.ceil(gapLeft) })}`
      : `${sleepLabel}${reciter ? (isRTL ? reciter.ar : reciter.en) : ''}${repeatLabel}`;

  return (
    <View pointerEvents="box-none" style={{ paddingBottom: Math.max(insets.bottom, 12) }} className="absolute inset-x-0 bottom-0 px-3">
      <View accessibilityRole="summary" accessibilityLabel={t('nowPlaying')} className="overflow-hidden rounded-3xl border border-border bg-card shadow-lg shadow-black/20">
        <View className="h-1 w-full bg-muted">
          <View style={{ width: `${pct}%` }} className={cn('h-full', inGap ? 'bg-gold' : 'bg-primary')} />
        </View>
        <View className="flex-row items-center gap-2 p-2.5">
          <Pressable
            onPress={() => setPlayerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('expand')}
            className="flex-1 flex-row items-center gap-3 rounded-2xl p-1 active:bg-accent/50"
          >
            <View className="size-11 items-center justify-center rounded-2xl bg-primary">
              <Text className="font-semibold text-primary-foreground">{playing.ayah}</Text>
            </View>
            <View className="flex-1">
              <Text numberOfLines={1} className="text-sm font-medium">{surah ? (settings.lang === 'ar' ? surah.name : surah.englishName) : ''}</Text>
              <Text numberOfLines={1} className={cn('text-xs', failed ? 'text-destructive' : inGap ? 'font-medium text-gold-foreground' : 'text-muted-foreground')} accessibilityLiveRegion={inGap ? 'polite' : 'none'}>
                {subtitle}
              </Text>
            </View>
            <Icon as={ChevronUp} className="size-5 text-muted-foreground" />
          </Pressable>
          <Button variant="ghost" size="icon" className="size-11 rounded-full" onPress={previous} accessibilityLabel={t('previous')}>
            <Icon as={SkipBack} className="size-5 rtl:-scale-x-100" />
          </Button>
          <PlayPause />
          <Button variant="ghost" size="icon" className="size-11 rounded-full" disabled={atEnd} onPress={next} accessibilityLabel={t('next')}>
            <Icon as={SkipForward} className="size-5 rtl:-scale-x-100" />
          </Button>
        </View>
      </View>
    </View>
  );
}

/** Full player controls. */
export function PlayerSheet() {
  const { playerOpen, setPlayerOpen, setTafsir } = useUI();
  const { settings, update, t, isRTL } = useSettings();
  const { byNumber } = useSurahs();
  const { pinned, others } = useOrderedReciters();
  const { playing, time, duration, stop, next, previous, seek, changeReciter } = usePlayer();
  const [scrub, setScrub] = useState<number | null>(null);
  if (!playing) return null;

  const surah = byNumber(playing.surah);
  const reciter = RECITERS.find(r => r.id === playing.reciter);
  const atEnd = surah ? playing.ayah >= surah.numberOfAyahs : false;
  const shown = scrub ?? Math.min(time, duration || 0);

  return (
    <Sheet
      open={playerOpen}
      tall
      onClose={() => setPlayerOpen(false)}
      quranTitle={isRTL}
      title={`${surah ? (isRTL ? surah.name : surah.englishName) : ''} · ${playing.ayah}`}
      description={reciter ? (isRTL ? reciter.ar : reciter.en) : ''}
    >
      <View className="gap-6 pb-4 pt-2">
        <View>
          <AppSlider
            label={t('seek')}
            value={shown}
            min={0}
            max={Math.max(duration, 0.1)}
            step={0.1}
            disabled={!duration}
            onChange={setScrub}
            onCommit={v => { seek(v); setScrub(null); }}
          />
          <View className="flex-row justify-between px-1" style={{ direction: 'ltr' }}>
            <Text className="text-xs text-muted-foreground">{formatTime(shown)}</Text>
            <Text className="text-xs text-muted-foreground">{formatTime(duration)}</Text>
          </View>
        </View>

        <View className="flex-row items-center justify-center gap-4" style={{ direction: 'ltr' }}>
          <Button variant="ghost" size="icon" className="size-12 rounded-full" onPress={previous} accessibilityLabel={t('previous')}>
            <Icon as={SkipBack} className="size-6" />
          </Button>
          <PlayPause big />
          <Button variant="ghost" size="icon" className="size-12 rounded-full" disabled={atEnd} onPress={next} accessibilityLabel={t('next')}>
            <Icon as={SkipForward} className="size-6" />
          </Button>
          <Button variant="ghost" size="icon" className="size-11 rounded-full" onPress={() => { stop(); setPlayerOpen(false); }} accessibilityLabel={t('stop')}>
            <Icon as={X} className="size-5" />
          </Button>
        </View>

        <Button variant="secondary" className="h-12 rounded-xl" onPress={() => { setPlayerOpen(false); setTafsir({ surah: playing.surah, ayah: playing.ayah }); }}>
          <Icon as={BookOpenText} className="size-5 text-secondary-foreground" />
          <Text>{t('tafsir')} · {t('ayah')} {playing.ayah}</Text>
        </Button>

        <Field label={t('reciter')}>
          <Chips
            label={t('reciter')}
            value={playing.reciter}
            onChange={id => { update({ reciter: id }); changeReciter(id); }}
            options={[...pinned, ...others].map(r => ({ value: r.id, label: isRTL ? r.ar : r.en }))}
          />
        </Field>
        <Field label={t('speed')}>
          <Chips label={t('speed')} value={settings.speed} onChange={speed => update({ speed })} options={SPEEDS.map(v => ({ value: v, label: `${v}x` }))} />
        </Field>
        <RepeatControl />
        <SleepControl />
        <AutoNextSurahControl />
        <GapControl />
        <ContinuousControl />
      </View>
    </Sheet>
  );
}
