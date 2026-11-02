import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, RotateCcw, Search, X } from 'lucide-react-native';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { CATEGORIES, totalCount, type AyahRef, type Category, type Dhikr } from '@/lib/adhkar';
import { allChapters, chapter, evening, featured, morning, searchChapters } from '@/lib/hisn';
import { fetchAyahText } from '@/lib/dailyayah';
import { useSettings } from '@/context/settings';

/** The joined text of some ayahs (fetched from the Quran text API). */
function useRefsText(refs: AyahRef[] | undefined): string | null {
  const [text, setText] = useState<string | null>(null);
  const key = refs?.map(r => `${r.surah}:${r.ayah}`).join(',') ?? '';
  useEffect(() => {
    if (!refs || refs.length === 0) return;
    let cancelled = false;
    setText(null);
    Promise.all(refs.map(r => fetchAyahText(r).then(a => a.ar)))
      .then(parts => !cancelled && setText(parts.join(' ')))
      .catch(() => !cancelled && setText(''));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return text;
}

function CategoryRow({ category, onOpen }: { category: Category; onOpen: () => void }) {
  const { t, isRTL } = useSettings();
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" className="flex-row items-center gap-4 rounded-2xl border border-border bg-card p-4 active:border-primary">
      <View className="flex-1">
        <Text className={cn('text-lg', isRTL && 'font-quran')} style={isRTL ? { lineHeight: 40, paddingVertical: 2 } : undefined}>{isRTL ? category.ar : category.en}</Text>
        <Text className="text-sm text-muted-foreground">{t('adhkarItems', { n: category.items.length })}</Text>
      </View>
      <Icon as={isRTL ? ChevronLeft : ChevronRight} className="size-5 text-muted-foreground" />
    </Pressable>
  );
}

function Item({ item, done, onTap }: { item: Dhikr; done: number; onTap: () => void }) {
  const { t, isRTL, settings } = useSettings();
  const quran = useRefsText(item.refs);
  const finished = done >= item.count;
  const body = item.ar ?? quran;
  const title = isRTL ? item.titleAr : item.titleEn;

  return (
    <View className={cn('gap-3 rounded-2xl border bg-card p-4', finished ? 'border-primary/40 bg-secondary/50' : 'border-border')}>
      <Text className="text-sm font-medium text-muted-foreground">{title}</Text>
      {body === null ? (
        <View className="h-12 rounded-xl bg-muted" />
      ) : (
        <Text className="font-quran text-2xl" style={{ lineHeight: 52, paddingVertical: 6, writingDirection: 'rtl' }}>{body}</Text>
      )}
      {settings.lang === 'en' && item.en ? <Text className="text-sm text-muted-foreground">{item.en}</Text> : null}
      {item.note ? <Text className="rounded-xl bg-muted p-3 text-xs leading-5 text-muted-foreground">{isRTL ? item.note.ar : item.note.en}</Text> : null}
      <Button
        variant={finished ? 'secondary' : 'default'}
        className="h-12 rounded-xl"
        disabled={finished}
        onPress={onTap}
        accessibilityLabel={`${title}: ${t('adhkarCount', { n: done, total: item.count })}`}
      >
        {finished ? <Icon as={CheckCircle2} className="size-5" /> : null}
        <Text className="text-base">{finished ? t('adhkarDone') : item.count === 1 ? t('adhkarTap') : t('adhkarCount', { n: done, total: item.count })}</Text>
      </Button>
    </View>
  );
}

/** The lists shown first: morning and evening, the most used chapters of the book, then the other duas. */
function useHome() {
  return useMemo(() => {
    const daily = [morning(), evening(), ...featured()];
    const more = CATEGORIES.filter(x => x.id === 'khatm' || x.id === 'quran-duas');
    return { daily, more };
  }, []);
}

export default function AdhkarScreen() {
  const router = useRouter();
  const { t, isRTL } = useSettings();
  const { c } = useLocalSearchParams<{ c?: string }>();
  const { daily, more } = useHome();
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const found = useMemo(() => (query.trim() ? searchChapters(query) : null), [query]);
  const all = useMemo(() => allChapters(), []);
  const [open, setOpen] = useState<Category | null>(() => [...daily, ...more].find(x => x.id === c) ?? CATEGORIES.find(x => x.id === c) ?? null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const goBack = () => (open ? setOpen(null) : router.canGoBack() ? router.back() : router.replace('/'));

  const total = open ? totalCount(open) : 0;
  const done = open ? open.items.reduce((sum, i) => sum + Math.min(i.count, counts[i.id] ?? 0), 0) : 0;

  return (
    <View className="flex-1 bg-background">
      <AppHeader title={open ? (isRTL ? open.ar : open.en) : t('adhkarTitle')} onBack={goBack} />
      <ScrollView contentContainerClassName="gap-3 px-4 pb-44 pt-5">
        {!open ? (
          <>
            <View className="justify-center" accessibilityRole="search">
              <View className="pointer-events-none absolute start-4 z-10"><Icon as={Search} className="size-5 text-muted-foreground" /></View>
              <Input value={query} onChangeText={setQuery} placeholder={t('adhkarSearch')} accessibilityLabel={t('adhkarSearch')} className="h-13 rounded-2xl bg-card ps-12 pe-12 text-base" returnKeyType="search" />
              {query ? (
                <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel={t('clear')} className="absolute end-2 size-10 items-center justify-center rounded-full">
                  <Icon as={X} className="size-5 text-muted-foreground" />
                </Pressable>
              ) : null}
            </View>

            {found ? (
              found.length === 0 ? (
                <Text accessibilityRole="alert" className="rounded-2xl bg-muted p-5 text-center text-sm text-muted-foreground">{t('adhkarNoResults')}</Text>
              ) : (
                found.map(c => <CategoryRow key={c.id} category={c} onOpen={() => { setOpen(c); setCounts({}); }} />)
              )
            ) : (
              <>
                <Text accessibilityRole="header" className="px-1 pt-1 text-sm font-medium text-muted-foreground">{t('adhkarSections')}</Text>
                {daily.map(c => <CategoryRow key={c.id} category={c} onOpen={() => { setOpen(c); setCounts({}); }} />)}
                <Text accessibilityRole="header" className="px-1 pt-3 text-sm font-medium text-muted-foreground">{t('adhkarMore')}</Text>
                {more.map(c => <CategoryRow key={c.id} category={c} onOpen={() => { setOpen(c); setCounts({}); }} />)}

                <Pressable onPress={() => setShowAll(v => !v)} accessibilityRole="button" accessibilityState={{ expanded: showAll }} className="mt-3 flex-row items-center gap-4 rounded-2xl border border-primary/40 bg-secondary p-4 active:opacity-80">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold">{t('adhkarAll')}</Text>
                    <Text className="text-sm text-muted-foreground">{t('adhkarAllHint')}</Text>
                  </View>
                  <Icon as={showAll ? ChevronUp : ChevronDown} className="size-5 text-muted-foreground" />
                </Pressable>
                {showAll ? all.map(c => <CategoryRow key={c.id} category={c} onOpen={() => { setOpen(c); setCounts({}); }} />) : null}
              </>
            )}
            <Text className="pt-2 text-xs leading-5 text-muted-foreground">{t('adhkarSourceNote')}</Text>
          </>
        ) : (
          <>
            <Progress value={Math.round((done / total) * 100)} />
            <Button variant="ghost" className="h-11 self-end rounded-xl" onPress={() => setCounts({})}>
              <Icon as={RotateCcw} className="size-4" />
              <Text>{t('adhkarReset')}</Text>
            </Button>
            {open.items.map(item => (
              <Item key={item.id} item={item} done={counts[item.id] ?? 0} onTap={() => setCounts(c => ({ ...c, [item.id]: Math.min(item.count, (c[item.id] ?? 0) + 1) }))} />
            ))}
            <Text className="text-xs leading-5 text-muted-foreground">{t('adhkarSourceNote')}</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}
