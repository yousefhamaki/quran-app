import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, View, type ViewToken } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowDownToLine, Bookmark, BookOpenText, Brain, CircleCheck, Eye, EyeOff, MoreHorizontal, Play, Repeat, Volume2 } from 'lucide-react-native';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { AllahText } from '@/components/allah-text';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { fetchSurah, fetchSurahWords, normalize, translationDir, type Ayah } from '@/lib/quran';
import type { Word } from '@/lib/tajweed';
import { useAyahs } from '@/hooks/use-ayahs';
import { useSurahWords } from '@/hooks/use-surah-words';
import { AyahWords } from '@/components/ayah-words';
import { MushafView } from '@/components/mushaf-view';
import { useDownloads } from '@/context/downloads';
import { useLibrary } from '@/context/library';
import { usePlayer } from '@/context/player';
import { useContentWidth } from '@/lib/layout';
import { useSettings } from '@/context/settings';
import { useSurahs } from '@/context/surahs';
import { useUI } from '@/context/ui';

/** One line of the list: an ayah, or the heading of a surah that the list has continued into. */
type Row = { kind: 'head'; surah: number } | { kind: 'ayah'; surah: number; a: Ayah };

/** Ornamental ayah-end marker. */
const mark = (n: number) => `﴿${n.toLocaleString('ar-EG')}﴾`;

/**
 * Memorize mode: stands in for the Arabic text. The text is never rendered while hidden, so nothing can leak
 * through (a colour trick can fail silently on some devices). The bars imitate blurred lines of text and roughly
 * follow the real length, so you still sense how long the ayah is.
 */
function HiddenAyah({ text, size, label }: { text: string; size: number; label: string }) {
  const width = useContentWidth();
  const lineWidth = Math.max(120, width - 48);
  const estimated = text.length * size * 0.42; // average Arabic glyph advance
  const lines = Math.max(1, Math.ceil(estimated / lineWidth));
  const lastShare = Math.min(1, Math.max(0.35, (estimated - (lines - 1) * lineWidth) / lineWidth));
  return (
    <View accessible accessibilityLabel={label} style={{ direction: 'rtl', alignItems: 'flex-start', gap: size * 0.4, paddingVertical: size * 0.3 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <View
          key={i}
          className="rounded-full bg-muted-foreground/25"
          style={{ height: size * 0.55, width: i === lines - 1 ? lineWidth * lastShare : lineWidth * (i % 2 ? 0.94 : 1) }}
        />
      ))}
    </View>
  );
}

export default function Reader() {
  const router = useRouter();
  const { id, ayah: ayahParam } = useLocalSearchParams<{ id: string; ayah?: string }>();
  const surahNumber = Number(id);
  const { settings, mushaf, memorize, setMemorize, tajweed, wordHighlight, t, isRTL } = useSettings();
  const { byNumber, status: surahsStatus } = useSurahs();
  const { isBookmarked, markRead } = useLibrary();
  const { playing, play, toggle, range } = usePlayer();
  const { has, job } = useDownloads();
  const { setOptions, setTafsir, setDownload, setRangeFor } = useUI();
  const { status, ayahs, retry } = useAyahs(Number.isFinite(surahNumber) ? surahNumber : null);
  // Word-level text (tajweed colours / word highlight); falls back to the plain text while loading or offline.
  const surahWords = useSurahWords(surahNumber, true, settings.reciter);
  const surah = byNumber(surahNumber);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const list = useRef<FlatList<Ayah>>(null);
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());
  const focused = useRef<string | null>(null);
  // Reading on past the last ayah continues into the next surah (and the next after that...).
  const [tail, setTail] = useState<number[]>([]);
  const [tailData, setTailData] = useState<Record<number, { ayahs: Ayah[]; words: Word[][] | null }>>({});
  const [visibleSurah, setVisibleSurah] = useState(surahNumber);
  const loadingTail = useRef(false);
  const userScrolled = useRef(false);
  // Memorize "revealed" keys: the ayah number for this surah, surah * 1000 + number for the ones that follow.
  const revealKey = (s: number, n: number) => (s === surahNumber ? n : s * 1000 + n);

  useEffect(() => setRevealed(new Set()), [surahNumber, memorize]);
  useEffect(() => {
    setTail([]);
    setTailData({});
    setVisibleSurah(surahNumber);
    userScrolled.current = false;
  }, [surahNumber]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = ayahs.map(a => ({ kind: 'ayah', surah: surahNumber, a }));
    for (const s of tail) {
      out.push({ kind: 'head', surah: s });
      for (const a of tailData[s]?.ayahs ?? []) out.push({ kind: 'ayah', surah: s, a });
    }
    return out;
  }, [ayahs, tail, tailData, surahNumber]);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const lastLoaded = tail.length ? tail[tail.length - 1] : surahNumber;
  const loadNext = useCallback(async () => {
    if (loadingTail.current || lastLoaded >= 114 || status !== 'ok') return;
    loadingTail.current = true;
    const next = lastLoaded + 1;
    try {
      const [nextAyahs, nextWords] = await Promise.all([fetchSurah(next), fetchSurahWords(next).catch(() => null)]);
      setTailData(prev => ({ ...prev, [next]: { ayahs: nextAyahs, words: nextWords } }));
      setTail(prev => (prev.includes(next) ? prev : [...prev, next]));
    } catch {
      /* offline: the "next surah" button stays so it can be tried again */
    } finally {
      loadingTail.current = false;
    }
  }, [lastLoaded, status]);

  // The title follows the surah that is on screen.
  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find(v => v.item)?.item as Row | undefined;
    if (first) setVisibleSurah(first.surah);
  }).current;
  const viewConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const scrollTo = useCallback((ayah: number, animated: boolean, ofSurah?: number) => {
    if (!list.current || ayah < 1) return;
    const target = ofSurah ?? surahNumber;
    const index = rowsRef.current.findIndex(r => r.kind === 'ayah' && r.surah === target && r.a.number === ayah);
    if (index >= 0) list.current.scrollToIndex({ index, animated, viewPosition: 0.3 });
  }, [surahNumber]);

  // Deep link / resume: scroll to the requested ayah once the text is on screen.
  useEffect(() => {
    if (status !== 'ok' || !ayahParam) return;
    const key = `${surahNumber}:${ayahParam}`;
    if (focused.current === key) return;
    focused.current = key;
    const timer = setTimeout(() => scrollTo(Number(ayahParam), false), 120);
    return () => clearTimeout(timer);
  }, [status, ayahParam, surahNumber, scrollTo]);

  // Follow the audio.
  useEffect(() => {
    if (status === 'ok' && playing && (playing.surah === surahNumber || tail.includes(playing.surah))) scrollTo(playing.ayah, true, playing.surah);
  }, [playing?.surah, playing?.ayah, status, surahNumber, scrollTo]);

  const playAyah = (s: number, n: number) => {
    if (playing?.surah === s && playing.ayah === n) toggle();
    else play(s, n);
  };

  if (!surah) {
    return (
      <View className="flex-1 bg-background">
        <AppHeader title={t('appName')} onBack={goBack} />
        <View className="p-6">
          {surahsStatus === 'loading' ? <Skeleton className="h-16 rounded-2xl" /> : <Text className="text-center text-muted-foreground">{t('noResults')}</Text>}
        </View>
      </View>
    );
  }

  const saved = has(surahNumber, settings.reciter);
  const downloading = job?.surah === surahNumber;
  const hasBasmala = surahNumber !== 1 && surahNumber !== 9;
  const shown = byNumber(visibleSurah) ?? surah;

  const toolbar = (
    <View className="gap-3 pb-2 pt-2">
      {hasBasmala && (
        <Text className="font-quran text-center text-3xl text-gold-foreground" style={{ lineHeight: 52, paddingVertical: 6 }} accessibilityLabel={t('bismillah')}>
          <AllahText text="بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ" />
        </Text>
      )}
      <View className="flex-row flex-wrap items-center gap-2">
        <Button className="h-11 rounded-full px-5" onPress={() => play(surahNumber, 1)}>
          <Icon as={Play} className="size-4 fill-primary-foreground text-primary-foreground" />
          <Text className="text-sm">{t('playSurah')}</Text>
        </Button>
        <Button variant="outline" className="h-11 rounded-full px-4" onPress={() => setDownload(surahNumber)}>
          <Icon as={downloading || !saved ? ArrowDownToLine : CircleCheck} className={cn('size-4', saved && !downloading && 'text-primary')} />
          <Text className="text-sm">
            {downloading && job ? `${Math.round((job.done / Math.max(1, job.total)) * 100)}%` : saved ? t('offlineSaved') : t('offlineButton')}
          </Text>
        </Button>
        <Button variant={range?.surah === surahNumber ? 'default' : 'outline'} className="h-11 rounded-full px-4" onPress={() => setRangeFor(surahNumber, Number(ayahParam) || undefined)}>
          <Icon as={Repeat} className={cn('size-4', range?.surah === surahNumber && 'text-primary-foreground')} />
          <Text className="text-sm">{t('rangeLoop')}</Text>
        </Button>
        <Button variant={memorize ? 'default' : 'outline'} className="h-11 rounded-full px-4" onPress={() => setMemorize(!memorize)} aria-pressed={memorize}>
          <Icon as={Brain} className={cn('size-4', memorize && 'text-primary-foreground')} />
          <Text className="text-sm">{t('memorize')}</Text>
        </Button>
        {memorize && (
          <Button variant="ghost" className="h-11 rounded-full px-4" onPress={() => setRevealed(revealed.size === ayahs.length ? new Set() : new Set(ayahs.map(a => a.number)))}>
            <Icon as={revealed.size === ayahs.length ? EyeOff : Eye} className="size-4" />
            <Text className="text-sm">{revealed.size === ayahs.length ? t('hideAll') : t('revealAll')}</Text>
          </Button>
        )}
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <AppHeader
        title={isRTL ? shown.name : shown.englishName}
        quranTitle={isRTL}
        subtitle={`${isRTL ? shown.englishName : shown.englishNameTranslation} · ${shown.numberOfAyahs} ${t('ayahs')}`}
        onBack={goBack}
      />

      {mushaf.view !== 'list' && (
        <MushafView
          surah={surahNumber}
          ayah={Number(ayahParam) || 1}
          onNavigate={(s, a) => router.setParams({ id: String(s), ayah: String(a) })}
        />
      )}

      {mushaf.view === 'list' && status === 'loading' && (
        <View className="gap-6 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} className="gap-3">
              <Skeleton className="h-10 w-11/12 self-end" />
              <Skeleton className="h-4 w-3/4" />
            </View>
          ))}
        </View>
      )}

      {mushaf.view === 'list' && status === 'error' && (
        <View className="m-4 items-center gap-4 rounded-2xl border border-dashed border-border p-8">
          <Text className="text-center text-muted-foreground">{t('error')}</Text>
          <Button onPress={retry}>
            <Text>{t('retry')}</Text>
          </Button>
        </View>
      )}

      {mushaf.view === 'list' && status === 'ok' && (
        <FlatList
          ref={list}
          data={rows}
          keyExtractor={r => (r.kind === 'head' ? `head:${r.surah}` : `${r.surah}:${r.a.number}`)}
          ListHeaderComponent={toolbar}
          ListFooterComponent={
            lastLoaded < 114 ? (
              <Pressable onPress={() => void loadNext()} accessibilityRole="button" className="mx-2 mt-6 items-center rounded-2xl border border-border bg-card py-4 active:bg-accent/60">
                <Text className="text-sm text-muted-foreground">{t('nextSurah')}</Text>
                <Text className="font-quran text-2xl text-gold-foreground" style={{ lineHeight: 48 }}>{isRTL ? byNumber(lastLoaded + 1)?.name : byNumber(lastLoaded + 1)?.englishName}</Text>
              </Pressable>
            ) : null
          }
          contentContainerClassName="px-2 pb-44"
          initialNumToRender={10}
          onScrollBeginDrag={() => { userScrolled.current = true; }}
          // (Not onEndReached: it fires once per list length, which on a short surah is before anyone has touched it.)
          scrollEventThrottle={100}
          onScroll={e => {
            if (!userScrolled.current) return;
            const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
            if (contentSize.height - (contentOffset.y + layoutMeasurement.height) < 700) void loadNext();
          }}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={viewConfig}
          onScrollToIndexFailed={info => {
            // Rows have different heights: jump near the target, then retry once it has been measured.
            list.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
            setTimeout(() => list.current?.scrollToIndex({ index: info.index, animated: false, viewPosition: 0.3 }), 150);
          }}
          renderItem={({ item }) => {
            if (item.kind === 'head') {
              const s = byNumber(item.surah);
              return (
                <View className="items-center gap-2 pb-2 pt-10">
                  <Text className="font-quran text-4xl text-gold-foreground" style={{ lineHeight: 72, paddingVertical: 6 }}>{s ? (isRTL ? s.name : s.englishName) : `#${item.surah}`}</Text>
                  {item.surah !== 9 && (
                    <Text className="font-quran text-center text-2xl" style={{ lineHeight: 52, paddingVertical: 4 }} accessibilityLabel={t('bismillah')}>
                      <AllahText text="بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ" />
                    </Text>
                  )}
                </View>
              );
            }
            const a = item.a;
            const sn = item.surah;
            const isPlaying = !!playing && playing.surah === sn && playing.ayah === a.number;
            const marked = isBookmarked(sn, a.number);
            const key = revealKey(sn, a.number);
            const hidden = memorize && !revealed.has(key);
            const words = sn === surahNumber ? surahWords : tailData[sn]?.words ?? null;
            // The API prepends the basmala to ayah 1 of most surahs; it is shown as the heading above instead.
            const stripBasmala = a.number === 1 && sn !== 1 && sn !== 9 && normalize(a.ar).startsWith('بسم الله الرحمن الرحيم');
            const text = stripBasmala ? a.ar.replace(/^(\S+\s+){4}/, '') : a.ar;
            const size = settings.fontSize;
            // At the smallest size the rows are tighter, so about six ayahs fit on the screen.
            const compact = size <= 20;
            return (
              <View className="border-b border-border/70">
                <Pressable
                  onPress={() => playAyah(sn, a.number)}
                  onLongPress={() => { markRead(sn, a.number); setOptions({ surah: sn, ayah: a.number }); }}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('ayah')} ${a.number}`}
                  className={cn('rounded-2xl px-4 active:bg-accent/60', compact ? 'py-2' : 'py-4', isPlaying && 'bg-accent')}
                >
                  {hidden ? (
                    <HiddenAyah text={text} size={size} label={`${t('ayah')} ${a.number}`} />
                  ) : (
                    <Text
                      className="font-quran"
                      style={{
                        fontSize: size,
                        // This Quran font is tall (long tails and stacked marks): a tighter line height clips the
                        // letters at the bottom of each ayah and makes lines overlap, most visibly at the big sizes.
                        lineHeight: size * 2.05,
                        paddingTop: size * 0.1,
                        paddingBottom: size * 0.3,
                        textAlign: 'right',
                        writingDirection: 'rtl',
                      }}
                    >
                      {words?.[a.number - 1] ? <AyahWords words={words[a.number - 1]} active={isPlaying} surah={sn} ayah={a.number} /> : <AllahText text={text} />}{' '}
                      <Text className="font-quran text-gold-foreground" style={{ fontSize: size * 0.6 }}>{mark(a.number)}</Text>
                    </Text>
                  )}
                  {(marked || isPlaying) && (
                    <View className="mt-1 flex-row gap-2">
                      {marked && <Icon as={Bookmark} className="size-4 fill-gold text-gold" />}
                      {isPlaying && <Icon as={Volume2} className="size-4 text-primary" />}
                    </View>
                  )}
                  {settings.showTranslation && (
                    <Text className="mt-2 text-[15px] text-muted-foreground" style={{ lineHeight: 23, textAlign: translationDir(settings.translation) === 'rtl' ? 'right' : 'left', writingDirection: translationDir(settings.translation) }}>
                      {a.en}
                    </Text>
                  )}
                </Pressable>
                {(mushaf.showActions || memorize) && (
                <View className={cn('flex-row items-center justify-end gap-1 px-3', compact ? 'pb-0' : 'pb-1')}>
                  {memorize && (
                    <Button
                      variant="ghost"
                      className="h-11 rounded-full px-4"
                      onPress={() =>
                        setRevealed(prev => {
                          const next = new Set(prev);
                          if (!next.delete(key)) next.add(key);
                          return next;
                        })
                      }
                      aria-pressed={!hidden}
                    >
                      <Icon as={hidden ? Eye : EyeOff} className="size-4 text-muted-foreground" />
                      <Text className="text-sm text-muted-foreground">{hidden ? t('revealAyah') : t('hideAyah')}</Text>
                    </Button>
                  )}
                  {mushaf.showActions && (<>
                  <Button
                    variant="secondary"
                    className="h-11 rounded-full px-4"
                    accessibilityLabel={`${t('tafsirHint')} · ${t('ayah')} ${a.number}`}
                    onPress={() => setTafsir({ surah: sn, ayah: a.number })}
                  >
                    <Icon as={BookOpenText} className="size-4 text-secondary-foreground" />
                    <Text className="text-sm">{t('tafsir')}</Text>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 rounded-full"
                    accessibilityLabel={`${t('ayahOptions')} · ${t('ayah')} ${a.number}`}
                    onPress={() => { markRead(sn, a.number); setOptions({ surah: sn, ayah: a.number }); }}
                  >
                    <Icon as={MoreHorizontal} className="size-5 text-muted-foreground" />
                  </Button>
                  </>)}
                </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
