import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Check, Pin, Star } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { RECITERS, type Reciter } from '@/lib/quran';
import { useSettings } from '@/context/settings';

/** Pinned reciters first (in pin order), then everyone else. */
export function useOrderedReciters() {
  const { pinned } = useSettings();
  return useMemo(() => {
    const pins = pinned.map(id => RECITERS.find(r => r.id === id)).filter((r): r is Reciter => !!r);
    return { pinned: pins, others: RECITERS.filter(r => !pinned.includes(r.id)) };
  }, [pinned]);
}

interface Props {
  /** The reciter chosen for the next play (not necessarily the default). */
  value: string;
  onChange: (reciterId: string) => void;
}

export function ReciterList({ value, onChange }: Props) {
  const { settings, pinned: pinnedIds, update, togglePin, t, isRTL } = useSettings();
  const { pinned, others } = useOrderedReciters();

  const row = (r: Reciter) => {
    const selected = r.id === value;
    const isDefault = r.id === settings.reciter;
    const isPinned = pinnedIds.includes(r.id);
    const name = isRTL ? r.ar : r.en;
    return (
      <View key={r.id} className={cn('flex-row items-center rounded-xl pe-1', selected && 'bg-accent')}>
        <Pressable
          onPress={() => onChange(r.id)}
          role="radio"
          aria-checked={selected}
          accessibilityLabel={name}
          accessibilityState={{ selected }}
          className="min-h-12 flex-1 flex-row items-center gap-3 rounded-xl px-3 active:bg-accent/70"
        >
          <View className={cn('size-6 items-center justify-center rounded-full border', selected ? 'border-primary bg-primary' : 'border-input')}>
            {selected && <Icon as={Check} className="size-3.5 text-primary-foreground" />}
          </View>
          <View className="flex-1">
            <Text numberOfLines={1}>{name}</Text>
            {isDefault && <Text className="text-xs text-gold-foreground">{t('isDefault')}</Text>}
          </View>
        </Pressable>

        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          accessibilityLabel={`${t('setDefault')}: ${name}`}
          accessibilityState={{ selected: isDefault }}
          onPress={() => update({ reciter: r.id })}
        >
          <Icon as={Star} className={cn('size-5', isDefault ? 'fill-gold text-gold' : 'text-muted-foreground')} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          accessibilityLabel={`${isPinned ? t('unpin') : t('pin')}: ${name}`}
          accessibilityState={{ selected: isPinned }}
          onPress={() => togglePin(r.id)}
        >
          <Icon as={Pin} className={cn('size-5', isPinned ? 'fill-primary text-primary' : 'text-muted-foreground')} />
        </Button>
      </View>
    );
  };

  return (
    <View role="radiogroup" accessibilityLabel={t('chooseReciter')} className="gap-3">
      {pinned.length > 0 && (
        <View className="gap-1">
          <Text className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('pinned')}</Text>
          {pinned.map(row)}
        </View>
      )}
      <View className="gap-1">
        {pinned.length > 0 && <Text className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('allReciters')}</Text>}
        {others.map(row)}
      </View>
    </View>
  );
}
