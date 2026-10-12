import { useState } from 'react';
import { View } from 'react-native';
import { useUniwind } from 'uniwind';
import { ChevronDown } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { TAJWEED_RULES, tajweedColor } from '@/lib/tajweed';
import { useSettings } from '@/context/settings';

/** Collapsible guide that shows what each tajweed colour means. */
export function TajweedLegend() {
  const { t, isRTL } = useSettings();
  const { theme } = useUniwind();
  const [open, setOpen] = useState(false);

  return (
    <View className="gap-2">
      <Button variant="ghost" className="h-11 self-start rounded-xl px-3" onPress={() => setOpen(o => !o)} aria-expanded={open}>
        <Icon as={ChevronDown} className={cn('size-4 text-primary', open && 'rotate-180')} />
        <Text className="text-primary">{open ? t('hideGuide') : t('tajweedGuide')}</Text>
      </Button>
      {open && (
        <View className="gap-2 rounded-2xl bg-muted p-3">
          {TAJWEED_RULES.map(rule => (
            <View key={rule.cls} className="flex-row items-center gap-3">
              <View className="size-4 rounded-full" style={{ backgroundColor: tajweedColor(rule.cls, theme === 'dark') }} />
              <Text className="flex-1 text-sm">{isRTL ? rule.ar : rule.en}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
