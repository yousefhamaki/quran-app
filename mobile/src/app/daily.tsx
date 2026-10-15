import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import { ArrowRight, Bell, BookCheck, CheckCircle2, Flame, HandHeart, Trash2 } from 'lucide-react-native';
import { AppHeader } from '@/components/app-header';
import { Chips } from '@/components/chips';
import { SwitchRow } from '@/components/controls';
import { Stepper } from '@/components/stepper';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { TKey } from '@/lib/i18n';
import { approxPages, daysEarly, takenDays, TOTAL_AYAHS, type Ref } from '@/lib/habit';
import { fetchAyahText, type AyahText } from '@/lib/dailyayah';
import type { ReminderResult } from '@/lib/reminders';
import { useHabit, type Reminder } from '@/context/habit';
import { useSettings } from '@/context/settings';
import { useSurahs } from '@/context/surahs';

const DAY_CHOICES = [7, 15, 30, 60, 90];

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <View className={cn('gap-3 rounded-2xl border border-border bg-card p-4', className)}>{children}</View>;
}

function Ring({ percent }: { percent: number }) {
  const primary = String(useCSSVariable('--color-primary') ?? '#0b5d4b');
  const track = String(useCSSVariable('--color-muted') ?? '#e5e5e5');
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <View className="size-28 items-center justify-center" accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.floor(percent) }}>
      <Svg width={112} height={112} viewBox="0 0 100 100" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={50} cy={50} r={r} fill="none" stroke={track} strokeWidth={9} />
        <Circle cx={50} cy={50} r={r} fill="none" stroke={primary} strokeWidth={9} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, percent) / 100)} />
      </Svg>
      <Text className="absolute text-xl font-semibold">{Math.floor(percent)}%</Text>
    </View>
  );
}

type Tab = 'reading' | 'khatmah' | 'completed';
const TABS: { id: Tab; label: TKey }[] = [
  { id: 'reading', label: 'dailyTabReading' },
  { id: 'khatmah', label: 'dailyTabKhatmah' },
  { id: 'completed', label: 'dailyTabCompleted' },
];

interface ReminderPanelProps {
  title: string;
  hint: string;
  reminder: Reminder;
  status: ReminderResult | null;
  onChange: (r: Reminder) => void;
}

/** A switch with a time picker (hour / minute steppers) for a phone notification. */
function ReminderPanel({ title, hint, reminder, status, onChange }: ReminderPanelProps) {
  const { t } = useSettings();
  return (
    <Panel className="gap-4 rounded-3xl p-5">
      <View className="flex-row items-center gap-3">
        <View className="size-11 items-center justify-center rounded-xl bg-secondary">
          <Icon as={Bell} className="size-5 text-primary" />
        </View>
        <View className="flex-1">
          <SwitchRow label={title} hint={hint} checked={reminder.enabled} onChange={enabled => onChange({ ...reminder, enabled })} />
        </View>
      </View>
      {reminder.enabled ? (
        <View className="gap-3">
          <Text className="text-sm font-medium">{t('reminderTime')}: {String(reminder.hour).padStart(2, '0')}:{String(reminder.minute).padStart(2, '0')}</Text>
          <Stepper label={`${t('reminderTime')} (h)`} value={reminder.hour} min={0} max={23} onChange={h => onChange({ ...reminder, hour: h })} />
          <Stepper label={`${t('reminderTime')} (min)`} value={reminder.minute} min={0} max={59} onChange={m => onChange({ ...reminder, minute: m })} big />
        </View>
      ) : null}
      {reminder.enabled && status === 'denied' ? <Text accessibilityRole="alert" className="text-sm text-destructive">{t('reminderDenied')}</Text> : null}
    </Panel>
  );
}

export default function DailyScreen() {
  const router = useRouter();
  const { t, isRTL, settings } = useSettings();
  const { byNumber } = useSurahs();
  const habit = useHabit();
  const { khatmah, stats, streak, longest, week, readToday, ayahOfDay, reminder, reminderStatus, khatmahReminder, khatmahReminderStatus, completed } = habit;
  const locale = isRTL ? 'ar' : 'en';
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(() => (TABS.some(x => x.id === tabParam) ? (tabParam as Tab) : 'reading'));
  useEffect(() => { if (TABS.some(x => x.id === tabParam)) setTab(tabParam as Tab); }, [tabParam]);
  const [text, setText] = useState<AyahText | null>(null);
  const [days, setDays] = useState(30);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const perDay = Math.ceil(TOTAL_AYAHS / days);

  useEffect(() => {
    let cancelled = false;
    setText(null);
    fetchAyahText(ayahOfDay).then(v => !cancelled && setText(v)).catch(() => {});
    return () => { cancelled = true; };
  }, [ayahOfDay.surah, ayahOfDay.ayah]);

  const nameOf = (n: number) => { const s = byNumber(n); return s ? (isRTL ? s.name : s.englishName) : `#${n}`; };
  const refLabel = (r: Ref) => `${nameOf(r.surah)} ${r.ayah}`;
  const open = (r: Ref) => router.push({ pathname: '/surah/[id]', params: { id: String(r.surah), ayah: String(r.ayah) } });
  const weekday = (day: string) => new Date(`${day}T00:00:00`).toLocaleDateString(locale, { weekday: 'narrow' });
  const dateLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View className="flex-1 bg-background">
      <AppHeader title={t('dailyTitle')} />
      <ScrollView contentContainerClassName="gap-5 px-4 pb-56 pt-4" keyboardShouldPersistTaps="handled">
        <View accessibilityRole="tablist" className="flex-row gap-1 rounded-full bg-muted p-1">
          {TABS.map(({ id, label }) => (
            <Pressable
              key={id}
              onPress={() => setTab(id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === id }}
              className={cn('h-10 flex-1 items-center justify-center rounded-full px-1', tab === id && 'bg-background')}
            >
              <Text numberOfLines={1} className={cn('text-sm font-medium', tab === id ? 'text-foreground' : 'text-muted-foreground')}>
                {t(label)}{id === 'completed' && completed.length > 0 ? ` (${completed.length})` : ''}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ------------------------------------------------ Daily reading */}
        {tab === 'reading' ? (
          <>
            <Panel className="gap-3 rounded-3xl p-5">
              <Text className="text-xs font-medium uppercase tracking-wide text-primary">{t('ayahOfDay')} · {refLabel(ayahOfDay)}</Text>
              {text ? (
                <>
                  <Text className="font-quran text-2xl" style={{ lineHeight: 52, paddingVertical: 6, writingDirection: 'rtl' }}>{text.ar}</Text>
                  {settings.lang === 'en' ? <Text className="text-sm text-muted-foreground">{text.en}</Text> : null}
                </>
              ) : (
                <View className="h-16 rounded-xl bg-muted" />
              )}
              <Button variant="outline" className="h-11 self-start rounded-xl" onPress={() => open(ayahOfDay)}>
                <Text>{t('ayahOfDayOpen')}</Text>
                <Icon as={ArrowRight} className="size-4 rtl:rotate-180" />
              </Button>
            </Panel>

            <Panel className="gap-4 rounded-3xl p-5">
              <View className="flex-row items-center gap-4">
                <View className={cn('size-14 items-center justify-center rounded-2xl', streak > 0 ? 'bg-primary' : 'bg-muted')}>
                  <Icon as={Flame} className={cn('size-7', streak > 0 ? 'text-primary-foreground' : 'text-muted-foreground')} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-muted-foreground">{t('streakHeading')}</Text>
                  <Text className="text-2xl font-semibold">{streak === 1 ? t('streakDay1') : t('streakDays', { n: streak })}</Text>
                  <Text className="text-xs text-muted-foreground">
                    {readToday ? t('streakToday') : streak > 0 ? t('streakKeep') : t('streakNone')}
                    {longest > 1 ? ` · ${t('streakBest', { n: longest })}` : ''}
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-between gap-1">
                {week.map(d => (
                  <View key={d.day} className="flex-1 items-center gap-1.5">
                    <View className={cn('size-8 items-center justify-center rounded-full border', d.read ? 'border-primary bg-primary' : 'border-border')} accessibilityLabel={`${d.day}: ${d.read ? '✓' : '–'}`}>
                      {d.read ? <Icon as={CheckCircle2} className="size-4 text-primary-foreground" /> : null}
                    </View>
                    <Text className="text-[11px] text-muted-foreground">{weekday(d.day)}</Text>
                  </View>
                ))}
              </View>
            </Panel>

            <ReminderPanel title={t('reminderHeading')} hint={t('reminderHint')} reminder={reminder} status={reminderStatus} onChange={habit.setReminder} />

            <Pressable onPress={() => router.push('/adhkar')} accessibilityRole="button" className="flex-row items-center gap-4 rounded-2xl border border-border bg-card p-4 active:border-primary">
              <View className="size-11 items-center justify-center rounded-xl bg-secondary">
                <Icon as={HandHeart} className="size-6 text-primary" />
              </View>
              <View className="flex-1">
                <Text className="font-medium">{t('adhkarTitle')}</Text>
                <Text numberOfLines={1} className="text-sm text-muted-foreground">{t('adhkarCardHint')}</Text>
              </View>
              <Icon as={ArrowRight} className="size-5 text-muted-foreground rtl:rotate-180" />
            </Pressable>

            <View className="rounded-2xl bg-muted p-4">
              <Text className="text-sm font-medium">{t('widgetHeading')}</Text>
              <Text className="mt-1 text-xs leading-5 text-muted-foreground">{t('widgetHint')}</Text>
            </View>
          </>
        ) : null}

        {/* ------------------------------------------------ Khatmah planner */}
        {tab === 'khatmah' ? (
          !khatmah || !stats ? (
            <Panel className="gap-5 rounded-3xl p-5">
              <Text className="text-sm leading-6 text-muted-foreground">{t('khatmahIntro')}</Text>
              <View className="gap-2">
                <Text className="text-sm font-medium">{t('khatmahDays')}</Text>
                <Chips label={t('khatmahDays')} value={DAY_CHOICES.includes(days) ? days : -1} onChange={setDays} options={DAY_CHOICES.map(n => ({ value: n, label: String(n) }))} />
                <Stepper label={t('khatmahDays')} value={days} min={1} max={365} onChange={setDays} big />
                <Text className="text-sm text-muted-foreground">{t('khatmahPerDay', { n: perDay, pages: approxPages(perDay) })}</Text>
              </View>
              <Button size="lg" className="h-12 rounded-xl" onPress={() => habit.startKhatmah(days)}>
                <Text className="text-base">{t('khatmahStart')}</Text>
              </Button>
            </Panel>
          ) : (
            <>
              <Panel className="flex-row items-center gap-5 rounded-3xl p-5">
                <Ring percent={stats.percent} />
                <View className="flex-1 gap-1">
                  <Text className="font-semibold">{stats.finished ? t('khatmahFinished') : t('khatmahDay', { day: Math.min(stats.day, khatmah.days), days: khatmah.days })}</Text>
                  <Text className="text-sm text-muted-foreground">{t('khatmahRead', { n: stats.read })}</Text>
                  {!stats.finished && stats.daysLeft === 0 ? <Text className="text-xs text-muted-foreground">{t('khatmahLate')}</Text> : null}
                  {!stats.finished && stats.daysLeft > 0 ? <Text className="text-xs text-muted-foreground">{t('khatmahNeed', { n: stats.perDayNow })}</Text> : null}
                </View>
              </Panel>

              {stats.finished ? (
                <Panel className="border-primary/40">
                  <Text className="text-sm text-muted-foreground">{t('khatmDuaHint')}</Text>
                  <Button className="h-11 self-start rounded-xl" onPress={() => router.push({ pathname: '/adhkar', params: { c: 'khatm' } })}>
                    <Icon as={HandHeart} className="size-4 text-primary-foreground" />
                    <Text>{t('khatmDuaOpen')}</Text>
                  </Button>
                </Panel>
              ) : null}

              {!stats.finished && (stats.portion ? (
                <Panel className="border-primary/40">
                  <Text className="text-xs font-medium uppercase tracking-wide text-primary">{t('khatmahToday')}</Text>
                  <Text className="text-lg font-semibold">{t('khatmahFrom', { from: refLabel(stats.portion.from), to: refLabel(stats.portion.to) })}</Text>
                  <Text className="text-sm text-muted-foreground">
                    {t('khatmahCount', { n: stats.portion.count, pages: approxPages(stats.portion.count) })}
                    {stats.behind > 0 ? ` · ${t('khatmahBehind', { n: stats.behind })}` : ''}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    <Button variant="outline" className="h-11 rounded-xl" onPress={() => open(stats.portion!.from)}>
                      <Text>{t('khatmahOpen')}</Text>
                      <Icon as={ArrowRight} className="size-4 rtl:rotate-180" />
                    </Button>
                    <Button className="h-11 rounded-xl" onPress={habit.finishToday}>
                      <Icon as={CheckCircle2} className="size-4 text-primary-foreground" />
                      <Text>{t('khatmahDone')}</Text>
                    </Button>
                  </View>
                </Panel>
              ) : (
                <View className="gap-2">
                  <View className="flex-row items-center gap-2 rounded-2xl bg-muted p-4">
                    <Icon as={CheckCircle2} className="size-5 text-primary" />
                    <Text className="flex-1 text-sm text-muted-foreground">{t('khatmahTodayDone')}</Text>
                  </View>
                  {stats.next ? (
                    <View className="flex-row flex-wrap gap-2">
                      <Button variant="outline" className="h-11 rounded-xl" onPress={() => open(stats.next!)}>
                        <Text>{t('khatmahOpen')}</Text>
                        <Icon as={ArrowRight} className="size-4 rtl:rotate-180" />
                      </Button>
                      <Button variant="ghost" className="h-11 rounded-xl" onPress={() => habit.readExtra(Math.ceil(TOTAL_AYAHS / khatmah.days))}>
                        <Text className="text-primary">{t('khatmahReadExtra', { n: Math.ceil(TOTAL_AYAHS / khatmah.days) })}</Text>
                      </Button>
                    </View>
                  ) : null}
                </View>
              ))}

              {!stats.finished ? (
                <ReminderPanel title={t('khatmahReminderHeading')} hint={t('khatmahReminderHint')} reminder={khatmahReminder} status={khatmahReminderStatus} onChange={habit.setKhatmahReminder} />
              ) : null}

              {confirmDelete ? (
                <Panel className="border-destructive/40">
                  <Text className="text-sm">{t('khatmahDeleteConfirm')}</Text>
                  <View className="flex-row justify-end gap-2">
                    <Button variant="ghost" className="h-11 rounded-xl px-4" onPress={() => setConfirmDelete(false)}>
                      <Text>{t('cancel')}</Text>
                    </Button>
                    <Button variant="destructive" className="h-11 rounded-xl px-4" onPress={() => { habit.removeKhatmah(); setConfirmDelete(false); }}>
                      <Text className="text-white">{t('khatmahDelete')}</Text>
                    </Button>
                  </View>
                </Panel>
              ) : (
                <Button variant="ghost" className="h-11 self-start rounded-xl" onPress={() => (stats.finished ? habit.removeKhatmah() : setConfirmDelete(true))}>
                  <Icon as={Trash2} className="size-4 text-destructive" />
                  <Text className="text-destructive">{stats.finished ? t('khatmahNew') : t('khatmahDelete')}</Text>
                </Button>
              )}
            </>
          )
        ) : null}

        {/* ------------------------------------------------ Completed khatmahs */}
        {tab === 'completed' ? (
          completed.length === 0 ? (
            <View className="items-center gap-2 rounded-3xl bg-secondary p-6">
              <Icon as={BookCheck} className="size-9 text-primary" />
              <Text className="text-center text-sm text-secondary-foreground">{t('completedEmpty')}</Text>
            </View>
          ) : (
            <>
              <View className="flex-row items-center gap-4 rounded-3xl bg-primary p-5">
                <Icon as={BookCheck} className="size-9 text-primary-foreground" />
                <Text className="flex-1 text-xl font-semibold text-primary-foreground">{t('completedCount', { n: completed.length })}</Text>
              </View>
              {completed.map((c, i) => {
                const early = daysEarly(c);
                return (
                  <Panel key={`${c.startDate}:${c.finishedOn}`} className="gap-1.5">
                    <View className="flex-row items-center justify-between gap-3">
                      <Text className="font-semibold">{t('completedTitle', { n: completed.length - i })}</Text>
                      <View className={cn('rounded-full px-3 py-1', early >= 0 ? 'bg-primary/15' : 'bg-muted')}>
                        <Text className={cn('text-xs font-medium', early >= 0 ? 'text-primary' : 'text-muted-foreground')}>
                          {early === 0 ? t('completedOnTime') : early > 0 ? t('completedEarly', { n: early }) : t('completedLate', { n: -early })}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-sm text-muted-foreground">{t('completedDates', { from: dateLabel(c.startDate), to: dateLabel(c.finishedOn) })}</Text>
                    <Text className="text-sm text-muted-foreground">{t('completedTook', { n: takenDays(c), plan: c.days })}</Text>
                  </Panel>
                );
              })}
            </>
          )
        ) : null}
      </ScrollView>
    </View>
  );
}
