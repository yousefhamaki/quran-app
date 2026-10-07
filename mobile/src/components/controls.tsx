import { View } from 'react-native';
import { AppSlider } from '@/components/app-slider';
import { Chips } from '@/components/chips';
import { Field } from '@/components/section';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { usePlayer } from '@/context/player';
import { useSettings } from '@/context/settings';

const GAP_PRESETS = [0, 3, 5, 10, 15];
const REPEAT_PRESETS = [1, 2, 3, 5, 7, 10, 0]; // 1 = once, 0 = forever
const SLEEP_MINUTES = [5, 10, 15, 30, 45, 60];

export function formatCountdown(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** "Normal" or N seconds of silence between ayahs, so you can repeat after the reciter. */
export function GapControl() {
  const { gapSeconds, setGapSeconds, t } = useSettings();
  return (
    <Field label={t('gap')} value={gapSeconds === 0 ? t('gapNormal') : t('gapSeconds', { n: gapSeconds })} hint={t('gapHint')}>
      <Chips
        label={t('gap')}
        value={GAP_PRESETS.includes(gapSeconds) ? gapSeconds : null}
        onChange={setGapSeconds}
        options={GAP_PRESETS.map(n => ({ value: n, label: n === 0 ? t('gapNormal') : t('gapSeconds', { n }) }))}
      />
      <AppSlider label={t('gap')} value={gapSeconds} min={0} max={60} step={1} onChange={setGapSeconds} />
    </Field>
  );
}

/** How many times each ayah plays before moving on (memorizing). */
export function RepeatControl() {
  const { repeatTimes, setRepeatTimes, t } = useSettings();
  const labelFor = (n: number) => (n === 1 ? t('repeatOff') : n === 0 ? t('repeatForever') : t('repeatTimesLabel', { n }));
  return (
    <Field label={t('repeatAyah')} hint={t('repeatHint')}>
      <Chips label={t('repeatAyah')} value={repeatTimes} onChange={setRepeatTimes} options={REPEAT_PRESETS.map(n => ({ value: n, label: labelFor(n) }))} />
    </Field>
  );
}

/** Sleep timer: stop after N minutes, or at the end of the surah. */
export function SleepControl() {
  const { sleep, sleepLeft, setSleep } = usePlayer();
  const { t } = useSettings();
  const value = sleep ? (sleep.kind === 'surah' ? 'surah' : String(sleep.minutes)) : 'off';
  const status = sleep
    ? sleep.kind === 'surah'
      ? t('sleepEndOfSurah')
      : t('sleepLeft', { time: formatCountdown(sleepLeft ?? sleep.minutes * 60) })
    : undefined;
  return (
    <Field label={t('sleepTimer')} value={status} hint={t('sleepHint')}>
      <Chips
        label={t('sleepTimer')}
        value={value}
        onChange={v => {
          if (v === 'off') setSleep(null);
          else if (v === 'surah') setSleep({ kind: 'surah' });
          else setSleep({ kind: 'time', minutes: Number(v) });
        }}
        options={[
          { value: 'off', label: t('sleepOff') },
          ...SLEEP_MINUTES.map(m => ({ value: String(m), label: t('sleepMinutes', { n: m }) })),
          { value: 'surah', label: t('sleepEndOfSurah') },
        ]}
      />
    </Field>
  );
}

function SwitchRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <View className="gap-1.5">
      <View className="min-h-11 flex-row items-center justify-between gap-4">
        <Text className="flex-1 text-sm font-medium">{label}</Text>
        <Switch checked={checked} onCheckedChange={onChange} accessibilityLabel={label} />
      </View>
      {hint ? <Text className="text-xs text-muted-foreground">{hint}</Text> : null}
    </View>
  );
}

export function AutoNextSurahControl() {
  const { autoNextSurah, setAutoNextSurah, t } = useSettings();
  return <SwitchRow label={t('autoNextSurah')} hint={t('autoNextHint')} checked={autoNextSurah} onChange={setAutoNextSurah} />;
}

export function ContinuousControl() {
  const { settings, update, t } = useSettings();
  return <SwitchRow label={t('continuous')} checked={settings.continuous} onChange={v => update({ continuous: v })} />;
}

export { SwitchRow };
