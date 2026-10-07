import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import NetInfo from '@react-native-community/netinfo';
import { RECITERS, audioUrl, type Surah } from '@/lib/quran';
import { localAudioUri, resolveNextSurah } from '@/lib/offline';
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
  sleep: Sleep | null;
  sleepLeft: number | null;
  setSleep: (option: { kind: 'time'; minutes: number } | { kind: 'surah' } | null) => void;
  /** Bumps whenever playback rolls over into the next surah by itself, so the UI can follow. */
  autoSurah: { surah: number; n: number } | null;
  /** Surah list: ayah counts (for rolling over) and names (for the lock screen). */
  setSurahData: (surahs: Surah[]) => void;
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
  const player = useRef<AudioPlayer | null>(null);
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pass, setPass] = useState(1);
  const passRef = useRef(1);
  const surahs = useRef<Surah[]>([]);
  const online = useRef(true);
  const endedHandled = useRef(false);
  const usedFallback = useRef(false);

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

  // Listeners are registered once, so they read the latest values from a ref.
  const live = useRef({ playing, continuous: settings.continuous, speed: settings.speed, repeatTimes, gap: gapSeconds, autoNext: autoNextSurah, reciter: settings.reciter });
  live.current = { playing, continuous: settings.continuous, speed: settings.speed, repeatTimes, gap: gapSeconds, autoNext: autoNextSurah, reciter: settings.reciter };

  const surahLength = (n: number) => surahs.current[n - 1]?.numberOfAyahs ?? 0;

  const updateLockScreen = useCallback((p: Playing) => {
    const s = surahs.current[p.surah - 1];
    const r = RECITERS.find(x => x.id === p.reciter);
    const ar = settings.lang === 'ar';
    try {
      player.current?.setActiveForLockScreen(true, {
        title: `${s ? (ar ? s.name : s.englishName) : `Surah ${p.surah}`} · ${p.ayah}`,
        artist: r ? (ar ? r.ar : r.en) : '',
        albumTitle: ar ? 'القرآن الكريم' : 'Holy Quran',
      });
    } catch {
      /* lock screen controls are best effort */
    }
  }, [settings.lang]);

  const play = useCallback(
    (surah: number, ayah: number, reciter = live.current.reciter) => {
      const p = player.current;
      if (!p) return;
      setFailed(false);
      endedHandled.current = false;
      usedFallback.current = false;
      passRef.current = 1;
      setPass(1);
      setGapLeft(null);
      setLoading(true);
      setTime(0);
      setDuration(0);
      // Saved on this device? Play the file; otherwise stream.
      p.replace({ uri: localAudioUri(reciter, surah, ayah) ?? audioUrl(reciter, surah, ayah) });
      p.volume = 1;
      p.setPlaybackRate(live.current.speed);
      p.play();
      const now = { surah, ayah, reciter };
      setPlaying(now);
      updateLockScreen(now);
      markRead(surah, ayah);
    },
    [markRead, updateLockScreen],
  );
  const playRef = useRef(play);
  playRef.current = play;

  const stop = useCallback(() => {
    const p = player.current;
    if (p) {
      p.pause();
      p.volume = 1;
      try { p.setActiveForLockScreen(false); } catch { /* ignore */ }
    }
    setSleepState(null);
    setSleepLeft(null);
    setGapLeft(null);
    setPlaying(null);
    setIsPlaying(false);
    setLoading(false);
    setTime(0);
    setDuration(0);
  }, []);
  const stopRef = useRef(stop);
  stopRef.current = stop;

  const next = useCallback(() => {
    const p = live.current.playing;
    if (p && p.ayah < surahLength(p.surah)) playRef.current(p.surah, p.ayah + 1, p.reciter);
  }, []);

  const previous = useCallback(() => {
    const cur = live.current.playing;
    const p = player.current;
    if (!cur || !p) return;
    setGapLeft(null);
    // Like most players: past the first seconds, "previous" restarts the current ayah.
    if (p.currentTime > 3 || cur.ayah <= 1) { void p.seekTo(0); p.play(); }
    else playRef.current(cur.surah, cur.ayah - 1, cur.reciter);
  }, []);

  const gapRef = useRef(false);
  gapRef.current = gapLeft !== null;

  const toggle = useCallback(() => {
    const p = player.current;
    if (!p || !live.current.playing) return;
    if (gapRef.current) { setGapPaused(v => !v); return; } // pause / resume the countdown
    if (p.playing) { p.pause(); return; }
    if (endedHandled.current) { endedHandled.current = false; void p.seekTo(0); }
    p.play();
  }, []);

  const seek = useCallback((seconds: number) => {
    const p = player.current;
    if (!p) return;
    setGapLeft(null);
    void p.seekTo(seconds);
    setTime(seconds);
  }, []);

  const changeReciter = useCallback((reciter: string) => {
    const cur = live.current.playing;
    if (cur) playRef.current(cur.surah, cur.ayah, reciter);
  }, []);

  const runActionRef = useRef<(kind: Action) => void>(() => {});

  // ---- audio engine ----
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => {});
    const p = createAudioPlayer(null, { updateInterval: 250 });
    player.current = p;

    const schedule = (kind: Action) => {
      const gap = live.current.gap;
      if (gap <= 0) { runAction(kind); return; }
      pendingAction.current = kind;
      setGapPaused(false);
      setGapTotal(gap);
      setGapLeft(gap);
    };

    const runAction = (kind: Action) => {
      const cur = live.current.playing;
      if (kind === 'nextSurah') {
        // Re-check at the moment of switching: the connection may have changed during the pause.
        const nextSurah = cur ? resolveNextSurah(cur.surah, cur.reciter, online.current) ?? 0 : 0;
        if (!cur || !nextSurah || !surahLength(nextSurah)) { setIsPlaying(false); return; }
        playRef.current(nextSurah, 1, cur.reciter);
        setAutoSurah(prev => ({ surah: nextSurah, n: (prev?.n ?? 0) + 1 }));
      } else if (kind === 'repeat') {
        passRef.current += 1;
        setPass(passRef.current);
        endedHandled.current = false;
        void p.seekTo(0);
        p.play();
      } else if (cur && cur.ayah < surahLength(cur.surah)) {
        playRef.current(cur.surah, cur.ayah + 1, cur.reciter);
      }
    };
    runActionRef.current = runAction;

    const onEnded = () => {
      const { repeatTimes: times, continuous, playing: cur, autoNext } = live.current;
      if (!cur) return;
      // times: 1 = once, N = N plays in total, 0 = forever.
      if (times === 0 || passRef.current < times) schedule('repeat');
      else if (continuous && cur.ayah < surahLength(cur.surah)) schedule('next');
      else if (cur.ayah >= surahLength(cur.surah)) {
        // Last ayah of the surah is done.
        if (sleepRef.current?.kind === 'surah') stopRef.current();
        else if (continuous && autoNext && resolveNextSurah(cur.surah, cur.reciter, online.current) !== null) schedule('nextSurah');
        else setIsPlaying(false);
      } else setIsPlaying(false);
    };

    const onStatus = (status: AudioStatus) => {
      setTime(status.currentTime);
      if (status.duration > 0) setDuration(status.duration);
      setIsPlaying(status.playing);
      if (status.playing) setLoading(false);
      else if (status.isBuffering) setLoading(true);

      if (status.error) {
        // A saved file that can't be read (e.g. cleared by the OS): fall back to streaming once.
        const cur = live.current.playing;
        if (cur && !usedFallback.current) {
          usedFallback.current = true;
          p.replace({ uri: audioUrl(cur.reciter, cur.surah, cur.ayah) });
          p.play();
          return;
        }
        setFailed(true);
        setLoading(false);
        return;
      }
      if (status.didJustFinish && !endedHandled.current) {
        endedHandled.current = true;
        onEnded();
      }
    };

    const sub = p.addListener('playbackStatusUpdate', onStatus);
    const net = NetInfo.addEventListener(state => {
      online.current = !!state.isConnected && state.isInternetReachable !== false;
    });
    return () => {
      sub.remove();
      net();
      try { p.setActiveForLockScreen(false); } catch { /* ignore */ }
      p.remove();
      player.current = null;
    };
  }, []);

  useEffect(() => { player.current?.setPlaybackRate(settings.speed); }, [settings.speed]);

  // ---- pause between ayahs ----
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

  // ---- sleep timer (wall-clock based; fades out over the last 5 s) ----
  const setSleep = useCallback((option: { kind: 'time'; minutes: number } | { kind: 'surah' } | null) => {
    if (!option) { setSleepState(null); setSleepLeft(null); if (player.current) player.current.volume = 1; return; }
    if (option.kind === 'time') {
      setSleepState({ kind: 'time', minutes: option.minutes, endsAt: Date.now() + option.minutes * 60_000 });
      setSleepLeft(option.minutes * 60);
    } else {
      setSleepState({ kind: 'surah' });
      setSleepLeft(null);
    }
  }, []);

  useEffect(() => {
    if (sleep?.kind !== 'time') return;
    const tick = () => {
      const left = Math.ceil((sleep.endsAt - Date.now()) / 1000);
      if (left <= 0) { stopRef.current(); return; }
      setSleepLeft(left);
      if (player.current) player.current.volume = left <= 5 ? Math.max(0.05, left / 5) : 1;
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [sleep]);

  const setSurahData = useCallback((list: Surah[]) => { surahs.current = list; }, []);

  const value = useMemo(
    () => ({
      playing, isPlaying, loading, failed, time, duration, pass, gapLeft, gapTotal, gapPaused, sleep, sleepLeft, setSleep, autoSurah,
      setSurahData, play, toggle, stop, next, previous, seek, changeReciter,
    }),
    [playing, isPlaying, loading, failed, time, duration, pass, gapLeft, gapTotal, gapPaused, sleep, sleepLeft, setSleep, autoSurah, setSurahData, play, toggle, stop, next, previous, seek, changeReciter],
  );
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return ctx;
}
