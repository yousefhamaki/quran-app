import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { AlarmClock, BellOff } from 'lucide-react-native';
import { Sheet } from '@/components/sheet';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { alarmSupported, currentAlarm, snoozeAlarm, stopAlarm, type RingingAlarm } from '../../../modules/daily-alarm';
import { useSettings } from '@/context/settings';
import { useToast } from '@/context/toast';

/**
 * Shown over the app while the daily alarm is ringing: Stop and Snooze are one tap away.
 * (The same two buttons are on the notification itself.) The alarm keeps ringing until one of them is pressed.
 */
export function AlarmRinging() {
  const { t } = useSettings();
  const toast = useToast();
  const [alarm, setAlarm] = useState<RingingAlarm | null>(null);

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

  if (!alarm) return null;

  return (
    <Sheet
      open
      onClose={() => { /* only Stop or Snooze end the alarm */ }}
      title={alarm.title || t('alarmRinging')}
      description={t('alarmRinging')}
      footer={
        <View className="gap-2">
          <Button size="lg" className="h-14 rounded-2xl" onPress={() => { stopAlarm(); setAlarm(null); }}>
            <Icon as={BellOff} className="size-5 text-primary-foreground" />
            <Text className="text-base">{t('alarmStop')}</Text>
          </Button>
          <Button variant="outline" size="lg" className="h-14 rounded-2xl" onPress={() => { snoozeAlarm(); setAlarm(null); toast.info(t('alarmSnoozedFor', { n: alarm.snoozeMinutes })); }}>
            <Icon as={AlarmClock} className="size-5" />
            <Text className="text-base">{t('alarmSnooze')} · {t('iqamaMinutes', { n: alarm.snoozeMinutes })}</Text>
          </Button>
        </View>
      }
    >
      <View className="items-center gap-4 py-6">
        <View className="size-20 items-center justify-center rounded-full bg-secondary">
          <Icon as={AlarmClock} className="size-10 text-primary" />
        </View>
        {alarm.body ? <Text className="font-quran text-center text-2xl" style={{ lineHeight: 52, paddingVertical: 6, writingDirection: 'rtl' }}>{alarm.body}</Text> : null}
      </View>
    </Sheet>
  );
}
