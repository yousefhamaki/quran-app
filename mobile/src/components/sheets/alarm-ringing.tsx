import { useEffect, useState } from 'react';
import { AppState, Modal, Pressable, ScrollView, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDirection } from 'uniwind';
import { AlarmClock, Bell, BellOff } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { alarmSupported, currentAlarm, showOverLockScreen, snoozeAlarm, stopAlarm, type RingingAlarm } from '../../../modules/daily-alarm';
import { useSettings } from '@/context/settings';
import { useToast } from '@/context/toast';

const GREEN = '#0b5d4b';
const GOLD = '#e0b65a';

/** A bell that keeps pulsing while the alarm rings. */
function PulsingBell() {
  const scale = useSharedValue(1);
  const halo = useSharedValue(0);
  useEffect(() => {
    scale.value = withRepeat(withSequence(withTiming(1.1, { duration: 650, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) })), -1);
    halo.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) }), -1);
  }, [scale, halo]);
  const bell = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ring = useAnimatedStyle(() => ({ opacity: 0.35 * (1 - halo.value), transform: [{ scale: 1 + halo.value * 0.9 }] }));
  return (
    <View style={{ width: 132, height: 132, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no">
      <Animated.View style={[{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: '#ffffff' }, ring]} />
      <Animated.View style={[{ width: 108, height: 108, borderRadius: 54, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' }, bell]}>
        <Icon as={Bell} className="size-12 text-white" />
      </Animated.View>
    </View>
  );
}

/**
 * The alarm screen: it fills the screen while the daily alarm rings (and over the lock screen), with the time, the ayah
 * and two big buttons. The alarm keeps ringing until Stop or Snooze is pressed; there is no way to just close it.
 */
export function AlarmRinging() {
  const { t, isRTL } = useSettings();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [alarm, setAlarm] = useState<RingingAlarm | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!alarmSupported) return;
    const check = () => setAlarm(prev => {
      const next = currentAlarm();
      if (!next) return prev === null ? prev : null;
      return prev && prev.title === next.title && prev.body === next.body ? prev : next;
    });
    check();
    const id = setInterval(check, 1500);
    const sub = AppState.addEventListener('change', s => s === 'active' && check());
    return () => { clearInterval(id); sub.remove(); };
  }, []);

  // Over the lock screen only while ringing; the app stays behind the lock screen otherwise.
  const ringing = alarm !== null;
  useEffect(() => { showOverLockScreen(ringing); }, [ringing]);

  useEffect(() => {
    if (!ringing) return;
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, [ringing]);

  if (!alarm) return null;
  const locale = isRTL ? 'ar' : 'en';
  const time = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  const date = now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Modal visible animationType="fade" onRequestClose={() => { /* only Stop or Snooze end the alarm */ }} statusBarTranslucent navigationBarTranslucent>
      <LayoutDirection rtl={isRTL}>
        <View style={{ flex: 1, backgroundColor: GREEN, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20, paddingHorizontal: 24 }}>
          {/* Decorative rings */}
          <View pointerEvents="none" style={{ position: 'absolute', top: -140, right: -140, width: 360, height: 360, borderRadius: 180, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }} />
          <View pointerEvents="none" style={{ position: 'absolute', bottom: 120, left: -180, width: 380, height: 380, borderRadius: 190, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }} />

          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={{ color: '#fff', fontSize: 72, lineHeight: 88, fontWeight: '600', writingDirection: 'ltr' }} accessibilityLiveRegion="polite">{time}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16 }}>{date}</Text>
          </View>

          <View style={{ alignItems: 'center', marginTop: 28 }}><PulsingBell /></View>

          <View style={{ flex: 1, marginTop: 20 }}>
            <Text style={{ color: GOLD, fontSize: 18, textAlign: 'center', fontWeight: '600' }}>{alarm.title || t('alarmRinging')}</Text>
            <ScrollView style={{ flex: 1, marginTop: 10 }} contentContainerStyle={{ paddingVertical: 6 }} showsVerticalScrollIndicator={false}>
              {alarm.body ? <Text className="font-quran" style={{ color: '#fff', fontSize: 26, lineHeight: 54, paddingBottom: 12, textAlign: 'center', writingDirection: 'rtl' }}>{alarm.body}</Text> : null}
            </ScrollView>
          </View>

          <View style={{ gap: 12 }}>
            <Pressable
              onPress={() => { snoozeAlarm(); toast.info(t('alarmSnoozedFor', { n: alarm.snoozeMinutes })); setAlarm(null); }}
              accessibilityRole="button"
              accessibilityLabel={`${t('alarmSnooze')} ${t('iqamaMinutes', { n: alarm.snoozeMinutes })}`}
              style={({ pressed }) => ({ height: 64, borderRadius: 32, borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)', backgroundColor: pressed ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 })}
            >
              <Icon as={AlarmClock} className="size-6 text-white" />
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>{t('alarmSnooze')} · {t('iqamaMinutes', { n: alarm.snoozeMinutes })}</Text>
            </Pressable>
            <Pressable
              onPress={() => { stopAlarm(); setAlarm(null); }}
              accessibilityRole="button"
              accessibilityLabel={t('alarmStop')}
              style={({ pressed }) => ({ height: 72, borderRadius: 36, backgroundColor: pressed ? '#e8e2d2' : '#faf7f0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 })}
            >
              <Icon as={BellOff} className="size-7 text-primary" />
              <Text style={{ color: GREEN, fontSize: 22, fontWeight: '700' }}>{t('alarmStop')}</Text>
            </Pressable>
          </View>
        </View>
      </LayoutDirection>
    </Modal>
  );
}
