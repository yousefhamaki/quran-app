import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import {
  AudioModule, RecordingPresets, createAudioPlayer, setAudioModeAsync, useAudioRecorder, type AudioPlayer,
} from 'expo-audio';
import { Mic, Play, Repeat, Square } from 'lucide-react-native';
import { Sheet } from '@/components/sheet';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { AYAH_FALLBACK_RECITER, audioUrl, isSurahReciter } from '@/lib/quran';
import { useSettings } from '@/context/settings';
import { useSurahs } from '@/context/surahs';
import { useUI } from '@/context/ui';

type Phase = 'idle' | 'recording' | 'ready' | 'denied';

/** Record yourself reciting an ayah, play it back, or hear the reciter first and then yourself. Recordings are not uploaded. */
export function RecordSheet() {
  const { record: target, setRecord } = useUI();
  const { settings, t, isRTL } = useSettings();
  const { byNumber } = useSurahs();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [phase, setPhase] = useState<Phase>('idle');
  const [uri, setUri] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const player = useRef<AudioPlayer | null>(null);

  const stopPlayer = () => {
    try { player.current?.remove(); } catch { /* already released */ }
    player.current = null;
  };

  // A new ayah (or closing the sheet) discards the take.
  useEffect(() => {
    stopPlayer();
    setUri(null);
    setSeconds(0);
    setPhase('idle');
    if (recorder.isRecording) void recorder.stop().catch(() => {});
    return stopPlayer;
  }, [target?.surah, target?.ayah]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'recording') return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  if (!target) return null;
  const s = byNumber(target.surah);
  const reciter = isSurahReciter(settings.reciter) ? AYAH_FALLBACK_RECITER : settings.reciter;
  const reciterSrc = audioUrl(reciter, target.surah, target.ayah);
  const fmt = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;

  const start = async () => {
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) { setPhase('denied'); return; }
    try {
      stopPlayer();
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setSeconds(0);
      setPhase('recording');
    } catch {
      setPhase('denied');
    }
  };

  const stop = async () => {
    try { await recorder.stop(); } catch { /* nothing recorded */ }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    setUri(recorder.uri);
    setPhase(recorder.uri ? 'ready' : 'idle');
  };

  const play = (src: string | null, then?: () => void) => {
    if (!src) return;
    stopPlayer();
    const p = createAudioPlayer({ uri: src });
    player.current = p;
    if (then) {
      const sub = p.addListener('playbackStatusUpdate', status => {
        if (status.didJustFinish) { sub.remove(); then(); }
      });
    }
    p.play();
  };

  return (
    <Sheet open onClose={() => { stopPlayer(); if (recorder.isRecording) void recorder.stop().catch(() => {}); setRecord(null); }} title={t('recordTitle')} description={`${s ? (isRTL ? s.name : s.englishName) : ''} · ${t('ayah')} ${target.ayah}`}>
      <View className="gap-4 pb-8">
        <Text className="text-sm text-muted-foreground">{t('recordHint')}</Text>
        {phase === 'denied' ? <Text accessibilityRole="alert" className="rounded-2xl bg-muted p-4 text-sm text-destructive">{t('recordDenied')}</Text> : null}

        {phase === 'idle' || phase === 'denied' ? (
          <Button size="lg" className="h-14 rounded-2xl" onPress={() => void start()}>
            <Icon as={Mic} className="size-5 text-primary-foreground" />
            <Text className="text-base">{t('recordStart')}</Text>
          </Button>
        ) : null}

        {phase === 'recording' ? (
          <View className="gap-3">
            <Text accessibilityLiveRegion="polite" className="text-center text-3xl font-semibold text-destructive" style={{ lineHeight: 44, paddingVertical: 3 }}>● {fmt(seconds)}</Text>
            <Button variant="destructive" size="lg" className="h-14 rounded-2xl" onPress={() => void stop()}>
              <Icon as={Square} className="size-5 fill-white text-white" />
              <Text className="text-base text-white">{t('recordStop')}</Text>
            </Button>
          </View>
        ) : null}

        {phase === 'ready' && uri ? (
          <View className="gap-3">
            <Button className="h-12 rounded-xl" onPress={() => play(reciterSrc, () => play(uri))}>
              <Icon as={Repeat} className="size-5 text-primary-foreground" />
              <Text>{t('recordCompare')}</Text>
            </Button>
            <View className="flex-row gap-3">
              <Button variant="outline" className="h-12 flex-1 rounded-xl" onPress={() => play(uri)}>
                <Icon as={Play} className="size-5" />
                <Text>{t('recordPlayMine')}</Text>
              </Button>
              <Button variant="outline" className="h-12 flex-1 rounded-xl" onPress={() => play(reciterSrc)}>
                <Icon as={Play} className="size-5" />
                <Text>{t('recordPlayReciter')}</Text>
              </Button>
            </View>
            <Button variant="ghost" className="h-11 rounded-xl" onPress={() => { stopPlayer(); setPhase('idle'); }}>
              <Icon as={Mic} className="size-4" />
              <Text>{t('recordAgain')}</Text>
            </Button>
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}
