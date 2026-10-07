import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowDownToLine, Bookmark, BookOpenText, Brain, CircleCheck, Eye, EyeOff, MoreHorizontal, Play, Volume2 } from 'lucide-react-native';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { normalize, type Ayah } from '@/lib/quran';
import { useAyahs } from '@/hooks/use-ayahs';
import { useDownloads } from '@/context/downloads';
import { useLibrary } from '@/context/library';
import { usePlayer } from '@/context/player';
import { useSettings } from '@/context/settings';
import { useSurahs } from '@/context/surahs';
import { useUI } from '@/context/ui';

/** Ornamental ayah-end marker. */
const mark = (n: number) => `﴿${n.toLocaleString('ar-EG')}﴾`;

export default function Reader() {
  const router = useRouter();
  const { id, ayah: ayahParam } = useLocalSearchParams<{ id: string; ayah?: string }>();
  const surahNumber = Number(id);
  const { settings, memorize, setMemorize, t, isRTL } = useSettings();
  const { byNumber, status: surahsStatus } = useSurahs();
  const { isBookmarked, markRead } = useLibrary();
  const { playing, play, toggle } = usePlayer();
  const { has, job } = useDownloads();
  const { setOptions, setTafsir, setDownload } = useUI();
  const { status, ayahs, retry } = useAyahs(Number.isFinite(surahNumber) ? surahNumber : null);
  const surah = byNumber(surahNumber);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const list = useRef<FlatList<Ayah>>(null);
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());
  const focused = useRef<string | null>(null);

  useEffect(() => setRevealed(new Set()), [surahNumber, memorize]);

  const scrollTo = useCallback((ayah: number, animated: boolean) => {
    if (!list.current || ayah < 1) return;
    list.current.scrollToIndex({ index: ayah - 1, animated, viewPosition: 0.3 });
  }, []);

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
    if (status === 'ok' && playing?.surah === surahNumber) scrollTo(playing.ayah, true);
  }, [playing?.surah, playing?.ayah, status, surahNumber, scrollTo]);

  const playAyah = (n: number) => {
    if (playing?.surah === surahNumber && playing.ayah === n) toggle();
    else play(surahNumber, n);
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

  const toolbar = (
    <View className="gap-3 pb-2 pt-2">
      {hasBasmala && (
        <Text className="font-quran text-center text-3xl text-gold-foreground" style={{ lineHeight: 52, paddingVertical: 6 }} accessibilityLabel={t('bismillah')}>
          بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
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
        title={isRTL ? surah.name : surah.englishName}
        quranTitle={isRTL}
        subtitle={`${isRTL ? surah.englishName : surah.englishNameTranslation} · ${surah.numberOfAyahs} ${t('ayahs')}`}
        onBack={goBack}
      />

      {status === 'loading' && (
        <View className="gap-6 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} className="gap-3">
              <Skeleton className="h-10 w-11/12 self-end" />
              <Skeleton className="h-4 w-3/4" />
            </View>
          ))}
        </View>
      )}

      {status === 'error' && (
        <View className="m-4 items-center gap-4 rounded-2xl border border-dashed border-border p-8">
          <Text className="text-center text-muted-foreground">{t('error')}</Text>
          <Button onPress={retry}>
            <Text>{t('retry')}</Text>
          </Button>
        </View>
      )}

      {status === 'ok' && (
        <FlatList
          ref={list}
          data={ayahs}
          keyExtractor={a => String(a.number)}
          ListHeaderComponent={toolbar}
          contentContainerClassName="px-2 pb-44"
          initialNumToRender={10}
          onScrollToIndexFailed={info => {
            // Rows have different heights: jump near the target, then retry once it has been measured.
            list.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
            setTimeout(() => list.current?.scrollToIndex({ index: info.index, animated: false, viewPosition: 0.3 }), 150);
          }}
          renderItem={({ item: a }) => {
            const isPlaying = playing?.surah === surahNumber && playing.ayah === a.number;
            const marked = isBookmarked(surahNumber, a.number);
            const hidden = memorize && !revealed.has(a.number);
            // The API prepends the basmala to ayah 1 of most surahs; it is shown as the heading above instead.
            const stripBasmala = a.number === 1 && hasBasmala && normalize(a.ar).startsWith('بسم الله الرحمن الرحيم');
            const text = stripBasmala ? a.ar.replace(/^(\S+\s+){4}/, '') : a.ar;
            const size = settings.fontSize;
            return (
              <View className="border-b border-border/70">
                <Pressable
                  onPress={() => playAyah(a.number)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('ayah')} ${a.number}`}
                  className={cn('rounded-2xl px-4 py-4 active:bg-accent/60', isPlaying && 'bg-accent')}
                >
                  <View className={cn('rounded-xl', hidden && 'bg-muted')}>
                    <Text
                      className="font-quran"
                      accessibilityElementsHidden={hidden}
                      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
                      style={{
                        fontSize: size,
                        lineHeight: size * 1.25,
                        paddingVertical: size * 0.35,
                        textAlign: 'right',
                        writingDirection: 'rtl',
                        color: hidden ? 'transparent' : undefined,
                      }}
                    >
                      {text} <Text className="font-quran text-gold-foreground" style={{ fontSize: size * 0.6, color: hidden ? 'transparent' : undefined }}>{mark(a.number)}</Text>
                    </Text>
                  </View>
                  {(marked || isPlaying) && (
                    <View className="mt-1 flex-row gap-2">
                      {marked && <Icon as={Bookmark} className="size-4 fill-gold text-gold" />}
                      {isPlaying && <Icon as={Volume2} className="size-4 text-primary" />}
                    </View>
                  )}
                  {settings.showTranslation && (
                    <Text className="mt-2 text-[15px] text-muted-foreground" style={{ lineHeight: 23, textAlign: 'left', writingDirection: 'ltr' }}>
                      {a.en}
                    </Text>
                  )}
                </Pressable>
                <View className="flex-row items-center justify-end gap-1 px-3 pb-1">
                  {memorize && (
                    <Button
                      variant="ghost"
                      className="h-11 rounded-full px-4"
                      onPress={() =>
                        setRevealed(prev => {
                          const next = new Set(prev);
                          if (!next.delete(a.number)) next.add(a.number);
                          return next;
                        })
                      }
                      aria-pressed={!hidden}
                    >
                      <Icon as={hidden ? Eye : EyeOff} className="size-4 text-muted-foreground" />
                      <Text className="text-sm text-muted-foreground">{hidden ? t('revealAyah') : t('hideAyah')}</Text>
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    className="h-11 rounded-full px-4"
                    accessibilityLabel={`${t('tafsirHint')} · ${t('ayah')} ${a.number}`}
                    onPress={() => setTafsir({ surah: surahNumber, ayah: a.number })}
                  >
                    <Icon as={BookOpenText} className="size-4 text-secondary-foreground" />
                    <Text className="text-sm">{t('tafsir')}</Text>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 rounded-full"
                    accessibilityLabel={`${t('ayahOptions')} · ${t('ayah')} ${a.number}`}
                    onPress={() => { markRead(surahNumber, a.number); setOptions({ surah: surahNumber, ayah: a.number }); }}
                  >
                    <Icon as={MoreHorizontal} className="size-5 text-muted-foreground" />
                  </Button>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
