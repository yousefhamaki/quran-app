import { Gauge, HStack, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, gaugeStyle, minimumScaleFactor, monospacedDigit, padding, scaleEffect, tint, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { WidgetData } from '../lib/widget-data';

/** Khatmah progress ring and today's portion (small and medium). Runs in an isolated runtime: no outside values. */
const KhatmahProgress = (data: WidgetData, environment: WidgetEnvironment) => {
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
  const link = widgetURL('quranapp://plan');
  const k = data.study.khatmah;
  if (!k) {
    return (
      <VStack modifiers={[bg, link, padding({ all: 8 })]}>
        <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(WHITE)]}>{data.text.noKhatmah}</Text>
      </VStack>
    );
  }
  const status = k.finished ? data.text.finished : k.todayLeft === 0 ? data.text.doneToday : data.text.todayPortion;
  const ring = (
    <ZStack>
      <Gauge value={k.percent / 100} modifiers={[gaugeStyle('circularCapacity'), tint(GOLD), scaleEffect(1.7)]} />
      <Text modifiers={[font({ size: 15, weight: 'bold' }), monospacedDigit(), foregroundStyle(WHITE)]}>{`${k.percent}%`}</Text>
    </ZStack>
  );
  if (environment.widgetFamily === 'systemSmall') {
    return (
      <VStack spacing={10} modifiers={[bg, link]}>
        {ring}
        <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(k.todayLeft === 0 ? GOLD : WHITE), minimumScaleFactor(0.6)]}>{k.todayLeft === 0 || k.finished ? status : k.portion}</Text>
      </VStack>
    );
  }
  return (
    <HStack spacing={18} modifiers={[bg, link]}>
      {ring}
      <VStack alignment="leading" spacing={3}>
        <Text modifiers={[font({ size: 14, weight: 'bold' }), foregroundStyle(WHITE)]}>{`${data.text.khatmah} · ${data.text.day} ${k.day}/${k.days}`}</Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(MUTED)]}>{status}</Text>
        {k.portion && !k.finished ? <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(GOLD), minimumScaleFactor(0.6)]}>{k.portion}</Text> : <Spacer />}
      </VStack>
    </HStack>
  );
};

export default createWidget('KhatmahProgress', KhatmahProgress);
