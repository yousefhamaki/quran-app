import { Moon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { usePlayer } from '@/context/player';
import { useSettings } from '@/context/settings';

const MINUTES = [5, 10, 15, 30, 45, 60];

export function formatCountdown(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** Sleep timer (stop after N minutes, or at the end of the surah). */
export function SleepControl() {
  const { sleep, sleepLeft, setSleep } = usePlayer();
  const { t } = useSettings();

  const value = sleep ? (sleep.kind === 'surah' ? 'surah' : String(sleep.minutes)) : 'off';
  const onChange = (v: string) => {
    if (!v || v === 'off') setSleep(null);
    else if (v === 'surah') setSleep({ kind: 'surah' });
    else setSleep({ kind: 'time', minutes: Number(v) });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label className="gap-2">
          <Moon className="size-4" aria-hidden /> {t('sleepTimer')}
        </Label>
        {sleep && (
          <span className="text-sm font-medium tabular-nums text-primary" aria-live="polite">
            {sleep.kind === 'surah' ? t('sleepEndOfSurah') : t('sleepLeft', { time: formatCountdown(sleepLeft ?? sleep.minutes * 60) })}
          </span>
        )}
      </div>
      <ToggleGroup type="single" variant="outline" value={value} onValueChange={onChange} className="flex w-full flex-wrap justify-start gap-2" aria-label={t('sleepTimer')}>
        <ToggleGroupItem value="off" className="h-11 rounded-full! border! px-4 text-sm shadow-none">{t('sleepOff')}</ToggleGroupItem>
        {MINUTES.map(m => (
          <ToggleGroupItem key={m} value={String(m)} className="h-11 rounded-full! border! px-4 text-sm shadow-none">
            {t('sleepMinutes', { n: m })}
          </ToggleGroupItem>
        ))}
        <ToggleGroupItem value="surah" className="h-11 rounded-full! border! px-4 text-sm shadow-none">{t('sleepEndOfSurah')}</ToggleGroupItem>
      </ToggleGroup>
      <p className="text-xs text-muted-foreground">{t('sleepHint')}</p>
    </div>
  );
}

/** "Keep going into the next surah" switch. */
export function AutoNextSurahControl({ id = 'auto-next-surah' }: { id?: string }) {
  const { autoNextSurah, setAutoNextSurah, t } = useSettings();
  return (
    <div className="space-y-1.5">
      <div className="flex min-h-11 items-center justify-between gap-4">
        <Label htmlFor={id}>{t('autoNextSurah')}</Label>
        <Switch id={id} checked={autoNextSurah} onCheckedChange={setAutoNextSurah} />
      </div>
      <p className="text-xs text-muted-foreground">{t('autoNextHint')}</p>
    </div>
  );
}
