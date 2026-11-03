import { ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, minimumScaleFactor, tint, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { WidgetData } from '../lib/widget-data';

/** Jump back to where you stopped reading (small and medium). Runs in an isolated runtime: no outside values. */
const ContinueReading = (data: WidgetData, _environment: WidgetEnvironment) => {
  'widget';
  const GOLD = '#e0b65a';
  const WHITE = '#ffffff';
  const MUTED = '#ffffffaa';
  const r = data.study.resume;
  return (
    <VStack alignment="leading" spacing={4} modifiers={[containerBackground('#0b3d33', 'widget'), widgetURL(r ? r.url : 'quranapp://')]}>
      <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(GOLD)]}>{r ? data.text.continueReading : data.text.startReading}</Text>
      <Text modifiers={[font({ size: 24, weight: 'bold' }), foregroundStyle(WHITE), minimumScaleFactor(0.6)]}>{r ? r.name : 'القرآن الكريم'}</Text>
      {r ? <Text modifiers={[font({ size: 13 }), foregroundStyle(MUTED)]}>{`${data.text.ayah} ${r.ayah}`}</Text> : <Spacer />}
      <Spacer />
      {r ? <ProgressView value={r.percent / 100} modifiers={[tint(GOLD)]} /> : <Spacer />}
    </VStack>
  );
};

export default createWidget('ContinueReading', ContinueReading);
