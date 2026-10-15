import { useEffect, useMemo, useState } from 'react';
import { Check, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { dateString } from '@/lib/hifz';
import { pickPrompt, recordAnswer, scoreOf, weakest, type Mistakes, type TestRange } from '@/lib/study';
import { fetchSurah, type Ayah, type Surah } from '@/lib/quran';
import { loadJSON, saveJSON } from '@/lib/storage';
import { useSettings } from '@/context/settings';

const KEY = 'quran.mistakes';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surahs: Surah[];
  /** Where to start the range (the plan's surah and what has been learned). */
  initial?: TestRange;
}

/** "What comes next?": the ayah is shown, the next one is hidden until you reveal it and say if you knew it. */
export function SelfTestSheet({ open, onOpenChange, surahs, initial }: Props) {
  const { settings, t } = useSettings();
  const ar = settings.lang === 'ar';
  const [step, setStep] = useState<'setup' | 'quiz' | 'done'>('setup');
  const [surahNo, setSurahNo] = useState(initial?.surah ?? 67);
  const [from, setFrom] = useState(initial?.from ?? 1);
  const [to, setTo] = useState(initial?.to ?? 10);
  const [ayahs, setAyahs] = useState<Ayah[] | null>(null);
  const [mistakes, setMistakes] = useState<Mistakes>(() => loadJSON<Mistakes>(KEY, {}));
  const [prompt, setPrompt] = useState(1);
  const [revealed, setRevealed] = useState(false);
  const [asked, setAsked] = useState(0);
  const [correct, setCorrect] = useState(0);
  const surah = surahs.find(s => s.number === surahNo);
  const total = surah?.numberOfAyahs ?? 1;
  const nameOf = (n: number) => { const s = surahs.find(x => x.number === n); return s ? (ar ? s.name : s.englishName) : `#${n}`; };
  const range: TestRange = { surah: surahNo, from: Math.max(1, Math.min(from, total)), to: Math.max(1, Math.min(to, total)) };
  const valid = range.to - range.from >= 1;

  useEffect(() => {
    if (!open) return;
    setStep('setup');
    if (initial) { setSurahNo(initial.surah); setFrom(initial.from); setTo(initial.to); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { saveJSON(KEY, mistakes); }, [mistakes]);

  const textOf = (n: number) => ayahs?.find(a => a.number === n)?.ar ?? '';
  const next = (list: Mistakes) => { setPrompt(pickPrompt(range, list)); setRevealed(false); };

  const start = async () => {
    setAyahs(null);
    setAsked(0);
    setCorrect(0);
    setStep('quiz');
    try { setAyahs(await fetchSurah(surahNo)); next(mistakes); } catch { setStep('setup'); }
  };

  const answer = (ok: boolean) => {
    const updated = recordAnswer(mistakes, surahNo, prompt + 1, ok, dateString());
    setMistakes(updated);
    setAsked(n => n + 1);
    if (ok) setCorrect(n => n + 1);
    next(updated);
  };

  const weak = useMemo(() => weakest(mistakes, 8), [mistakes]);
  const score = scoreOf(asked, correct);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto h-[90dvh] max-w-3xl gap-0 overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>{t('testTitle')}</SheetTitle>
          <SheetDescription>{step === 'quiz' ? `${nameOf(surahNo)} · ${t('ayah')} ${range.from}–${range.to}` : t('testHint')}</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-10">
          {step === 'setup' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="test-surah">{t('planSurah')}</Label>
                <Select value={String(surahNo)} onValueChange={v => { setSurahNo(Number(v)); setFrom(1); setTo(Math.min(10, surahs.find(s => s.number === Number(v))?.numberOfAyahs ?? 10)); }}>
                  <SelectTrigger id="test-surah" className="h-12 w-full rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {surahs.map(s => <SelectItem key={s.number} value={String(s.number)}>{s.number}. {ar ? s.name : s.englishName} ({s.numberOfAyahs})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="test-from">{t('testFrom')}</Label>
                  <Input id="test-from" type="number" inputMode="numeric" min={1} max={total} value={from} onChange={e => setFrom(Number(e.target.value) || 1)} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="test-to">{t('testTo')}</Label>
                  <Input id="test-to" type="number" inputMode="numeric" min={1} max={total} value={to} onChange={e => setTo(Number(e.target.value) || 1)} className="h-12 rounded-xl" />
                </div>
              </div>
              {!valid && <p role="alert" className="text-sm text-destructive">{t('testNeedTwo')}</p>}
              <Button className="h-12 w-full rounded-xl text-base" disabled={!valid} onClick={() => void start()}>{t('testStart')}</Button>

              <section className="space-y-2 pt-2" aria-labelledby="weak-heading">
                <h3 id="weak-heading" className="text-sm font-medium text-muted-foreground">{t('testWeak')}</h3>
                {weak.length === 0 ? (
                  <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">{t('testWeakEmpty')}</p>
                ) : (
                  <ul className="space-y-1.5">
                    {weak.map(w => (
                      <li key={`${w.surah}:${w.ayah}`} className="flex items-center justify-between gap-3 rounded-xl bg-muted px-4 py-2.5 text-sm">
                        <span>{nameOf(w.surah)} · {t('ayah')} {w.ayah}</span>
                        <span className="text-muted-foreground tabular-nums">{t('testMissedTimes', { n: w.missed, total: w.seen })}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}

          {step === 'quiz' && (
            <>
              <p className="text-sm font-medium text-muted-foreground">{t('testProgress', { n: asked + 1 })} · {t('testQuestion')}</p>
              {!ayahs ? (
                <p className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground" aria-busy>…</p>
              ) : (
                <>
                  <div className="rounded-3xl border bg-card p-5">
                    <p className="mb-2 text-xs text-muted-foreground">{nameOf(surahNo)} · {t('ayah')} {prompt}</p>
                    <p dir="rtl" className="font-quran text-center leading-[2.1]" style={{ fontSize: `${settings.fontSize}px` }}>{textOf(prompt)}</p>
                  </div>
                  <div className={cn('rounded-3xl border-2 border-dashed p-5', revealed && 'border-primary/50 bg-secondary')}>
                    <p className="mb-2 text-xs text-muted-foreground">{t('ayah')} {prompt + 1}</p>
                    {revealed ? (
                      <p dir="rtl" className="font-quran text-center leading-[2.1]" style={{ fontSize: `${settings.fontSize}px` }}>{textOf(prompt + 1)}</p>
                    ) : (
                      <Button variant="outline" className="h-12 w-full gap-2 rounded-xl" onClick={() => setRevealed(true)}><Eye className="size-5" aria-hidden /> {t('testReveal')}</Button>
                    )}
                  </div>
                  {revealed && (
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" className="h-12 gap-2 rounded-xl text-destructive" onClick={() => answer(false)}><X className="size-5" aria-hidden /> {t('testMissed')}</Button>
                      <Button className="h-12 gap-2 rounded-xl" onClick={() => answer(true)}><Check className="size-5" aria-hidden /> {t('testKnew')}</Button>
                    </div>
                  )}
                  {asked > 0 && (
                    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                      <span aria-live="polite">{t('testScore', { correct, asked, percent: score.percent })}</span>
                      <Button variant="ghost" className="h-11 rounded-xl" onClick={() => setStep('done')}>{t('testFinish')}</Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {step === 'done' && (
            <>
              <div className="rounded-3xl bg-secondary p-6 text-center">
                <p className="text-4xl font-semibold tabular-nums text-primary">{score.percent}%</p>
                <p className="mt-1 text-sm text-secondary-foreground">{t('testScore', { correct, asked, percent: score.percent })}</p>
              </div>
              <Button className="h-12 w-full rounded-xl text-base" onClick={() => setStep('setup')}>{t('testAgain')}</Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
