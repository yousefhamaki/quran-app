import { FlexWidget, TextWidget, type ColorProp } from 'react-native-android-widget';
import type { WidgetData } from '../lib/widget-data';

const BG: ColorProp = '#0b3d33';
const GOLD = '#e0b65a';
const WHITE = '#ffffff';
const MUTED = '#b8d4cc';

const root = (uri: string) => ({ clickAction: 'OPEN_URI' as const, clickActionData: { uri }, style: { height: 'match_parent' as const, width: 'match_parent' as const, backgroundColor: BG, borderRadius: 24, padding: 12 } });

/** Today's date in both calendars and the coming occasions. */
export function HijriEventsWidget({ data }: { data: WidgetData }) {
  return (
    <FlexWidget {...root('quranapp://calendar')} style={{ ...root('').style, flexDirection: 'column', justifyContent: 'space-between' }}>
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between' }}>
        <TextWidget text={data.gregorian} style={{ fontSize: 11, color: MUTED }} />
        <TextWidget text={data.hijri} style={{ fontSize: 13, color: GOLD, fontWeight: 'bold' }} />
      </FlexWidget>
      {data.events.slice(0, 5).map(e => (
        <FlexWidget key={`${e.hijri}-${e.name}`} style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between' }}>
          <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
            <TextWidget text={e.name} maxLines={1} style={{ fontSize: 13, color: WHITE, fontWeight: 'bold' }} />
            <TextWidget text={`${e.hijri} · ${e.gregorian}`} maxLines={1} style={{ fontSize: 9, color: MUTED }} />
          </FlexWidget>
          <TextWidget text={e.inDays === 0 ? data.text.today : `${e.inDays} ${data.text.days}`} style={{ fontSize: 12, color: GOLD, fontWeight: 'bold' }} />
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}
