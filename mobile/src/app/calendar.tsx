import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Moon } from 'lucide-react-native';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { dateString } from '@/lib/habit';
import { HIJRI_MONTHS_AR, HIJRI_MONTHS_EN, monthDays, monthLength, OCCASIONS, RAMADAN, shiftMonth } from '@/lib/hijri';
import { formatTime } from '@/lib/prayer';
import { useHabit } from '@/context/habit';
import { usePrayer } from '@/context/prayer';
import { useSettings } from '@/context/settings';

export default function CalendarScreen() {
  const router = useRouter();
  const { t, isRTL } = useSettings();
  const { hijri, hijriAdjust, setHijriAdjust, times } = usePrayer();
  const { khatmah, startKhatmah } = useHabit();
  const locale = isRTL ? 'ar' : 'en';
  const months = isRTL ? HIJRI_MONTHS_AR : HIJRI_MONTHS_EN;
  const [view, setView] = useState({ year: hijri.year, month: hijri.month });
  const today = dateString();
  const num = (n: number) => n.toLocaleString(locale, { useGrouping: false });

  const days = useMemo(() => monthDays(view.year, view.month, hijriAdjust), [view, hijriAdjust]);
  const occasions = OCCASIONS.filter(o => o.month === view.month);
  const weekdayNames = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 7 + i).toLocaleDateString(locale, { weekday: 'narrow' })), [locale]);
  const lead = days[0]?.weekday ?? 0;
  const cells: (typeof days[number] | null)[] = [...Array.from({ length: lead }, () => null), ...days];
  const label = `${months[view.month - 1]} ${num(view.year)}`;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View className="flex-1 bg-background">
      <AppHeader title={t('calendarTitle')} onBack={goBack} />
      <ScrollView contentContainerClassName="gap-5 px-4 pb-44 pt-5">
        <View className="gap-1 rounded-3xl border border-border bg-card p-5">
          <View className="flex-row items-center gap-2">
            <Icon as={Moon} className="size-4 text-primary" />
            <Text className="text-xs font-medium uppercase tracking-wide text-primary">{t('hijriTodayLabel')}</Text>
          </View>
          <Text className={cn('text-3xl', isRTL ? 'font-quran' : 'font-display')} style={isRTL ? { lineHeight: 46, paddingVertical: 4 } : undefined}>
            {num(hijri.day)} {months[hijri.month - 1]} {num(hijri.year)}
          </Text>
          <Text className="text-sm text-muted-foreground">{new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
        </View>

        {hijri.month === RAMADAN ? (
          <View className="gap-3 rounded-3xl bg-primary p-5">
            <Text className="font-display text-2xl text-primary-foreground">{t('ramadanGreeting')}</Text>
            <Text className="text-sm text-primary-foreground/90">{t('ramadanDay', { n: hijri.day, total: monthLength(hijri.year, RAMADAN) })}</Text>
            {times ? (
              <View className="flex-row gap-3">
                <View className="flex-1 rounded-2xl bg-primary-foreground/15 p-3">
                  <Text className="text-sm text-primary-foreground/80">{t('ramadanSuhoor')}</Text>
                  <Text className="text-xl font-semibold text-primary-foreground">{formatTime(times.fajr, locale)}</Text>
                </View>
                <View className="flex-1 rounded-2xl bg-primary-foreground/15 p-3">
                  <Text className="text-sm text-primary-foreground/80">{t('ramadanIftar')}</Text>
                  <Text className="text-xl font-semibold text-primary-foreground">{formatTime(times.maghrib, locale)}</Text>
                </View>
              </View>
            ) : null}
            {!khatmah ? (
              <Button variant="secondary" className="h-11 self-start rounded-xl" onPress={() => { startKhatmah(30); router.push('/daily'); }}>
                <Text>{t('ramadanKhatmah')}</Text>
              </Button>
            ) : null}
          </View>
        ) : null}

        <View className="gap-3 rounded-3xl border border-border bg-card p-4">
          <View className="flex-row items-center justify-between gap-2">
            <Button variant="ghost" size="icon" className="size-11" accessibilityLabel={t('hijriPrev')} onPress={() => setView(v => shiftMonth(v.year, v.month, -1))}>
              <Icon as={isRTL ? ChevronRight : ChevronLeft} className="size-5" />
            </Button>
            <Text accessibilityLiveRegion="polite" className="text-lg font-semibold">{label}</Text>
            <Button variant="ghost" size="icon" className="size-11" accessibilityLabel={t('hijriNext')} onPress={() => setView(v => shiftMonth(v.year, v.month, 1))}>
              <Icon as={isRTL ? ChevronLeft : ChevronRight} className="size-5" />
            </Button>
          </View>
          <View className="flex-row">
            {weekdayNames.map((w, i) => <Text key={i} className="flex-1 py-1 text-center text-xs text-muted-foreground">{w}</Text>)}
          </View>
          <View className="flex-row flex-wrap">
            {cells.map((d, i) => (
              <View key={i} className="w-[14.2857%] p-0.5">
                {d ? (
                  <View accessibilityLabel={`${num(d.day)} ${label}`} className={cn('aspect-square items-center justify-center rounded-xl', d.iso === today ? 'bg-primary' : OCCASIONS.some(o => o.month === view.month && o.day === d.day) ? 'bg-secondary' : 'bg-muted/50')}>
                    <Text className={cn('text-sm', d.iso === today && 'font-semibold text-primary-foreground')}>{num(d.day)}</Text>
                    <Text className={cn('text-[9px]', d.iso === today ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{num(Number(d.iso.slice(8)))}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
          <Button variant="ghost" className="h-10 self-start rounded-xl" onPress={() => setView({ year: hijri.year, month: hijri.month })}>
            <Text className="text-primary">{t('hijriTodayLabel')}</Text>
          </Button>
        </View>

        {occasions.length > 0 ? (
          <View className="gap-2">
            <Text accessibilityRole="header" className="text-sm font-medium text-muted-foreground">{t('hijriOccasions')}</Text>
            {occasions.map(o => (
              <View key={o.day} className="flex-row gap-3 rounded-xl bg-muted px-4 py-2.5">
                <Text className="w-6 font-semibold">{num(o.day)}</Text>
                <Text className="flex-1 text-sm">{isRTL ? o.ar : o.en}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View className="gap-3 rounded-3xl border border-border bg-card p-5">
          <Text className="font-medium">{t('hijriAdjust')}</Text>
          <View className="flex-row gap-2">
            {[-1, 0, 1].map(n => (
              <Button key={n} variant={hijriAdjust === n ? 'default' : 'outline'} className="h-11 min-w-14 rounded-full" onPress={() => setHijriAdjust(n)} accessibilityState={{ selected: hijriAdjust === n }}>
                <Text>{n > 0 ? `+${n}` : String(n)}</Text>
              </Button>
            ))}
          </View>
          <Text className="text-xs leading-5 text-muted-foreground">{t('hijriAdjustHint')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
