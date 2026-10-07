import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-4 py-4">
      <Text className="font-display text-xl">{title}</Text>
      {children}
    </View>
  );
}

export function Field({ label, value, children, hint }: { label: string; value?: string; children: ReactNode; hint?: string }) {
  return (
    <View className="gap-2.5">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-sm font-medium">{label}</Text>
        {value ? <Text className="text-sm font-medium text-primary">{value}</Text> : null}
      </View>
      {children}
      {hint ? <Text className="text-xs text-muted-foreground">{hint}</Text> : null}
    </View>
  );
}
