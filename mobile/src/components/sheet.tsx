import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDirection } from 'uniwind';
import { X } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { useSettings } from '@/context/settings';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  /** Arabic display font for the title (surah names). */
  quranTitle?: boolean;
  children: ReactNode;
  /** Pinned below the scrolling content (primary action, navigation). */
  footer?: ReactNode;
  /** Let the sheet fill most of the screen (settings) instead of hugging its content. */
  tall?: boolean;
}

/**
 * Bottom sheet built on the native Modal (works on iOS, Android and web).
 * Counterpart of shadcn's <Sheet side="bottom">.
 */
export function Sheet({ open, onClose, title, description, quranTitle, children, footer, tall }: Props) {
  const insets = useSafeAreaInsets();
  const { isRTL, t } = useSettings();
  if (!open) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <LayoutDirection rtl={isRTL}>
        <View className="flex-1 justify-end">
          <Animated.View entering={FadeIn.duration(180)} className="absolute inset-0 bg-black/50">
            <Pressable className="flex-1" onPress={onClose} accessibilityRole="button" accessibilityLabel={t('close')} />
          </Animated.View>

          <Animated.View
            entering={SlideInDown.duration(260)}
            style={{ paddingBottom: insets.bottom, maxHeight: '92%' }}
            className={cn('w-full self-center rounded-t-3xl border border-b-0 border-border bg-background', tall && 'h-[92%]')}
          >
            <View className="items-center pt-2.5" accessibilityElementsHidden importantForAccessibility="no">
              <View className="h-1 w-10 rounded-full bg-border" />
            </View>

            <View className="flex-row items-start gap-3 px-5 pb-3 pt-3">
              <View className="flex-1">
                <Text className={cn('text-2xl', quranTitle ? 'font-quran' : 'font-display')} accessibilityRole="header">
                  {title}
                </Text>
                {description ? <Text className="mt-0.5 text-sm text-muted-foreground">{description}</Text> : null}
              </View>
              <Button variant="ghost" size="icon" className="size-11" onPress={onClose} accessibilityLabel={t('close')}>
                <Icon as={X} className="size-5 text-muted-foreground" />
              </Button>
            </View>

            <ScrollView className={cn(tall && 'flex-1')} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerClassName="px-5 pb-5">
              {children}
            </ScrollView>

            {footer ? <View className="gap-1 border-t border-border px-4 pb-2 pt-3">{footer}</View> : null}
          </Animated.View>
        </View>
      </LayoutDirection>
    </Modal>
  );
}
