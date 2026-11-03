import { FlexWidget, SvgWidget, TextWidget, type ColorProp } from 'react-native-android-widget';
import type { WidgetData } from '../lib/widget-data';

const BG: ColorProp = '#0b3d33';
const NIGHT: ColorProp = '#1d2b53';
const GOLD = '#e0b65a';
const WHITE = '#ffffff';
const MUTED = '#b8d4cc';

const root = (uri: string, color: ColorProp = BG) => ({
  clickAction: 'OPEN_URI' as const,
  clickActionData: { uri },
  style: { height: 'match_parent' as const, width: 'match_parent' as const, backgroundColor: color, borderRadius: 24, padding: 14, flexDirection: 'column' as const, justifyContent: 'space-between' as const },
});

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Streak, whether today is read and the last seven days. */
export function ReadingStreakWidget({ data }: { data: WidgetData }) {
  const s = data.study;
  const r = root('quranapp://daily');
  return (
    <FlexWidget {...r}>
      <FlexWidget style={{ flexDirection: 'column' }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget text={String(s.streak)} style={{ fontSize: 34, color: GOLD, fontWeight: 'bold' }} />
          <TextWidget text={` ${data.text.streak}`} style={{ fontSize: 12, color: WHITE }} />
        </FlexWidget>
        <TextWidget text={s.readToday ? data.text.readToday : data.text.notYet} maxLines={1} style={{ fontSize: 12, color: s.readToday ? GOLD : MUTED, fontWeight: 'bold' }} />
      </FlexWidget>
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between' }}>
        {s.week.map((d, i) => (
          <FlexWidget key={i} style={{ alignItems: 'center', flexDirection: 'column' }}>
            <FlexWidget style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: d.read ? GOLD : '#ffffff33' }} />
            <TextWidget text={d.label} style={{ fontSize: 9, color: MUTED }} />
          </FlexWidget>
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}

function khatmahRing(percent: number): string {
  const c = 2 * Math.PI * 42;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="#ffffff26" stroke-width="8"/><circle cx="50" cy="50" r="42" fill="none" stroke="${GOLD}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(percent / 100) * c} ${c}" transform="rotate(-90 50 50)"/><text x="50" y="58" text-anchor="middle" font-size="22" font-weight="bold" fill="${WHITE}">${esc(`${percent}%`)}</text></svg>`;
}

/** Khatmah progress ring and today's portion. */
export function KhatmahProgressWidget({ data }: { data: WidgetData }) {
  const k = data.study.khatmah;
  const r = root('quranapp://plan');
  if (!k) {
    return (
      <FlexWidget {...r} style={{ ...r.style, justifyContent: 'center' }}>
        <TextWidget text={data.text.noKhatmah} style={{ fontSize: 15, color: WHITE, fontWeight: 'bold' }} />
      </FlexWidget>
    );
  }
  const status = k.finished ? data.text.finished : k.todayLeft === 0 ? data.text.doneToday : data.text.todayPortion;
  return (
    <FlexWidget {...r} style={{ ...r.style, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
      <SvgWidget svg={khatmahRing(k.percent)} style={{ width: 84, height: 84 }} />
      <FlexWidget style={{ flex: 1, flexDirection: 'column', paddingLeft: 12 }}>
        <TextWidget text={`${data.text.khatmah} · ${data.text.day} ${k.day}/${k.days}`} maxLines={1} style={{ fontSize: 13, color: WHITE, fontWeight: 'bold' }} />
        <TextWidget text={status} maxLines={1} style={{ fontSize: 11, color: k.todayLeft === 0 ? GOLD : MUTED }} />
        {k.portion && !k.finished ? <TextWidget text={k.portion} maxLines={2} style={{ fontSize: 12, color: GOLD, fontWeight: 'bold' }} /> : null}
      </FlexWidget>
    </FlexWidget>
  );
}

/** Jump back to where the user stopped reading. */
export function ContinueReadingWidget({ data }: { data: WidgetData }) {
  const x = data.study.resume;
  const r = root(x ? x.url : 'quranapp://');
  const pct = x ? Math.max(3, x.percent) : 0;
  return (
    <FlexWidget {...r}>
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget text={x ? data.text.continueReading : data.text.startReading} style={{ fontSize: 11, color: GOLD, fontWeight: 'bold' }} />
        <TextWidget text={x ? x.name : 'القرآن الكريم'} maxLines={1} style={{ fontSize: 24, color: WHITE, fontWeight: 'bold' }} />
        {x ? <TextWidget text={`${data.text.ayah} ${x.ayah}`} style={{ fontSize: 13, color: MUTED }} /> : null}
      </FlexWidget>
      {x ? (
        <FlexWidget style={{ width: 'match_parent', height: 6, borderRadius: 3, backgroundColor: '#ffffff26', flexDirection: 'row' }}>
          <FlexWidget style={{ flex: pct, height: 6, borderRadius: 3, backgroundColor: GOLD }} />
          <FlexWidget style={{ flex: Math.max(1, 100 - pct), height: 6 }} />
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}

/** Morning adhkar until Asr, evening adhkar after it. */
export function AdhkarNowWidget({ data }: { data: WidgetData }) {
  const a = data.study.adhkar;
  const r = root(a.url, a.kind === 'evening' ? NIGHT : BG);
  return (
    <FlexWidget {...r}>
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget text={a.kind === 'evening' ? '🌙' : '☀️'} style={{ fontSize: 20, color: WHITE }} />
        <TextWidget text={a.title} maxLines={2} style={{ fontSize: 20, color: WHITE, fontWeight: 'bold' }} />
        <TextWidget text={`${a.count} ${data.text.adhkarCount}`} style={{ fontSize: 12, color: MUTED }} />
      </FlexWidget>
      <TextWidget text={data.text.openAdhkar} style={{ fontSize: 12, color: GOLD, fontWeight: 'bold' }} />
    </FlexWidget>
  );
}
