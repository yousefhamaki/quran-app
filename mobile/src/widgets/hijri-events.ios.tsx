import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, minimumScaleFactor, padding, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { WidgetData } from '../lib/widget-data';

/** Today's date in both calendars and the coming Islamic occasions (medium and large). Runs in an isolated runtime: no outside values. */
const HijriEvents = (data: WidgetData, environment: WidgetEnvironment) => {
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
  const count = environment.widgetFamily === 'systemLarge' ? 7 : 4;
  return (
    <VStack spacing={5} modifiers={[containerBackground('#0b3d33', 'widget'), widgetURL('quranapp://calendar')]}>
      <HStack>
        <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(MUTED)]}>{data.gregorian}</Text>
        <Spacer />
        <Text modifiers={[font({ size: 14, weight: 'bold' }), foregroundStyle(GOLD), minimumScaleFactor(0.7)]}>{data.hijri}</Text>
      </HStack>
      {data.events.slice(0, count).map(e => (
        <HStack key={`${e.hijri}-${e.name}`} spacing={8}>
          <VStack alignment="leading" spacing={0}>
            <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(WHITE), minimumScaleFactor(0.7)]}>{e.name}</Text>
            <Text modifiers={[font({ size: 10 }), foregroundStyle(MUTED)]}>{`${e.hijri} · ${e.gregorian}`}</Text>
          </VStack>
          <Spacer />
          <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(GOLD), padding({ leading: 4 })]}>{e.inDays === 0 ? data.text.today : `${e.inDays} ${data.text.days}`}</Text>
        </HStack>
      ))}
    </VStack>
  );
};

export default createWidget('HijriEvents', HijriEvents);
