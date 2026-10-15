import { useState } from 'react';
import { Check, Crosshair } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Lang } from '@/lib/i18n';
import { METHODS, type MethodId } from '@/lib/prayer';
import { RECITERS } from '@/lib/quran';
import { saveJSON } from '@/lib/storage';
import { useHabit } from '@/context/habit';
import { usePrayer } from '@/context/prayer';
import { useSettings } from '@/context/settings';

export const ONBOARDED_KEY = 'quran.onboarded';

/** A short list of well-loved reciters to pick from; the full list stays in the settings. */
const POPULAR = ['Alafasy_128kbps', 'Abdurrahmaan_As-Sudais_192kbps', 'MaherAlMuaiqly128kbps', 'Husary_128kbps', 'Minshawy_Murattal_128kbps', 'Abdul_Basit_Murattal_192kbps'];
const GOALS = [30, 60, 90];
const STEPS = 4;

interface Props {
  open: boolean;
  onClose: () => void;
}

/** First-run setup: language, reciter, prayer times and a reading goal. Every step can be skipped. */
export function Onboarding({ open, onClose }: Props) {
  const { settings, update, t } = useSettings();
  const prayer = usePrayer();
  const habit = useHabit();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [located, setLocated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goal, setGoal] = useState<number | null>(null);
  const ar = settings.lang === 'ar';

  const finish = () => {
    if (goal) { habit.startKhatmah(goal); toast.success(t('onboardGoalSet', { n: goal })); }
    saveJSON(ONBOARDED_KEY, true);
    setStep(0);
    onClose();
  };

  const locate = async () => {
    setBusy(true);
    setError(null);
    const r = await prayer.locate(settings.lang);
    setBusy(false);
    if (r === 'ok') setLocated(true);
    else setError(t('prayerLocDenied'));
  };

  const titles = [t('onboardWelcome'), t('onboardReciter'), t('onboardPrayer'), t('onboardGoal')];
  const last = step === STEPS - 1;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) { saveJSON(ONBOARDED_KEY, true); onClose(); } }}>
      <DialogContent className="max-h-[92dvh] gap-5 overflow-y-auto rounded-3xl sm:max-w-lg">
        <DialogHeader className="text-start">
          <p className="text-xs font-medium tracking-wide text-primary uppercase" aria-live="polite">{t('onboardStep', { n: step + 1, total: STEPS })}</p>
          <DialogTitle className="font-display text-2xl">{titles[step]}</DialogTitle>
          <DialogDescription className="sr-only">{titles[step]}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-1.5" aria-hidden>
          {Array.from({ length: STEPS }, (_, i) => <span key={i} className={cn('h-1.5 flex-1 rounded-full', i <= step ? 'bg-primary' : 'bg-muted')} />)}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{t('onboardWelcomeText')}</p>
            <div role="radiogroup" aria-label={t('onboardLanguage')} className="grid grid-cols-2 gap-2">
              {([['ar', 'العربية'], ['en', 'English']] as [Lang, string][]).map(([id, label]) => (
                <button key={id} type="button" role="radio" aria-checked={settings.lang === id} onClick={() => update({ lang: id })}
                  className={cn('h-14 rounded-2xl border-2 text-lg font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none', settings.lang === id ? 'border-primary bg-secondary' : 'border-border')}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('onboardReciterHint')}</p>
            <div role="radiogroup" aria-label={t('onboardReciter')} className="grid gap-2">
              {POPULAR.map(id => RECITERS.find(r => r.id === id)).filter((r): r is NonNullable<typeof r> => !!r).map(r => (
                <button key={r.id} type="button" role="radio" aria-checked={settings.reciter === r.id} onClick={() => update({ reciter: r.id })}
                  className={cn('flex min-h-12 items-center justify-between gap-3 rounded-2xl border-2 px-4 text-start transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none', settings.reciter === r.id ? 'border-primary bg-secondary' : 'border-border')}>
                  <span className={cn(ar && 'font-quran text-lg')}>{ar ? r.ar : r.en}</span>
                  {settings.reciter === r.id && <Check className="size-5 text-primary" aria-hidden />}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('onboardPrayerHint')}</p>
            <Button className="h-12 w-full gap-2 rounded-xl text-base" disabled={busy || located} onClick={() => void locate()}>
              {located ? <><Check className="size-5" aria-hidden /> {t('onboardLocated')}</> : <><Crosshair className="size-5" aria-hidden /> {busy ? t('prayerLocating') : t('prayerUseLocation')}</>}
            </Button>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('prayerMethod')}</p>
              <Select value={prayer.method} onValueChange={v => prayer.setMethod(v as MethodId)}>
                <SelectTrigger className="h-12 w-full rounded-xl" aria-label={t('prayerMethod')}><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {METHODS.map(m => <SelectItem key={m.id} value={m.id}>{ar ? m.ar : m.en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('onboardGoalHint')}</p>
            <div role="radiogroup" aria-label={t('onboardGoal')} className="grid grid-cols-4 gap-2">
              {GOALS.map(n => (
                <button key={n} type="button" role="radio" aria-checked={goal === n} onClick={() => setGoal(n)}
                  className={cn('h-14 rounded-2xl border-2 text-lg font-semibold tabular-nums transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none', goal === n ? 'border-primary bg-secondary' : 'border-border')}>
                  {n}
                </button>
              ))}
              <button type="button" role="radio" aria-checked={goal === null} onClick={() => setGoal(null)}
                className={cn('h-14 rounded-2xl border-2 text-sm font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none', goal === null ? 'border-primary bg-secondary' : 'border-border')}>
                {t('onboardNoGoal')}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button variant="ghost" className="h-11 rounded-xl" onClick={() => (step === 0 ? finish() : setStep(s => s - 1))}>
            {step === 0 ? t('onboardSkip') : t('onboardBack')}
          </Button>
          <Button className="h-11 min-w-32 rounded-xl" onClick={() => (last ? finish() : setStep(s => s + 1))}>
            {last ? t('onboardDone') : t('onboardNext')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
