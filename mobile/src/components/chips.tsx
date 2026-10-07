import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

interface Option<T extends string | number> {
  value: T;
  label: string;
}

interface Props<T extends string | number> {
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

/** Single-choice pill group (wraps onto several lines). Built from the shadcn Button variants. */
export function Chips<T extends string | number>({ options, value, onChange, label, className }: Props<T>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} className={cn('flex-row flex-wrap gap-2', className)}>
      {options.map(o => {
        const selected = o.value === value;
        return (
          <Button
            key={String(o.value)}
            variant={selected ? 'default' : 'outline'}
            className="h-11 rounded-full px-4"
            onPress={() => onChange(o.value)}
            role="radio"
            aria-checked={selected}
            accessibilityState={{ selected }}
          >
            <Text className="text-sm">{o.label}</Text>
          </Button>
        );
      })}
    </View>
  );
}
