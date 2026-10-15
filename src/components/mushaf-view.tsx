import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, BookmarkCheck, BookOpenText, ChevronLeft, ChevronRight, ListTree, NotebookPen, Pause, Play, Share2, X } from 'lucide-react';
import { toast } from 'sonner';
import { shareAyahCard } from '@/lib/share-card';
import { Button } from '@/components/ui/button';
import { JumpSheet } from '@/components/jump-sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { indexOf, locate } from '@/lib/habit';
import { pageOfIndex, pageRange, TOTAL_PAGES } from '@/lib/mushaf';
import { NUMBER_COLORS } from '@/lib/mushaf-prefs';
import { HIGHLIGHT_COLORS, type HighlightColor } from '@/lib/study';
import { fetchSurah, normalize, translationDir, type Ayah, type Surah } from '@/lib/quran';
import { useLibrary } from '@/context/library';
import { usePlayer } from '@/context/player';
import { useSettings } from '@/context/settings';
import { useTheme } from '@/context/theme';

// Surah texts are fetched once per session; a page rarely needs more than two or three of them.
const HL_CLASS: Record<HighlightColor, string> = {
  yellow: 'bg-yellow-300/45 dark:bg-yellow-400/25',
  green: 'bg-emerald-400/35 dark:bg-emerald-400/25',
  blue: 'bg-sky-400/35 dark:bg-sky-400/25',
  pink: 'bg-pink-400/35 dark:bg-pink-400/25',
};
const HL_DOT: Record<HighlightColor, string> = { yellow: 'bg-yellow-400', green: 'bg-emerald-500', blue: 'bg-sky-500', pink: 'bg-pink-500' };
const HL_LABEL = { yellow: 'hlYellow', green: 'hlGreen', blue: 'hlBlue', pink: 'hlPink' } as const;

const texts = new Map<number, Promise<Ayah[]>>();
const surahText = (n: number) => {
  let hit = texts.get(n);
  if (!hit) {
    hit = fetchSurah(n).catch(error => { texts.delete(n); throw error; });
    texts.set(n, hit);
  }
  return hit;
};

interface PageAyah {
  surah: number;
  number: number;
  text: string;
}

interface Segment {
  surah: number;
  /** True when the surah begins on this page (header + bismillah are shown). */
  begins: boolean;
  ayahs: PageAyah[];
}

/** The ayahs of one mushaf page, grouped by surah. The bismillah the API puts in front of ayah 1 is shown as a line of its own. */
async function loadPage(page: number): Promise<Segment[]> {
  const [from, to] = pageRange(page);
  const segments: Segment[] = [];
  for (let i = from; i < to; i++) {
    const { surah, ayah } = locate(i);
    let seg = segments[segments.length - 1];
    if (!seg || seg.surah !== surah) {
      seg = { surah, begins: ayah === 1, ayahs: [] };
      segments.push(seg);
    }
  }
  const loaded = new Map<number, Ayah[]>();
  await Promise.all(segments.map(async s => { loaded.set(s.surah, await surahText(s.surah)); }));
  for (let i = from; i < to; i++) {
    const { surah, ayah } = locate(i);
    const a = loaded.get(surah)?.find(x => x.number === ayah);
    if (!a) continue;
    const hasBasmala = ayah === 1 && surah !== 1 && surah !== 9 && normalize(a.ar).startsWith('بسم الله الرحمن الرحيم');
    segments.find(s => s.surah === surah)!.ayahs.push({ surah, number: ayah, text: hasBasmala ? a.ar.replace(/^(\S+\s+){4}/, '') : a.ar });
  }
  return segments;
}

interface Props {
  surahs: Surah[];
  /** Where to open: the page that holds this ayah. */
  surah: number;
  ayah: number;
  /** Called with the first ayah of the page when the page changes (the address bar and header follow it). */
  onNavigate: (surah: number, ayah: number) => void;
  /** Opens the tafsir of an ayah of the surah in the address (the sheet only knows that surah). */
  onOpenTafsir?: (ayah: number) => void;
}

/** Ornamental or plain surah heading, with the bismillah under it. */
function SurahHeader({ number, surahs }: { number: number; surahs: Surah[] }) {
  const { mushaf, settings, t } = useSettings();
  const s = surahs.find(x => x.number === number);
  const name = s ? (settings.lang === 'ar' ? s.name : s.englishName) : `#${number}`;
  return (
    <header className="my-4 text-center">
      {mushaf.surahName === 'ornate' ? (
        <div className="pattern-lattice relative mx-auto my-2 flex max-w-md items-center justify-center rounded-2xl border-2 border-gold/60 bg-secondary px-6 py-3 shadow-sm">
          <span className="pointer-events-none absolute inset-1 rounded-xl border border-gold/40" aria-hidden />
          <h3 className="font-quran ar-safe text-3xl leading-[1.8] text-gold-foreground">{name}</h3>
        </div>
      ) : (
        <h3 className="font-quran text-3xl leading-[1.8] text-gold-foreground">{name}</h3>
      )}
      {number !== 1 && number !== 9 && (
        <p className="py-2 font-quran text-2xl leading-[1.9]" aria-label={t('bismillah')}>بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>
      )}
    </header>
  );
}

/** A page-by-page mushaf: ayahs run on like in the printed mushaf (Mushaf 1) or one ayah per block (Mushaf 2). */
export function MushafView({ surahs, surah, ayah, onNavigate, onOpenTafsir }: Props) {
  const { settings, mushaf, t } = useSettings();
  const { resolvedTheme } = useTheme();
  const { markRead, isBookmarked, toggleBookmark, annotationOf, setHighlight, setNote } = useLibrary();
  const [jumpOpen, setJumpOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [picked, setPicked] = useState<{ surah: number; number: number } | null>(null);
  const { playing, play, toggle } = usePlayer();
  const [page, setPage] = useState(() => pageOfIndex(indexOf(surah, ayah)));
  const [segments, setSegments] = useState<Segment[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  // Follow the address (a bookmark or "continue reading" opened a different place).
  const target = pageOfIndex(indexOf(surah, ayah));
  useEffect(() => { setPage(target); }, [target]);

  useEffect(() => {
    let cancelled = false;
    setSegments(null);
    setFailed(false);
    loadPage(page)
      .then(list => {
        if (cancelled) return;
        setSegments(list);
        const first = list[0]?.ayahs[0];
        if (first) markRead(first.surah, first.number);
      })
      .catch(() => !cancelled && setFailed(true));
    // Warm the next page while this one is read.
    void loadPage(Math.min(TOTAL_PAGES, page + 1)).catch(() => {});
    return () => { cancelled = true; };
  }, [page, attempt, markRead]);

  const go = useCallback((next: number) => {
    const p = Math.max(1, Math.min(TOTAL_PAGES, next));
    if (p === page) return;
    setPage(p);
    const first = locate(pageRange(p)[0]);
    onNavigate(first.surah, first.ayah);
    window.scrollTo({ top: 0 });
  }, [page, onNavigate]);

  // Left / right arrow keys turn the page (the mushaf is read right to left: left = next).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, [role=dialog]')) return;
      if (e.key === 'ArrowLeft') go(page + 1);
      else if (e.key === 'ArrowRight') go(page - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, page]);

  const numberColor = NUMBER_COLORS[mushaf.numberColor][resolvedTheme];
  const textStyle = useMemo(() => ({ fontSize: `${settings.fontSize}px`, color: undefined }), [settings.fontSize]);
  const alignClass = mushaf.align === 'center' ? 'text-center' : 'text-start';

  // Tapping an ayah marks it and shows its actions (play, bookmark, tafsir); tapping it again lets go.
  const pick = (s: number, n: number) => setPicked(p => (p?.surah === s && p.number === n ? null : { surah: s, number: n }));
  useEffect(() => { setPicked(null); }, [page]);
  useEffect(() => { setNoteOpen(false); setNoteDraft(picked ? annotationOf(picked.surah, picked.number)?.note ?? '' : ''); }, [picked]); // eslint-disable-line react-hooks/exhaustive-deps
  const share = async () => {
    if (!picked) return;
    try {
      const list = await surahText(picked.surah);
      const a = list.find(x => x.number === picked.number);
      const s = surahs.find(x => x.number === picked.surah);
      const result = await shareAyahCard(
        { ar: a?.ar ?? '', translation: settings.showTranslation ? a?.en : undefined, translationDir: translationDir(settings.translation), reference: `${s ? (settings.lang === 'ar' ? s.name : s.englishName) : picked.surah} · ${picked.number}`, dark: resolvedTheme === 'dark' },
        `quran-${picked.surah}-${picked.number}.png`,
      );
      if (result === 'downloaded') toast.success(t('shareDownloaded'));
    } catch { toast.error(t('shareFailed')); }
  };
  const pickedPlaying = !!picked && playing?.surah === picked.surah && playing.ayah === picked.number;

  const mark = (s: number, n: number) => (
    <span className="mx-1 inline-block align-middle font-quran text-[0.55em]" style={{ color: numberColor }} aria-hidden>
      ﴿{n.toLocaleString('ar-EG')}﴾{annotationOf(s, n)?.note ? <span className="ms-0.5 font-sans text-[0.9em]" title={annotationOf(s, n)?.note}>✎</span> : null}
    </span>
  );

  return (
    <div
      className="mx-auto w-full max-w-3xl px-3 pt-3 pb-44"
      onPointerDown={e => { swipe.current = { x: e.clientX, y: e.clientY }; }}
      onPointerUp={e => {
        const s = swipe.current;
        swipe.current = null;
        if (!s) return;
        const dx = e.clientX - s.x;
        // A mostly horizontal drag of 70px or more turns the page: right = next page, like turning a page of an Arabic book.
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5) go(dx > 0 ? page + 1 : page - 1);
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-2" dir="ltr">
        <Button variant="outline" size="icon" className="size-11 rounded-full" onClick={() => go(page + 1)} disabled={page >= TOTAL_PAGES} aria-label={t('mushafNextPage')}>
          <ChevronLeft className="size-5" aria-hidden />
        </Button>
        <button type="button" onClick={() => setJumpOpen(true)} className="flex h-11 items-center gap-2 rounded-full border px-4 text-sm text-muted-foreground transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none" aria-label={t('goToTitle')}>
          <ListTree className="size-4" aria-hidden />
          <span aria-live="polite" className="tabular-nums">{t('mushafPage', { n: page, total: TOTAL_PAGES })}</span>
          <span className="font-medium text-foreground">{t('goTo')}</span>
        </button>
        <Button variant="outline" size="icon" className="size-11 rounded-full" onClick={() => go(page - 1)} disabled={page <= 1} aria-label={t('mushafPrevPage')}>
          <ChevronRight className="size-5" aria-hidden />
        </Button>
      </div>

      {failed ? (
        <div className="rounded-2xl border border-dashed p-8 text-center">
          <p className="mb-4 text-muted-foreground">{t('error')}</p>
          <Button onClick={() => setAttempt(a => a + 1)}>{t('retry')}</Button>
        </div>
      ) : !segments ? (
        <div className="space-y-3" aria-busy aria-label={t('mushafLoading')}>
          {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-xl" />)}
        </div>
      ) : (
        <article dir="rtl" aria-label={t('mushafPage', { n: page, total: TOTAL_PAGES })}>
          {segments.map(seg => (
            <section key={seg.surah}>
              {seg.begins && <SurahHeader number={seg.surah} surahs={surahs} />}
              {mushaf.view === 'mushaf2' ? (
                <ol className="space-y-4">
                  {seg.ayahs.map(a => {
                    const isPlaying = (playing?.surah === a.surah && playing.ayah === a.number) || (picked?.surah === a.surah && picked.number === a.number);
                    return (
                      <li key={a.number}>
                        <button
                          type="button"
                          onClick={() => pick(a.surah, a.number)}
                          aria-label={`${t('ayah')} ${a.number}`}
                          className={cn('block w-full rounded-2xl px-4 py-3 transition-colors hover:bg-accent/60 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none', alignClass, isPlaying && 'ayah-playing bg-accent', !isPlaying && annotationOf(a.surah, a.number)?.color && HL_CLASS[annotationOf(a.surah, a.number)!.color!])}
                        >
                          <span className={cn('font-quran', mushaf.wide ? 'leading-[2]' : 'leading-[1.9]')} style={textStyle}>{a.text}{mark(a.surah, a.number)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className={cn('font-quran', alignClass, mushaf.wide ? 'leading-[2.4]' : 'leading-[2.25]')} style={textStyle}>
                  {seg.ayahs.map(a => {
                    const isPlaying = (playing?.surah === a.surah && playing.ayah === a.number) || (picked?.surah === a.surah && picked.number === a.number);
                    return (
                      <span
                        key={a.number}
                        role="button"
                        tabIndex={0}
                        onClick={() => pick(a.surah, a.number)}
                        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && pick(a.surah, a.number)}
                        aria-label={`${t('ayah')} ${a.number}`}
                        className={cn('mx-1 cursor-pointer rounded-md px-1.5 py-0.5 [box-decoration-break:clone] transition-colors hover:bg-accent/60 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none', isPlaying && 'ayah-playing bg-accent', !isPlaying && annotationOf(a.surah, a.number)?.color && HL_CLASS[annotationOf(a.surah, a.number)!.color!])}
                      >
                        {a.text}{mark(a.surah, a.number)}
                      </span>
                    );
                  })}
                </p>
              )}
            </section>
          ))}
        </article>
      )}

      {picked && (
        <div role="toolbar" aria-label={`${t('ayah')} ${picked.number}`} className="fixed inset-x-3 bottom-24 z-40 mx-auto max-w-md space-y-1 rounded-2xl border bg-background/95 p-1.5 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between gap-1">
            <span className="px-3 text-sm font-medium tabular-nums">{t('ayah')} {picked.number}</span>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="size-11 rounded-full" aria-label={pickedPlaying ? t('pause') : t('play')} onClick={() => (pickedPlaying ? toggle() : play(picked.surah, picked.number))}>
                {pickedPlaying ? <Pause className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}
              </Button>
              <Button size="icon" variant="ghost" className="size-11 rounded-full" aria-pressed={isBookmarked(picked.surah, picked.number)} aria-label={t('bookmark')} onClick={() => toggleBookmark(picked.surah, picked.number)}>
                {isBookmarked(picked.surah, picked.number) ? <BookmarkCheck className="size-5 text-primary" aria-hidden /> : <Bookmark className="size-5" aria-hidden />}
              </Button>
              <Button size="icon" variant="ghost" className="size-11 rounded-full" aria-label={t('shareAyah')} onClick={() => void share()}>
                <Share2 className="size-5" aria-hidden />
              </Button>
              <Button size="icon" variant="ghost" className="size-11 rounded-full" aria-expanded={noteOpen} aria-label={annotationOf(picked.surah, picked.number)?.note ? t('noteEdit') : t('noteAdd')} onClick={() => setNoteOpen(o => !o)}>
                <NotebookPen className={cn('size-5', annotationOf(picked.surah, picked.number)?.note && 'text-primary')} aria-hidden />
              </Button>
              {onOpenTafsir && picked.surah === surah && (
                <Button size="icon" variant="ghost" className="size-11 rounded-full" aria-label={t('tafsir')} onClick={() => onOpenTafsir(picked.number)}>
                  <BookOpenText className="size-5" aria-hidden />
                </Button>
              )}
              <Button size="icon" variant="ghost" className="size-11 rounded-full" aria-label={t('close')} onClick={() => setPicked(null)}>
                <X className="size-5" aria-hidden />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 pb-1.5" role="group" aria-label={t('highlight')}>
            {HIGHLIGHT_COLORS.map(c => {
              const on = annotationOf(picked.surah, picked.number)?.color === c;
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  aria-label={`${t('highlight')}: ${t(HL_LABEL[c])}`}
                  onClick={() => setHighlight(picked.surah, picked.number, on ? null : c)}
                  className="grid size-11 place-items-center rounded-full focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className={cn('size-7 rounded-full ring-offset-2 ring-offset-background transition-shadow', HL_DOT[c], on && 'ring-2 ring-foreground')} />
                </button>
              );
            })}
            {annotationOf(picked.surah, picked.number)?.color && (
              <Button size="sm" variant="ghost" className="ms-auto h-9 rounded-full text-xs" onClick={() => setHighlight(picked.surah, picked.number, null)}>{t('highlightClear')}</Button>
            )}
          </div>
          {noteOpen && (
            <form
              className="space-y-2 px-3 pb-2"
              onSubmit={e => { e.preventDefault(); setNote(picked.surah, picked.number, noteDraft); setNoteOpen(false); }}
            >
              <textarea
                value={noteDraft}
                onChange={e => setNoteDraft(e.target.value)}
                placeholder={t('notePlaceholder')}
                aria-label={t('noteAdd')}
                rows={3}
                autoFocus
                className="w-full resize-none rounded-xl border bg-background p-3 text-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              />
              <div className="flex justify-end gap-2">
                {annotationOf(picked.surah, picked.number)?.note && (
                  <Button type="button" variant="ghost" className="h-10 rounded-xl" onClick={() => { setNote(picked.surah, picked.number, null); setNoteDraft(''); setNoteOpen(false); }}>{t('noteDelete')}</Button>
                )}
                <Button type="submit" className="h-10 rounded-xl">{t('noteSave')}</Button>
              </div>
            </form>
          )}
        </div>
      )}

      <JumpSheet
        open={jumpOpen}
        onOpenChange={setJumpOpen}
        surahs={surahs}
        surah={surah}
        ayah={ayah}
        onPage={n => go(n)}
        onAyah={(s, a) => { setPage(pageOfIndex(indexOf(s, a))); onNavigate(s, a); window.scrollTo({ top: 0 }); }}
      />
    </div>
  );
}
