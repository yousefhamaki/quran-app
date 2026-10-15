import { useEffect, useState } from 'react';
import { AppState, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import { ChevronsRight } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { HIJRI_MONTHS_AR, HIJRI_MONTHS_EN, hijriOf } from '@/lib/hijri';
import { cornerPrayers, formatHMS, formatTime, prayerWindow, type DayTimes, type Location, type MadhabId, type MethodId, type PrayerName } from '@/lib/prayer';
import { PRAYER_KEYS } from '@/context/prayer';
import { useSettings } from '@/context/settings';

/** A clock that ticks every second (the countdown shows seconds). */
function useSecond() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    const sub = AppState.addEventListener('change', s => s === 'active' && setNow(new Date()));
    return () => { clearInterval(id); sub.remove(); };
  }, []);
  return now;
}

interface Props {
  loc: Location;
  method: MethodId;
  madhab: MadhabId;
  hijriAdjust: number;
  /** Today's times (for the corner prayers). */
  times: DayTimes;
}

/**
 * The home of the Prayer tab: a ring that fills as time passes between the last prayer and the next one,
 * a live H:MM:SS countdown in the middle, and the other four prayers in the corners.
 */
export function PrayerRing({ loc, method, madhab, hijriAdjust, times }: Props) {
  const { t, isRTL } = useSettings();
  const { width } = useWindowDimensions();
  const now = useSecond();
  const locale = isRTL ? 'ar' : 'en';
  const primary = String(useCSSVariable('--color-primary') ?? '#0b5d4b');
  const warm = String(useCSSVariable('--color-destructive') ?? '#c0392b');
  const track = String(useCSSVariable('--color-muted') ?? '#e5e5e5');

  const win = prayerWindow(loc, now, method, madhab);
  const left = win.next.at.getTime() - now.getTime();
  const corners = cornerPrayers(win.next.name);
  const hijri = hijriOf(now, hijriAdjust);
  const months = isRTL ? HIJRI_MONTHS_AR : HIJRI_MONTHS_EN;
  const num = (n: number) => n.toLocaleString(locale, { useGrouping: false });

  const size = Math.min(width - 32, 340);
  const r = 44;
  const c = 2 * Math.PI * r;
  const angle = (win.elapsed * 360 * Math.PI) / 180;
  const marker = 36;
  const end = { x: (50 + r * Math.sin(angle)) / 100 * size, y: (50 - r * Math.cos(angle)) / 100 * size };

  const corner = (name: PrayerName, align: 'items-start' | 'items-end') => (
    <View className={cn('flex-1 flex-row items-baseline gap-2', align === 'items-end' ? 'justify-end' : 'justify-start')}>
      <Text className="text-lg font-medium text-muted-foreground">{t(PRAYER_KEYS[name])}</Text>
      <Text className="text-lg text-muted-foreground" style={{ writingDirection: 'ltr' }}>{formatTime(times[name], locale)}</Text>
    </View>
  );

  return (
    <View className="gap-5" accessibilityLabel={t('prayerNextLabel')}>
      <View className="flex-row">
        {corner(corners[0], 'items-start')}
        {corner(corners[1], 'items-end')}
      </View>

      <View className="items-center">
        <Text className={cn('text-3xl text-gold-foreground', isRTL ? 'font-quran' : 'font-display')} style={isRTL ? { lineHeight: 46, paddingVertical: 4 } : undefined}>
          {num(hijri.day)} {months[hijri.month - 1]} {num(hijri.year)}
        </Text>
        <Text className="mt-1 text-sm text-gold-foreground/80">{loc.name ?? `${Math.abs(loc.lat).toFixed(2)}°${loc.lat >= 0 ? 'N' : 'S'}, ${Math.abs(loc.lng).toFixed(2)}°${loc.lng >= 0 ? 'E' : 'W'}`}</Text>
      </View>

      <View
        className="items-center justify-center self-center"
        style={{ width: size, height: size }}
        accessibilityRole="timer"
        accessibilityLabel={t('prayerNextIn', { name: t(PRAYER_KEYS[win.next.name]), h: Math.floor(left / 3_600_000), m: Math.floor((left % 3_600_000) / 60_000) })}
      >
        <Svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: [{ rotate: '-90deg' }] }}>
          <Defs>
            <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={warm} />
              <Stop offset="0.45" stopColor={primary} />
            </LinearGradient>
          </Defs>
          <Circle cx={50} cy={50} r={r} fill="none" stroke={track} strokeWidth={6.5} />
          <Circle cx={50} cy={50} r={r} fill="none" stroke="url(#ring)" strokeWidth={6.5} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - win.elapsed)} />
        </Svg>
        <View className="absolute items-center justify-center rounded-full bg-primary" style={{ width: marker, height: marker, left: end.x - marker / 2, top: end.y - marker / 2 }}>
          <Icon as={ChevronsRight} className="size-5 text-primary-foreground rtl:rotate-180" />
        </View>

        <View className="absolute items-center gap-1">
          <Text className="text-5xl font-semibold" style={{ writingDirection: 'ltr', lineHeight: 58 }}>{formatHMS(left)}</Text>
          <Text className="text-base text-muted-foreground">{t('prayerLeftUntil')}</Text>
          <Text className={cn('text-5xl font-semibold', isRTL && 'font-quran')} style={{ lineHeight: isRTL ? 76 : 58, paddingVertical: isRTL ? 4 : 0 }}>{t(PRAYER_KEYS[win.next.name])}</Text>
          <Text className="text-xl" style={{ writingDirection: 'ltr' }}>{formatTime(win.next.at, locale)}</Text>
        </View>
      </View>

      <View className="flex-row">
        {corner(corners[2], 'items-start')}
        {corner(corners[3], 'items-end')}
      </View>
    </View>
  );
}
