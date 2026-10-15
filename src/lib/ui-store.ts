import { useSyncExternalStore } from 'react';

/**
 * Tiny shared UI state, so a screen can open a sheet that another component owns (for example
 * "Playback options" on the More screen opens the player sheet that lives in the mini player).
 */
let playerSheet = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export function setPlayerSheet(open: boolean) {
  if (playerSheet === open) return;
  playerSheet = open;
  emit();
}

export interface WordTarget { surah: number; ayah: number; index: number }
let wordTarget: WordTarget | null = null;
export function setWordSheet(target: WordTarget | null) { wordTarget = target; emit(); }
export function useWordSheet(): [WordTarget | null, (t: WordTarget | null) => void] {
  const t = useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => wordTarget, () => null);
  return [t, setWordSheet];
}

export function usePlayerSheet(): [boolean, (open: boolean) => void] {
  const open = useSyncExternalStore(
    cb => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => playerSheet,
    () => false,
  );
  return [open, setPlayerSheet];
}
