import Slider from '@react-native-community/slider';
import { View } from 'react-native';
import { useCSSVariable } from 'uniwind';

interface Props {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Called when the user lifts their finger (use for expensive work such as seeking). */
  onCommit?: (value: number) => void;
  disabled?: boolean;
  label: string;
}

/** Themed native slider (counterpart of shadcn's <Slider>). Kept LTR so the thumb moves the same way in Arabic. */
export function AppSlider({ value, min, max, step = 1, onChange, onCommit, disabled, label }: Props) {
  const primary = useCSSVariable('--color-primary');
  const track = useCSSVariable('--color-border');
  return (
    <View style={{ direction: 'ltr' }}>
      <Slider
        style={{ height: 44 }}
        value={value}
        minimumValue={min}
        maximumValue={Math.max(max, min + 0.001)}
        step={step}
        disabled={disabled}
        minimumTrackTintColor={String(primary ?? '#0b5d4b')}
        maximumTrackTintColor={String(track ?? '#e4ddcb')}
        thumbTintColor={String(primary ?? '#0b5d4b')}
        onValueChange={onChange}
        onSlidingComplete={onCommit}
        accessibilityLabel={label}
      />
    </View>
  );
}
