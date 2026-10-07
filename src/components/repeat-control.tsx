import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useSettings } from '@/context/settings';

// 1 = once (no repeat), 0 = forever.
const PRESETS = [1, 2, 3, 5, 7, 10, 0];

/** How many times each ayah plays before the player moves on (for memorizing). */
export function RepeatControl() {
  const { repeatTimes, setRepeatTimes, t } = useSettings();
  const labelFor = (n: number) => (n === 1 ? t('repeatOff') : n === 0 ? t('repeatForever') : t('repeatTimesLabel', { n }));

  return (
    <div className="space-y-3">
      <Label>{t('repeatAyah')}</Label>
      <ToggleGroup
        type="single"
        variant="outline"
        value={String(repeatTimes)}
        onValueChange={v => v !== '' && setRepeatTimes(Number(v))}
        className="w-full"
        aria-label={t('repeatAyah')}
      >
        {PRESETS.map(n => (
          <ToggleGroupItem key={n} value={String(n)} className="h-11 flex-1 px-1 text-sm">
            {labelFor(n)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p className="text-xs text-muted-foreground">{t('repeatHint')}</p>
    </div>
  );
}
