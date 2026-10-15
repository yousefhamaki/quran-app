import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { AyahWidget } from './src/widgets/ayah-widget.android';
import { ayahOfDayText } from './src/lib/dailyayah';
import { dateString } from './src/lib/habit';

/** Runs headless (the app does not need to be open) when the widget is added or refreshed by the system. */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const ayah = await ayahOfDayText(dateString());
      props.renderWidget(<AyahWidget ayah={ayah} />);
      break;
    }
    default:
      break;
  }
}
