import { ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, monospacedDigit, padding, tint, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { WidgetData } from '../lib/widget-data';

/** The next prayer, its time and a bar that fills until it arrives (small). Runs in an isolated runtime: no outside values. */
const NextPrayer = (data: WidgetData, _environment: WidgetEnvironment) => {
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
  return (
    <VStack alignment="leading" spacing={4} modifiers={[bg, link]}>
      <Text modifiers={[font({ size: 20, weight: 'bold' }), foregroundStyle(WHITE)]}>{next.label}</Text>
      <Text modifiers={[font({ size: 34, weight: 'bold' }), monospacedDigit(), foregroundStyle(GOLD)]}>{next.time}</Text>
      <Spacer />
      <ProgressView timerInterval={{ lower: new Date(next.prevAt), upper: new Date(next.at) }} countsDown={false} modifiers={[tint(GOLD)]} />
      <Text timerInterval={{ lower: new Date(data.nowMs), upper: new Date(next.at) }} countsDown modifiers={[font({ size: 12 }), monospacedDigit(), foregroundStyle(MUTED)]} />
    </VStack>
  );
};

export default createWidget('NextPrayer', NextPrayer);
