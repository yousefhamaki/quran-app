import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Tiny key-value store with the same sync API the web app uses (loadJSON / saveJSON).
 * Everything under the `quran.` prefix is read into memory once at startup (initStorage),
 * so the rest of the app can read synchronously; writes go to memory and to AsyncStorage.
 */
const memory = new Map<string, string>();

export async function initStorage() {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith('quran.'));
    const pairs = await AsyncStorage.multiGet(keys);
    for (const [key, value] of pairs) if (value != null) memory.set(key, value);
  } catch {
    /* start with defaults */
  }
}

export function loadJSON<T>(key: string, fallback: T): T {
  const raw = memory.get(key);
  if (raw === undefined) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown) {
  const raw = JSON.stringify(value);
  memory.set(key, raw);
  AsyncStorage.setItem(key, raw).catch(() => {});
}

export function removeKey(key: string) {
  memory.delete(key);
  AsyncStorage.removeItem(key).catch(() => {});
}

// The auth token is kept as a plain string (not JSON).
export const loadString = (key: string): string | null => memory.get(key) ?? null;
export function saveString(key: string, value: string | null) {
  if (value === null) removeKey(key);
  else {
    memory.set(key, value);
    AsyncStorage.setItem(key, value).catch(() => {});
  }
}
