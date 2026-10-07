import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Settings as SettingsIcon, UserRound } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth';
import { useSettings } from '@/context/settings';
import { useUI } from '@/context/ui';

interface Props {
  title: string;
  subtitle?: string;
  /** Arabic display face for the title (surah names). */
  quranTitle?: boolean;
  onBack?: () => void;
}

export function AppHeader({ title, subtitle, quranTitle, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useSettings();
  const { user } = useAuth();
  const { setSettingsOpen, setAccountOpen } = useUI();

  return (
    <View style={{ paddingTop: insets.top }} className="border-b border-border bg-background">
      <View className="h-16 flex-row items-center gap-1 px-3">
        {onBack && (
          <Button variant="ghost" size="icon" className="size-11" onPress={onBack} accessibilityLabel={t('back')}>
            <Icon as={ChevronLeft} className="size-6 rtl:rotate-180" />
          </Button>
        )}
        <View className="flex-1 px-1">
          <Text numberOfLines={1} accessibilityRole="header" className={cn('text-2xl', quranTitle ? 'font-quran' : 'font-display')} style={quranTitle ? { lineHeight: 34, paddingVertical: 4 } : undefined}>
            {title}
          </Text>
          {subtitle ? <Text numberOfLines={1} className="text-xs text-muted-foreground">{subtitle}</Text> : null}
        </View>
        <Button variant="ghost" size="icon" className="size-11" onPress={() => setAccountOpen(true)} accessibilityLabel={t('account')}>
          <Icon as={UserRound} className="size-5" />
          {user ? <View className="absolute end-2.5 top-2.5 size-2 rounded-full bg-primary" /> : null}
        </Button>
        <Button variant="ghost" size="icon" className="size-11" onPress={() => setSettingsOpen(true)} accessibilityLabel={t('settings')}>
          <Icon as={SettingsIcon} className="size-5" />
        </Button>
      </View>
    </View>
  );
}
