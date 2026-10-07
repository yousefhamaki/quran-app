import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';

type Kind = 'success' | 'error' | 'info';

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Minimal toast (the sonner of the mobile app): one message at the top, auto-dismisses. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ id: number; kind: Kind; message: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);

  const show = useCallback((kind: Kind, message: string) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: ++counter.current, kind, message });
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({ success: m => show('success', m), error: m => show('error', m), info: m => show('info', m) }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && (
        <View pointerEvents="none" style={{ top: insets.top + 8 }} className="absolute inset-x-0 z-50 items-center px-4">
          <Animated.View
            key={toast.id}
            entering={FadeInUp.duration(180)}
            exiting={FadeOutUp.duration(160)}
            accessibilityLiveRegion="polite"
            className={
              'max-w-md rounded-2xl border px-4 py-3 shadow-lg ' +
              (toast.kind === 'error' ? 'border-destructive bg-card' : 'border-border bg-card')
            }
          >
            <Text className={toast.kind === 'error' ? 'text-destructive' : toast.kind === 'success' ? 'text-primary' : ''}>{toast.message}</Text>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
