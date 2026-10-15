import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useUniwind } from 'uniwind';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { JumpSheet } from '@/components/sheets/jump-sheet';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { indexOf, locate } from '@/lib/habit';
import { pageOfIndex, pageRange, TOTAL_PAGES } from '@/lib/mushaf';
import { NUMBER_COLORS } from '@/lib/mushaf-prefs';
import { fetchSurah, normalize, type Ayah } from '@/lib/quran';
import { HIGHLIGHT_COLORS, type HighlightColor } from '@/lib/study';
import { useLibrary } from '@/context/library';
import { useUI } from '@/context/ui';
import { usePlayer } from '@/context/player';
import { useSettings } from '@/context/settings';
import { useSurahs } from '@/context/surahs';

// Surah texts are fetched once per session; a page rarely needs more than two or three of them.
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

const HL_RGBA: Record<HighlightColor, string> = { yellow: 'rgba(250,204,21,0.38)', green: 'rgba(52,211,153,0.32)', blue: 'rgba(56,189,248,0.32)', pink: 'rgba(244,114,182,0.32)' };
void HIGHLIGHT_COLORS;

const pageCache = new Map<number, Promise<Segment[]>>();

/** The ayahs of one mushaf page, grouped by surah. The bismillah the API puts in front of ayah 1 is shown as a line of its own. */
function loadPage(page: number): Promise<Segment[]> {
  const hit = pageCache.get(page);
  if (hit) return hit;
  const job = (async () => {
    const [from, to] = pageRange(page);
    const segments: Segment[] = [];
    for (let i = from; i < to; i++) {
      const { surah, ayah } = locate(i);
      if (segments[segments.length - 1]?.surah !== surah) segments.push({ surah, begins: ayah === 1, ayahs: [] });
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
  })();
  job.catch(() => pageCache.delete(page));
  pageCache.set(page, job);
  return job;
}

/** Ornamental or plain surah heading, with the bismillah under it. */
function SurahHeader({ number }: { number: number }) {
  const { mushaf, isRTL, t } = useSettings();
  const { byNumber } = useSurahs();
  const s = byNumber(number);
  const name = s ? (isRTL ? s.name : s.englishName) : `#${number}`;
  return (
    <View className="my-4 items-center">
      {mushaf.surahName === 'ornate' ? (
        <View className="min-w-[70%] items-center rounded-2xl border-2 border-gold/60 bg-secondary px-6 py-2">
          <View pointerEvents="none" className="absolute inset-1 rounded-xl border border-gold/40" />
          <Text className="font-quran text-3xl text-gold-foreground" style={{ lineHeight: 76, paddingVertical: 8 }}>{name}</Text>
        </View>
      ) : (
        <Text className="font-quran text-3xl text-gold-foreground" style={{ lineHeight: 76, paddingVertical: 8 }}>{name}</Text>
      )}
      {number !== 1 && number !== 9 ? (
        <Text className="font-quran py-2 text-2xl" accessibilityLabel={t('bismillah')} style={{ lineHeight: 52, paddingVertical: 4 }}>بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</Text>
      ) : null}
    </View>
  );
}

interface PageProps {
  page: number;
  width: number;
}

/** One mushaf page: ayahs run on like in the printed mushaf (Mushaf 1) or one ayah per block (Mushaf 2). */
const MushafPage = memo(function MushafPage({ page, width }: PageProps) {
  const { settings, mushaf, t } = useSettings();
  const { theme } = useUniwind();
  const { playing } = usePlayer();
  const { markRead, annotationOf } = useLibrary();
  const { setOptions, setTafsir } = useUI();
  const bgOf = (s: number, n: number, playingNow: boolean) => {
    if (playingNow) return { backgroundColor: highlight };
    const c = annotationOf(s, n)?.color;
    return c ? { backgroundColor: HL_RGBA[c] } : undefined;
  };
  const [segments, setSegments] = useState<Segment[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const highlight = theme === 'dark' ? 'rgba(79,197,150,0.22)' : 'rgba(11,93,75,0.14)';
  const numberColor = NUMBER_COLORS[mushaf.numberColor][theme === 'dark' ? 'dark' : 'light'];
  const size = settings.fontSize;

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    loadPage(page).then(list => !cancelled && setSegments(list)).catch(() => !cancelled && setFailed(true));
    return () => { cancelled = true; };
  }, [page, attempt]);

  // Tap an ayah for its options (play, bookmark, reciter); long-press for its tafsir.
  const pick = (s: number, n: number) => { markRead(s, n); setOptions({ surah: s, ayah: n }); };
  const explain = (s: number, n: number) => setTafsir({ surah: s, ayah: n });
  const lineHeight = size * (mushaf.wide ? 2.25 : 2.1);
  const textStyle = { fontSize: size, lineHeight, textAlign: mushaf.align === 'center' ? ('center' as const) : ('right' as const), writingDirection: 'rtl' as const };
  const num = (n: number) => `﴿${n.toLocaleString('ar-EG')}﴾`;

  return (
    <View style={{ width, flex: 1 }}>
      <ScrollView contentContainerClassName="px-3 pb-56 pt-2" showsVerticalScrollIndicator={false}>
        {failed ? (
          <View className="items-center gap-4 rounded-2xl border border-dashed border-border p-8">
            <Text className="text-center text-muted-foreground">{t('error')}</Text>
            <Button onPress={() => setAttempt(a => a + 1)}><Text>{t('retry')}</Text></Button>
          </View>
        ) : !segments ? (
          <View className="gap-3" accessibilityLabel={t('mushafLoading')}>
            {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-xl" />)}
          </View>
        ) : (
          segments.map(seg => (
            <View key={seg.surah}>
              {seg.begins ? <SurahHeader number={seg.surah} /> : null}
              {mushaf.view === 'mushaf2' ? (
                <View className="gap-4">
                  {seg.ayahs.map(a => {
                    const isPlaying = playing?.surah === a.surah && playing.ayah === a.number;
                    return (
                      <Pressable
                        key={a.number}
                        onPress={() => pick(a.surah, a.number)}
                        onLongPress={() => explain(a.surah, a.number)}
                        accessibilityRole="button"
                        accessibilityLabel={`${t('ayah')} ${a.number}`}
                        className="rounded-2xl px-4 py-3 active:bg-accent/60"
                        style={bgOf(a.surah, a.number, isPlaying)}
                      >
                        <Text className="font-quran" style={textStyle}>
                          {a.text}{' '}
                          <Text className="font-quran" style={{ fontSize: size * 0.6, color: numberColor }}>{num(a.number)}</Text>
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Text className="font-quran" style={textStyle}>
                  {seg.ayahs.map(a => {
                    const isPlaying = playing?.surah === a.surah && playing.ayah === a.number;
                    return (
                      <Text
                        key={a.number}
                        onPress={() => pick(a.surah, a.number)}
                        onLongPress={() => explain(a.surah, a.number)}
                        accessibilityRole="button"
                        accessibilityLabel={`${t('ayah')} ${a.number}`}
                        style={bgOf(a.surah, a.number, isPlaying)}
                      >
                        {a.text}{' '}
                        <Text className="font-quran" style={{ fontSize: size * 0.6, color: numberColor }}>{num(a.number)}{annotationOf(a.surah, a.number)?.note ? ' ✎' : ''}</Text>{' '}
                      </Text>
                    );
                  })}
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
});

interface Props {
  /** Where to open: the page that holds this ayah. */
  surah: number;
  ayah: number;
  /** Called with the first ayah of the page when the page changes (the screen's title follows it). */
  onNavigate: (surah: number, ayah: number) => void;
}

/** A page-by-page mushaf you flip by swiping (page 1 on the right, like a printed mushaf). */
export function MushafView({ surah, ayah, onNavigate }: Props) {
  const { t } = useSettings();
  const { markRead } = useLibrary();
  const { width } = useWindowDimensions();
  const list = useRef<FlatList<number>>(null);
  const [jumpOpen, setJumpOpen] = useState(false);
  const target = pageOfIndex(indexOf(surah, ayah));
  const [page, setPage] = useState(target);
  const pageRef = useRef(target);
  // The pages are listed 604 → 1 from left to right, so page 1 sits on the right and swiping right turns to the next page.
  const data = useMemo(() => Array.from({ length: TOTAL_PAGES }, (_, i) => TOTAL_PAGES - i), []);
  const indexOfPage = (p: number) => TOTAL_PAGES - p;

  const show = useCallback((p: number, animated: boolean) => {
    const next = Math.max(1, Math.min(TOTAL_PAGES, p));
    list.current?.scrollToIndex({ index: indexOfPage(next), animated });
  }, []);

  // Followed the address (a bookmark or "continue reading" opened another place).
  useEffect(() => {
    if (target !== pageRef.current) { pageRef.current = target; setPage(target); show(target, false); }
  }, [target, show]);

  const settle = (p: number) => {
    if (p === pageRef.current) return;
    pageRef.current = p;
    setPage(p);
    const first = locate(pageRange(p)[0]);
    markRead(first.surah, first.ayah);
    onNavigate(first.surah, first.ayah);
  };

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    settle(TOTAL_PAGES - Math.max(0, Math.min(TOTAL_PAGES - 1, index)));
  };

  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between gap-2 px-3 py-2" style={{ direction: 'ltr' }}>
        <Button variant="outline" size="icon" className="size-11 rounded-full" disabled={page >= TOTAL_PAGES} onPress={() => { show(page + 1, true); settle(Math.min(TOTAL_PAGES, page + 1)); }} accessibilityLabel={t('mushafNextPage')}>
          <Icon as={ChevronLeft} className="size-5" />
        </Button>
        <Pressable onPress={() => setJumpOpen(true)} accessibilityRole="button" accessibilityLabel={t('goToTitle')} className="min-h-11 flex-row items-center gap-2 rounded-full border border-border px-4 active:bg-accent">
          <Text accessibilityLiveRegion="polite" className="text-sm text-muted-foreground">{t('mushafPage', { n: page, total: TOTAL_PAGES })}</Text>
          <Text className="text-sm font-medium">{t('goTo')}</Text>
        </Pressable>
        <Button variant="outline" size="icon" className="size-11 rounded-full" disabled={page <= 1} onPress={() => { show(page - 1, true); settle(Math.max(1, page - 1)); }} accessibilityLabel={t('mushafPrevPage')}>
          <Icon as={ChevronRight} className="size-5" />
        </Button>
      </View>
      <FlatList
        ref={list}
        data={data}
        keyExtractor={p => String(p)}
        horizontal
        pagingEnabled
        style={{ flex: 1, direction: 'ltr' }}
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={indexOfPage(target)}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        initialNumToRender={1}
        windowSize={3}
        maxToRenderPerBatch={2}
        removeClippedSubviews
        onMomentumScrollEnd={onEnd}
        renderItem={({ item }) => <MushafPage page={item} width={width} />}
      />
      <JumpSheet
        open={jumpOpen}
        onClose={() => setJumpOpen(false)}
        surah={surah}
        ayah={ayah}
        onPage={n => { show(n, false); settle(n); }}
        onAyah={(s, a) => { const p = pageOfIndex(indexOf(s, a)); show(p, false); settle(p); }}
      />
    </View>
  );
}
