import { Pressable, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, Clock, Flame, GraduationCap, LayoutGrid } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { useAnySheetOpen } from '@/lib/sheet-store';
import type { TKey } from '@/lib/i18n';
import { useSettings } from '@/context/settings';

/** Height of the bar without the safe area. The mini player and the screens leave this much room. */
export const NAV_HEIGHT = 64;

const TABS: { path: '/' | '/daily' | '/prayer' | '/plan' | '/more'; icon: typeof BookOpen; label: TKey }[] = [
  { path: '/', icon: BookOpen, label: 'navQuran' },
  { path: '/daily', icon: Flame, label: 'navDaily' },
  { path: '/prayer', icon: Clock, label: 'navPrayer' },
  { path: '/plan', icon: GraduationCap, label: 'navMemorize' },
  { path: '/more', icon: LayoutGrid, label: 'navMore' },
];

/** True on the four top-level screens (the bar is hidden in the reader and on sub-pages). */
export function useShowNav() {
  const pathname = usePathname();
  return TABS.some(t => t.path === pathname);
}

/** Bottom navigation: Quran, Daily, Prayer, Memorize. */
export function BottomNav() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useSettings();
  const sheetOpen = useAnySheetOpen();
  if (sheetOpen) return null;

  return (
    <View accessibilityRole="tablist" style={{ paddingBottom: insets.bottom }} className="absolute inset-x-0 bottom-0 flex-row border-t border-border bg-background">
      {TABS.map(({ path, icon, label }) => {
        const on = pathname === path;
        return (
          <Pressable
            key={path}
            onPress={() => { if (!on) router.replace(path); }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t(label)}
            style={{ height: NAV_HEIGHT }}
            className="flex-1 items-center justify-center gap-1 active:opacity-70"
          >
            <View className={cn('h-7 w-14 items-center justify-center rounded-full', on && 'bg-secondary')}>
              <Icon as={icon} className={cn('size-5', on ? 'text-primary' : 'text-muted-foreground')} />
            </View>
            <Text className={cn('text-xs font-medium', on ? 'text-primary' : 'text-muted-foreground')}>{t(label)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
