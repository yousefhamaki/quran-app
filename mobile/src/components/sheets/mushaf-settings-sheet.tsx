import { Pressable, View } from 'react-native';
import { useUniwind } from 'uniwind';
import { AlignCenter, AlignRight, Check, Minus, Plus, SlidersHorizontal } from 'lucide-react-native';
import { Chips } from '@/components/chips';
import { SwitchRow } from '@/components/controls';
import { Field, Section } from '@/components/section';
import { Sheet } from '@/components/sheet';
import { TajweedLegend } from '@/components/tajweed-legend';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { TKey } from '@/lib/i18n';
import { FONT_DEFAULT, NUMBER_COLORS, NUMBER_COLOR_ORDER, stepFont, type MushafView, type NumberColor } from '@/lib/mushaf-prefs';
import { TAFSIRS, TRANSLATIONS } from '@/lib/quran';
import { useSettings } from '@/context/settings';
import { useUI } from '@/context/ui';

const VIEWS: { id: MushafView; label: TKey; hint: TKey }[] = [
  { id: 'list', label: 'mushafViewList', hint: 'mushafViewListHint' },
  { id: 'mushaf1', label: 'mushafView1', hint: 'mushafView1Hint' },
  { id: 'mushaf2', label: 'mushafView2', hint: 'mushafView2Hint' },
];

const COLOR_LABELS: Record<NumberColor, TKey> = {
  red: 'mushafColorRed',
  gray: 'mushafColorGray',
  blue: 'mushafColorBlue',
  green: 'mushafColorGreen',
  gold: 'mushafColorGold',
};

/** Settings that only make sense while reading the Quran: they are shown from the reader and nowhere else. */
export function MushafSettingsSheet({ onOpenGeneral }: { onOpenGeneral: () => void }) {
  const { settingsOpen, setSettingsOpen } = useUI();
  const { settings, update, mushaf, setMushaf, memorize, setMemorize, tajweed, setTajweed, wordHighlight, setWordHighlight, t, isRTL } = useSettings();
  const { theme } = useUniwind();
  const size = settings.fontSize;
  const mode = theme === 'dark' ? 'dark' : 'light';

  return (
    <Sheet open={settingsOpen} tall onClose={() => setSettingsOpen(false)} title={t('mushafSettingsTitle')}>
      {/* How the Quran is shown */}
      <Section title={t('mushafViewHeading')}>
        <View accessibilityRole="radiogroup" className="overflow-hidden rounded-2xl border border-border">
          {VIEWS.map((v, i) => {
            const selected = mushaf.view === v.id;
            return (
              <Pressable
                key={v.id}
                onPress={() => setMushaf({ view: v.id })}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                className={cn('min-h-14 flex-row items-center gap-3 px-4 py-3 active:bg-accent/60', i > 0 && 'border-t border-border')}
              >
                <View className="flex-1">
                  <Text className="font-medium">{t(v.label)}</Text>
                  <Text className="text-sm text-muted-foreground">{t(v.hint)}</Text>
                </View>
                {selected ? <Icon as={Check} className="size-5 text-primary" /> : null}
              </Pressable>
            );
          })}
        </View>
      </Section>

      {/* Text size */}
      <Section title={t('mushafTextSize')}>
        <View className="flex-row items-center justify-between gap-2 rounded-2xl bg-muted p-1.5" style={{ direction: 'ltr' }}>
          <Button variant="ghost" size="icon" className="size-11 rounded-xl" onPress={() => update({ fontSize: stepFont(size, -1) })} accessibilityLabel={t('mushafSizeDown')}>
            <Icon as={Minus} className="size-5" />
          </Button>
          <Pressable onPress={() => update({ fontSize: FONT_DEFAULT })} accessibilityRole="button" accessibilityLabel={t('mushafSizeDefault')} className="min-w-24 items-center rounded-xl px-3 py-2">
            <Text className="font-medium">{size === FONT_DEFAULT ? t('mushafSizeDefault') : `${size}`}</Text>
          </Pressable>
          <Button variant="ghost" size="icon" className="size-11 rounded-xl" onPress={() => update({ fontSize: stepFont(size, 1) })} accessibilityLabel={t('mushafSizeUp')}>
            <Icon as={Plus} className="size-5" />
          </Button>
        </View>
      </Section>

      {/* Alignment */}
      <Section title={t('mushafAlign')}>
        <View accessibilityRole="radiogroup" className="flex-row gap-2 rounded-2xl bg-muted p-1.5">
          {([['center', AlignCenter, 'mushafAlignCenter'], ['start', AlignRight, 'mushafAlignStart']] as const).map(([id, IconComp, label]) => (
            <Pressable
              key={id}
              onPress={() => setMushaf({ align: id })}
              accessibilityRole="radio"
              accessibilityState={{ selected: mushaf.align === id }}
              accessibilityLabel={t(label)}
              className={cn('h-12 flex-1 items-center justify-center rounded-xl border-2', mushaf.align === id ? 'border-primary bg-background' : 'border-transparent')}
            >
              <Icon as={IconComp} className={cn('size-6', mushaf.align === id ? 'text-foreground' : 'text-muted-foreground')} />
            </Pressable>
          ))}
        </View>
      </Section>

      {/* Landscape (phone only) */}
      <SwitchRow label={t('mushafLandscape')} hint={t('mushafLandscapeHint')} checked={mushaf.allowLandscape} onChange={v => setMushaf({ allowLandscape: v })} />

      {/* Surah name */}
      <Section title={t('mushafSurahName')}>
        <View accessibilityRole="radiogroup" className="flex-row gap-2 rounded-2xl bg-muted p-1.5">
          {([['plain', 'mushafNamePlain', 'سورة البقرة'], ['ornate', 'mushafNameOrnate', 'سُورَةُ البَقَرَة']] as const).map(([id, label, sample]) => (
            <Pressable
              key={id}
              onPress={() => setMushaf({ surahName: id })}
              accessibilityRole="radio"
              accessibilityState={{ selected: mushaf.surahName === id }}
              accessibilityLabel={t(label)}
              className={cn('h-14 flex-1 items-center justify-center rounded-xl border-2', mushaf.surahName === id ? 'border-primary bg-background' : 'border-transparent')}
            >
              <Text className="font-quran text-xl" style={{ lineHeight: 36, paddingVertical: 2 }}>{sample}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      {/* Number colour */}
      <Section title={t('mushafNumberColor')}>
        <View accessibilityRole="radiogroup" className="flex-row items-center justify-around rounded-2xl bg-muted p-3">
          {NUMBER_COLOR_ORDER.map(c => (
            <Pressable
              key={c}
              onPress={() => setMushaf({ numberColor: c })}
              accessibilityRole="radio"
              accessibilityState={{ selected: mushaf.numberColor === c }}
              accessibilityLabel={t(COLOR_LABELS[c])}
              className={cn('size-11 items-center justify-center rounded-full border-2', mushaf.numberColor === c ? 'border-foreground' : 'border-transparent')}
            >
              <View className="size-8 rounded-full" style={{ backgroundColor: NUMBER_COLORS[c][mode] }} />
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title={t('mushafColorsHeading')}>
        <Text className="rounded-2xl bg-muted p-4 text-sm leading-6">{t('mushafColorsNote')}</Text>
      </Section>

      {/* Wide font */}
      <View className="gap-2 rounded-2xl bg-muted p-4">
        <SwitchRow label={t('mushafWide')} hint={t('mushafWideHint')} checked={mushaf.wide} onChange={v => setMushaf({ wide: v })} />
        <View className="border-t border-border pt-3">
          <Text className="font-quran text-center text-2xl" style={{ lineHeight: 52, paddingVertical: 4, writingDirection: 'rtl' }}>بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</Text>
        </View>
      </View>

      <Separator />

      {/* Reading options (moved here from the general settings) */}
      <Section title={t('reading')}>
        <SwitchRow label={t('showTranslation')} checked={settings.showTranslation} onChange={v => update({ showTranslation: v })} />
        <Field label={t('translationLabel')}>
          <Chips<string> label={t('translationLabel')} value={settings.translation} onChange={translation => update({ translation })} options={TRANSLATIONS.map(x => ({ value: x.id, label: x.native }))} />
        </Field>
        <SwitchRow label={t('memorize')} hint={t('memorizeHint')} checked={memorize} onChange={setMemorize} />
        <SwitchRow label={t('wordHighlight')} hint={t('wordHighlightHint')} checked={wordHighlight} onChange={setWordHighlight} />
        <View className="gap-1">
          <SwitchRow label={t('tajweedColours')} hint={t('tajweedHint')} checked={tajweed} onChange={setTajweed} />
          <TajweedLegend />
        </View>
        <Field label={t('defaultTafsir')}>
          <Chips
            label={t('defaultTafsir')}
            value={settings.tafsirId}
            onChange={id => update({ tafsirId: id })}
            options={TAFSIRS.map(x => ({ value: x.id, label: isRTL ? x.ar : x.en }))}
          />
        </Field>
      </Section>

      <Button variant="outline" className="h-12 rounded-xl" onPress={onOpenGeneral}>
        <Icon as={SlidersHorizontal} className="size-4" />
        <Text>{t('mushafMoreSettings')}</Text>
      </Button>
    </Sheet>
  );
}
