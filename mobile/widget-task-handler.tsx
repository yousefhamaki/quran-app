import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { AyahWidget } from './src/widgets/ayah-widget.android';
import { HijriEventsWidget, NextPrayerWidget, PrayerRingWidget, PrayerTimesWidget } from './src/widgets/prayer-widgets.android';
import { AdhkarNowWidget, ContinueReadingWidget, KhatmahProgressWidget, ReadingStreakWidget } from './src/widgets/study-widgets.android';
import { ayahOfDayText } from './src/lib/dailyayah';
import { dateString } from './src/lib/habit';
import { buildWidgetData, inputsFromStorage } from './src/lib/widget-data';

/** Runs headless (the app does not need to be open) when a widget is added or refreshed by the system. */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const name = props.widgetInfo.widgetName;
      if (name === 'AyahOfDay') {
        const ayah = await ayahOfDayText(dateString());
        props.renderWidget(<AyahWidget ayah={ayah} />);
        break;
      }
      const data = buildWidgetData(await inputsFromStorage(), new Date());
      if (name === 'PrayerRing') props.renderWidget(<PrayerRingWidget data={data} />);
      else if (name === 'PrayerTimes') props.renderWidget(<PrayerTimesWidget data={data} />);
      else if (name === 'NextPrayer') props.renderWidget(<NextPrayerWidget data={data} />);
      else if (name === 'HijriEvents') props.renderWidget(<HijriEventsWidget data={data} />);
      else if (name === 'ReadingStreak') props.renderWidget(<ReadingStreakWidget data={data} />);
      else if (name === 'KhatmahProgress') props.renderWidget(<KhatmahProgressWidget data={data} />);
      else if (name === 'ContinueReading') props.renderWidget(<ContinueReadingWidget data={data} />);
      else if (name === 'AdhkarNow') props.renderWidget(<AdhkarNowWidget data={data} />);
      break;
    }
    default:
      break;
  }
}
