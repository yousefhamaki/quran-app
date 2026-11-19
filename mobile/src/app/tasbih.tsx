import { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Switch, Vibration, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import { RotateCcw, Undo2 } from 'lucide-react-native';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { dateString } from '@/lib/habit';
import { DHIKRS, TARGETS, countOf, dhikrById, normalizeTasbih, reset, select, setTarget, tap, targetOf, totalOf, undo, type TasbihState } from '@/lib/tasbih';
import { loadJSON, saveJSON } from '@/lib/storage';
import { useContentWidth } from '@/lib/layout';
import { useSettings } from '@/context/settings';

const KEY = 'quran.tasbih';

/** A short buzz per tap (Android only: iOS can't do a short vibration without the haptics module). */
const buzz = (ms: number) => { if (Platform.OS === 'android') Vibration.vibrate(ms); };

export default function TasbihScreen() {
  const router = useRouter();
  const { t, isRTL } = useSettings();
  const width = useContentWidth();
  const primary = String(useCSSVariable('--color-primary') ?? '#0b5d4b');
  const track = String(useCSSVariable('--color-muted') ?? '#e5e5e5');
  const [state, setState] = useState<TasbihState>(() => normalizeTasbih(loadJSON(KEY, null)));
  const ref = useRef(state);
  const commit = useCallback((next: TasbihState) => { ref.current = next; setState(next); saveJSON(KEY, next); }, []);

  const dhikr = dhikrById(state.active);
  const target = targetOf(state, dhikr.id);
  const cur = countOf(state, dhikr.id);
  const today = state.days[dateString()] ?? 0;
  const num = (n: number) => n.toLocaleString(isRTL ? 'ar' : 'en', { useGrouping: false });

  const onTap = () => {
    const r = tap(ref.current, dateString());
    commit(r.state);
    if (ref.current.vibrate) buzz(r.finishedRound ? 220 : 12);
  };

  const size = Math.min(width - 48, 300);
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const fraction = target > 0 ? cur.count / target : 0;

  return (
    <View className="flex-1 bg-background">
      <AppHeader title={t('tasbihTitle')} onBack={() => (router.canGoBack() ? router.back() : router.replace('/more'))} />
      <ScrollView contentContainerClassName="items-center gap-6 px-4 pb-44 pt-5">
        {/* Which dhikr */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-1" className="max-h-14 self-stretch">
          {DHIKRS.map(d => {
            const on = d.id === state.active;
            return (
              <Pressable
                key={d.id}
                onPress={() => commit(select(ref.current, d.id))}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                className={cn('min-h-11 justify-center rounded-full border px-4', on ? 'border-primary bg-primary' : 'border-border bg-card')}
              >
                <Text className={cn('text-sm', on && 'text-primary-foreground')}>{isRTL ? d.ar : d.en}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text className="font-quran text-center text-3xl" style={{ lineHeight: 64, paddingVertical: 6, writingDirection: 'rtl' }}>{dhikr.ar}</Text>

        {/* The counter: tap anywhere on the circle */}
        <Pressable
          onPress={onTap}
          accessibilityRole="button"
          accessibilityLabel={`${isRTL ? dhikr.ar : dhikr.en}: ${num(cur.count)}`}
          accessibilityHint={t('tasbihTapHint')}
          className="items-center justify-center rounded-full active:opacity-80"
          style={{ width: size, height: size }}
        >
          <Svg width={size} height={size} style={{ position: 'absolute' }}>
            <Circle cx={size / 2} cy={size / 2} r={radius} stroke={track} strokeWidth={stroke} fill="none" />
            {target > 0 && cur.count > 0 ? (
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={primary}
                strokeWidth={stroke}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${circ * fraction} ${circ}`}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            ) : null}
          </Svg>
          <Text accessibilityLiveRegion="polite" className="text-7xl font-semibold">{num(cur.count)}</Text>
          <Text className="text-sm text-muted-foreground">{target > 0 ? t('tasbihOf', { n: num(target) }) : t('tasbihNoLimit')}</Text>
        </Pressable>

        {/* Rounds and totals */}
        <View className="w-full flex-row gap-3">
          <View className="flex-1 items-center rounded-2xl border border-border bg-card p-3">
            <Text className="text-2xl font-semibold">{num(cur.laps)}</Text>
            <Text className="text-xs text-muted-foreground">{t('tasbihRounds')}</Text>
          </View>
          <View className="flex-1 items-center rounded-2xl border border-border bg-card p-3">
            <Text className="text-2xl font-semibold">{num(totalOf(state, dhikr.id))}</Text>
            <Text className="text-xs text-muted-foreground">{t('tasbihTotal')}</Text>
          </View>
          <View className="flex-1 items-center rounded-2xl border border-border bg-card p-3">
            <Text className="text-2xl font-semibold">{num(today)}</Text>
            <Text className="text-xs text-muted-foreground">{t('tasbihToday')}</Text>
          </View>
        </View>

        {/* Target */}
        <View className="w-full gap-2">
          <Text className="px-1 text-sm font-medium text-muted-foreground">{t('tasbihTarget')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {TARGETS.map(n => {
              const on = n === target;
              return (
                <Pressable
                  key={n}
                  onPress={() => commit(setTarget(ref.current, dhikr.id, n))}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  className={cn('min-h-11 min-w-16 items-center justify-center rounded-full border px-4', on ? 'border-primary bg-primary' : 'border-border bg-card')}
                >
                  <Text className={cn('text-sm', on && 'text-primary-foreground')}>{n === 0 ? '∞' : num(n)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="w-full flex-row gap-3">
          <Button variant="outline" className="h-12 flex-1 rounded-xl" onPress={() => commit(undo(ref.current, dateString()))} disabled={cur.count === 0}>
            <Icon as={Undo2} className="size-4" />
            <Text>{t('tasbihUndo')}</Text>
          </Button>
          <Button variant="outline" className="h-12 flex-1 rounded-xl" onPress={() => commit(reset(ref.current))}>
            <Icon as={RotateCcw} className="size-4" />
            <Text>{t('tasbihReset')}</Text>
          </Button>
        </View>

        {Platform.OS === 'android' ? (
          <View className="w-full flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
            <Text className="text-base">{t('tasbihVibrate')}</Text>
            <Switch value={state.vibrate} onValueChange={v => commit({ ...ref.current, vibrate: v })} accessibilityLabel={t('tasbihVibrate')} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
