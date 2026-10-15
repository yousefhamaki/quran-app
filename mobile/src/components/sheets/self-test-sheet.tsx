import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Check, ChevronDown, Eye, X } from 'lucide-react-native';
import { Sheet } from '@/components/sheet';
import { Stepper } from '@/components/stepper';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { dateString } from '@/lib/hifz';
import { pickPrompt, recordAnswer, scoreOf, weakest, type Mistakes, type TestRange } from '@/lib/study';
import { fetchSurah, type Ayah } from '@/lib/quran';
import { loadJSON, saveJSON } from '@/lib/storage';
import { useSettings } from '@/context/settings';
import { useSurahs } from '@/context/surahs';

const KEY = 'quran.mistakes';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Where to start the range (the plan's surah and what has been learned). */
  initial?: TestRange;
}

/** "What comes next?": the ayah is shown, the next one is hidden until you reveal it and say if you knew it. */
export function SelfTestSheet({ open, onClose, initial }: Props) {
  const { settings, t, isRTL } = useSettings();
  const { surahs, byNumber } = useSurahs();
  const [step, setStep] = useState<'setup' | 'quiz' | 'done'>('setup');
  const [surahNo, setSurahNo] = useState(initial?.surah ?? 67);
  const [from, setFrom] = useState(initial?.from ?? 1);
  const [to, setTo] = useState(initial?.to ?? 10);
  const [picking, setPicking] = useState(false);
  const [ayahs, setAyahs] = useState<Ayah[] | null>(null);
  const [mistakes, setMistakes] = useState<Mistakes>(() => loadJSON<Mistakes>(KEY, {}));
  const [prompt, setPrompt] = useState(1);
  const [revealed, setRevealed] = useState(false);
  const [asked, setAsked] = useState(0);
  const [correct, setCorrect] = useState(0);
  const total = byNumber(surahNo)?.numberOfAyahs ?? 1;
  const nameOf = (n: number) => { const s = byNumber(n); return s ? (isRTL ? s.name : s.englishName) : `#${n}`; };
  const range: TestRange = { surah: surahNo, from, to };
  const valid = to - from >= 1;
  const fmt = (n: number) => (isRTL ? n.toLocaleString('ar-EG') : String(n));

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
  const quranStyle = { fontSize: settings.fontSize, lineHeight: settings.fontSize * 2.1, textAlign: 'center' as const, writingDirection: 'rtl' as const };

  return (
    <Sheet open={open} tall onClose={onClose} title={t('testTitle')} description={step === 'quiz' ? `${nameOf(surahNo)} · ${t('ayah')} ${fmt(from)}–${fmt(to)}` : t('testHint')}>
      <View className="gap-5 pb-8">
        {step === 'setup' ? (
          <>
            <View className="gap-2">
              <Text className="text-sm font-medium">{t('planSurah')}</Text>
              <Pressable onPress={() => setPicking(true)} accessibilityRole="button" accessibilityLabel={t('planSurah')} className="h-12 flex-row items-center justify-between rounded-xl border border-input bg-background px-4 active:bg-accent">
                <Text numberOfLines={1} className="flex-1">{surahNo}. {nameOf(surahNo)}</Text>
                <Icon as={ChevronDown} className="size-4 text-muted-foreground" />
              </Pressable>
            </View>
            <View className="gap-2">
              <Text className="text-sm font-medium">{t('testFrom')}</Text>
              <Stepper value={from} min={1} max={total} onChange={v => { setFrom(v); if (to <= v) setTo(Math.min(total, v + 1)); }} label={t('testFrom')} big={total > 30} />
            </View>
            <View className="gap-2">
              <Text className="text-sm font-medium">{t('testTo')}</Text>
              <Stepper value={to} min={1} max={total} onChange={setTo} label={t('testTo')} big={total > 30} />
            </View>
            {!valid ? <Text accessibilityRole="alert" className="text-sm text-destructive">{t('testNeedTwo')}</Text> : null}
            <Button size="lg" className="h-12 rounded-xl" disabled={!valid} onPress={() => void start()}>
              <Text className="text-base">{t('testStart')}</Text>
            </Button>

            <View className="gap-2 pt-2">
              <Text accessibilityRole="header" className="text-sm font-medium text-muted-foreground">{t('testWeak')}</Text>
              {weak.length === 0 ? (
                <Text className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">{t('testWeakEmpty')}</Text>
              ) : (
                weak.map(w => (
                  <View key={`${w.surah}:${w.ayah}`} className="flex-row items-center justify-between gap-3 rounded-xl bg-muted px-4 py-2.5">
                    <Text className="text-sm">{nameOf(w.surah)} · {t('ayah')} {fmt(w.ayah)}</Text>
                    <Text className="text-sm text-muted-foreground">{t('testMissedTimes', { n: fmt(w.missed), total: fmt(w.seen) })}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        ) : null}

        {step === 'quiz' ? (
          <>
            <Text className="text-sm font-medium text-muted-foreground">{t('testProgress', { n: fmt(asked + 1) })} · {t('testQuestion')}</Text>
            {!ayahs ? (
              <Text className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">…</Text>
            ) : (
              <>
                <View className="rounded-3xl border border-border bg-card p-5">
                  <Text className="mb-2 text-xs text-muted-foreground">{nameOf(surahNo)} · {t('ayah')} {fmt(prompt)}</Text>
                  <Text className="font-quran" style={quranStyle}>{textOf(prompt)}</Text>
                </View>
                <View className={cn('rounded-3xl border-2 border-dashed border-border p-5', revealed && 'border-primary/50 bg-secondary')}>
                  <Text className="mb-2 text-xs text-muted-foreground">{t('ayah')} {fmt(prompt + 1)}</Text>
                  {revealed ? (
                    <Text className="font-quran" style={quranStyle}>{textOf(prompt + 1)}</Text>
                  ) : (
                    <Button variant="outline" className="h-12 rounded-xl" onPress={() => setRevealed(true)}>
                      <Icon as={Eye} className="size-5" />
                      <Text>{t('testReveal')}</Text>
                    </Button>
                  )}
                </View>
                {revealed ? (
                  <View className="flex-row gap-3">
                    <Button variant="outline" className="h-12 flex-1 rounded-xl" onPress={() => answer(false)}>
                      <Icon as={X} className="size-5 text-destructive" />
                      <Text className="text-destructive">{t('testMissed')}</Text>
                    </Button>
                    <Button className="h-12 flex-1 rounded-xl" onPress={() => answer(true)}>
                      <Icon as={Check} className="size-5 text-primary-foreground" />
                      <Text>{t('testKnew')}</Text>
                    </Button>
                  </View>
                ) : null}
                {asked > 0 ? (
                  <View className="flex-row items-center justify-between gap-3">
                    <Text accessibilityLiveRegion="polite" className="flex-1 text-sm text-muted-foreground">{t('testScore', { correct: fmt(correct), asked: fmt(asked), percent: fmt(score.percent) })}</Text>
                    <Button variant="ghost" className="h-11 rounded-xl" onPress={() => setStep('done')}><Text>{t('testFinish')}</Text></Button>
                  </View>
                ) : null}
              </>
            )}
          </>
        ) : null}

        {step === 'done' ? (
          <>
            <View className="items-center rounded-3xl bg-secondary p-6">
              <Text className="text-4xl font-semibold text-primary">{fmt(score.percent)}%</Text>
              <Text className="mt-1 text-sm text-secondary-foreground">{t('testScore', { correct: fmt(correct), asked: fmt(asked), percent: fmt(score.percent) })}</Text>
            </View>
            <Button size="lg" className="h-12 rounded-xl" onPress={() => setStep('setup')}><Text className="text-base">{t('testAgain')}</Text></Button>
          </>
        ) : null}
      </View>

      <Sheet open={picking} tall onClose={() => setPicking(false)} title={t('planSurah')}>
        <View className="gap-1 pb-4">
          {surahs.map(s => {
            const selected = s.number === surahNo;
            return (
              <Pressable
                key={s.number}
                onPress={() => { setSurahNo(s.number); setFrom(1); setTo(Math.min(10, s.numberOfAyahs)); setPicking(false); }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                className={cn('min-h-12 flex-row items-center gap-3 rounded-xl px-3 active:bg-accent', selected && 'bg-accent')}
              >
                <Text className="w-8 text-center text-sm text-muted-foreground">{s.number}</Text>
                <Text className="flex-1">{isRTL ? s.name : s.englishName}</Text>
                <Text className="text-xs text-muted-foreground">{s.numberOfAyahs}</Text>
                {selected ? <Icon as={Check} className="size-4 text-primary" /> : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </Sheet>
  );
}
