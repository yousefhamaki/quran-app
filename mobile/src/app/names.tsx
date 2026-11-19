import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Share2, X } from 'lucide-react-native';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { dateString } from '@/lib/habit';
import { NAMES, nameOfDay, searchNames, type AllahName } from '@/lib/names';
import { useSettings } from '@/context/settings';

export default function NamesScreen() {
  const router = useRouter();
  const { t, isRTL } = useSettings();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const today = useMemo(() => nameOfDay(dateString()), []);
  const found = useMemo(() => searchNames(query), [query]);
  const num = (n: number) => n.toLocaleString(isRTL ? 'ar' : 'en', { useGrouping: false });
  const meaning = (x: AllahName) => (isRTL ? x.meaning : x.en);
  const share = (x: AllahName) => Share.share({ message: `${x.ar}\n${x.tr} — ${x.en}\n${x.meaning}` }).catch(() => {});

  return (
    <View className="flex-1 bg-background">
      <AppHeader title={t('namesTitle')} subtitle={t('namesSubtitle', { n: NAMES.length })} onBack={() => (router.canGoBack() ? router.back() : router.replace('/more'))} />
      <ScrollView contentContainerClassName="gap-3 px-4 pb-44 pt-5" keyboardShouldPersistTaps="handled">
        {/* The name of the day */}
        {!query.trim() ? (
          <View className="items-center gap-2 rounded-3xl border border-primary/40 bg-secondary p-6">
            <Text className="text-sm font-medium text-muted-foreground">{t('namesOfDay')}</Text>
            <Text className="font-quran text-center text-5xl" style={{ lineHeight: 96, paddingVertical: 8, writingDirection: 'rtl' }}>{today.ar}</Text>
            <Text className="text-lg font-semibold">{today.tr}</Text>
            <Text className="text-center text-base text-muted-foreground">{isRTL ? today.meaning : today.en}</Text>
            <Button variant="outline" className="mt-2 h-11 rounded-full px-5" onPress={() => share(today)} accessibilityLabel={t('namesShare')}>
              <Icon as={Share2} className="size-4" />
              <Text>{t('namesShare')}</Text>
            </Button>
          </View>
        ) : null}

        <View className="justify-center" accessibilityRole="search">
          <View className="pointer-events-none absolute start-4 z-10"><Icon as={Search} className="size-5 text-muted-foreground" /></View>
          <Input value={query} onChangeText={setQuery} placeholder={t('namesSearch')} accessibilityLabel={t('namesSearch')} className="h-13 rounded-2xl bg-card ps-12 pe-12 text-base" returnKeyType="search" />
          {query ? (
            <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel={t('clear')} className="absolute end-2 size-10 items-center justify-center rounded-full">
              <Icon as={X} className="size-5 text-muted-foreground" />
            </Pressable>
          ) : null}
        </View>

        {found.length === 0 ? (
          <Text accessibilityRole="alert" className="rounded-2xl bg-muted p-5 text-center text-sm text-muted-foreground">{t('namesNoResults')}</Text>
        ) : (
          found.map(x => {
            const on = open === x.n;
            return (
              <Pressable
                key={x.n}
                onPress={() => setOpen(on ? null : x.n)}
                accessibilityRole="button"
                accessibilityState={{ expanded: on }}
                accessibilityLabel={`${x.n}. ${x.ar}, ${x.tr}`}
                className={cn('gap-2 rounded-2xl border bg-card p-4 active:border-primary', on ? 'border-primary/50' : 'border-border')}
              >
                <View className="flex-row items-center gap-4">
                  <View className="size-9 items-center justify-center rounded-full bg-muted">
                    <Text className="text-sm text-muted-foreground">{num(x.n)}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold">{x.tr}</Text>
                    <Text className="text-sm text-muted-foreground">{x.en}</Text>
                  </View>
                  <Text className="font-quran text-3xl" style={{ lineHeight: 64, paddingVertical: 4, writingDirection: 'rtl' }}>{x.ar}</Text>
                </View>
                {on ? (
                  <View className="gap-2 border-t border-border pt-3">
                    <Text className="text-base leading-7">{meaning(x)}</Text>
                    <Button variant="ghost" className="h-11 self-start rounded-full" onPress={() => share(x)} accessibilityLabel={t('namesShare')}>
                      <Icon as={Share2} className="size-4" />
                      <Text>{t('namesShare')}</Text>
                    </Button>
                  </View>
                ) : null}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
