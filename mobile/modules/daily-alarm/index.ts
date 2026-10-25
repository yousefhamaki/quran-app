import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

/** One alarm to ring: `at` is a timestamp in milliseconds. */
export interface AlarmItem {
  id: string;
  at: number;
  title: string;
  body: string;
  snoozeMinutes: number;
  snoozeLabel: string;
  stopLabel: string;
}

export interface RingingAlarm {
  title: string;
  body: string;
  snoozeMinutes: number;
}

interface Native {
  schedule(kind: string, itemsJson: string): void;
  cancel(kind: string): void;
  isRinging(): boolean;
  current(): RingingAlarm | null;
  stop(): void;
  snooze(): void;
  canScheduleExact(): boolean;
  openExactAlarmSettings(): void;
  canUseFullScreen(): boolean;
  openFullScreenSettings(): void;
}

/** Only Android has the native alarm; everywhere else this is null and callers fall back to normal notifications. */
const native: Native | null = Platform.OS === 'android' ? requireOptionalNativeModule<Native>('DailyAlarm') : null;

export const alarmSupported = native !== null;

export function scheduleAlarms(kind: 'werd' | 'khatmah', items: AlarmItem[]) {
  native?.schedule(kind, JSON.stringify(items));
}
export const cancelAlarms = (kind: 'werd' | 'khatmah') => native?.cancel(kind);
export const isAlarmRinging = (): boolean => native?.isRinging() ?? false;
export const currentAlarm = (): RingingAlarm | null => native?.current() ?? null;
export const stopAlarm = () => native?.stop();
export const snoozeAlarm = () => native?.snooze();
export const canScheduleExactAlarms = (): boolean => native?.canScheduleExact() ?? true;
export const openExactAlarmSettings = () => native?.openExactAlarmSettings();
export const canUseFullScreenAlarm = (): boolean => native?.canUseFullScreen() ?? true;
export const openFullScreenAlarmSettings = () => native?.openFullScreenSettings();

/** Rings in a few seconds, so the user can hear what the alarm is like (replaces the "snooze" slot). */
export function testAlarm(item: Omit<AlarmItem, 'id' | 'at'>, inSeconds = 5) {
  native?.schedule('snooze', JSON.stringify([{ ...item, id: 'test', at: Date.now() + inSeconds * 1000 }]));
}
