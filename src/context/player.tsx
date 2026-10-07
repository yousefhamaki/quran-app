import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { audioUrl } from '@/lib/quran';
import { isDownloaded, isOnline, offlineAudioUrl, resolveNextSurah } from '@/lib/offline';
import { useSettings } from '@/context/settings';
import { useLibrary } from '@/context/library';

export type Sleep = { kind: 'time'; minutes: number; endsAt: number } | { kind: 'surah' };
type Action = 'next' | 'repeat' | 'nextSurah';

export interface Playing {
  surah: number;
  ayah: number;
  reciter: string;
}

interface PlayerContextValue {
  /** The ayah the player is loaded with (null = player closed). */
  playing: Playing | null;
  /** True while audio is actually playing; false when paused or finished. */
  isPlaying: boolean;
  loading: boolean;
  failed: boolean;
  time: number;
  duration: number;
  /** Which pass of the current ayah is playing (1 = first). */
  pass: number;
  /** Seconds left in the pause between ayahs, or null when not in a pause. */
  gapLeft: number | null;
  gapTotal: number;
  gapPaused: boolean;
  /** Active sleep timer, if any. */
  sleep: Sleep | null;
  /** Seconds until a time-based sleep timer fires. */
  sleepLeft: number | null;
  setSleep: (option: { kind: 'time'; minutes: number } | { kind: 'surah' } | null) => void;
  /** Bumps whenever playback rolls over into the next surah by itself, so the UI can follow. */
  autoSurah: { surah: number; n: number } | null;
  /** Ayah counts of all 114 surahs, needed to roll over to the next surah. */
  setSurahCounts: (counts: number[]) => void;
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
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { settings, gapSeconds, repeatTimes, autoNextSurah } = useSettings();
  const { markRead } = useLibrary();
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pass, setPass] = useState(1);
  const passRef = useRef(1);
  const surahLength = useRef(0);
  const playToken = useRef(0); // guards against a slow offline lookup finishing after a newer play()
  const blobUrl = useRef<string | null>(null);

  // Pause between ayahs ("your turn" to repeat). gapLeft counts down in seconds.
  const [gapLeft, setGapLeft] = useState<number | null>(null);
  const [gapTotal, setGapTotal] = useState(0);
  const [gapPaused, setGapPaused] = useState(false);
  const pendingAction = useRef<Action>('next');

  // Sleep timer + rolling over into the next surah.
  const [sleep, setSleepState] = useState<Sleep | null>(null);
  const [sleepLeft, setSleepLeft] = useState<number | null>(null);
  const sleepRef = useRef<Sleep | null>(null);
  sleepRef.current = sleep;
  const [autoSurah, setAutoSurah] = useState<{ surah: number; n: number } | null>(null);
  const surahCounts = useRef<number[]>([]);
  const autoNextRef = useRef(autoNextSurah);
  autoNextRef.current = autoNextSurah;

  // The audio listeners are registered once, so they read the latest values from a ref.
  const live = useRef({ playing, continuous: settings.continuous, speed: settings.speed, repeatTimes, gap: gapSeconds });
  live.current = { playing, continuous: settings.continuous, speed: settings.speed, repeatTimes, gap: gapSeconds };

  const play = useCallback(
    (surah: number, ayah: number, reciter = settings.reciter) => {
      const el = audio.current;
      if (!el) return;
      setFailed(false);
      passRef.current = 1;
      setPass(1);
      setGapLeft(null);
      setLoading(true);
      setTime(0);
      setDuration(0);
      const begin = (src: string) => {
        const previous = blobUrl.current;
        blobUrl.current = src.startsWith('blob:') ? src : null;
        el.src = src;
        if (previous) URL.revokeObjectURL(previous);
        el.playbackRate = live.current.speed;
        el.play().catch(() => { setFailed(true); setLoading(false); setIsPlaying(false); });
      };
      const network = audioUrl(reciter, surah, ayah);
      const token = ++playToken.current;
      if (isDownloaded(surah, reciter)) {
        // Saved on this device: play from storage (falls back to the network if it was evicted).
        void offlineAudioUrl(network).then(local => {
          if (token !== playToken.current) { if (local) URL.revokeObjectURL(local); return; }
          begin(local ?? network);
        });
      } else begin(network);
      setPlaying({ surah, ayah, reciter });
      markRead(surah, ayah);
    },
    [settings.reciter, markRead],
  );
  const playRef = useRef(play);
  playRef.current = play;

  const stop = useCallback(() => {
    playToken.current += 1;
    if (audio.current) { audio.current.pause(); audio.current.volume = 1; }
    setSleepState(null);
    setSleepLeft(null);
    setGapLeft(null);
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
    setGapLeft(null);
    // Like most players: past the first seconds, "previous" restarts the current ayah.
    if (el.currentTime > 3 || p.ayah <= 1) { el.currentTime = 0; void el.play().catch(() => {}); }
    else playRef.current(p.surah, p.ayah - 1, p.reciter);
  }, []);

  const toggle = useCallback(() => {
    const el = audio.current;
    if (!el || !live.current.playing) return;
    if (gapRef.current) { setGapPaused(v => !v); return; } // pause / resume the countdown
    if (!el.paused) { el.pause(); return; }
    if (el.ended) el.currentTime = 0;
    el.play().catch(() => setFailed(true));
  }, []);

  const seek = useCallback((seconds: number) => {
    const el = audio.current;
    if (!el) return;
    setGapLeft(null);
    el.currentTime = seconds;
    setTime(seconds);
  }, []);

  const changeReciter = useCallback((reciter: string) => {
    const p = live.current.playing;
    if (p) playRef.current(p.surah, p.ayah, reciter);
  }, []);


  useEffect(() => {
    const el = new Audio();
    audio.current = el;
    const schedule = (kind: Action) => {
      const gap = live.current.gap;
      if (gap <= 0) { runAction(kind); return; }
      pendingAction.current = kind;
      setGapPaused(false);
      setGapTotal(gap);
      setGapLeft(gap);
    };
    const onEnded = () => {
      const { repeatTimes: times, continuous, playing: p } = live.current;
      // times: 1 = once, N = N plays in total, 0 = forever.
      if (times === 0 || passRef.current < times) schedule('repeat');
      else if (continuous && p && p.ayah < surahLength.current) schedule('next');
      else if (p && p.ayah >= surahLength.current) {
        // Last ayah of the surah is done.
        if (sleepRef.current?.kind === 'surah') stopRef.current();
        else if (continuous && autoNextRef.current && resolveNextSurah(p.surah, p.reciter, isOnline()) !== null) schedule('nextSurah');
        else setIsPlaying(false);
      } else setIsPlaying(false);
    };
    const runAction = (kind: Action) => {
      if (kind === 'nextSurah') {
        const p = live.current.playing;
        // Re-check at the moment of switching: the connection may have changed during the pause.
        const nextSurah = p ? resolveNextSurah(p.surah, p.reciter, isOnline()) ?? 0 : 0;
        const length = surahCounts.current[nextSurah - 1];
        if (!p || !nextSurah || !length) { setIsPlaying(false); return; }
        surahLength.current = length;
        playRef.current(nextSurah, 1, p.reciter);
        setAutoSurah(prev => ({ surah: nextSurah, n: (prev?.n ?? 0) + 1 }));
      } else if (kind === 'repeat') {
        passRef.current += 1;
        setPass(passRef.current);
        el.currentTime = 0;
        void el.play().catch(() => {});
      } else next();
    };
    runActionRef.current = runAction;
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

  const gapRef = useRef(false);
  gapRef.current = gapLeft !== null;
  const runActionRef = useRef<(kind: Action) => void>(() => {});
  const stopRef = useRef(stop);
  stopRef.current = stop;

  const setSleep = useCallback((option: { kind: 'time'; minutes: number } | { kind: 'surah' } | null) => {
    if (!option) { setSleepState(null); setSleepLeft(null); if (audio.current) audio.current.volume = 1; return; }
    if (option.kind === 'time') {
      setSleepState({ kind: 'time', minutes: option.minutes, endsAt: Date.now() + option.minutes * 60_000 });
      setSleepLeft(option.minutes * 60);
    } else {
      setSleepState({ kind: 'surah' });
      setSleepLeft(null);
    }
  }, []);

  // Wall-clock based so background-tab throttling can't stretch the timer. Fades out over the last 5 s.
  useEffect(() => {
    if (sleep?.kind !== 'time') return;
    const tick = () => {
      const left = Math.ceil((sleep.endsAt - Date.now()) / 1000);
      if (left <= 0) { stopRef.current(); return; }
      setSleepLeft(left);
      if (audio.current) audio.current.volume = left <= 5 ? Math.max(0.05, left / 5) : 1;
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [sleep]);

  const setSurahCounts = useCallback((counts: number[]) => { surahCounts.current = counts; }, []);

  const gapActive = gapLeft !== null;
  useEffect(() => {
    if (!gapActive || gapPaused) return;
    const id = setInterval(() => setGapLeft(l => (l === null ? null : Math.max(0, l - 0.1))), 100);
    return () => clearInterval(id);
  }, [gapActive, gapPaused]);

  useEffect(() => {
    if (gapLeft !== null && gapLeft <= 0) {
      setGapLeft(null);
      runActionRef.current(pendingAction.current);
    }
  }, [gapLeft]);

  const setSurahLength = useCallback((n: number) => { surahLength.current = n; }, []);

  const value = useMemo(
    () => ({ playing, isPlaying, loading, failed, time, duration, pass, gapLeft, gapTotal, gapPaused, sleep, sleepLeft, setSleep, autoSurah, setSurahCounts, setSurahLength, play, toggle, stop, next, previous, seek, changeReciter }),
    [playing, isPlaying, loading, failed, time, duration, pass, gapLeft, gapTotal, gapPaused, sleep, sleepLeft, setSleep, autoSurah, setSurahCounts, setSurahLength, play, toggle, stop, next, previous, seek, changeReciter],
  );
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return ctx;
}
