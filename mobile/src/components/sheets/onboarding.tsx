import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Check, ChevronDown, Crosshair } from 'lucide-react-native';
import { Sheet } from '@/components/sheet';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { Lang } from '@/lib/i18n';
import { METHODS } from '@/lib/prayer';
import { RECITERS } from '@/lib/quran';
import { saveJSON } from '@/lib/storage';
import { useHabit } from '@/context/habit';
import { usePrayer } from '@/context/prayer';
import { useSettings } from '@/context/settings';
import { useToast } from '@/context/toast';
import { useUI } from '@/context/ui';

export const ONBOARDED_KEY = 'quran.onboarded';

/** A short list of well-loved reciters to pick from; the full list stays in the settings. */
const POPULAR = ['Alafasy_128kbps', 'Abdurrahmaan_As-Sudais_192kbps', 'MaherAlMuaiqly128kbps', 'Husary_128kbps', 'Minshawy_Murattal_128kbps', 'Abdul_Basit_Murattal_192kbps'];
const GOALS = [30, 60, 90];
const STEPS = 4;

function Choice({ selected, onPress, children, label }: { selected: boolean; onPress: () => void; children: React.ReactNode; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={label} className={cn('min-h-12 flex-row items-center justify-between gap-3 rounded-2xl border-2 px-4', selected ? 'border-primary bg-secondary' : 'border-border')}>
      {children}
    </Pressable>
  );
}

/** First-run setup: language, reciter, prayer times and a reading goal. Every step can be skipped. */
export function Onboarding() {
  const { setupOpen, setSetupOpen } = useUI();
  const { settings, update, t, isRTL } = useSettings();
  const prayer = usePrayer();
  const habit = useHabit();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [located, setLocated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goal, setGoal] = useState<number | null>(null);
  const [methodOpen, setMethodOpen] = useState(false);
  const last = step === STEPS - 1;
  const titles = [t('onboardWelcome'), t('onboardReciter'), t('onboardPrayer'), t('onboardGoal')];
  const methodName = METHODS.find(m => m.id === prayer.method);

  const finish = () => {
    if (goal) { habit.startKhatmah(goal); toast.success(t('onboardGoalSet', { n: goal })); }
    saveJSON(ONBOARDED_KEY, true);
    setStep(0);
    setSetupOpen(false);
  };

  const locate = async () => {
    setBusy(true);
    setError(null);
    const r = await prayer.locate(settings.lang);
    setBusy(false);
    if (r === 'ok') setLocated(true);
    else setError(t('prayerLocDenied'));
  };

  return (
    <Sheet
      open={setupOpen}
      tall
      onClose={() => { saveJSON(ONBOARDED_KEY, true); setSetupOpen(false); }}
      title={titles[step]}
      description={t('onboardStep', { n: step + 1, total: STEPS })}
      footer={
        <View className="flex-row items-center justify-between gap-2">
          <Button variant="ghost" className="h-11 rounded-xl" onPress={() => (step === 0 ? finish() : setStep(s => s - 1))}>
            <Text>{step === 0 ? t('onboardSkip') : t('onboardBack')}</Text>
          </Button>
          <Button className="h-11 min-w-32 rounded-xl" onPress={() => (last ? finish() : setStep(s => s + 1))}>
            <Text>{last ? t('onboardDone') : t('onboardNext')}</Text>
          </Button>
        </View>
      }
    >
      <View className="gap-4 pb-4">
        <View className="flex-row gap-1.5">
          {Array.from({ length: STEPS }, (_, i) => <View key={i} className={cn('h-1.5 flex-1 rounded-full', i <= step ? 'bg-primary' : 'bg-muted')} />)}
        </View>

        {step === 0 ? (
          <>
            <Text className="text-sm leading-6 text-muted-foreground">{t('onboardWelcomeText')}</Text>
            <View accessibilityRole="radiogroup" className="flex-row gap-2">
              {([['ar', 'العربية'], ['en', 'English']] as [Lang, string][]).map(([id, label]) => (
                <Pressable key={id} onPress={() => update({ lang: id })} accessibilityRole="radio" accessibilityState={{ selected: settings.lang === id }} className={cn('h-14 flex-1 items-center justify-center rounded-2xl border-2', settings.lang === id ? 'border-primary bg-secondary' : 'border-border')}>
                  <Text className="text-lg font-medium">{label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Text className="text-sm text-muted-foreground">{t('onboardReciterHint')}</Text>
            <View accessibilityRole="radiogroup" className="gap-2">
              {POPULAR.map(id => RECITERS.find(r => r.id === id)).filter((r): r is NonNullable<typeof r> => !!r).map(r => (
                <Choice key={r.id} selected={settings.reciter === r.id} onPress={() => update({ reciter: r.id })} label={isRTL ? r.ar : r.en}>
                  <Text className={cn(isRTL && 'font-quran text-lg')}>{isRTL ? r.ar : r.en}</Text>
                  {settings.reciter === r.id ? <Icon as={Check} className="size-5 text-primary" /> : null}
                </Choice>
              ))}
            </View>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text className="text-sm text-muted-foreground">{t('onboardPrayerHint')}</Text>
            <Button size="lg" className="h-12 rounded-xl" disabled={busy || located} onPress={() => void locate()}>
              <Icon as={located ? Check : Crosshair} className="size-5 text-primary-foreground" />
              <Text className="text-base">{located ? t('onboardLocated') : busy ? t('prayerLocating') : t('prayerUseLocation')}</Text>
            </Button>
            {error ? <Text accessibilityRole="alert" className="text-sm text-destructive">{error}</Text> : null}
            <View className="gap-2">
              <Text className="text-sm font-medium">{t('prayerMethod')}</Text>
              <Pressable onPress={() => setMethodOpen(v => !v)} accessibilityRole="button" accessibilityLabel={t('prayerMethod')} className="h-12 flex-row items-center justify-between rounded-xl border border-input bg-background px-4 active:bg-accent">
                <Text numberOfLines={1} className="flex-1">{methodName ? (isRTL ? methodName.ar : methodName.en) : prayer.method}</Text>
                <Icon as={ChevronDown} className="size-4 text-muted-foreground" />
              </Pressable>
              {methodOpen ? (
                <View className="overflow-hidden rounded-xl border border-border">
                  {METHODS.map((m, i) => (
                    <Pressable key={m.id} onPress={() => { prayer.setMethod(m.id); setMethodOpen(false); }} accessibilityRole="radio" accessibilityState={{ selected: m.id === prayer.method }} className={cn('min-h-12 flex-row items-center gap-3 px-4 active:bg-accent', i > 0 && 'border-t border-border', m.id === prayer.method && 'bg-accent')}>
                      <Text className="flex-1 text-sm">{isRTL ? m.ar : m.en}</Text>
                      {m.id === prayer.method ? <Icon as={Check} className="size-4 text-primary" /> : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Text className="text-sm text-muted-foreground">{t('onboardGoalHint')}</Text>
            <View accessibilityRole="radiogroup" className="flex-row gap-2">
              {GOALS.map(n => (
                <Pressable key={n} onPress={() => setGoal(n)} accessibilityRole="radio" accessibilityState={{ selected: goal === n }} className={cn('h-14 flex-1 items-center justify-center rounded-2xl border-2', goal === n ? 'border-primary bg-secondary' : 'border-border')}>
                  <Text className="text-lg font-semibold">{n}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setGoal(null)} accessibilityRole="radio" accessibilityState={{ selected: goal === null }} className={cn('h-14 flex-1 items-center justify-center rounded-2xl border-2', goal === null ? 'border-primary bg-secondary' : 'border-border')}>
                <Text className="text-sm font-medium">{t('onboardNoGoal')}</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </View>
    </Sheet>
  );
}
