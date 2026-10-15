import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronLeft, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { CATEGORIES, totalCount, type AyahRef, type Category, type Dhikr } from '@/lib/adhkar';
import { fetchSurah } from '@/lib/quran';
import { useSettings } from '@/context/settings';

/** The joined text of some ayahs (read from the Quran text API; cached by the service worker). */
function useRefsText(refs: AyahRef[] | undefined): string | null {
  const [text, setText] = useState<string | null>(null);
  const key = refs?.map(r => `${r.surah}:${r.ayah}`).join(',') ?? '';
  useEffect(() => {
    if (!refs || refs.length === 0) return;
    let cancelled = false;
    setText(null);
    Promise.all(refs.map(r => fetchSurah(r.surah).then(list => list.find(a => a.number === r.ayah)?.ar ?? '')))
      .then(parts => !cancelled && setText(parts.join(' ')))
      .catch(() => !cancelled && setText(''));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return text;
}

interface ItemProps {
  item: Dhikr;
  done: number;
  onTap: () => void;
}

function Item({ item, done, onTap }: ItemProps) {
  const { settings, t } = useSettings();
  const ar = settings.lang === 'ar';
  const quran = useRefsText(item.refs);
  const finished = done >= item.count;
  const body = item.ar ?? quran;

  return (
    <Card className={cn('gap-3 rounded-2xl p-4 transition-colors', finished && 'border-primary/40 bg-secondary/50')}>
      <p className="text-sm font-medium text-muted-foreground">{ar ? item.titleAr : item.titleEn}</p>
      {body === null ? <div className="h-12 animate-pulse rounded-xl bg-muted" aria-hidden /> : <p lang="ar" dir="rtl" className="font-quran ar-safe text-2xl leading-[1.9]">{body}</p>}
      {!ar && item.en && <p className="text-sm text-muted-foreground">{item.en}</p>}
      {item.note && <p className="rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">{ar ? item.note.ar : item.note.en}</p>}
      <Button
        variant={finished ? 'secondary' : 'default'}
        className="h-12 w-full gap-2 rounded-xl text-base tabular-nums"
        disabled={finished}
        onClick={onTap}
        aria-label={`${ar ? item.titleAr : item.titleEn}: ${t('adhkarCount', { n: done, total: item.count })}`}
      >
        {finished ? <><CheckCircle2 className="size-5" aria-hidden /> {t('adhkarDone')}</> : item.count === 1 ? t('adhkarTap') : t('adhkarCount', { n: done, total: item.count })}
      </Button>
    </Card>
  );
}

export function AdhkarPage({ initial = null }: { initial?: string | null }) {
  const { settings, t } = useSettings();
  const ar = settings.lang === 'ar';
  const [open, setOpen] = useState<Category | null>(() => CATEGORIES.find(c => c.id === initial) ?? null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  if (!open) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-3 px-4 pt-6 pb-32">
        <ul className="space-y-3">
          {CATEGORIES.map(c => (
            <li key={c.id}>
              <button type="button" onClick={() => { setOpen(c); setCounts({}); }} className="flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-start transition-colors hover:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-lg', ar && 'font-quran')}>{ar ? c.ar : c.en}</span>
                  <span className="block text-sm text-muted-foreground">{t('adhkarItems', { n: c.items.length })}</span>
                </span>
                <ChevronLeft className="size-5 shrink-0 text-muted-foreground ltr:rotate-180" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <p className="pt-2 text-xs leading-relaxed text-muted-foreground">{t('adhkarNote')}</p>
      </div>
    );
  }

  const total = totalCount(open);
  const done = open.items.reduce((sum, i) => sum + Math.min(i.count, counts[i.id] ?? 0), 0);
  const pct = Math.round((done / total) * 100);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 pt-6 pb-32">
      <div className="flex items-center gap-2">
        <Button variant="ghost" className="h-11 gap-1 rounded-xl px-2" onClick={() => setOpen(null)}>
          <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden /> {t('adhkarTitle')}
        </Button>
        <Button variant="ghost" className="ms-auto h-11 gap-2 rounded-xl" onClick={() => setCounts({})}><RotateCcw className="size-4" aria-hidden /> {t('adhkarReset')}</Button>
      </div>
      <h2 className={cn('text-2xl', ar ? 'font-quran' : 'font-display font-semibold')}>{ar ? open.ar : open.en}</h2>
      <Progress value={pct} aria-label={open.en} />
      <ul className="space-y-3">
        {open.items.map(item => (
          <li key={item.id}>
            <Item item={item} done={counts[item.id] ?? 0} onTap={() => setCounts(c => ({ ...c, [item.id]: Math.min(item.count, (c[item.id] ?? 0) + 1) }))} />
          </li>
        ))}
      </ul>
      <p className="text-xs leading-relaxed text-muted-foreground">{t('adhkarNote')}</p>
    </div>
  );
}
