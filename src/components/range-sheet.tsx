import { useEffect, useState } from 'react';
import { Repeat } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import type { Surah } from '@/lib/quran';
import { usePlayer } from '@/context/player';
import { useSettings } from '@/context/settings';

const ROUNDS = [2, 3, 5, 7, 10, 0]; // 0 = until stopped

interface Props {
  surah: Surah;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select this ayah (e.g. the one last played). */
  suggestFrom?: number;
}

/** Pick ayahs "from … to" and how many times to loop them as one block. */
export function RangeSheet({ surah, open, onOpenChange, suggestFrom }: Props) {
  const { settings, t } = useSettings();
  const { startRange } = usePlayer();
  const ar = settings.lang === 'ar';
  const total = surah.numberOfAyahs;
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(Math.min(total, 3));
  const [rounds, setRounds] = useState(3);

  useEffect(() => {
    if (!open) return;
    const start = Math.min(Math.max(1, suggestFrom ?? 1), total);
    setFrom(start);
    setTo(Math.min(total, start + 2));
  }, [open, surah.number, suggestFrom, total]);

  const ayahOptions = Array.from({ length: total }, (_, i) => i + 1);
  const changeFrom = (v: number) => { setFrom(v); if (to < v) setTo(v); };
  const changeTo = (v: number) => { setTo(v); if (from > v) setFrom(v); };
  const roundLabel = (n: number) => (n === 0 ? '∞' : `${n}×`);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] w-full max-w-3xl gap-0 overflow-y-auto rounded-t-3xl p-0 [&>*]:shrink-0">
        <SheetHeader className="px-5 pt-5 pb-3 text-start">
          <SheetTitle className="font-display text-2xl">{t('rangeTitle')}</SheetTitle>
          <SheetDescription className={cn(ar && 'font-quran text-base')}>
            {ar ? surah.name : surah.englishName} · {t('rangeHint')}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="range-from">{t('rangeFrom')}</Label>
              <Select value={String(from)} onValueChange={v => changeFrom(Number(v))}>
                <SelectTrigger id="range-from" className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{ayahOptions.map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="range-to">{t('rangeTo')}</Label>
              <Select value={String(to)} onValueChange={v => changeTo(Number(v))}>
                <SelectTrigger id="range-to" className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{ayahOptions.map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('rangeRounds')}</Label>
            <ToggleGroup type="single" variant="outline" value={String(rounds)} onValueChange={v => v !== '' && setRounds(Number(v))} className="flex w-full flex-wrap justify-start gap-2" aria-label={t('rangeRounds')}>
              {ROUNDS.map(n => (
                <ToggleGroupItem key={n} value={String(n)} className="h-11 rounded-full! border! px-4 text-sm shadow-none">{roundLabel(n)}</ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <Button
            className="h-12 w-full gap-2 rounded-xl text-base"
            onClick={() => {
              startRange({ surah: surah.number, from, to, rounds }, settings.reciter);
              onOpenChange(false);
            }}
          >
            <Repeat className="size-5" aria-hidden />
            {from === to ? t('rangeSingle', { from }) : t('rangeStart', { from, to })}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
