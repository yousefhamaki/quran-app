import { useEffect, useRef, useState } from 'react';
import { Mic, Play, Repeat, Square } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { audioUrl, isSurahReciter, AYAH_FALLBACK_RECITER } from '@/lib/quran';
import { setRecordSheet, useRecordSheet } from '@/lib/ui-store';
import { useSettings } from '@/context/settings';

type Phase = 'idle' | 'recording' | 'ready' | 'denied' | 'unsupported';

/** Record yourself reciting an ayah, play it back, or hear the reciter first and then yourself. The recording stays on the device only for this session. */
export function RecordSheet({ surahName }: { surahName: (n: number) => string }) {
  const { settings, t } = useSettings();
  const [target] = useRecordSheet();
  const [phase, setPhase] = useState<Phase>('idle');
  const [url, setUrl] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const timer = useRef<number | null>(null);

  const stopAudio = () => { audio.current?.pause(); audio.current = null; };
  const release = () => {
    if (timer.current) window.clearInterval(timer.current);
    stream.current?.getTracks().forEach(tr => tr.stop());
    stream.current = null;
  };
  // A new ayah or closing the sheet discards the take.
  useEffect(() => {
    return () => { stopAudio(); release(); };
  }, []);
  useEffect(() => {
    stopAudio();
    release();
    setUrl(old => { if (old) URL.revokeObjectURL(old); return null; });
    setPhase(typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia ? 'unsupported' : 'idle');
    setSeconds(0);
  }, [target?.surah, target?.ayah]);

  const start = async () => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = media;
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(media);
      recorder.current = rec;
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        setUrl(old => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
        setPhase('ready');
        release();
      };
      rec.start();
      setSeconds(0);
      timer.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
      setPhase('recording');
    } catch {
      setPhase('denied');
    }
  };
  const stop = () => recorder.current?.state === 'recording' && recorder.current.stop();

  const play = (src: string | null, then?: () => void) => {
    if (!src) return;
    stopAudio();
    const el = new Audio(src);
    audio.current = el;
    if (then) el.onended = then;
    void el.play().catch(() => {});
  };
  const reciter = isSurahReciter(settings.reciter) ? AYAH_FALLBACK_RECITER : settings.reciter;
  const reciterSrc = target ? audioUrl(reciter, target.surah, target.ayah) : null;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <Sheet open={target !== null} onOpenChange={o => { if (!o) { stopAudio(); stop(); release(); setRecordSheet(null); } }}>
      <SheetContent side="bottom" className="mx-auto max-h-[85dvh] max-w-3xl gap-0 overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>{t('recordTitle')}</SheetTitle>
          <SheetDescription>{target ? `${surahName(target.surah)} · ${t('ayah')} ${target.ayah}` : ''}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-8">
          <p className="text-sm text-muted-foreground">{t('recordHint')}</p>

          {phase === 'unsupported' && <p role="alert" className="rounded-2xl bg-muted p-4 text-sm">{t('recordUnsupported')}</p>}
          {phase === 'denied' && <p role="alert" className="rounded-2xl bg-muted p-4 text-sm text-destructive">{t('recordDenied')}</p>}

          {(phase === 'idle' || phase === 'denied') && (
            <Button className="h-14 w-full gap-2 rounded-2xl text-base" onClick={() => void start()}>
              <Mic className="size-5" aria-hidden /> {t('recordStart')}
            </Button>
          )}

          {phase === 'recording' && (
            <div className="space-y-3 text-center">
              <p aria-live="polite" className="text-3xl font-semibold tabular-nums text-destructive"><span className="me-2 inline-block size-3 animate-pulse rounded-full bg-destructive" aria-hidden />{fmt(seconds)}</p>
              <Button variant="destructive" className="h-14 w-full gap-2 rounded-2xl text-base" onClick={stop}>
                <Square className="size-5 fill-current" aria-hidden /> {t('recordStop')}
              </Button>
            </div>
          )}

          {phase === 'ready' && url && (
            <div className="space-y-3">
              <Button className="h-12 w-full gap-2 rounded-xl" onClick={() => play(reciterSrc, () => play(url))}>
                <Repeat className="size-5" aria-hidden /> {t('recordCompare')}
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-12 gap-2 rounded-xl" onClick={() => play(url)}>
                  <Play className="size-5" aria-hidden /> {t('recordPlayMine')}
                </Button>
                <Button variant="outline" className="h-12 gap-2 rounded-xl" onClick={() => play(reciterSrc)}>
                  <Play className="size-5" aria-hidden /> {t('recordPlayReciter')}
                </Button>
              </div>
              <Button variant="ghost" className="h-11 w-full gap-2 rounded-xl" onClick={() => { stopAudio(); setPhase('idle'); }}>
                <Mic className="size-4" aria-hidden /> {t('recordAgain')}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
