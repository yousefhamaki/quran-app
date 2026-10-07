import { View } from 'react-native';
import { AppSlider } from '@/components/app-slider';
import { Chips } from '@/components/chips';
import { AutoNextSurahControl, ContinuousControl, GapControl, RepeatControl, SleepControl, SwitchRow } from '@/components/controls';
import { DownloadsList } from '@/components/downloads-list';
import { useOrderedReciters } from '@/components/reciter-list';
import { Field, Section } from '@/components/section';
import { Sheet } from '@/components/sheet';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { TAFSIRS } from '@/lib/quran';
import type { Lang } from '@/lib/i18n';
import { useSettings, type ThemeMode } from '@/context/settings';
import { useUI } from '@/context/ui';

const SPEEDS = [0.75, 1, 1.25, 1.5];

export function SettingsSheet() {
  const { settingsOpen, setSettingsOpen } = useUI();
  const { settings, update, theme, setTheme, memorize, setMemorize, t, isRTL } = useSettings();
  const { pinned, others } = useOrderedReciters();

  return (
    <Sheet open={settingsOpen} tall onClose={() => setSettingsOpen(false)} title={t('settings')}>
      <Section title={t('appearance')}>
        <Field label={t('theme')}>
          <Chips<ThemeMode>
            label={t('theme')}
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: t('light') },
              { value: 'dark', label: t('dark') },
              { value: 'system', label: t('system') },
            ]}
          />
        </Field>
        <Field label={t('language')}>
          <Chips<Lang>
            label={t('language')}
            value={settings.lang}
            onChange={lang => update({ lang })}
            options={[
              { value: 'ar', label: 'العربية' },
              { value: 'en', label: 'English' },
            ]}
          />
        </Field>
      </Section>

      <Separator />

      <Section title={t('reading')}>
        <Field label={t('textSize')} value={`${settings.fontSize}`}>
          <AppSlider label={t('textSize')} value={settings.fontSize} min={20} max={52} step={2} onChange={v => update({ fontSize: v })} />
          <View className="rounded-xl bg-muted px-4 py-3">
            <Text
              className="font-quran text-center"
              style={{ fontSize: settings.fontSize, lineHeight: settings.fontSize * 1.25, paddingVertical: settings.fontSize * 0.3, writingDirection: 'rtl' }}
            >
              بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </Text>
          </View>
        </Field>
        <SwitchRow label={t('showTranslation')} checked={settings.showTranslation} onChange={v => update({ showTranslation: v })} />
        <SwitchRow label={t('memorize')} hint={t('memorizeHint')} checked={memorize} onChange={setMemorize} />
        <Field label={t('defaultTafsir')}>
          <Chips
            label={t('defaultTafsir')}
            value={settings.tafsirId}
            onChange={id => update({ tafsirId: id })}
            options={TAFSIRS.map(x => ({ value: x.id, label: isRTL ? x.ar : x.en }))}
          />
        </Field>
      </Section>

      <Separator />

      <Section title={t('audio')}>
        <Field label={t('defaultReciter')}>
          <Chips
            label={t('defaultReciter')}
            value={settings.reciter}
            onChange={reciter => update({ reciter })}
            options={[...pinned, ...others].map(r => ({ value: r.id, label: isRTL ? r.ar : r.en }))}
          />
        </Field>
        <Field label={t('speed')}>
          <Chips label={t('speed')} value={settings.speed} onChange={speed => update({ speed })} options={SPEEDS.map(v => ({ value: v, label: `${v}x` }))} />
        </Field>
        <ContinuousControl />
        <AutoNextSurahControl />
        <RepeatControl />
        <GapControl />
        <SleepControl />
      </Section>

      <Separator />

      <Section title={t('offlineSection')}>
        <DownloadsList />
      </Section>
    </Sheet>
  );
}
