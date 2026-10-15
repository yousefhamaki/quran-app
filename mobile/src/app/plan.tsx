import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays, Check, CheckCircle2, ChevronDown, ClipboardCheck, GraduationCap, Repeat, Trash2 } from 'lucide-react-native';
import { SelfTestSheet } from '@/components/sheets/self-test-sheet';
import { weekCalendar } from '@/lib/study';
import { AppHeader } from '@/components/app-header';
import { Chips } from '@/components/chips';
import { Sheet } from '@/components/sheet';
import { Stepper } from '@/components/stepper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Progress } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { addDays } from '@/lib/hifz';
import { useHabit } from '@/context/habit';
import { useHifz } from '@/context/hifz';
import { usePlayer } from '@/context/player';
import { useSettings } from '@/context/settings';
import { useSurahs } from '@/context/surahs';

const PACES = [1, 2, 3, 5, 10];
const rangeLabel = (from: number, to: number) => (from === to ? `${from}` : `${from}–${to}`);

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <View className={cn('gap-3 rounded-2xl border border-border bg-card p-4', className)}>{children}</View>;
}

export default function PlanScreen() {
  const router = useRouter();
  const { t, isRTL, settings } = useSettings();
  const { surahs, byNumber } = useSurahs();
  const { startRange } = usePlayer();
  const { plan, today, learn, due, stats, coming, create, markLearned: learned, rate: rateCard, remove } = useHifz();
  const { recordRead } = useHabit();
  const markLearned = () => { learned(); recordRead(); };
  const rate: typeof rateCard = (id, rating) => { rateCard(id, rating); recordRead(); };
  const [surahNo, setSurahNo] = useState(67);
  const [startAyah, setStartAyah] = useState(1);
  const [pace, setPace] = useState(3);
  const [picking, setPicking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const chosen = byNumber(surahNo);
  const nameOf = (n: number) => { const s = byNumber(n); return s ? (isRTL ? s.name : s.englishName) : `#${n}`; };
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // "Practice": loop the portion 5 times and open it in the reader.
  const practice = (surah: number, from: number, to: number) => {
    startRange({ surah, from, to, rounds: 5 }, settings.reciter);
    router.push({ pathname: '/surah/[id]', params: { id: String(surah), ayah: String(from) } });
  };

  const testRange = plan ? { surah: plan.surah, from: plan.start, to: Math.max(plan.start + 1, Math.min(plan.total, plan.nextAyah - 1)) } : undefined;
  const testButton = (
    <Button variant="outline" className="h-12 rounded-xl" onPress={() => setTestOpen(true)}>
      <Icon as={ClipboardCheck} className="size-5" />
      <Text>{t('testTitle')}</Text>
    </Button>
  );
  const tomorrow = addDays(today, 1);
  const dayLabel = (day: string) =>
    day === tomorrow ? t('planTomorrow') : new Date(`${day}T00:00:00`).toLocaleDateString(isRTL ? 'ar' : 'en', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <View className="flex-1 bg-background">
      <AppHeader title={t('planTitle')} />
      <ScrollView contentContainerClassName="gap-5 px-4 pb-56 pt-5" keyboardShouldPersistTaps="handled">
        {!plan || !stats ? (
          <>
            <View className="flex-row items-start gap-4 rounded-3xl bg-secondary p-5">
              <Icon as={GraduationCap} className="mt-0.5 size-8 text-primary" />
              <Text className="flex-1 text-sm leading-6 text-secondary-foreground">{t('planHow')}</Text>
            </View>

            <Panel className="gap-5 p-5">
              <View className="gap-2">
                <Text className="text-sm font-medium">{t('planSurah')}</Text>
                <Pressable
                  onPress={() => setPicking(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t('planSurah')}
                  className="h-12 flex-row items-center justify-between rounded-xl border border-input bg-background px-4 active:bg-accent"
                >
                  <Text className="flex-1">{chosen ? `${chosen.number}. ${isRTL ? chosen.name : chosen.englishName} (${chosen.numberOfAyahs})` : '…'}</Text>
                  <Icon as={ChevronDown} className="size-4 text-muted-foreground" />
                </Pressable>
              </View>
              <View className="gap-2">
                <Text className="text-sm font-medium">{t('planStartAyah')}</Text>
                <Stepper label={t('planStartAyah')} value={startAyah} min={1} max={chosen?.numberOfAyahs ?? 1} onChange={setStartAyah} big={(chosen?.numberOfAyahs ?? 0) > 20} />
              </View>
              <View className="gap-2">
                <Text className="text-sm font-medium">{t('planPace')}</Text>
                <Chips label={t('planPace')} value={pace} onChange={setPace} options={PACES.map(n => ({ value: n, label: String(n) }))} />
                <Text className="text-xs text-muted-foreground">{t('planPaceHint')}</Text>
              </View>
              <Button size="lg" className="h-12 rounded-xl" disabled={!chosen} onPress={() => chosen && create({ surah: chosen.number, total: chosen.numberOfAyahs, start: startAyah, pace })}>
                <Text className="text-base">{t('planCreate')}</Text>
              </Button>
            </Panel>
            {testButton}
          </>
        ) : (
          <>
            {/* Progress */}
            <Panel className="p-5">
              <View className="flex-row items-baseline justify-between gap-3">
                <Text className={cn('text-2xl', isRTL ? 'font-quran' : 'font-display')} style={isRTL ? { lineHeight: 34, paddingVertical: 4 } : undefined}>{nameOf(plan.surah)}</Text>
                <Text className="text-2xl font-semibold text-primary">{stats.percent}%</Text>
              </View>
              <Progress value={stats.percent} />
              <Text className="text-sm text-muted-foreground">{t('planProgress')}: {t('planOf', { n: stats.memorized, total: stats.covered })}</Text>
              <Text className="text-xs text-muted-foreground">{stats.finished ? t('planFinished') : t('planDaysLeft', { n: stats.daysLeft })}</Text>
            </Panel>

            <Text accessibilityRole="header" className="font-display text-xl">{t('planTodayHeading')}</Text>

            {learn ? (
              <Panel className="border-primary/40">
                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-xs font-medium uppercase tracking-wide text-primary">{t('planLearn')}</Text>
                    <Text className="text-lg font-semibold">{nameOf(plan.surah)} · {t('ayah')} {rangeLabel(learn.from, learn.to)}</Text>
                  </View>
                  <Badge variant="secondary" className="rounded-full"><Text className="text-xs">{learn.to - learn.from + 1}</Text></Badge>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  <Button variant="outline" className="h-11 rounded-xl" onPress={() => practice(plan.surah, learn.from, learn.to)}>
                    <Icon as={Repeat} className="size-4" />
                    <Text>{t('planPractice')}</Text>
                  </Button>
                  <Button className="h-11 rounded-xl" onPress={markLearned}>
                    <Icon as={CheckCircle2} className="size-4 text-primary-foreground" />
                    <Text>{t('planLearnedBtn')}</Text>
                  </Button>
                </View>
              </Panel>
            ) : (
              <View className="flex-row items-center gap-2 rounded-2xl bg-muted p-4">
                <Icon as={CheckCircle2} className="size-5 text-primary" />
                <Text className="flex-1 text-sm text-muted-foreground">{stats.finished ? t('planFinished') : t('planLearnDone')}</Text>
              </View>
            )}

            <Text className="pt-1 text-sm font-medium text-muted-foreground">{t('planReviewHeading')}</Text>
            {due.length === 0 ? (
              <Text className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">{t('planNoReviews')}</Text>
            ) : (
              due.map(card => (
                <Panel key={card.id}>
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="flex-1 font-semibold">{nameOf(plan.surah)} · {t('ayah')} {rangeLabel(card.from, card.to)}</Text>
                    <Badge variant="outline" className="rounded-full"><Text className="text-xs">{t('planBox', { n: card.box + 1 })}</Text></Badge>
                  </View>
                  <Button variant="ghost" className="h-11 self-start rounded-xl" onPress={() => practice(plan.surah, card.from, card.to)}>
                    <Icon as={Repeat} className="size-4 text-primary" />
                    <Text className="text-primary">{t('planPractice')}</Text>
                  </Button>
                  <View className="flex-row gap-2">
                    <Button variant="outline" className="h-11 flex-1 rounded-xl" onPress={() => rate(card.id, 'again')}>
                      <Text className="text-destructive">{t('planAgain')}</Text>
                    </Button>
                    <Button variant="outline" className="h-11 flex-1 rounded-xl" onPress={() => rate(card.id, 'good')}>
                      <Text>{t('planGood')}</Text>
                    </Button>
                    <Button className="h-11 flex-1 rounded-xl" onPress={() => rate(card.id, 'easy')}>
                      <Text>{t('planEasy')}</Text>
                    </Button>
                  </View>
                </Panel>
              ))
            )}

            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <Icon as={CalendarDays} className="size-4 text-muted-foreground" />
                <Text accessibilityRole="header" className="text-sm font-medium text-muted-foreground">{t('planWeek')}</Text>
              </View>
              <View className="flex-row gap-1.5">
                {weekCalendar(plan.cards, today, addDays).map(d => {
                  const date = new Date(`${d.day}T00:00:00`);
                  const loc = isRTL ? 'ar' : 'en';
                  return (
                    <View
                      key={d.day}
                      accessible
                      accessibilityLabel={`${date.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' })}: ${t('planWeekCount', { n: d.count })}`}
                      className={cn('flex-1 items-center gap-1 rounded-2xl border border-border py-2', d.isToday && 'border-primary bg-secondary')}
                    >
                      <Text className="text-[11px] text-muted-foreground">{date.toLocaleDateString(loc, { weekday: 'short' })}</Text>
                      <Text className="text-sm font-medium">{date.getDate().toLocaleString(isRTL ? 'ar-EG' : 'en')}</Text>
                      <View className={cn('size-7 items-center justify-center rounded-full', d.count > 0 ? 'bg-primary' : 'bg-muted')}>
                        <Text className={cn('text-xs font-semibold', d.count > 0 ? 'text-primary-foreground' : 'text-muted-foreground')}>{d.count.toLocaleString(isRTL ? 'ar-EG' : 'en')}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {testButton}

            {coming.length > 0 && (
              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <Icon as={CalendarDays} className="size-4 text-muted-foreground" />
                  <Text accessibilityRole="header" className="text-sm font-medium text-muted-foreground">{t('planUpcoming')}</Text>
                </View>
                {coming.map(c => (
                  <Text key={c.due} className="rounded-xl bg-muted px-4 py-2.5 text-sm">{t('planOnDay', { day: dayLabel(c.due), n: c.count })}</Text>
                ))}
              </View>
            )}

            <Text className="text-xs leading-5 text-muted-foreground">{t('planHow')}</Text>

            {confirmDelete ? (
              <Panel className="border-destructive/40">
                <Text className="text-sm">{t('planResetConfirm')}</Text>
                <View className="flex-row justify-end gap-2">
                  <Button variant="ghost" className="h-11 rounded-xl px-4" onPress={() => setConfirmDelete(false)}>
                    <Text>{t('cancel')}</Text>
                  </Button>
                  <Button variant="destructive" className="h-11 rounded-xl px-4" onPress={() => { remove(); setConfirmDelete(false); }}>
                    <Text className="text-white">{t('planReset')}</Text>
                  </Button>
                </View>
              </Panel>
            ) : (
              <Button variant="ghost" className="h-11 self-start rounded-xl" onPress={() => setConfirmDelete(true)}>
                <Icon as={Trash2} className="size-4 text-destructive" />
                <Text className="text-destructive">{t('planReset')}</Text>
              </Button>
            )}
          </>
        )}
      </ScrollView>

      <SelfTestSheet open={testOpen} onClose={() => setTestOpen(false)} initial={testRange} />

      {/* Surah picker */}
      <Sheet open={picking} tall onClose={() => setPicking(false)} title={t('planSurah')}>
        <View className="gap-1 pb-4">
          {surahs.map(s => {
            const selected = s.number === surahNo;
            return (
              <Pressable
                key={s.number}
                onPress={() => { setSurahNo(s.number); setStartAyah(1); setPicking(false); }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                className={cn('min-h-12 flex-row items-center gap-3 rounded-xl px-3 active:bg-accent', selected && 'bg-accent')}
              >
                <Text className="w-8 text-center text-sm text-muted-foreground">{s.number}</Text>
                <Text className="flex-1">{isRTL ? s.name : s.englishName}</Text>
                <Text className="text-xs text-muted-foreground">{s.numberOfAyahs}</Text>
                {selected && <Icon as={Check} className="size-4 text-primary" />}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}
