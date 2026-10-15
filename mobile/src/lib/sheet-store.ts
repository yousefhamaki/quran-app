import { useEffect, useSyncExternalStore } from 'react';

/**
 * Counts the bottom sheets that are open right now. The bottom navigation hides while one is open
 * (it is drawn above the sheet's backdrop and would cover the sheet's last row).
 */
let open = 0;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach(l => l());

/** Call from a sheet: registers it as open for as long as `active` is true. */
export function useRegisterSheet(active: boolean) {
  useEffect(() => {
    if (!active) return;
    open += 1;
    emit();
    return () => { open -= 1; emit(); };
  }, [active]);
}

export function useAnySheetOpen(): boolean {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => open > 0,
    () => false,
  );
}
