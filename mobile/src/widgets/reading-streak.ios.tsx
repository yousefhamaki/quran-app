import { Circle, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, frame, minimumScaleFactor, monospacedDigit, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { WidgetData } from '../lib/widget-data';

/** Reading streak, whether today is read and the last seven days (small and medium). Runs in an isolated runtime: no outside values. */
const ReadingStreak = (data: WidgetData, _environment: WidgetEnvironment) => {
  'widget';
  const GOLD = '#e0b65a';
  const WHITE = '#ffffff';
  const MUTED = '#ffffffaa';
  const s = data.study;
  return (
    <VStack alignment="leading" spacing={6} modifiers={[containerBackground('#0b3d33', 'widget'), widgetURL('quranapp://daily')]}>
      <HStack spacing={6}>
        <Text modifiers={[font({ size: 38, weight: 'bold' }), monospacedDigit(), foregroundStyle(GOLD)]}>{String(s.streak)}</Text>
        <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(WHITE), minimumScaleFactor(0.7)]}>{data.text.streak}</Text>
      </HStack>
      <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(s.readToday ? GOLD : MUTED), minimumScaleFactor(0.7)]}>{s.readToday ? data.text.readToday : data.text.notYet}</Text>
      <Spacer />
      <HStack spacing={6}>
        {s.week.map((d, i) => (
          <VStack key={i} spacing={3}>
            <Circle modifiers={[frame({ width: 14, height: 14 }), foregroundStyle(d.read ? GOLD : '#ffffff33')]} />
            <Text modifiers={[font({ size: 9 }), foregroundStyle(MUTED)]}>{d.label}</Text>
          </VStack>
        ))}
      </HStack>
    </VStack>
  );
};

export default createWidget('ReadingStreak', ReadingStreak);
