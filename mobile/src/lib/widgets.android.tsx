import type { ReactElement } from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { dateString } from './habit';
import { ayahOfDayText } from './dailyayah';
import { buildWidgetData, inputsFromApp, type WidgetData } from './widget-data';
import { AyahWidget } from '../widgets/ayah-widget.android';
import { AdhkarNowWidget, ContinueReadingWidget, KhatmahProgressWidget, ReadingStreakWidget } from '../widgets/study-widgets.android';
import { HijriEventsWidget, NextPrayerWidget, PrayerRingWidget, PrayerTimesWidget } from '../widgets/prayer-widgets.android';

const update = (widgetName: string, render: () => ReactElement) =>
  requestWidgetUpdate({ widgetName, renderWidget: render, widgetNotFound: () => {} }).catch(() => {
    /* no such widget on the home screen */
  });

/** Re-draw every home-screen widget (the ayah of the day and the prayer / Hijri ones). */
export async function refreshWidgets(): Promise<void> {
  try {
    const data: WidgetData = buildWidgetData(inputsFromApp(), new Date());
    const ayah = await ayahOfDayText(dateString());
    await Promise.all([
      update('AyahOfDay', () => <AyahWidget ayah={ayah} />),
      update('PrayerRing', () => <PrayerRingWidget data={data} />),
      update('PrayerTimes', () => <PrayerTimesWidget data={data} />),
      update('NextPrayer', () => <NextPrayerWidget data={data} />),
      update('HijriEvents', () => <HijriEventsWidget data={data} />),
      update('ReadingStreak', () => <ReadingStreakWidget data={data} />),
      update('KhatmahProgress', () => <KhatmahProgressWidget data={data} />),
      update('ContinueReading', () => <ContinueReadingWidget data={data} />),
      update('AdhkarNow', () => <AdhkarNowWidget data={data} />),
    ]);
  } catch {
    /* offline or nothing to update */
  }
}
