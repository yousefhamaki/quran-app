import { useMemo, useState, type ReactNode } from 'react';
import { ArrowRight, Bookmark, Highlighter, CalendarDays, ArrowDownToLine, HandHeart, Languages, Search, SlidersHorizontal, Sparkles, UserRound, Volume2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { searchFeatures, type Feature } from '@/lib/features';
import { annotationList, type HighlightColor } from '@/lib/study';
import type { Surah } from '@/lib/quran';
import { useLibrary } from '@/context/library';
import { usePlayer } from '@/context/player';
import { useSettings } from '@/context/settings';

const DOT: Record<HighlightColor, string> = { yellow: 'bg-yellow-400', green: 'bg-emerald-500', blue: 'bg-sky-500', pink: 'bg-pink-500' };

/** What the More screen can ask the app to open. The app (App.tsx) owns the sheets. */
export interface MoreActions {
  openFeature: (feature: Feature) => void;
  openSettings: () => void;
  openMushafSettings: () => void;
  openDownloads: () => void;
  openPlayer: () => void;
  openAccount: () => void;
  openSetup: () => void;
  openPage: (page: 'adhkar' | 'calendar') => void;
  openAyah: (surah: number, ayah: number) => void;
}

interface RowProps {
  icon: ReactNode;
  title: string;
  hint?: string;
  onClick: () => void;
  badge?: string;
}

function Row({ icon, title, hint, onClick, badge }: RowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-16 w-full items-center gap-4 px-4 py-3 text-start transition-colors hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary" aria-hidden>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        {hint && <span className="block truncate text-sm text-muted-foreground">{hint}</span>}
      </span>
      {badge && <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary tabular-nums">{badge}</span>}
      <ArrowRight className="size-5 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
    </button>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="divide-y overflow-hidden rounded-3xl border bg-card">{children}</div>
    </section>
  );
}

/** The hub: search every feature, then the places that were hard to reach (library, tools, settings). */
export function MorePage({ surahs, actions }: { surahs: Surah[]; actions: MoreActions }) {
  const { settings, t } = useSettings();
  const { bookmarks, annotations } = useLibrary();
  const notes = useMemo(() => annotationList(annotations), [annotations]);
  const [showNotes, setShowNotes] = useState(false);
  const { playing } = usePlayer();
  const ar = settings.lang === 'ar';
  const [query, setQuery] = useState('');
  const [showBookmarks, setShowBookmarks] = useState(false);
  const results = useMemo(() => searchFeatures(query), [query]);
  const surahName = (n: number) => { const s = surahs.find(x => x.number === n); return s ? (ar ? s.name : s.englishName) : `#${n}`; };
  const searching = query.trim() !== '';

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pt-4 pb-32">
      <form role="search" onSubmit={e => e.preventDefault()} className="relative">
        <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('moreSearchPlaceholder')}
          aria-label={t('moreSearchLabel')}
          className="h-13 rounded-2xl bg-card ps-12 pe-12 text-base"
        />
        {searching && (
          <button type="button" onClick={() => setQuery('')} aria-label={t('clear')} className="absolute end-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-accent">
            <X className="size-5" aria-hidden />
          </button>
        )}
      </form>

      {searching ? (
        results.length === 0 ? (
          <p role="status" className="rounded-2xl bg-muted p-5 text-center text-sm text-muted-foreground">{t('moreSearchEmpty')}</p>
        ) : (
          <ul aria-label={t('moreSearchLabel')} className="divide-y overflow-hidden rounded-3xl border bg-card">
            {results.map(f => (
              <li key={f.id}>
                <Row icon={<Sparkles className="size-5" />} title={ar ? f.ar : f.en} hint={ar ? f.hintAr : f.hintEn} onClick={() => actions.openFeature(f)} />
              </li>
            ))}
          </ul>
        )
      ) : (
        <>
          <Group title={t('moreLibrary')}>
            <Row
              icon={<Bookmark className="size-5" />}
              title={t('moreBookmarks')}
              hint={bookmarks.length === 0 ? t('moreBookmarksEmpty') : undefined}
              badge={bookmarks.length > 0 ? String(bookmarks.length) : undefined}
              onClick={() => setShowBookmarks(v => !v)}
            />
            {showBookmarks && bookmarks.length > 0 && (
              <ul className="bg-muted/40">
                {bookmarks.map(b => (
                  <li key={`${b.surah}:${b.ayah}`}>
                    <button
                      type="button"
                      onClick={() => actions.openAyah(b.surah, b.ayah)}
                      className={cn('flex min-h-12 w-full items-center justify-between gap-3 px-6 py-2 text-start text-sm hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset')}
                    >
                      <span>{surahName(b.surah)}</span>
                      <span className="tabular-nums text-muted-foreground">{t('ayah')} {b.ayah}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Row
              icon={<Highlighter className="size-5" />}
              title={t('moreNotes')}
              hint={notes.length === 0 ? t('moreNotesEmpty') : undefined}
              badge={notes.length > 0 ? String(notes.length) : undefined}
              onClick={() => setShowNotes(v => !v)}
            />
            {showNotes && notes.length > 0 && (
              <ul className="bg-muted/40">
                {notes.map(n => (
                  <li key={`${n.surah}:${n.ayah}`}>
                    <button
                      type="button"
                      onClick={() => actions.openAyah(n.surah, n.ayah)}
                      className="flex min-h-12 w-full items-start gap-3 px-6 py-2 text-start text-sm hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset"
                    >
                      <span className={cn('mt-1 size-3 shrink-0 rounded-full', n.color ? DOT[n.color] : 'bg-muted-foreground/40')} aria-hidden />
                      <span className="flex-1">
                        <span className="block">{surahName(n.surah)} · {t('ayah')} {n.ayah}</span>
                        {n.note && <span className="block text-muted-foreground">{n.note}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Row icon={<ArrowDownToLine className="size-5" />} title={t('moreDownloads')} hint={t('moreDownloadsHint')} onClick={actions.openDownloads} />
          </Group>

          <Group title={t('moreTools')}>
            <Row icon={<HandHeart className="size-5" />} title={t('adhkarTitle')} hint={t('adhkarCardHint')} onClick={() => actions.openPage('adhkar')} />
            <Row icon={<CalendarDays className="size-5" />} title={t('calendarTitle')} hint={t('calendarCardHint')} onClick={() => actions.openPage('calendar')} />
            <Row icon={<Volume2 className="size-5" />} title={t('morePlayback')} hint={playing ? t('morePlaybackHint') : t('morePlaybackNone')} onClick={actions.openPlayer} />
          </Group>

          <Group title={t('moreApp')}>
            <Row icon={<SlidersHorizontal className="size-5" />} title={t('moreSettings')} hint={t('moreSettingsHint')} onClick={actions.openSettings} />
            <Row icon={<Languages className="size-5" />} title={t('moreMushaf')} hint={t('moreMushafHint')} onClick={actions.openMushafSettings} />
            <Row icon={<UserRound className="size-5" />} title={t('moreAccount')} hint={t('moreAccountHint')} onClick={actions.openAccount} />
            <Row icon={<Sparkles className="size-5" />} title={t('moreSetup')} hint={t('moreSetupHint')} onClick={actions.openSetup} />
          </Group>
        </>
      )}
    </div>
  );
}
