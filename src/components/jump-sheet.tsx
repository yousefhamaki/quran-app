import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { TOTAL_PAGES } from '@/lib/mushaf';
import { HIZB_STARTS, hizbOf } from '@/lib/study';
import type { Surah } from '@/lib/quran';
import { useSettings } from '@/context/settings';

type Mode = 'page' | 'juz' | 'hizb';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surahs: Surah[];
  /** Current place, to mark the juz/hizb you are in. */
  surah: number;
  ayah: number;
  onPage: (page: number) => void;
  onAyah: (surah: number, ayah: number) => void;
}

/** Jump to a page, juz' or hizb. */
export function JumpSheet({ open, onOpenChange, surahs, surah, ayah, onPage, onAyah }: Props) {
  const { settings, t } = useSettings();
  const [mode, setMode] = useState<Mode>('juz');
  const [page, setPage] = useState('');
  const hizb = hizbOf(surah, ayah);
  const nameOf = (n: number) => { const s = surahs.find(x => x.number === n); return s ? (settings.lang === 'ar' ? s.name : s.englishName) : `#${n}`; };
  const fmt = (n: number) => (settings.lang === 'ar' ? n.toLocaleString('ar-EG') : String(n));

  const go = (s: number, a: number) => { onAyah(s, a); onOpenChange(false); };
  const items = mode === 'juz' ? Array.from({ length: 30 }, (_, i) => i + 1) : Array.from({ length: 60 }, (_, i) => i + 1);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto h-[85dvh] max-w-3xl gap-0 rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>{t('goToTitle')}</SheetTitle>
          <SheetDescription className="sr-only">{t('goToTitle')}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-3">
          <ToggleGroup type="single" value={mode} onValueChange={v => v && setMode(v as Mode)} variant="outline" className="w-full" aria-label={t('goToTitle')}>
            <ToggleGroupItem value="juz" className="h-11 flex-1">{t('goJuz')}</ToggleGroupItem>
            <ToggleGroupItem value="hizb" className="h-11 flex-1">{t('goHizb')}</ToggleGroupItem>
            <ToggleGroupItem value="page" className="h-11 flex-1">{t('goPage')}</ToggleGroupItem>
          </ToggleGroup>
        </div>

        {mode === 'page' ? (
          <form
            className="flex items-center gap-2 px-4"
            onSubmit={e => { e.preventDefault(); const n = Number(page); if (n >= 1 && n <= TOTAL_PAGES) { onPage(n); onOpenChange(false); } }}
          >
            <Input inputMode="numeric" value={page} onChange={e => setPage(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder={t('goPageHint')} aria-label={t('goPageHint')} className="h-12 rounded-xl text-center text-lg tabular-nums" autoFocus />
            <Button type="submit" className="h-12 rounded-xl px-6" disabled={!(Number(page) >= 1 && Number(page) <= TOTAL_PAGES)}>{t('goPageButton')}</Button>
          </form>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <ul className="grid grid-cols-2 gap-2 px-4 pb-8">
              {items.map(n => {
                const [s, a] = mode === 'juz' ? HIZB_STARTS[(n - 1) * 2] : HIZB_STARTS[n - 1];
                const here = mode === 'juz' ? Math.ceil(hizb / 2) === n : hizb === n;
                return (
                  <li key={n}>
                    <button
                      type="button"
                      onClick={() => go(s, a)}
                      aria-current={here ? 'true' : undefined}
                      className={cn('flex min-h-14 w-full flex-col items-start justify-center rounded-2xl border px-4 py-2 text-start transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none', here && 'border-primary bg-secondary')}
                    >
                      <span className="font-medium">{t(mode === 'juz' ? 'goJuzN' : 'goHizbN', { n: fmt(n) })}</span>
                      <span className="text-xs text-muted-foreground">{nameOf(s)} · {fmt(a)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
