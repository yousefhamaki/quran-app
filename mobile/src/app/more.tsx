import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowDownToLine, Highlighter, ArrowRight, Bookmark, CalendarDays, HandHeart, Languages, Search, SlidersHorizontal, Sparkles, UserRound, Volume2, X } from 'lucide-react-native';
import { AppHeader } from '@/components/app-header';
import { QueueSheet } from '@/components/sheets/queue-sheet';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { searchFeatures, type Feature } from '@/lib/features';
import { annotationList, type HighlightColor } from '@/lib/study';
import { useLibrary } from '@/context/library';
import { usePlayer } from '@/context/player';
import { useSettings } from '@/context/settings';
import { useSurahs } from '@/context/surahs';
import { useUI } from '@/context/ui';

const DOT: Record<HighlightColor, string> = { yellow: '#facc15', green: '#34d399', blue: '#38bdf8', pink: '#f472b6' };

interface RowProps {
  icon: typeof Search;
  title: string;
  hint?: string;
  onPress: () => void;
  badge?: string;
  last?: boolean;
}

function Row({ icon, title, hint, onPress, badge, last }: RowProps) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" className={cn('min-h-16 flex-row items-center gap-4 px-4 py-3 active:bg-accent/50', !last && 'border-b border-border')}>
      <View className="size-11 items-center justify-center rounded-xl bg-secondary">
        <Icon as={icon} className="size-5 text-primary" />
      </View>
      <View className="flex-1">
        <Text className="font-medium">{title}</Text>
        {hint ? <Text numberOfLines={2} className="text-sm text-muted-foreground">{hint}</Text> : null}
      </View>
      {badge ? <View className="rounded-full bg-primary/15 px-2.5 py-0.5"><Text className="text-xs font-semibold text-primary">{badge}</Text></View> : null}
      <Icon as={ArrowRight} className="size-5 text-muted-foreground rtl:rotate-180" />
    </Pressable>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text accessibilityRole="header" className="px-1 text-sm font-medium text-muted-foreground">{title}</Text>
      <View className="overflow-hidden rounded-3xl border border-border bg-card">{children}</View>
    </View>
  );
}

/** The hub: search every feature, then the places that were hard to reach (library, tools, settings). */
export default function MoreScreen() {
  const router = useRouter();
  const { t, isRTL } = useSettings();
  const { bookmarks, annotations } = useLibrary();
  const notes = useMemo(() => annotationList(annotations), [annotations]);
  const [showNotes, setShowNotes] = useState(false);
  const { byNumber } = useSurahs();
  const { playing } = usePlayer();
  const { setSettingsOpen, setSettingsScope, setAccountOpen, setPlayerOpen, setSetupOpen } = useUI();
  const [query, setQuery] = useState('');
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const results = useMemo(() => searchFeatures(query), [query]);
  const searching = query.trim() !== '';
  const surahName = (n: number) => { const s = byNumber(n); return s ? (isRTL ? s.name : s.englishName) : `#${n}`; };

  const openGeneral = () => { setSettingsScope('general'); setSettingsOpen(true); };
  const openMushaf = () => { setSettingsScope('mushaf'); setSettingsOpen(true); };
  const openPlayer = () => (playing ? setPlayerOpen(true) : openGeneral());
  const goPage = (path: '/daily' | '/prayer' | '/plan' | '/calendar' | '/adhkar', param?: string) =>
    router.push(param ? { pathname: path, params: path === '/adhkar' ? { c: param } : { tab: param } } : path);

  const openFeature = (f: Feature) => {
    const target = f.target;
    switch (target.kind) {
      case 'page': goPage(`/${target.page}` as '/daily', target.param); break;
      case 'quran': router.replace('/'); break;
      case 'settings': openGeneral(); break;
      case 'mushafSettings': openMushaf(); break;
      case 'downloads': setQueueOpen(true); break;
      case 'player': openPlayer(); break;
      case 'account': setAccountOpen(true); break;
      case 'setup': setSetupOpen(true); break;
    }
  };

  return (
    <View className="flex-1 bg-background">
      <AppHeader title={t('moreTitle')} />
      <ScrollView contentContainerClassName="gap-6 px-4 pb-56 pt-4" keyboardShouldPersistTaps="handled">
        <View className="justify-center" accessibilityRole="search">
          <View className="pointer-events-none absolute start-4 z-10"><Icon as={Search} className="size-5 text-muted-foreground" /></View>
          <Input value={query} onChangeText={setQuery} placeholder={t('moreSearchPlaceholder')} accessibilityLabel={t('moreSearchLabel')} className="h-13 rounded-2xl bg-card ps-12 pe-12 text-base" returnKeyType="search" />
          {searching ? (
            <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel={t('clear')} className="absolute end-2 size-10 items-center justify-center rounded-full">
              <Icon as={X} className="size-5 text-muted-foreground" />
            </Pressable>
          ) : null}
        </View>

        {searching ? (
          results.length === 0 ? (
            <Text accessibilityRole="alert" className="rounded-2xl bg-muted p-5 text-center text-sm text-muted-foreground">{t('moreSearchEmpty')}</Text>
          ) : (
            <View className="overflow-hidden rounded-3xl border border-border bg-card">
              {results.map((f, i) => (
                <Row key={f.id} icon={Sparkles} title={isRTL ? f.ar : f.en} hint={isRTL ? f.hintAr : f.hintEn} onPress={() => openFeature(f)} last={i === results.length - 1} />
              ))}
            </View>
          )
        ) : (
          <>
            <Group title={t('moreLibrary')}>
              <Row icon={Bookmark} title={t('moreBookmarks')} hint={bookmarks.length === 0 ? t('moreBookmarksEmpty') : undefined} badge={bookmarks.length > 0 ? String(bookmarks.length) : undefined} onPress={() => setShowBookmarks(v => !v)} />
              {showBookmarks && bookmarks.length > 0 ? (
                <View className="border-b border-border bg-muted/40">
                  {bookmarks.map(b => (
                    <Pressable key={`${b.surah}:${b.ayah}`} onPress={() => router.push({ pathname: '/surah/[id]', params: { id: String(b.surah), ayah: String(b.ayah) } })} accessibilityRole="button" className="min-h-12 flex-row items-center justify-between gap-3 px-6 py-2 active:bg-accent/50">
                      <Text className="text-sm">{surahName(b.surah)}</Text>
                      <Text className="text-sm text-muted-foreground">{t('ayah')} {b.ayah}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <Row icon={Highlighter} title={t('moreNotes')} hint={notes.length === 0 ? t('moreNotesEmpty') : undefined} badge={notes.length > 0 ? String(notes.length) : undefined} onPress={() => setShowNotes(v => !v)} />
              {showNotes && notes.length > 0 ? (
                <View className="border-b border-border bg-muted/40">
                  {notes.map(n => (
                    <Pressable key={`${n.surah}:${n.ayah}`} onPress={() => router.push({ pathname: '/surah/[id]', params: { id: String(n.surah), ayah: String(n.ayah) } })} accessibilityRole="button" className="min-h-12 flex-row items-start gap-3 px-6 py-2 active:bg-accent/50">
                      <View className="mt-1.5 size-3 rounded-full" style={{ backgroundColor: n.color ? DOT[n.color] : '#9ca3af' }} />
                      <View className="flex-1">
                        <Text className="text-sm">{surahName(n.surah)} · {t('ayah')} {n.ayah}</Text>
                        {n.note ? <Text className="text-sm text-muted-foreground">{n.note}</Text> : null}
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <Row icon={ArrowDownToLine} title={t('moreDownloads')} hint={t('moreDownloadsHint')} onPress={() => setQueueOpen(true)} last />
            </Group>

            <Group title={t('moreTools')}>
              <Row icon={HandHeart} title={t('adhkarTitle')} hint={t('adhkarCardHint')} onPress={() => goPage('/adhkar')} />
              <Row icon={CalendarDays} title={t('calendarTitle')} hint={t('calendarCardHint')} onPress={() => goPage('/calendar')} />
              <Row icon={Volume2} title={t('morePlayback')} hint={playing ? t('morePlaybackHint') : t('morePlaybackNone')} onPress={openPlayer} last />
            </Group>

            <Group title={t('moreApp')}>
              <Row icon={SlidersHorizontal} title={t('moreSettings')} hint={t('moreSettingsHint')} onPress={openGeneral} />
              <Row icon={Languages} title={t('moreMushaf')} hint={t('moreMushafHint')} onPress={openMushaf} />
              <Row icon={UserRound} title={t('moreAccount')} hint={t('moreAccountHint')} onPress={() => setAccountOpen(true)} />
              <Row icon={Sparkles} title={t('moreSetup')} hint={t('moreSetupHint')} onPress={() => setSetupOpen(true)} last />
            </Group>
          </>
        )}
      </ScrollView>
      <QueueSheet open={queueOpen} onClose={() => setQueueOpen(false)} />
    </View>
  );
}
