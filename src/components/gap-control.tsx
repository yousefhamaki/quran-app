import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useSettings } from '@/context/settings';

const PRESETS = [0, 3, 5, 10, 15];

/** "Normal" (0 s) or a number of seconds of silence between one ayah and the next. */
export function GapControl({ idPrefix = 'gap' }: { idPrefix?: string }) {
  const { gapSeconds, setGapSeconds, t } = useSettings();
  const label = gapSeconds === 0 ? t('gapNormal') : t('gapSeconds', { n: gapSeconds });
  const isPreset = PRESETS.includes(gapSeconds);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor={`${idPrefix}-slider`}>{t('gap')}</Label>
        <span className="text-sm font-medium tabular-nums text-primary">{label}</span>
      </div>

      <ToggleGroup
        type="single"
        variant="outline"
        value={isPreset ? String(gapSeconds) : ''}
        onValueChange={v => v !== '' && setGapSeconds(Number(v))}
        className="w-full"
        aria-label={t('gap')}
      >
        {PRESETS.map(n => (
          <ToggleGroupItem key={n} value={String(n)} className="h-11 flex-1 px-1 text-sm">
            {n === 0 ? t('gapNormal') : t('gapSeconds', { n })}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <Slider
        id={`${idPrefix}-slider`}
        min={0}
        max={60}
        step={1}
        value={[gapSeconds]}
        onValueChange={([v]) => setGapSeconds(v)}
        aria-label={t('gap')}
      />
      <p className="text-xs text-muted-foreground">{t('gapHint')}</p>
    </div>
  );
}
