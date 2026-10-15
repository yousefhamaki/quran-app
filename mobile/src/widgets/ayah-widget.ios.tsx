import { Text, VStack } from '@expo/ui/swift-ui';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export interface AyahWidgetProps {
  ar: string;
  label: string;
}

/** "Ayah of the day" for the iOS home screen (WidgetKit). Runs in an isolated runtime: no imports or outside values. */
const AyahWidget = (props: AyahWidgetProps, _environment: WidgetEnvironment) => {
  'widget';
  return (
    <VStack>
      <Text>{props.ar}</Text>
      <Text>{props.label}</Text>
    </VStack>
  );
};

export default createWidget('AyahOfDay', AyahWidget);
