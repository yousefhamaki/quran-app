import { FlexWidget, SvgWidget, TextWidget, type ColorProp } from 'react-native-android-widget';
import type { WidgetData } from '../lib/widget-data';

const BG: ColorProp = '#0b3d33';
const GOLD = '#e0b65a';
const WHITE = '#ffffff';
const MUTED = '#b8d4cc';

const root = (uri: string) => ({ clickAction: 'OPEN_URI' as const, clickActionData: { uri }, style: { height: 'match_parent' as const, width: 'match_parent' as const, backgroundColor: BG, borderRadius: 24, padding: 12 } });

/** "1h 05m" (the system refreshes a widget at most every 30 minutes, so the exact seconds are shown only on iOS). */
function left(data: WidgetData): string {
  if (!data.next) return '';
  const total = Math.max(0, Math.round((data.next.at - data.nowMs) / 60_000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return data.lang === 'ar' ? (h ? `${h}س ${m}د` : `${m} د`) : h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** The ring with the countdown written inside it (a widget cannot stack views, so the text is part of the picture). */
function ringSvg(data: WidgetData): string {
  const next = data.next!;
  const c = 2 * Math.PI * 42;
  const filled = Math.max(0, Math.min(1, next.elapsed)) * c;
  const t = (y: number, size: number, color: string, text: string, weight = 'bold') =>
    `<text x="50" y="${y}" text-anchor="middle" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(text)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="#ffffff26" stroke-width="7"/><circle cx="50" cy="50" r="42" fill="none" stroke="${GOLD}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${filled} ${c}" transform="rotate(-90 50 50)"/>${t(47, 15, WHITE, left(data))}${t(61, 11, WHITE, next.label)}${t(73, 9, GOLD, next.time, 'normal')}</svg>`;
}

function SetupHint({ data }: { data: WidgetData }) {
  return (
    <FlexWidget {...root('quranapp://prayer')} style={{ ...root('').style, justifyContent: 'center' }}>
      <TextWidget text={data.text.setup} maxLines={3} style={{ fontSize: 13, color: WHITE, fontWeight: 'bold' }} />
    </FlexWidget>
  );
}

/** Countdown ring to the next prayer with the other four in the corners. */
export function PrayerRingWidget({ data }: { data: WidgetData }) {
  if (!data.ready || !data.next) return <SetupHint data={data} />;
  const c = data.corners;
  const corner = (i: number) => <TextWidget text={c[i] ? `${c[i].label} ${c[i].time}` : ''} maxLines={1} style={{ fontSize: 10, color: MUTED }} />;
  return (
    <FlexWidget {...root('quranapp://prayer')} style={{ ...root('').style, justifyContent: 'space-between', flexDirection: 'column' }}>
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between' }}>{corner(0)}{corner(1)}</FlexWidget>
      <FlexWidget style={{ width: 'match_parent', height: 92, alignItems: 'center', justifyContent: 'center' }}>
        <SvgWidget svg={ringSvg(data)} style={{ width: 92, height: 92 }} />
      </FlexWidget>
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between' }}>{corner(2)}{corner(3)}</FlexWidget>
    </FlexWidget>
  );
}

/** Today's times with the next one highlighted. */
export function PrayerTimesWidget({ data }: { data: WidgetData }) {
  if (!data.ready || !data.next) return <SetupHint data={data} />;
  return (
    <FlexWidget {...root('quranapp://prayer')} style={{ ...root('').style, flexDirection: 'row' }}>
      <FlexWidget style={{ width: 100, height: 'match_parent', justifyContent: 'space-between', flexDirection: 'column' }}>
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget text={data.next.label} style={{ fontSize: 18, color: WHITE, fontWeight: 'bold' }} />
          <TextWidget text={data.next.time} style={{ fontSize: 22, color: GOLD, fontWeight: 'bold' }} />
          <TextWidget text={left(data)} style={{ fontSize: 11, color: MUTED }} />
        </FlexWidget>
        <TextWidget text={data.hijri} maxLines={2} style={{ fontSize: 9, color: MUTED }} />
      </FlexWidget>
      <FlexWidget style={{ flex: 1, height: 'match_parent', flexDirection: 'column', justifyContent: 'space-between' }}>
        {data.rows.map(row => (
          <FlexWidget
            key={row.key}
            style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: row.next ? '#ffffff2a' : '#00000000' }}
          >
            <TextWidget text={row.label} style={{ fontSize: 12, color: WHITE, fontWeight: row.next ? 'bold' : 'normal' }} />
            <TextWidget text={row.time} style={{ fontSize: 12, color: row.next ? GOLD : WHITE, fontWeight: row.next ? 'bold' : 'normal' }} />
          </FlexWidget>
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}

/** The next prayer, its time and how far through the wait we are. */
export function NextPrayerWidget({ data }: { data: WidgetData }) {
  if (!data.ready || !data.next) return <SetupHint data={data} />;
  const pct = Math.round(data.next.elapsed * 100);
  return (
    <FlexWidget {...root('quranapp://prayer')} style={{ ...root('').style, justifyContent: 'space-between', flexDirection: 'column' }}>
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget text={data.next.label} style={{ fontSize: 18, color: WHITE, fontWeight: 'bold' }} />
        <TextWidget text={data.next.time} style={{ fontSize: 30, color: GOLD, fontWeight: 'bold' }} />
      </FlexWidget>
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'column' }}>
        <FlexWidget style={{ width: 'match_parent', height: 6, borderRadius: 3, backgroundColor: '#ffffff26', flexDirection: 'row' }}>
          <FlexWidget style={{ flex: Math.max(4, pct), height: 6, borderRadius: 3, backgroundColor: GOLD }} />
          <FlexWidget style={{ flex: Math.max(1, 100 - pct), height: 6 }} />
        </FlexWidget>
        <TextWidget text={left(data)} style={{ fontSize: 11, color: MUTED }} />
      </FlexWidget>
    </FlexWidget>
  );
}

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
