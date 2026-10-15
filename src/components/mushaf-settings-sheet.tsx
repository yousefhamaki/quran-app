import type { ReactNode } from 'react';
import { AlignCenter, AlignRight, Check, Minus, Plus, SlidersHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TajweedLegend } from '@/components/tajweed-legend';
import { cn } from '@/lib/utils';
import type { TKey } from '@/lib/i18n';
import { FONT_DEFAULT, NUMBER_COLORS, NUMBER_COLOR_ORDER, stepFont, type MushafView, type NumberColor } from '@/lib/mushaf-prefs';
import { TAFSIRS, TRANSLATIONS } from '@/lib/quran';
import { useSettings } from '@/context/settings';
import { useTheme } from '@/context/theme';

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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Row({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <Label htmlFor={id} className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Switch to the general settings (theme, language, audio, offline…). */
  onOpenGeneral: () => void;
}

/** Settings that only make sense while reading the Quran: they are shown from the reader and nowhere else. */
export function MushafSettingsSheet({ open, onOpenChange, onOpenGeneral }: Props) {
  const { settings, update, mushaf, setMushaf, memorize, setMemorize, tajweed, setTajweed, wordHighlight, setWordHighlight, t } = useSettings();
  const { resolvedTheme } = useTheme();
  const ar = settings.lang === 'ar';
  const size = settings.fontSize;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4 text-start">
          <SheetTitle className="font-display text-2xl">{t('mushafSettingsTitle')}</SheetTitle>
          <SheetDescription className="sr-only">{t('mushafSettingsTitle')}</SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-7 px-5 py-6">
            {/* How the Quran is shown */}
            <Section title={t('mushafViewHeading')}>
              <div role="radiogroup" aria-label={t('mushafViewHeading')} className="divide-y overflow-hidden rounded-2xl border">
                {VIEWS.map(v => {
                  const selected = mushaf.view === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setMushaf({ view: v.id })}
                      className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-accent/60 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{t(v.label)}</span>
                        <span className="block text-sm text-muted-foreground">{t(v.hint)}</span>
                      </span>
                      {selected && <Check className="size-5 shrink-0 text-primary" aria-hidden />}
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Text size */}
            <Section title={t('mushafTextSize')}>
              <div className="flex items-center justify-between gap-2 rounded-2xl bg-muted p-1.5" dir="ltr">
                <Button variant="ghost" size="icon" className="size-11 rounded-xl" onClick={() => update({ fontSize: stepFont(size, -1) })} aria-label={t('mushafSizeDown')}><Minus className="size-5" aria-hidden /></Button>
                <button type="button" onClick={() => update({ fontSize: FONT_DEFAULT })} className="min-w-24 rounded-xl px-3 py-2 text-center font-medium tabular-nums" aria-label={t('mushafSizeDefault')}>
                  {size === FONT_DEFAULT ? t('mushafSizeDefault') : `${size}px`}
                </button>
                <Button variant="ghost" size="icon" className="size-11 rounded-xl" onClick={() => update({ fontSize: stepFont(size, 1) })} aria-label={t('mushafSizeUp')}><Plus className="size-5" aria-hidden /></Button>
              </div>
            </Section>

            {/* Alignment */}
            <Section title={t('mushafAlign')}>
              <div role="radiogroup" aria-label={t('mushafAlign')} className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1.5">
                {([['center', AlignCenter, 'mushafAlignCenter'], ['start', AlignRight, 'mushafAlignStart']] as const).map(([id, Icon, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={mushaf.align === id}
                    aria-label={t(label)}
                    onClick={() => setMushaf({ align: id })}
                    className={cn('grid h-12 place-items-center rounded-xl border-2 transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none', mushaf.align === id ? 'border-primary bg-background' : 'border-transparent text-muted-foreground')}
                  >
                    <Icon className="size-6" aria-hidden />
                  </button>
                ))}
              </div>
            </Section>

            {/* Surah name */}
            <Section title={t('mushafSurahName')}>
              <div role="radiogroup" aria-label={t('mushafSurahName')} className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1.5">
                {([['plain', 'mushafNamePlain', 'سورة البقرة'], ['ornate', 'mushafNameOrnate', 'سُورَةُ البَقَرَة']] as const).map(([id, label, sample]) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={mushaf.surahName === id}
                    aria-label={t(label)}
                    onClick={() => setMushaf({ surahName: id })}
                    className={cn('grid h-14 place-items-center rounded-xl border-2 font-quran text-xl transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none', mushaf.surahName === id ? 'border-primary bg-background' : 'border-transparent text-muted-foreground')}
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </Section>

            {/* Number colour */}
            <Section title={t('mushafNumberColor')}>
              <div role="radiogroup" aria-label={t('mushafNumberColor')} className="flex items-center justify-around rounded-2xl bg-muted p-3">
                {NUMBER_COLOR_ORDER.map(c => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={mushaf.numberColor === c}
                    aria-label={t(COLOR_LABELS[c])}
                    onClick={() => setMushaf({ numberColor: c })}
                    className={cn('grid size-11 place-items-center rounded-full border-2 transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none', mushaf.numberColor === c ? 'border-foreground' : 'border-transparent')}
                  >
                    <span className="size-8 rounded-full" style={{ backgroundColor: NUMBER_COLORS[c][resolvedTheme] }} />
                  </button>
                ))}
              </div>
            </Section>

            <Section title={t('mushafColorsHeading')}>
              <p className="rounded-2xl bg-muted p-4 text-sm leading-relaxed">{t('mushafColorsNote')}</p>
            </Section>

            {/* Wide font */}
            <Section title={t('mushafWide')}>
              <div className="space-y-2 rounded-2xl bg-muted p-4">
                <Row id="mushaf-wide" label={t('mushafWide')}>
                  <Switch id="mushaf-wide" checked={mushaf.wide} onCheckedChange={v => setMushaf({ wide: v })} />
                </Row>
                <p dir="rtl" className="border-t pt-3 text-center font-quran text-2xl leading-[1.9]">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>
              </div>
              <p className="text-xs text-muted-foreground">{t('mushafWideHint')}</p>
            </Section>

            <Separator />

            {/* Reading options (moved here from the general settings) */}
            <Section title={t('reading')}>
              <Row id="show-translation" label={t('showTranslation')}>
                <Switch id="show-translation" checked={settings.showTranslation} onCheckedChange={v => update({ showTranslation: v })} />
              </Row>
              <div className="space-y-1.5">
                <Label htmlFor="translation">{t('translationLabel')}</Label>
                <Select value={settings.translation} onValueChange={v => update({ translation: v })}>
                  <SelectTrigger id="translation" className="h-12 w-full rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRANSLATIONS.map(x => <SelectItem key={x.id} value={x.id}>{x.native} — {x.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{t('translationHint')}</p>
              </div>
              <div className="space-y-1.5">
                <Row id="memorize" label={t('memorize')}>
                  <Switch id="memorize" checked={memorize} onCheckedChange={setMemorize} />
                </Row>
                <p className="text-xs text-muted-foreground">{t('memorizeHint')}</p>
              </div>
              <div className="space-y-1.5">
                <Row id="word-highlight" label={t('wordHighlight')}>
                  <Switch id="word-highlight" checked={wordHighlight} onCheckedChange={setWordHighlight} />
                </Row>
                <p className="text-xs text-muted-foreground">{t('wordHighlightHint')}</p>
              </div>
              <div className="space-y-1.5">
                <Row id="tajweed" label={t('tajweedColours')}>
                  <Switch id="tajweed" checked={tajweed} onCheckedChange={setTajweed} />
                </Row>
                <p className="text-xs text-muted-foreground">{t('tajweedHint')}</p>
                <TajweedLegend />
              </div>
              <div className="space-y-2">
                <Label>{t('defaultTafsir')}</Label>
                <Select value={String(settings.tafsirId)} onValueChange={v => update({ tafsirId: Number(v) })}>
                  <SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TAFSIRS.map(x => <SelectItem key={x.id} value={String(x.id)}>{ar ? x.ar : x.en}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </Section>

            <Button variant="outline" className="h-12 w-full gap-2 rounded-xl" onClick={onOpenGeneral}>
              <SlidersHorizontal className="size-4" aria-hidden /> {t('mushafMoreSettings')}
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
