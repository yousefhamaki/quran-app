import type { ReactNode } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type Theme } from '@/context/theme';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TAFSIRS, type Surah } from '@/lib/quran';
import { useOrderedReciters } from '@/components/reciter-list';
import { GapControl } from '@/components/gap-control';
import { RepeatControl } from '@/components/repeat-control';
import { DownloadsList } from '@/components/downloads-list';
import { SleepControl, AutoNextSurahControl } from '@/components/sleep-control';
import type { Lang } from '@/lib/i18n';
import { useSettings } from '@/context/settings';

const SPEEDS = [0.75, 1, 1.25, 1.5];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
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

export function SettingsSheet({ open, onOpenChange, surahs }: { open: boolean; onOpenChange: (o: boolean) => void; surahs: Surah[] }) {
  const { settings, update, memorize, setMemorize, t } = useSettings();
  const { theme, setTheme } = useTheme();
  const { pinned, others } = useOrderedReciters();
  const ar = settings.lang === 'ar';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4 text-start">
          <SheetTitle className="font-display text-2xl">{t('settings')}</SheetTitle>
          <SheetDescription className="sr-only">{t('settings')}</SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-7 px-5 py-6">
            <Section title={t('appearance')}>
              <div className="space-y-2">
                <Label>{t('theme')}</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={theme}
                  onValueChange={v => v && setTheme(v as Theme)}
                  className="w-full"
                >
                  <ToggleGroupItem value="light" className="h-11 flex-1 gap-2"><Sun className="size-4" aria-hidden />{t('light')}</ToggleGroupItem>
                  <ToggleGroupItem value="dark" className="h-11 flex-1 gap-2"><Moon className="size-4" aria-hidden />{t('dark')}</ToggleGroupItem>
                  <ToggleGroupItem value="system" className="h-11 flex-1 gap-2"><Monitor className="size-4" aria-hidden />{t('system')}</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="space-y-2">
                <Label>{t('language')}</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={settings.lang}
                  onValueChange={v => v && update({ lang: v as Lang })}
                  className="w-full"
                >
                  <ToggleGroupItem value="ar" className="h-11 flex-1">العربية</ToggleGroupItem>
                  <ToggleGroupItem value="en" className="h-11 flex-1">English</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </Section>

            <Separator />

            <Section title={t('reading')}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="font-size">{t('textSize')}</Label>
                  <span className="text-sm tabular-nums text-muted-foreground">{settings.fontSize}px</span>
                </div>
                <Slider
                  id="font-size"
                  min={20}
                  max={60}
                  step={2}
                  value={[settings.fontSize]}
                  onValueChange={([v]) => update({ fontSize: v })}
                  aria-label={t('textSize')}
                />
                <p dir="rtl" className="rounded-xl bg-muted p-4 text-center font-quran" style={{ fontSize: settings.fontSize }}>
                  بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                </p>
              </div>
              <Row id="show-translation" label={t('showTranslation')}>
                <Switch id="show-translation" checked={settings.showTranslation} onCheckedChange={v => update({ showTranslation: v })} />
              </Row>
              <div className="space-y-1.5">
                <Row id="memorize" label={t('memorize')}>
                  <Switch id="memorize" checked={memorize} onCheckedChange={setMemorize} />
                </Row>
                <p className="text-xs text-muted-foreground">{t('memorizeHint')}</p>
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

            <Separator />

            <Section title={t('audio')}>
              <div className="space-y-2">
                <Label>{t('defaultReciter')}</Label>
                <Select value={settings.reciter} onValueChange={v => update({ reciter: v })}>
                  <SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[...pinned, ...others].map(r => <SelectItem key={r.id} value={r.id}>{ar ? r.ar : r.en}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('speed')}</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={String(settings.speed)}
                  onValueChange={v => v && update({ speed: Number(v) })}
                  className="w-full"
                >
                  {SPEEDS.map(v => <ToggleGroupItem key={v} value={String(v)} className="h-11 flex-1">{v}x</ToggleGroupItem>)}
                </ToggleGroup>
              </div>
              <RepeatControl />
              <GapControl idPrefix="settings-gap" />
              <AutoNextSurahControl />
              <SleepControl />
              <Row id="continuous" label={t('continuous')}>
                <Switch id="continuous" checked={settings.continuous} onCheckedChange={v => update({ continuous: v })} />
              </Row>
            </Section>
            <Separator />

            <Section title={t('offlineSection')}>
              <DownloadsList surahs={surahs} />
            </Section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
