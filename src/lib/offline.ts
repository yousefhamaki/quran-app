/**
 * Offline storage. Text/JSON responses and audio files live in the browser's Cache Storage
 * (needs HTTPS or localhost). A small index in localStorage records what was downloaded on purpose.
 */
import { loadJSON, saveJSON } from '@/lib/storage';

const TEXT_CACHE = 'quran-text-v1';
const AUDIO_CACHE = 'quran-audio-v1';
const INDEX_KEY = 'quran.downloads';

export interface DownloadRecord {
  surah: number;
  reciter: string;
  ayahs: number;
  bytes: number;
  at: number;
}

export const offlineSupported = typeof caches !== 'undefined';

export const getDownloads = (): DownloadRecord[] => loadJSON<DownloadRecord[]>(INDEX_KEY, []);
const saveDownloads = (list: DownloadRecord[]) => saveJSON(INDEX_KEY, list);

export const findDownload = (list: DownloadRecord[], surah: number, reciter: string) =>
  list.find(d => d.surah === surah && d.reciter === reciter) ?? null;

/** Synchronous check used on the play path (the index is in localStorage). */
export const isDownloaded = (surah: number, reciter: string) => findDownload(getDownloads(), surah, reciter) !== null;

/**
 * Network first, cache as fallback. Every successful response is kept, so anything you have
 * opened once can be read again without a connection.
 */
export async function cachedFetch(url: string): Promise<Response> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (offlineSupported) {
      const copy = res.clone();
      void caches.open(TEXT_CACHE).then(c => c.put(url, copy)).catch(() => {});
    }
    return res;
  } catch (error) {
    if (offlineSupported) {
      const cache = await caches.open(TEXT_CACHE).catch(() => null);
      const hit = cache ? await cache.match(url) : undefined;
      if (hit) return hit;
    }
    throw error;
  }
}

/** A blob: URL for a downloaded ayah, or null when it is not stored. The caller revokes it. */
export async function offlineAudioUrl(url: string): Promise<string | null> {
  if (!offlineSupported) return null;
  try {
    const cache = await caches.open(AUDIO_CACHE);
    const hit = await cache.match(url);
    return hit ? URL.createObjectURL(await hit.blob()) : null;
  } catch {
    return null;
  }
}

export interface DownloadJob {
  surah: number;
  reciter: string;
  textUrl: string;
  audioUrls: string[];
  signal: AbortSignal;
  onProgress: (done: number, total: number) => void;
}

const CONCURRENCY = 4;
const RETRIES = 2;

async function fetchWithRetry(url: string, signal: AbortSignal): Promise<Blob> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.blob();
    } catch (error) {
      if (signal.aborted) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

/** Saves the surah text and every ayah's audio. All-or-nothing: a failure or cancel removes the partial files. */
export async function downloadSurah(job: DownloadJob): Promise<DownloadRecord> {
  if (!offlineSupported) throw new Error('Offline storage is not available in this browser');
  const { surah, reciter, textUrl, audioUrls, signal, onProgress } = job;
  const audio = await caches.open(AUDIO_CACHE);
  const stored: string[] = [];
  let bytes = 0;
  let done = 0;

  try {
    await cachedFetch(textUrl); // fills the text cache
    onProgress(0, audioUrls.length);

    const queue = [...audioUrls];
    const worker = async () => {
      for (let url = queue.shift(); url !== undefined; url = queue.shift()) {
        const blob = await fetchWithRetry(url, signal);
        await audio.put(url, new Response(blob, { headers: { 'Content-Type': 'audio/mpeg' } }));
        stored.push(url);
        bytes += blob.size;
        onProgress(++done, audioUrls.length);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, audioUrls.length) }, worker));
  } catch (error) {
    await Promise.all(stored.map(u => audio.delete(u))).catch(() => {});
    throw error;
  }

  // Ask the browser not to evict what the user chose to keep (best effort).
  void navigator.storage?.persist?.().catch(() => {});

  const record: DownloadRecord = { surah, reciter, ayahs: audioUrls.length, bytes, at: Date.now() };
  saveDownloads([...getDownloads().filter(d => !(d.surah === surah && d.reciter === reciter)), record]);
  return record;
}

export async function removeDownload(surah: number, reciter: string, audioUrls: string[]) {
  if (offlineSupported) {
    const audio = await caches.open(AUDIO_CACHE);
    await Promise.all(audioUrls.map(u => audio.delete(u)));
  }
  saveDownloads(getDownloads().filter(d => !(d.surah === surah && d.reciter === reciter)));
}

/**
 * Which surah should follow `current` when "continue to the next surah" is on?
 * - Online: simply the next one in the mushaf (it streams).
 * - Offline: only surahs saved on this device for this reciter can play, so jump to the next saved one
 *   (skipping the ones that aren't downloaded). null = nothing left to play.
 */
export function resolveNextSurah(current: number, reciter: string, online: boolean, downloads: DownloadRecord[] = getDownloads()): number | null {
  if (current >= 114) return null;
  if (online) return current + 1;
  const saved = downloads.filter(d => d.reciter === reciter && d.surah > current).map(d => d.surah);
  return saved.length ? Math.min(...saved) : null;
}

export const isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine);

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

/** Rough size before downloading (≈ 125 KB per ayah at 128 kbps). */
export const estimateBytes = (ayahs: number) => ayahs * 125 * 1024;
