import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowDownToLine, ArrowRight, BookOpen, Clock, Flame, Search, X } from 'lucide-react-native';
import { QueueSheet } from '@/components/sheets/queue-sheet';
import { formatBytes } from '@/lib/offline';
import { AppHeader } from '@/components/app-header';
import { SurahCard } from '@/components/surah-card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { isArabic, normalize, searchQuran, type SearchResult, type Surah } from '@/lib/quran';
import { cn } from '@/lib/utils';
import { useDownloads } from '@/context/downloads';
import { useHabit } from '@/context/habit';
import { PRAYER_KEYS, usePrayer } from '@/context/prayer';
import { formatTime } from '@/lib/prayer';
import { useLibrary } from '@/context/library';
import { useSettings } from '@/context/settings';
import { useSurahs } from '@/context/surahs';
import { useOnline } from '@/hooks/use-online';

type Found = { state: 'loading' } | { state: 'error' } | { state: 'ok'; term: string; ar: boolean; data: SearchResult };
type Row = { kind: 'surah'; surah: Surah } | { kind: 'match'; surah: number; ayah: number; text: string };

const RESULT_LIMIT = 50;
const AR_DIACRITICS = /[ً-ٰٟۖ-ۭـ]/g;

/** Splits text around the search term so matches can be highlighted. */
function highlight(text: string, term: string, ar: boolean) {
  const clean = ar ? term.replace(AR_DIACRITICS, '') : term;
  if (!clean) return [{ text, hit: false }];
  const lower = text.toLowerCase();
  const needle = clean.toLowerCase();
  const parts: { text: string; hit: boolean }[] = [];
  let from = 0;
  for (let i = lower.indexOf(needle); i !== -1; i = lower.indexOf(needle, from)) {
    if (i > from) parts.push({ text: text.slice(from, i), hit: false });
    parts.push({ text: text.slice(i, i + needle.length), hit: true });
    from = i + needle.length;
  }
  if (from < text.length) parts.push({ text: text.slice(from), hit: false });
  return parts;
}

export default function Home() {
  const router = useRouter();
  const { t, isRTL } = useSettings();
  const { surahs, status, reload, byNumber } = useSurahs();
  const { lastRead, bookmarks } = useLibrary();
  const { records, hasAny } = useDownloads();
  const [view, setView] = useState<'all' | 'offline'>('all');
  const [queueOpen, setQueueOpen] = useState(false);
  const { streak, readToday } = useHabit();
  const { next: nextPrayer } = usePrayer();
  const online = useOnline();
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Found | null>(null);

  const open = (surah: number, ayah?: number) =>
    router.push({ pathname: '/surah/[id]', params: ayah ? { id: String(surah), ayah: String(ayah) } : { id: String(surah) } });
  const surahName = (n: number) => { const s = byNumber(n); return s ? (isRTL ? s.name : s.englishName) : `#${n}`; };

  const q = normalize(query.trim());
  const filtered = useMemo(
    () =>
      !q
        ? surahs
        : surahs.filter(s => String(s.number) === q || normalize(s.name).includes(q) || normalize(s.englishName).includes(q) || normalize(s.englishNameTranslation).includes(q)),
    [q, surahs],
  );
  // Downloaded surahs are marked with a check on their card; this filter lists just those, however many there are.
  const savedCount = useMemo(() => surahs.filter(s => hasAny(s.number)).length, [surahs, hasAny, records]);
  const list = view === 'offline' && savedCount > 0 ? filtered.filter(s => hasAny(s.number)) : filtered;
  const savedBytes = records.reduce((sum, d) => sum + d.bytes, 0);

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

  const rows: Row[] =
    found?.state === 'ok'
      ? found.data.matches.slice(0, RESULT_LIMIT).map(m => ({ kind: 'match', ...m }))
      : found
        ? []
        : status === 'ok'
          ? list.map(surah => ({ kind: 'surah', surah }))
          : [];

  const resume = lastRead ?? { surah: 1, ayah: 1 };

  const header = (
    <View className="gap-5 pb-2 pt-4">
      {/* Hero: the one primary action on the home screen. */}
      <Pressable
        onPress={() => open(resume.surah, resume.ayah)}
        accessibilityRole="button"
        className="flex-row items-center gap-4 overflow-hidden rounded-3xl bg-primary p-5 active:opacity-90"
      >
        <View className="size-12 items-center justify-center rounded-2xl bg-primary-foreground/15">
          <Icon as={BookOpen} className="size-6 text-primary-foreground" />
        </View>
        <View className="flex-1">
          <Text className="text-xs uppercase tracking-wide text-primary-foreground/80">{lastRead ? t('continueReading') : t('tagline')}</Text>
          <Text numberOfLines={1} className={cn('text-2xl text-primary-foreground', isRTL ? 'font-quran' : 'font-display')} style={isRTL ? { lineHeight: 36, paddingVertical: 4 } : undefined}>
            {lastRead && surahs.length ? `${surahName(resume.surah)} · ${resume.ayah}` : t('startReading')}
          </Text>
        </View>
        <Icon as={ArrowRight} className="size-5 text-primary-foreground rtl:rotate-180" />
      </Pressable>

      {!online && (
        <View accessibilityRole="alert" className="rounded-2xl bg-secondary p-3.5">
          <Text className="text-sm text-secondary-foreground">{t('offlineBanner')}</Text>
          {records.length > 0 && <Text className="mt-1 text-xs text-muted-foreground">{t('offlineTapHint')}</Text>}
        </View>
      )}

      {/* Today: one quiet line, the full tools live in the bottom tabs. */}
      <View className="flex-row flex-wrap gap-2" accessibilityLabel={t('navDaily')}>
        <Pressable onPress={() => router.push('/daily')} accessibilityRole="button" className="h-11 flex-row items-center gap-2 rounded-full border border-border bg-card px-4 active:border-primary">
          <Icon as={Flame} className={streak > 0 ? 'size-4 text-primary' : 'size-4 text-muted-foreground'} />
          <Text className="text-sm">{streak > 0 ? t('todayStreak', { n: streak }) : t('todayStart')}</Text>
          {!readToday ? <View className="size-2 rounded-full bg-primary" /> : null}
        </Pressable>
        <Pressable onPress={() => router.push('/prayer')} accessibilityRole="button" className="h-11 flex-row items-center gap-2 rounded-full border border-border bg-card px-4 active:border-primary">
          <Icon as={Clock} className="size-4 text-primary" />
          <Text className="text-sm">{nextPrayer ? `${t(PRAYER_KEYS[nextPrayer.name])} ${formatTime(nextPrayer.at, isRTL ? 'ar' : 'en')}` : t('todayPrayerSet')}</Text>
        </Pressable>
      </View>

      {/* Search */}
      <View className="flex-row items-center gap-2" accessibilityRole="search">
        <View className="flex-1 justify-center">
          <View className="pointer-events-none absolute start-3.5 z-10">
            <Icon as={Search} className="size-4 text-muted-foreground" />
          </View>
          <Input
            value={query}
            onChangeText={v => { setQuery(v); setFound(null); }}
            onSubmitEditing={() => void runSearch()}
            placeholder={t('searchPlaceholder')}
            accessibilityLabel={t('searchPlaceholder')}
            returnKeyType="search"
            className="h-12 rounded-2xl bg-card text-base"
            style={{ paddingStart: 40 }}
          />
        </View>
        <Button className="h-12 rounded-2xl px-5" disabled={!query.trim()} onPress={() => void runSearch()}>
          <Text>{t('searchAction')}</Text>
        </Button>
      </View>

      {found ? (
        <View accessibilityLiveRegion="polite" className="gap-1">
          {found.state === 'loading' && <Text className="py-6 text-center text-muted-foreground">{t('searching')}</Text>}
          {found.state === 'error' && <Text className="py-6 text-center text-destructive">{t('error')}</Text>}
          {found.state === 'ok' && (
            <View className="flex-row items-center justify-between">
              <Text className="flex-1 text-sm text-muted-foreground">
                {found.data.count} {t('matches')}
                {found.data.count > RESULT_LIMIT ? ` · ${t('showingFirst', { n: RESULT_LIMIT })}` : ''}
              </Text>
              <Button variant="ghost" size="sm" className="h-11 gap-1" onPress={() => setFound(null)}>
                <Icon as={X} className="size-4" />
                <Text>{t('clear')}</Text>
              </Button>
            </View>
          )}
          {found.state === 'ok' && found.data.count === 0 && <Text className="py-6 text-center text-muted-foreground">{t('noResults')}</Text>}
        </View>
      ) : (
        <>
          {bookmarks.length > 0 && !q && surahs.length > 0 && (
            <View className="gap-2">
              <Text accessibilityRole="header" className="text-sm font-medium text-muted-foreground">{t('bookmarks')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                {bookmarks.map(b => (
                  <Button key={`${b.surah}:${b.ayah}`} variant="secondary" className="h-10 rounded-full px-4" onPress={() => open(b.surah, b.ayah)}>
                    <Text className="text-sm">{surahName(b.surah)} · {b.ayah}</Text>
                  </Button>
                ))}
              </ScrollView>
            </View>
          )}

          <View className="flex-row items-center justify-between gap-2 pt-2">
            <Text accessibilityRole="header" className="font-display text-xl">{t('surahs')}</Text>
            <View className="flex-row items-center gap-2">
              {savedCount > 0 && !q ? (
                <View accessibilityRole="tablist" accessibilityLabel={t('availableOffline')} className="flex-row gap-1 rounded-full bg-muted p-1">
                  {(['all', 'offline'] as const).map(v => (
                    <Pressable
                      key={v}
                      onPress={() => setView(v)}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: view === v }}
                      className={cn('h-9 items-center justify-center rounded-full px-4', view === v && 'bg-background')}
                    >
                      <Text className={cn('text-sm font-medium', view === v ? 'text-foreground' : 'text-muted-foreground')}>
                        {v === 'all' ? t('filterAll') : t('filterOffline', { n: savedCount })}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <Button variant="outline" size="icon" className="size-11 rounded-full" onPress={() => setQueueOpen(true)} accessibilityLabel={t('queueOpen')}>
                <Icon as={ArrowDownToLine} className="size-5" />
              </Button>
            </View>
          </View>

          {view === 'offline' && savedCount > 0 && !q ? (
            <View className="flex-row items-center justify-between gap-3 rounded-2xl bg-secondary px-4 py-3">
              <Text className="flex-1 text-sm text-secondary-foreground">{savedCount > 0 ? t('offlineSummary', { n: savedCount, size: formatBytes(savedBytes) }) : t('offlineNone')}</Text>
              <Button className="h-10 rounded-xl px-4" onPress={() => setQueueOpen(true)}>
                <Text>{t('downloadMore')}</Text>
              </Button>
            </View>
          ) : null}
          <QueueSheet open={queueOpen} onClose={() => setQueueOpen(false)} />

          {status === 'error' && (
            <View className="items-center gap-4 rounded-2xl border border-dashed border-border p-8">
              <Text className="text-center text-muted-foreground">{t('error')}</Text>
              <Button onPress={reload}>
                <Text>{t('retry')}</Text>
              </Button>
            </View>
          )}
          {status === 'loading' && (
            <View className="gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[68px] rounded-2xl" />)}
            </View>
          )}
          {status === 'ok' && list.length === 0 && <Text className="py-8 text-center text-muted-foreground">{t('noResults')}</Text>}
        </>
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <AppHeader title={t('appName')} />
      <FlatList
        data={rows}
        keyExtractor={r => (r.kind === 'surah' ? `s${r.surah.number}` : `m${r.surah}:${r.ayah}`)}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-4 pb-56 gap-3"
        renderItem={({ item }) =>
          item.kind === 'surah' ? (
            <SurahCard surah={item.surah} onOpen={s => open(s.number)} />
          ) : (
            <Pressable
              onPress={() => open(item.surah, item.ayah)}
              accessibilityRole="button"
              className="gap-2 rounded-2xl border border-border bg-card p-4 active:border-primary"
            >
              <Text className="text-xs font-medium text-primary">{surahName(item.surah)} · {item.ayah}</Text>
              <Text
                className={found?.state === 'ok' && found.ar ? 'font-quran' : 'text-base'}
                style={found?.state === 'ok' && found.ar ? { fontSize: 22, lineHeight: 34, textAlign: 'right', writingDirection: 'rtl' } : { lineHeight: 24 }}
              >
                {found?.state === 'ok'
                  ? highlight(item.text, found.term, found.ar).map((p, i) => (p.hit ? <Text key={i} className={cn('bg-gold/30 text-foreground', found.ar && 'font-quran')} style={found.ar ? { fontSize: 22 } : undefined}>{p.text}</Text> : p.text))
                  : item.text}
              </Text>
            </Pressable>
          )
        }
      />
    </View>
  );
}
