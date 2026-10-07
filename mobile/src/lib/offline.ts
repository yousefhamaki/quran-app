/**
 * Offline storage for the mobile app.
 * - JSON responses (surah text, surah list, tafsir you opened) are cached as files so they can be read again offline.
 * - Downloaded audio lives under documentDirectory/quran-audio/<reciter>/<surah>/<ayah>.mp3.
 * - A small index in AsyncStorage records which surahs were downloaded on purpose.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { loadJSON, saveJSON } from '@/lib/storage';

const INDEX_KEY = 'quran.downloads';
const ROOT = FileSystem.documentDirectory; // null on web

export interface DownloadRecord {
  surah: number;
  reciter: string;
  ayahs: number;
  bytes: number;
  at: number;
}

/** Native platforms can store files; the web preview can't. */
export const offlineSupported = Platform.OS !== 'web' && !!ROOT;

export const getDownloads = (): DownloadRecord[] => loadJSON<DownloadRecord[]>(INDEX_KEY, []);
const saveDownloads = (list: DownloadRecord[]) => saveJSON(INDEX_KEY, list);

export const isDownloaded = (surah: number, reciter: string) =>
  getDownloads().some(d => d.surah === surah && d.reciter === reciter);

// ---------- JSON cache (network first, file as fallback) ----------

function hash(text: string) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

const cacheFile = (url: string) => `${ROOT}quran-cache/${hash(url)}.json`;

export async function cachedJson<T>(url: string): Promise<T> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (offlineSupported) {
      void FileSystem.makeDirectoryAsync(`${ROOT}quran-cache/`, { intermediates: true })
        .then(() => FileSystem.writeAsStringAsync(cacheFile(url), text))
        .catch(() => {});
    }
    return JSON.parse(text) as T;
  } catch (error) {
    if (offlineSupported) {
      try {
        return JSON.parse(await FileSystem.readAsStringAsync(cacheFile(url))) as T;
      } catch {
        /* not cached */
      }
    }
    throw error;
  }
}

// ---------- audio downloads ----------

const audioDir = (reciter: string, surah: number) => `${ROOT}quran-audio/${reciter}/${surah}/`;
export const audioFile = (reciter: string, surah: number, ayah: number) => `${audioDir(reciter, surah)}${ayah}.mp3`;

/** file:// URI of a saved ayah, or null when the surah isn't downloaded for this reciter. */
export const localAudioUri = (reciter: string, surah: number, ayah: number): string | null =>
  offlineSupported && isDownloaded(surah, reciter) ? audioFile(reciter, surah, ayah) : null;

export interface DownloadJob {
  surah: number;
  reciter: string;
  /** Remote URL for each ayah, index 0 = ayah 1. */
  audioUrls: string[];
  textUrl: string;
  isCancelled: () => boolean;
  onProgress: (done: number, total: number) => void;
  /** Called with each resumable so the caller can cancel in-flight downloads. */
  track: (task: FileSystem.DownloadResumable) => void;
}

const CONCURRENCY = 3;
const RETRIES = 2;

export async function downloadSurah(job: DownloadJob): Promise<DownloadRecord> {
  if (!offlineSupported) throw new Error('Offline storage is not available here');
  const { surah, reciter, audioUrls, textUrl, onProgress, isCancelled, track } = job;
  const dir = audioDir(reciter, surah);
  let bytes = 0;
  let done = 0;

  const cleanup = () => FileSystem.deleteAsync(dir, { idempotent: true }).catch(() => {});

  try {
    await cachedJson(textUrl); // fills the text cache
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    onProgress(0, audioUrls.length);

    const queue = audioUrls.map((url, i) => ({ url, ayah: i + 1 }));
    const worker = async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
        let lastError: unknown;
        let ok = false;
        for (let attempt = 0; attempt <= RETRIES && !ok; attempt++) {
          if (isCancelled()) throw new Error('cancelled');
          try {
            const task = FileSystem.createDownloadResumable(item.url, audioFile(reciter, surah, item.ayah));
            track(task);
            const result = await task.downloadAsync();
            if (!result || result.status !== 200) throw new Error(`HTTP ${result?.status}`);
            const info = await FileSystem.getInfoAsync(result.uri);
            bytes += info.exists && 'size' in info ? info.size : 0;
            ok = true;
          } catch (error) {
            lastError = error;
            if (isCancelled()) throw new Error('cancelled');
          }
        }
        if (!ok) throw lastError ?? new Error('download failed');
        onProgress(++done, audioUrls.length);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, audioUrls.length) }, worker));
  } catch (error) {
    await cleanup();
    throw error;
  }

  const record: DownloadRecord = { surah, reciter, ayahs: audioUrls.length, bytes, at: Date.now() };
  saveDownloads([...getDownloads().filter(d => !(d.surah === surah && d.reciter === reciter)), record]);
  return record;
}

export async function removeDownload(surah: number, reciter: string) {
  if (offlineSupported) await FileSystem.deleteAsync(audioDir(reciter, surah), { idempotent: true }).catch(() => {});
  saveDownloads(getDownloads().filter(d => !(d.surah === surah && d.reciter === reciter)));
}

/**
 * Which surah should follow `current` when "continue to the next surah" is on?
 * - Online: the next one in the mushaf (it streams).
 * - Offline: only surahs saved on this device for this reciter can play, so jump to the next saved one.
 */
export function resolveNextSurah(current: number, reciter: string, online: boolean, downloads: DownloadRecord[] = getDownloads()): number | null {
  if (current >= 114) return null;
  if (online) return current + 1;
  const saved = downloads.filter(d => d.reciter === reciter && d.surah > current).map(d => d.surah);
  return saved.length ? Math.min(...saved) : null;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

/** Rough size before downloading (≈ 125 KB per ayah at 128 kbps). */
export const estimateBytes = (ayahs: number) => ayahs * 125 * 1024;
