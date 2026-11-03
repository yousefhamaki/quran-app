import { Gauge, HStack, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, frame, gaugeStyle, minimumScaleFactor, monospacedDigit, padding, scaleEffect, tint, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { WidgetData } from '../lib/widget-data';

/** Countdown ring to the next prayer with the other four prayers in the corners (small). Runs in an isolated runtime: no outside values. */
const PrayerRing = (data: WidgetData, _environment: WidgetEnvironment) => {
  'widget';
  const GOLD = '#e0b65a';
  const WHITE = '#ffffff';
  const MUTED = '#ffffffaa';
  const bg = containerBackground('#0b3d33', 'widget');
  const link = widgetURL('quranapp://prayer');
  if (!data.ready || !data.next) {
    return (
      <VStack modifiers={[bg, link, padding({ all: 8 })]}>
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(WHITE)]}>{data.text.setup}</Text>
      </VStack>
    );
  }
  const next = data.next;
  const corner = (i: number) => {
    const c = data.corners[i];
    return c ? <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(MUTED), minimumScaleFactor(0.6)]}>{`${c.label} ${c.time}`}</Text> : <Spacer />;
  };
  return (
    <VStack spacing={2} modifiers={[bg, link]}>
      <HStack>
        {corner(0)}
        <Spacer />
        {corner(1)}
      </HStack>
      <ZStack>
        <Gauge value={next.elapsed} modifiers={[gaugeStyle('circularCapacity'), tint(GOLD), scaleEffect(2.15)]} />
        <VStack spacing={0}>
          <Text timerInterval={{ lower: new Date(data.nowMs), upper: new Date(next.at) }} countsDown modifiers={[font({ size: 17, weight: 'bold' }), monospacedDigit(), foregroundStyle(WHITE), frame({ maxWidth: 70 })]} />
          <Text modifiers={[font({ size: 9 }), foregroundStyle(MUTED)]}>{data.text.leftUntil}</Text>
          <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(WHITE)]}>{next.label}</Text>
          <Text modifiers={[font({ size: 10 }), foregroundStyle(GOLD)]}>{next.time}</Text>
        </VStack>
      </ZStack>
      <HStack>
        {corner(2)}
        <Spacer />
        {corner(3)}
      </HStack>
    </VStack>
  );
};

export default createWidget('PrayerRing', PrayerRing);
