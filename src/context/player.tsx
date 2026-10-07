import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { audioUrl } from '@/lib/quran';
import { useSettings } from '@/context/settings';
import { useLibrary } from '@/context/library';

export interface Playing {
  surah: number;
  ayah: number;
  reciter: string;
}

export type RepeatMode = 'off' | 'ayah';

interface PlayerContextValue {
  /** The ayah the player is loaded with (null = player closed). */
  playing: Playing | null;
  /** True while audio is actually playing; false when paused or finished. */
  isPlaying: boolean;
  loading: boolean;
  failed: boolean;
  time: number;
  duration: number;
  repeat: RepeatMode;
  /** Number of ayahs in the surah being read, so "next" knows where to stop. */
  setSurahLength: (n: number) => void;
  play: (surah: number, ayah: number, reciter?: string) => void;
  toggle: () => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  /** Switch the reciter for the loaded ayah (restarts it with the new voice). */
  changeReciter: (reciter: string) => void;
  toggleRepeat: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const { markRead } = useLibrary();
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const surahLength = useRef(0);

  // The audio listeners are registered once, so they read the latest values from a ref.
  const live = useRef({ playing, continuous: settings.continuous, speed: settings.speed, repeat });
  live.current = { playing, continuous: settings.continuous, speed: settings.speed, repeat };

  const play = useCallback(
    (surah: number, ayah: number, reciter = settings.reciter) => {
      const el = audio.current;
      if (!el) return;
      setFailed(false);
      setLoading(true);
      setTime(0);
      setDuration(0);
      el.src = audioUrl(reciter, surah, ayah);
      el.playbackRate = live.current.speed;
      el.play().catch(() => { setFailed(true); setLoading(false); setIsPlaying(false); });
      setPlaying({ surah, ayah, reciter });
      markRead(surah, ayah);
    },
    [settings.reciter, markRead],
  );
  const playRef = useRef(play);
  playRef.current = play;

  const stop = useCallback(() => {
    audio.current?.pause();
    setPlaying(null);
    setIsPlaying(false);
    setLoading(false);
    setTime(0);
    setDuration(0);
  }, []);

  const next = useCallback(() => {
    const p = live.current.playing;
    if (p && p.ayah < surahLength.current) playRef.current(p.surah, p.ayah + 1, p.reciter);
  }, []);

  const previous = useCallback(() => {
    const p = live.current.playing;
    const el = audio.current;
    if (!p || !el) return;
    // Like most players: past the first seconds, "previous" restarts the current ayah.
    if (el.currentTime > 3 || p.ayah <= 1) { el.currentTime = 0; void el.play().catch(() => {}); }
    else playRef.current(p.surah, p.ayah - 1, p.reciter);
  }, []);

  const toggle = useCallback(() => {
    const el = audio.current;
    if (!el || !live.current.playing) return;
    if (!el.paused) { el.pause(); return; }
    if (el.ended) el.currentTime = 0;
    el.play().catch(() => setFailed(true));
  }, []);

  const seek = useCallback((seconds: number) => {
    const el = audio.current;
    if (!el) return;
    el.currentTime = seconds;
    setTime(seconds);
  }, []);

  const changeReciter = useCallback((reciter: string) => {
    const p = live.current.playing;
    if (p) playRef.current(p.surah, p.ayah, reciter);
  }, []);

  const toggleRepeat = useCallback(() => setRepeat(r => (r === 'off' ? 'ayah' : 'off')), []);

  useEffect(() => {
    const el = new Audio();
    audio.current = el;
    const onEnded = () => {
      const { repeat: rep, continuous } = live.current;
      if (rep === 'ayah') { el.currentTime = 0; void el.play().catch(() => {}); return; }
      const p = live.current.playing;
      if (continuous && p && p.ayah < surahLength.current) next();
      else setIsPlaying(false);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onPlaying = () => { setLoading(false); setIsPlaying(true); };
    const onWaiting = () => setLoading(true);
    const onTime = () => setTime(el.currentTime);
    const onMeta = () => setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    const onError = () => { setFailed(true); setLoading(false); setIsPlaying(false); };
    const events: [string, () => void][] = [
      ['ended', onEnded], ['play', onPlay], ['pause', onPause], ['playing', onPlaying], ['waiting', onWaiting],
      ['timeupdate', onTime], ['loadedmetadata', onMeta], ['durationchange', onMeta], ['error', onError],
    ];
    events.forEach(([n, h]) => el.addEventListener(n, h));
    return () => { events.forEach(([n, h]) => el.removeEventListener(n, h)); el.pause(); };
  }, [next]);

  useEffect(() => { if (audio.current) audio.current.playbackRate = settings.speed; }, [settings.speed]);

  const setSurahLength = useCallback((n: number) => { surahLength.current = n; }, []);

  const value = useMemo(
    () => ({ playing, isPlaying, loading, failed, time, duration, repeat, setSurahLength, play, toggle, stop, next, previous, seek, changeReciter, toggleRepeat }),
    [playing, isPlaying, loading, failed, time, duration, repeat, setSurahLength, play, toggle, stop, next, previous, seek, changeReciter, toggleRepeat],
  );
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return ctx;
}
