import { View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

interface Props {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  /** Also show −10 / +10 buttons (for long ranges such as the 286 ayahs of Al-Baqara). */
  big?: boolean;
}

/** A number picker with − / + buttons (counterpart of a shadcn number input on a touch screen). */
export function Stepper({ value, min, max, onChange, label, big }: Props) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  const step = (delta: number, text: string, disabled: boolean) => (
    <Button variant="outline" className="h-11 min-w-11 rounded-xl px-2" disabled={disabled} onPress={() => set(value + delta)} accessibilityLabel={`${label} ${delta > 0 ? '+' : ''}${delta}`}>
      {Math.abs(delta) === 1 ? <Icon as={delta > 0 ? Plus : Minus} className="size-4" /> : <Text className="text-xs">{text}</Text>}
    </Button>
  );

  return (
    <View accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min, max, now: value }} className="flex-row items-center justify-between gap-1.5 rounded-2xl bg-muted p-1.5" style={{ direction: 'ltr' }}>
      {big && step(-10, '−10', value - 10 < min)}
      {step(-1, '−1', value <= min)}
      <Text className="min-w-12 text-center text-xl font-semibold tabular-nums">{value}</Text>
      {step(1, '+1', value >= max)}
      {big && step(10, '+10', value + 10 > max)}
    </View>
  );
}
