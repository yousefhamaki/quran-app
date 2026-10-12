import { useState } from 'react';
import { CalendarDays, CheckCircle2, GraduationCap, Repeat, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { addDays } from '@/lib/hifz';
import type { Surah } from '@/lib/quran';
import { useHifz } from '@/context/hifz';
import { useSettings } from '@/context/settings';

const PACES = [1, 2, 3, 5, 10];

interface Props {
  surahs: Surah[];
  /** Open the reader on these ayahs and loop them. */
  onPractice: (surah: number, from: number, to: number) => void;
}

function rangeLabel(from: number, to: number) {
  return from === to ? `${from}` : `${from}–${to}`;
}

export function PlanPage({ surahs, onPractice }: Props) {
  const { settings, t } = useSettings();
  const { plan, today, learn, due, stats, coming, create, markLearned, rate, remove } = useHifz();
  const ar = settings.lang === 'ar';
  const nameOf = (n: number) => { const s = surahs.find(x => x.number === n); return s ? (ar ? s.name : s.englishName) : `#${n}`; };

  // ---- create form ----
  const [surahNo, setSurahNo] = useState(67);
  const [startAyah, setStartAyah] = useState(1);
  const [pace, setPace] = useState(3);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const chosen = surahs.find(s => s.number === surahNo);

  if (!plan || !stats) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pt-6 pb-32">
        <div className="flex items-start gap-4 rounded-3xl bg-secondary p-5">
          <GraduationCap className="mt-0.5 size-8 shrink-0 text-primary" aria-hidden />
          <p className="text-sm leading-relaxed text-secondary-foreground">{t('planHow')}</p>
        </div>

        <Card className="space-y-5 rounded-3xl p-5">
          <div className="space-y-2">
            <Label htmlFor="plan-surah">{t('planSurah')}</Label>
            <Select value={String(surahNo)} onValueChange={v => { setSurahNo(Number(v)); setStartAyah(1); }}>
              <SelectTrigger id="plan-surah" className="h-12 w-full rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {surahs.map(s => (
                  <SelectItem key={s.number} value={String(s.number)}>
                    {s.number}. {ar ? s.name : s.englishName} ({s.numberOfAyahs})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-start">{t('planStartAyah')}</Label>
            <Input
              id="plan-start"
              type="number"
              inputMode="numeric"
              min={1}
              max={chosen?.numberOfAyahs ?? 1}
              value={startAyah}
              onChange={e => setStartAyah(Math.min(chosen?.numberOfAyahs ?? 1, Math.max(1, Number(e.target.value) || 1)))}
              className="h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('planPace')}</Label>
            <ToggleGroup type="single" variant="outline" value={String(pace)} onValueChange={v => v !== '' && setPace(Number(v))} className="flex w-full flex-wrap justify-start gap-2" aria-label={t('planPace')}>
              {PACES.map(n => (
                <ToggleGroupItem key={n} value={String(n)} className="h-11 min-w-12 rounded-full! border! px-4 text-sm shadow-none">{n}</ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">{t('planPaceHint')}</p>
          </div>

          <Button
            className="h-12 w-full rounded-xl text-base"
            disabled={!chosen}
            onClick={() => chosen && create({ surah: chosen.number, total: chosen.numberOfAyahs, start: startAyah, pace })}
          >
            {t('planCreate')}
          </Button>
        </Card>
      </div>
    );
  }

  const tomorrow = addDays(today, 1);
  const dayLabel = (day: string) => (day === tomorrow ? t('planTomorrow') : new Date(`${day}T00:00:00`).toLocaleDateString(ar ? 'ar' : 'en', { weekday: 'short', day: 'numeric', month: 'short' }));

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pt-6 pb-32">
      {/* Progress */}
      <Card className="gap-3 rounded-3xl p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className={cn('text-2xl', ar ? 'font-quran' : 'font-display font-semibold')}>{nameOf(plan.surah)}</h2>
          <span className="text-2xl font-semibold tabular-nums text-primary">{stats.percent}%</span>
        </div>
        <Progress value={stats.percent} aria-label={t('planProgress')} />
        <p className="text-sm text-muted-foreground">
          {t('planProgress')}: {t('planOf', { n: stats.memorized, total: stats.covered })}
        </p>
        <p className="text-xs text-muted-foreground">{stats.finished ? t('planFinished') : t('planDaysLeft', { n: stats.daysLeft })}</p>
      </Card>

      <section className="space-y-3" aria-labelledby="today-heading">
        <h2 id="today-heading" className="font-display text-xl font-semibold">{t('planTodayHeading')}</h2>

        {/* New portion */}
        {learn ? (
          <Card className="gap-3 rounded-2xl border-primary/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium tracking-wide text-primary uppercase">{t('planLearn')}</p>
                <p className="text-lg font-semibold">{nameOf(plan.surah)} · {t('ayah')} {rangeLabel(learn.from, learn.to)}</p>
              </div>
              <Badge variant="secondary" className="rounded-full">{learn.to - learn.from + 1}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="h-11 gap-2 rounded-xl" title={t('planPracticeHint')} onClick={() => onPractice(plan.surah, learn.from, learn.to)}>
                <Repeat className="size-4" aria-hidden /> {t('planPractice')}
              </Button>
              <Button className="h-11 gap-2 rounded-xl" onClick={markLearned}>
                <CheckCircle2 className="size-4" aria-hidden /> {t('planLearnedBtn')}
              </Button>
            </div>
          </Card>
        ) : (
          <p className="flex items-center gap-2 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
            <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden />
            {stats.finished ? t('planFinished') : t('planLearnDone')}
          </p>
        )}

        {/* Reviews */}
        <h3 className="pt-2 text-sm font-medium text-muted-foreground">{t('planReviewHeading')}</h3>
        {due.length === 0 ? (
          <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">{t('planNoReviews')}</p>
        ) : (
          <ul className="space-y-3">
            {due.map(card => (
              <li key={card.id}>
                <Card className="gap-3 rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{nameOf(plan.surah)} · {t('ayah')} {rangeLabel(card.from, card.to)}</p>
                    <Badge variant="outline" className="rounded-full font-normal">{t('planBox', { n: card.box + 1 })}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="ghost" className="h-11 gap-2 rounded-xl text-primary" onClick={() => onPractice(plan.surah, card.from, card.to)}>
                      <Repeat className="size-4" aria-hidden /> {t('planPractice')}
                    </Button>
                    <span className="ms-auto flex gap-2">
                      <Button variant="outline" className="h-11 rounded-xl px-3 text-destructive" onClick={() => rate(card.id, 'again')}>{t('planAgain')}</Button>
                      <Button variant="outline" className="h-11 rounded-xl px-3" onClick={() => rate(card.id, 'good')}>{t('planGood')}</Button>
                      <Button className="h-11 rounded-xl px-3" onClick={() => rate(card.id, 'easy')}>{t('planEasy')}</Button>
                    </span>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Coming up */}
      {coming.length > 0 && (
        <section className="space-y-2" aria-labelledby="coming-heading">
          <h2 id="coming-heading" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarDays className="size-4" aria-hidden /> {t('planUpcoming')}
          </h2>
          <ul className="space-y-1.5">
            {coming.map(c => (
              <li key={c.due} className="rounded-xl bg-muted px-4 py-2.5 text-sm">{t('planOnDay', { day: dayLabel(c.due), n: c.count })}</li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">{t('planHow')}</p>

      <Button variant="ghost" className="h-11 gap-2 rounded-xl text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
        <Trash2 className="size-4" aria-hidden /> {t('planReset')}
      </Button>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('planReset')}</AlertDialogTitle>
            <AlertDialogDescription>{t('planResetConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { remove(); setConfirmDelete(false); }}>{t('planReset')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
