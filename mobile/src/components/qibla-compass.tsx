import { Fragment, type ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polygon, Rect } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/** The Kaaba: a black cube with the golden band (hizam) and the door. */
export function KaabaIcon({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Polygon points="10,22 38,22 54,12 26,12" fill="#3a3a3a" />
      <Rect x="10" y="22" width="28" height="30" fill="#141414" />
      <Polygon points="38,22 54,12 54,42 38,52" fill="#0b0b0b" />
      <Rect x="10" y="27" width="28" height="5" fill="#d4a93c" />
      <Polygon points="38,27 54,17 54,22 38,32" fill="#b98f2a" />
      <Rect x="19" y="37" width="9" height="15" rx="1" fill="#d4a93c" />
      <Rect x="21" y="39" width="5" height="13" fill="#8a6a1c" />
    </Svg>
  );
}

interface Props {
  /** Direction of the Qibla from north, in degrees. */
  bearing: number;
  /** Direction the phone points, in degrees from north; null when there is no compass. */
  heading: number | null;
  facing: boolean;
  size?: number;
  label: string;
}

const CARDINALS: { key: 'N' | 'E' | 'S' | 'W'; deg: number }[] = [
  { key: 'N', deg: 0 },
  { key: 'E', deg: 90 },
  { key: 'S', deg: 180 },
  { key: 'W', deg: 270 },
];

/**
 * The dial turns with the phone, so the red N always points to true north. The Kaaba sits on the dial at the Qibla
 * direction: when it is at the top (under the marker) you are facing the Qibla. Without a compass the dial stays
 * still, N on top, and the Kaaba shows where the Qibla lies.
 */
export function QiblaCompass({ bearing, heading, facing, size = 240, label }: Props) {
  const border = String(useCSSVariable('--color-border') ?? '#d9d2c3');
  const primary = String(useCSSVariable('--color-primary') ?? '#0b5d4b');
  const dial = heading === null ? 0 : -heading;
  const radius = size / 2;
  const ticks = Array.from({ length: 36 }, (_, i) => i * 10);

  /** Something placed on the dial rim at `deg`, kept upright whatever the dial's rotation. */
  const onRim = (deg: number, node: ReactNode, inset: number, width: number) => (
    <View pointerEvents="none" style={{ position: 'absolute', width: size, height: size, alignItems: 'center', transform: [{ rotate: `${dial + deg}deg` }] }}>
      <View style={{ marginTop: inset, width, alignItems: 'center', transform: [{ rotate: `${-(dial + deg)}deg` }] }}>{node}</View>
    </View>
  );

  return (
    <View accessibilityRole="image" accessibilityLabel={label} style={{ width: size + 28, height: size + 28, alignItems: 'center', justifyContent: 'flex-end' }}>
      {/* Marker for where the phone points */}
      <View style={{ position: 'absolute', top: 0, width: 0, height: 0, borderLeftWidth: 9, borderRightWidth: 9, borderTopWidth: 14, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: facing ? primary : border }} />
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: size, height: size, transform: [{ rotate: `${dial}deg` }] }}>
          <Svg width={size} height={size}>
            <Circle cx={radius} cy={radius} r={radius - 2} fill="none" stroke={facing ? primary : border} strokeWidth={facing ? 4 : 2} />
            {ticks.map(a => {
              const long = a % 90 === 0;
              const rad = (a * Math.PI) / 180;
              const r1 = radius - 4;
              const r2 = radius - (long ? 16 : 10);
              return <Line key={a} x1={radius + r1 * Math.sin(rad)} y1={radius - r1 * Math.cos(rad)} x2={radius + r2 * Math.sin(rad)} y2={radius - r2 * Math.cos(rad)} stroke={a === 0 ? '#c0392b' : border} strokeWidth={long ? 2.5 : 1.5} />;
            })}
          </Svg>
        </View>

        {CARDINALS.map(c => (
          <Fragment key={c.key}>
            {onRim(c.deg, (
              <Text className={cn('text-base font-bold', c.key === 'N' ? 'text-[#c0392b]' : 'text-muted-foreground')} style={{ lineHeight: 22 }}>{c.key}</Text>
            ), 36, 28)}
          </Fragment>
        ))}

        {onRim(bearing, <KaabaIcon size={44} />, 2, 48)}

        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: border }} />
      </View>
    </View>
  );
}
