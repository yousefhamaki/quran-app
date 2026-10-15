import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { addDays, dailyAyah, dateString, khatmahDay, plannedPortion, TOTAL_AYAHS, type Khatmah, type Ref } from './habit';
import { ayahOfDayText } from './dailyayah';
import { ADHAN_PRAYERS, timesFor, type Location, type MadhabId, type MethodId, type PrayerName } from './prayer';

export interface ReminderTexts {
  title: string;
  fallback: string;
}

const AYAH_CHANNEL = 'daily-ayah';
const ADHAN_CHANNEL = 'adhan-sound';
const SOON_CHANNEL = 'prayer-soon';
/** File in assets/sounds (copied into the app by the expo-notifications plugin). */
const ADHAN_SOUND = 'adhan.wav';
const AYAH_PREFIX = 'ayah-';
const ADHAN_PREFIX = 'adhan-';
/** How many days ahead are scheduled (each day gets its own notifications); refreshed every time the app opens. */
const AYAH_DAYS = 14;
/** iOS keeps at most 64 pending notifications, and every day now needs up to ten. */
export const ADHAN_DAYS = Platform.OS === 'ios' ? 3 : 7;

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  });
}

export type ReminderResult = 'off' | 'scheduled' | 'denied' | 'unsupported';

export async function askNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } });
  return asked.granted;
}

/** Cancels only our own notifications of one kind (the ayah reminder and the adhan must not wipe each other). */
async function cancelPrefix(prefix: string) {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(all.filter(n => n.identifier.startsWith(prefix)).map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

const localDate = (day: string, hour: number, minute: number) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute, 0, 0);
};

/**
 * Replaces the scheduled "ayah of the day" reminders: one notification per day at hour:minute for the next two weeks,
 * each carrying that day's ayah. Called when the setting changes and whenever the app opens, so the window keeps moving.
 */
export async function syncReminder(args: { enabled: boolean; hour: number; minute: number } & ReminderTexts): Promise<ReminderResult> {
  if (Platform.OS === 'web') return 'unsupported';
  await cancelPrefix(AYAH_PREFIX);
  if (!args.enabled) return 'off';
  if (!(await askNotificationPermission())) return 'denied';

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(AYAH_CHANNEL, { name: args.title, importance: Notifications.AndroidImportance.DEFAULT });
  }

  const now = Date.now();
  const today = dateString();
  for (let i = 0; i < AYAH_DAYS; i++) {
    const day = addDays(today, i);
    const at = localDate(day, args.hour, args.minute);
    if (at.getTime() <= now) continue;
    const ref = dailyAyah(day);
    const text = await ayahOfDayText(day);
    await Notifications.scheduleNotificationAsync({
      identifier: `${AYAH_PREFIX}${day}`,
      content: {
        title: args.title,
        subtitle: text ? `${text.surahAr} · ${ref.ayah}` : undefined,
        body: text?.ar ?? args.fallback,
        data: { surah: ref.surah, ayah: ref.ayah },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: AYAH_CHANNEL },
    });
  }
  return 'scheduled';
}

export interface AdhanArgs {
  enabled: boolean;
  loc: Location | null;
  method: MethodId;
  madhab: MadhabId;
  /** Also notify this many minutes before each prayer (0 = off). */
  beforeMinutes: number;
  channelName: string;
  soonChannelName: string;
  /** Localized prayer names. */
  names: Record<PrayerName, string>;
  /** "It is time for {name}" */
  body: (name: string) => string;
  /** "{name} in {n} min" and its body text. */
  soonTitle: (name: string, minutes: number) => string;
  soonBody: string;
}

/**
 * Schedules, for the next days, a notification at each of the five prayer times that plays the adhan, and (optionally)
 * one a few minutes earlier with the normal notification sound. Returns how many days were scheduled.
 */
export async function syncAdhan(args: AdhanArgs): Promise<{ result: ReminderResult; days: number }> {
  if (Platform.OS === 'web') return { result: 'unsupported', days: 0 };
  await cancelPrefix(ADHAN_PREFIX);
  if (!args.enabled || !args.loc) return { result: 'off', days: 0 };
  if (!(await askNotificationPermission())) return { result: 'denied', days: 0 };

  if (Platform.OS === 'android') {
    // Android fixes a channel's sound when it is created, so the adhan lives in its own (new) channel.
    await Notifications.setNotificationChannelAsync(ADHAN_CHANNEL, { name: args.channelName, importance: Notifications.AndroidImportance.HIGH, sound: ADHAN_SOUND });
    await Notifications.setNotificationChannelAsync(SOON_CHANNEL, { name: args.soonChannelName, importance: Notifications.AndroidImportance.DEFAULT });
  }

  const now = Date.now();
  const today = dateString();
  for (let i = 0; i < ADHAN_DAYS; i++) {
    const day = addDays(today, i);
    const [y, m, d] = day.split('-').map(Number);
    const times = timesFor(args.loc, new Date(y, m - 1, d, 12), args.method, args.madhab);
    for (const name of ADHAN_PRAYERS) {
      const at = times[name];
      if (args.beforeMinutes > 0) {
        const soon = new Date(at.getTime() - args.beforeMinutes * 60_000);
        if (soon.getTime() > now) {
          await Notifications.scheduleNotificationAsync({
            identifier: `${ADHAN_PREFIX}soon-${day}-${name}`,
            content: { title: args.soonTitle(args.names[name], args.beforeMinutes), body: args.soonBody, data: { adhan: name, soon: true } },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: soon, channelId: SOON_CHANNEL },
          });
        }
      }
      if (at.getTime() <= now) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `${ADHAN_PREFIX}${day}-${name}`,
        content: { title: args.names[name], body: args.body(args.names[name]), sound: ADHAN_SOUND, data: { adhan: name } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: ADHAN_CHANNEL },
      });
    }
  }
  return { result: 'scheduled', days: ADHAN_DAYS };
}

const KHATMAH_PREFIX = 'khatmah-';
const KHATMAH_CHANNEL = 'khatmah';
const KHATMAH_DAYS = 14;

export interface KhatmahReminderArgs {
  enabled: boolean;
  hour: number;
  minute: number;
  khatmah: Khatmah | null;
  title: string;
  fallback: string;
  /** "Today: {from} → {to} ({n} ayahs)" */
  body: (from: Ref, to: Ref, n: number) => string;
}

/**
 * A second reminder, separate from the "ayah of the day" one: each day at hour:minute for the next two weeks, with that
 * day's portion of the khatmah. The text assumes you stay on schedule; it is refreshed every time the app opens.
 */
export async function syncKhatmahReminder(args: KhatmahReminderArgs): Promise<ReminderResult> {
  if (Platform.OS === 'web') return 'unsupported';
  await cancelPrefix(KHATMAH_PREFIX);
  const k = args.khatmah;
  if (!args.enabled || !k || k.read >= TOTAL_AYAHS) return 'off';
  if (!(await askNotificationPermission())) return 'denied';

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(KHATMAH_CHANNEL, { name: args.title, importance: Notifications.AndroidImportance.DEFAULT });
  }

  const now = Date.now();
  const today = dateString();
  const firstDay = khatmahDay(k, today);
  for (let i = 0; i < KHATMAH_DAYS; i++) {
    const day = addDays(today, i);
    const at = localDate(day, args.hour, args.minute);
    if (at.getTime() <= now) continue;
    const portion = plannedPortion(k, firstDay + i, i === 0 ? k.read : undefined);
    await Notifications.scheduleNotificationAsync({
      identifier: `${KHATMAH_PREFIX}${day}`,
      content: {
        title: args.title,
        body: portion ? args.body(portion.from, portion.to, portion.count) : args.fallback,
        data: portion ? { surah: portion.from.surah, ayah: portion.from.ayah } : {},
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: KHATMAH_CHANNEL },
    });
  }
  return 'scheduled';
}
