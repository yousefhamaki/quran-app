import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react-native';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Progress } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { CATEGORIES, totalCount, type AyahRef, type Category, type Dhikr } from '@/lib/adhkar';
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

export default function AdhkarScreen() {
  const router = useRouter();
  const { t, isRTL } = useSettings();
  const { c } = useLocalSearchParams<{ c?: string }>();
  const [open, setOpen] = useState<Category | null>(() => CATEGORIES.find(x => x.id === c) ?? null);
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
            {CATEGORIES.map(c => (
              <Pressable key={c.id} onPress={() => { setOpen(c); setCounts({}); }} accessibilityRole="button" className="flex-row items-center gap-4 rounded-2xl border border-border bg-card p-4 active:border-primary">
                <View className="flex-1">
                  <Text className={cn('text-lg', isRTL && 'font-quran')}>{isRTL ? c.ar : c.en}</Text>
                  <Text className="text-sm text-muted-foreground">{t('adhkarItems', { n: c.items.length })}</Text>
                </View>
                <Icon as={isRTL ? ChevronLeft : ChevronRight} className="size-5 text-muted-foreground" />
              </Pressable>
            ))}
            <Text className="pt-2 text-xs leading-5 text-muted-foreground">{t('adhkarNote')}</Text>
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
            <Text className="text-xs leading-5 text-muted-foreground">{t('adhkarNote')}</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}
