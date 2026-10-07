import { useMemo, useState, type ReactNode } from 'react';
import { ArrowRight, BookOpen, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { SurahCard } from '@/components/surah-card';
import { useSettings } from '@/context/settings';
import { useLibrary } from '@/context/library';
import { isArabic, normalize, searchQuran, type SearchResult, type Surah } from '@/lib/quran';

interface Props {
  surahs: Surah[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onOpen: (surah: number, ayah?: number) => void;
}

type Found = { state: 'loading' } | { state: 'error' } | { state: 'ok'; term: string; ar: boolean; data: SearchResult };

const RESULT_LIMIT = 50;

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function Highlight({ text, term, ar }: { text: string; term: string; ar: boolean }): ReactNode {
  const clean = ar ? term.replace(/[ً-ٰٟۖ-ۭـ]/g, '') : term;
  if (!clean) return text;
  return text.split(new RegExp(`(${escapeRegExp(clean)})`, 'gi')).map((part, i) =>
    part.toLowerCase() === clean.toLowerCase() ? (
      <mark key={i} className="rounded bg-gold/30 px-0.5 text-foreground">{part}</mark>
    ) : (
      part
    ),
  );
}

export function Home({ surahs, loading, error, onRetry, onOpen }: Props) {
  const { settings, t } = useSettings();
  const { lastRead, bookmarks } = useLibrary();
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Found | null>(null);
  const ar = settings.lang === 'ar';

  const q = normalize(query.trim());
  const filtered = useMemo(
    () =>
      !q
        ? surahs
        : surahs.filter(
            s =>
              String(s.number) === q ||
              normalize(s.name).includes(q) ||
              normalize(s.englishName).includes(q) ||
              normalize(s.englishNameTranslation).includes(q),
          ),
    [q, surahs],
  );

  const surahName = (n: number) => {
    const s = surahs.find(x => x.number === n);
    return s ? (ar ? s.name : s.englishName) : `#${n}`;
  };

  async function runSearch() {
    const term = query.trim();
    if (!term) return;
    setFound({ state: 'loading' });
    try {
      setFound({ state: 'ok', term, ar: isArabic(term), data: await searchQuran(term) });
    } catch {
      setFound({ state: 'error' });
    }
  }

  const resume = lastRead ?? { surah: 1, ayah: 1 };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-5 pb-32">
      {/* Hero: the one primary action on the home screen. */}
      <button
        type="button"
        onClick={() => onOpen(resume.surah, resume.ayah)}
        className="pattern-lattice group relative isolate flex w-full items-center gap-4 overflow-hidden rounded-3xl bg-primary p-5 text-start text-primary-foreground shadow-[var(--shadow-soft)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-foreground/15" aria-hidden>
          <BookOpen className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs tracking-wide uppercase opacity-80">{lastRead ? t('continueReading') : t('tagline')}</span>
          <span className={`ar-safe block truncate text-2xl ${ar ? 'font-quran' : 'font-display font-semibold'}`}>
            {lastRead && surahs.length ? `${surahName(resume.surah)} · ${resume.ayah}` : t('startReading')}
          </span>
        </span>
        <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden />
      </button>

      {/* Search */}
      <form
        className="mt-5 flex items-center gap-2"
        onSubmit={e => { e.preventDefault(); void runSearch(); }}
        role="search"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={e => { setQuery(e.target.value); setFound(null); }}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className="h-12 rounded-2xl bg-card ps-10 text-base"
          />
        </div>
        <Button type="submit" className="h-12 rounded-2xl px-5" disabled={!query.trim()}>
          {t('searchAction')}
        </Button>
      </form>

      {found ? (
        <section className="mt-6" aria-live="polite">
          {found.state === 'loading' && <p className="py-8 text-center text-muted-foreground">{t('searching')}</p>}
          {found.state === 'error' && <p className="py-8 text-center text-destructive">{t('error')}</p>}
          {found.state === 'ok' && (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {found.data.count} {t('matches')}
                  {found.data.count > RESULT_LIMIT && ` · ${t('showingFirst', { n: RESULT_LIMIT })}`}
                </p>
                <Button variant="ghost" size="sm" onClick={() => setFound(null)}>
                  <X className="size-4" aria-hidden /> {t('clear')}
                </Button>
              </div>
              {found.data.count === 0 && <p className="py-8 text-center text-muted-foreground">{t('noResults')}</p>}
              <ul className="space-y-3">
                {found.data.matches.slice(0, RESULT_LIMIT).map((m, i) => (
                  <li key={`${m.surah}:${m.ayah}`} style={{ ['--i' as string]: Math.min(i, 10) }} className="rise-in">
                    <Card
                      role="button"
                      tabIndex={0}
                      onClick={() => onOpen(m.surah, m.ayah)}
                      onKeyDown={e => e.key === 'Enter' && onOpen(m.surah, m.ayah)}
                      className="gap-2 rounded-2xl p-4 transition-colors hover:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <p className="text-xs font-medium text-primary">{surahName(m.surah)} · {m.ayah}</p>
                      <p
                        dir={found.ar ? 'rtl' : 'ltr'}
                        className={found.ar ? 'font-quran text-xl' : 'leading-relaxed'}
                      >
                        <Highlight text={m.text} term={found.term} ar={found.ar} />
                      </p>
                    </Card>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ) : (
        <>
          {bookmarks.length > 0 && !q && surahs.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">{t('bookmarks')}</h2>
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                {bookmarks.map(b => (
                  <Badge
                    key={`${b.surah}:${b.ayah}`}
                    asChild
                    variant="secondary"
                    className="h-9 shrink-0 cursor-pointer rounded-full px-4 text-sm font-normal hover:bg-accent"
                  >
                    <button type="button" onClick={() => onOpen(b.surah, b.ayah)}>
                      {surahName(b.surah)} · {b.ayah}
                    </button>
                  </Badge>
                ))}
              </div>
            </section>
          )}

          <h2 className="mt-7 mb-3 font-display text-xl font-semibold">{t('surahs')}</h2>

          {error && (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <p className="mb-4 text-muted-foreground">{t('error')}</p>
              <Button onClick={onRetry}>{t('retry')}</Button>
            </div>
          )}

          {loading && (
            <ul className="grid gap-3 sm:grid-cols-2" aria-busy>
              {Array.from({ length: 8 }).map((_, i) => (
                <li key={i}><Skeleton className="h-[72px] rounded-2xl" /></li>
              ))}
            </ul>
          )}

          {!loading && !error && (
            <ul className="grid gap-3 sm:grid-cols-2">
              {filtered.map((s, i) => (
                <li key={s.number}><SurahCard surah={s} index={i} onOpen={x => onOpen(x.number)} /></li>
              ))}
            </ul>
          )}
          {!loading && !error && filtered.length === 0 && <p className="py-10 text-center text-muted-foreground">{t('noResults')}</p>}
        </>
      )}
    </div>
  );
}
