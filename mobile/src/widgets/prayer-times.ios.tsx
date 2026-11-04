import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { background, containerBackground, font, foregroundStyle, monospacedDigit, padding, shapes, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { WidgetData } from '../lib/widget-data';

/** All of today's prayer times with the next one highlighted (medium). Runs in an isolated runtime: no outside values. */
const PrayerTimes = (data: WidgetData, _environment: WidgetEnvironment) => {
  'widget';
  // Before the app has sent this widget any data (just added, or the gallery preview) there is nothing to draw yet.
  if (!data || !data.text || !data.study) {
    return (
      <VStack modifiers={[containerBackground('#0b3d33', 'widget'), padding({ all: 8 })]}>
        <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle('#ffffff')]}>افتح التطبيق · Open the app</Text>
      </VStack>
    );
  }
  const GOLD = '#e0b65a';
  const WHITE = '#ffffff';
  const MUTED = '#ffffffaa';
  const bg = containerBackground('#0b3d33', 'widget');
  const link = widgetURL('quranapp://prayer');
  if (!data.ready || !data.next) {
    return (
      <VStack modifiers={[bg, link, padding({ all: 8 })]}>
        <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(WHITE)]}>{data.text.setup}</Text>
      </VStack>
    );
  }
  const next = data.next;
  return (
    <HStack spacing={14} modifiers={[bg, link]}>
      <VStack alignment="leading" spacing={4}>
        <Text modifiers={[font({ size: 20, weight: 'bold' }), foregroundStyle(WHITE)]}>{next.label}</Text>
        <Text modifiers={[font({ size: 26, weight: 'bold' }), monospacedDigit(), foregroundStyle(GOLD)]}>{next.time}</Text>
        <Text timerInterval={{ lower: new Date(data.nowMs), upper: new Date(next.at) }} countsDown modifiers={[font({ size: 12 }), monospacedDigit(), foregroundStyle(MUTED)]} />
        <Spacer />
        <Text modifiers={[font({ size: 10 }), foregroundStyle(MUTED)]}>{data.hijri}</Text>
      </VStack>
      <VStack spacing={2}>
        {data.rows.map(row => (
          <HStack key={row.key} spacing={6} modifiers={row.next ? [padding({ horizontal: 6, vertical: 2 }), background('#ffffff2a', shapes.roundedRectangle({ cornerRadius: 7 }))] : [padding({ horizontal: 6, vertical: 2 })]}>
            <Text modifiers={[font({ size: 13, weight: row.next ? 'bold' : 'regular' }), foregroundStyle(WHITE)]}>{row.label}</Text>
            <Spacer />
            <Text modifiers={[font({ size: 13, weight: row.next ? 'bold' : 'regular' }), monospacedDigit(), foregroundStyle(row.next ? GOLD : WHITE)]}>{row.time}</Text>
          </HStack>
        ))}
      </VStack>
    </HStack>
  );
};

export default createWidget('PrayerTimes', PrayerTimes);
