import { Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, minimumScaleFactor, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { WidgetData } from '../lib/widget-data';

/** Morning adhkar until Asr, evening adhkar after it; tap to open them (small and medium). Runs in an isolated runtime: no outside values. */
const AdhkarNow = (data: WidgetData, _environment: WidgetEnvironment) => {
  'widget';
  const GOLD = '#e0b65a';
  const WHITE = '#ffffff';
  const MUTED = '#ffffffaa';
  const a = data.study.adhkar;
  return (
    <VStack alignment="leading" spacing={4} modifiers={[containerBackground(a.kind === 'evening' ? '#1d2b53' : '#0b3d33', 'widget'), widgetURL(a.url)]}>
      <Text modifiers={[font({ size: 20 })]}>{a.kind === 'evening' ? '🌙' : '☀️'}</Text>
      <Text modifiers={[font({ size: 22, weight: 'bold' }), foregroundStyle(WHITE), minimumScaleFactor(0.6)]}>{a.title}</Text>
      <Text modifiers={[font({ size: 12 }), foregroundStyle(MUTED)]}>{`${a.count} ${data.text.adhkarCount}`}</Text>
      <Spacer />
      <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(GOLD)]}>{data.text.openAdhkar}</Text>
    </VStack>
  );
};

export default createWidget('AdhkarNow', AdhkarNow);
