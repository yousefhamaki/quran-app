import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { usePathname } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import { MushafSettingsSheet } from '@/components/sheets/mushaf-settings-sheet';
import { Icon } from '@/components/ui/icon';
import { ReciterList } from '@/components/reciter-list';
import { Chips } from '@/components/chips';
import { AutoNextSurahControl, ContinuousControl, GapControl, RepeatControl, SleepControl, SwitchRow } from '@/components/controls';
import { DownloadsList } from '@/components/downloads-list';
import { useOrderedReciters } from '@/components/reciter-list';
import { Field, Section } from '@/components/section';
import { Sheet } from '@/components/sheet';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import type { Lang } from '@/lib/i18n';
import { useSettings, type ThemeMode } from '@/context/settings';
import { useUI } from '@/context/ui';

const SPEEDS = [0.75, 1, 1.25, 1.5];

export function SettingsSheet() {
  const { settingsOpen, setSettingsOpen } = useUI();
  const { settings, update, theme, setTheme, t, isRTL } = useSettings();
  const { pinned, others } = useOrderedReciters();
  const [pickingReciter, setPickingReciter] = useState(false);

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

      <Section title={t('audio')}>
        <Field label={t('defaultReciter')}>
          <Pressable
            onPress={() => setPickingReciter(true)}
            accessibilityRole="button"
            accessibilityLabel={t('defaultReciter')}
            className="h-12 flex-row items-center justify-between rounded-xl border border-input bg-background px-4 active:bg-accent"
          >
            <Text numberOfLines={1} className="flex-1">{(() => { const r = [...pinned, ...others].find(x => x.id === settings.reciter); return r ? (isRTL ? r.ar : r.en) : settings.reciter; })()}</Text>
            <Icon as={ChevronDown} className="size-4 text-muted-foreground" />
          </Pressable>
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
      <Sheet open={pickingReciter} tall onClose={() => setPickingReciter(false)} title={t('defaultReciter')}>
        <ReciterList value={settings.reciter} onChange={reciter => { update({ reciter }); setPickingReciter(false); }} />
      </Sheet>
    </Sheet>
  );
}

/**
 * Settings depend on the screen: in the reader the gear opens the Mushaf settings (text, mushaf view, reading options);
 * everywhere else it opens the general settings. The Mushaf sheet has a button to reach the general ones.
 */
export function SettingsSheets() {
  const { settingsOpen, settingsScope, setSettingsScope } = useUI();
  const pathname = usePathname();
  useEffect(() => { if (!settingsOpen) setSettingsScope('auto'); }, [settingsOpen, setSettingsScope]);
  const mushaf = settingsScope === 'mushaf' || (settingsScope === 'auto' && pathname.startsWith('/surah'));
  return mushaf ? <MushafSettingsSheet onOpenGeneral={() => setSettingsScope('general')} /> : <SettingsSheet />;
}
