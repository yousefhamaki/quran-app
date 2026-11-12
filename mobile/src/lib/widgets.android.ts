import { createElement, type ReactElement } from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { dateString } from './habit';
import { ayahOfDayText } from './dailyayah';
import { buildWidgetData, inputsFromApp, prayerWidgetSnapshot, type WidgetData } from './widget-data';
import { setPrayerWidgetData } from '../../modules/daily-alarm';
import { AyahWidget } from '../widgets/ayah-widget.android';
import { AdhkarNowWidget, ContinueReadingWidget, KhatmahProgressWidget, ReadingStreakWidget } from '../widgets/study-widgets.android';
import { HijriEventsWidget } from '../widgets/prayer-widgets.android';

const update = (widgetName: string, render: () => ReactElement) =>
  requestWidgetUpdate({ widgetName, renderWidget: render, widgetNotFound: () => {} }).catch(() => {
    /* no such widget on the home screen */
  });

/**
 * Re-draw every home-screen widget: the native prayer ones get their data, the others are re-rendered. (This file is .ts, not .tsx, on purpose: Metro tries every platform variant of a
 * `.ts` file before any `.tsx`, so a `.tsx` here would lose to the empty widgets.ts.)
 */
export async function refreshWidgets(): Promise<void> {
  try {
    const inputs = inputsFromApp();
    const data: WidgetData = buildWidgetData(inputs, new Date());
    // The prayer widgets are native (a live countdown needs the system clock): they only need the data.
    setPrayerWidgetData(JSON.stringify(prayerWidgetSnapshot(inputs, new Date())));
    const ayah = await ayahOfDayText(dateString());
    await Promise.all([
      update('AyahOfDay', () => createElement(AyahWidget, { ayah })),
      update('HijriEvents', () => createElement(HijriEventsWidget, { data })),
      update('ReadingStreak', () => createElement(ReadingStreakWidget, { data })),
      update('KhatmahProgress', () => createElement(KhatmahProgressWidget, { data })),
      update('ContinueReading', () => createElement(ContinueReadingWidget, { data })),
      update('AdhkarNow', () => createElement(AdhkarNowWidget, { data })),
    ]);
  } catch (e) {
    console.warn('refreshWidgets failed', e);
  }
}
