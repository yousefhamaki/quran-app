import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { CircleCheck } from 'lucide-react-native';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { Surah } from '@/lib/quran';
import { useDownloads } from '@/context/downloads';
import { useSettings } from '@/context/settings';
import { useCSSVariable } from 'uniwind';

/** Eight-point star that frames the surah number. */
function NumberStar({ n }: { n: number }) {
  const gold = String(useCSSVariable('--color-gold') ?? '#b7892b');
  return (
    <View className="size-12 items-center justify-center" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Svg viewBox="0 0 48 48" width={48} height={48} style={{ position: 'absolute' }}>
        <Path
          d="M24 2l6 12.5L44 10l-4.5 14L44 38l-14-4.5L24 46l-6-12.5L4 38l4.5-14L4 10l14 4.5z"
          fill={gold}
          fillOpacity={0.12}
          stroke={gold}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      </Svg>
      <Text className="text-sm font-semibold">{n}</Text>
    </View>
  );
}

export function SurahCard({ surah, onOpen }: { surah: Surah; onOpen: (surah: Surah) => void }) {
  const { t, isRTL } = useSettings();
  const { hasAny } = useDownloads();
  const saved = hasAny(surah.number);

  return (
    <Pressable
      onPress={() => onOpen(surah)}
      accessibilityRole="button"
      accessibilityLabel={`${isRTL ? surah.name : surah.englishName}, ${surah.numberOfAyahs} ${t('ayahs')}`}
      className="min-h-[68px] flex-row items-center gap-4 rounded-2xl border border-border bg-card p-3.5 active:border-primary"
    >
      <NumberStar n={surah.number} />
      <View className="flex-1">
        <Text
          numberOfLines={1}
          className={cn('text-xl', isRTL ? 'font-quran' : 'font-display')}
          style={isRTL ? { lineHeight: 30, paddingVertical: 3 } : undefined}
        >
          {isRTL ? surah.name : surah.englishName}
        </Text>
        <Text numberOfLines={1} className="text-sm text-muted-foreground">
          {isRTL ? surah.englishName : surah.englishNameTranslation} · {surah.numberOfAyahs} {t('ayahs')}
        </Text>
      </View>
      {saved ? <Icon as={CircleCheck} className="size-5 text-primary" accessibilityLabel={t('offlineSaved')} /> : null}
      <Badge variant="secondary" className="rounded-full">
        <Text className="text-xs">{surah.revelationType === 'Meccan' ? t('meccan') : t('medinan')}</Text>
      </Badge>
    </Pressable>
  );
}
