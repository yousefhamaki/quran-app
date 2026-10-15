import { requestWidgetUpdate } from 'react-native-android-widget';
import { dateString } from './habit';
import { ayahOfDayText } from './dailyayah';
import { AyahWidget } from '../widgets/ayah-widget.android';

/** Re-draw the "Ayah of the day" widgets with today's ayah. */
export async function refreshWidgets(): Promise<void> {
  try {
    const ayah = await ayahOfDayText(dateString());
    await requestWidgetUpdate({
      widgetName: 'AyahOfDay',
      renderWidget: () => <AyahWidget ayah={ayah} />,
      widgetNotFound: () => {},
    });
  } catch {
    /* no widget on the home screen, or offline: nothing to do */
  }
}
