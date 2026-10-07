import { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck, Headphones, Play, ScrollText } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { RECITERS, TAFSIRS, fetchTafsir, type Ayah, type Surah } from '@/lib/quran';
import { ReciterList } from '@/components/reciter-list';
import { useSettings } from '@/context/settings';
import { useLibrary } from '@/context/library';
import { usePlayer } from '@/context/player';

interface Props {
  surah: Surah;
  ayah: Ayah | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TafsirState = { state: 'idle' | 'loading' | 'error' } | { state: 'ok'; text: string };

export function AyahSheet({ surah, ayah, open, onOpenChange }: Props) {
  const { settings, update, t } = useSettings();
  const { isBookmarked, toggleBookmark } = useLibrary();
  const { play } = usePlayer();
  const [tab, setTab] = useState('listen');
  const [choice, setChoice] = useState(settings.reciter);
  const [tafsir, setTafsir] = useState<TafsirState>({ state: 'idle' });
  const ar = settings.lang === 'ar';
  const number = ayah?.number ?? 0;
  const marked = ayah ? isBookmarked(surah.number, number) : false;
  const activeTafsir = TAFSIRS.find(x => x.id === settings.tafsirId) ?? TAFSIRS[0];

  // Each time the sheet opens, start from the default reciter; the user picks, then presses Play.
  useEffect(() => { if (open) { setTab('listen'); setChoice(settings.reciter); } }, [open, number]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || tab !== 'tafsir' || !number) return;
    let cancelled = false;
    setTafsir({ state: 'loading' });
    fetchTafsir(settings.tafsirId, surah.number, number)
      .then(text => !cancelled && setTafsir({ state: 'ok', text }))
      .catch(() => !cancelled && setTafsir({ state: 'error' }));
    return () => { cancelled = true; };
  }, [open, tab, settings.tafsirId, surah.number, number]);

  function startPlayback() {
    play(surah.number, number, choice);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] w-full max-w-3xl gap-0 overflow-y-auto rounded-t-3xl p-0 [&>*]:shrink-0">
        <SheetHeader className="px-5 pt-5 pb-3 text-start">
          <SheetTitle className={cn('text-xl', ar ? 'font-quran' : 'font-display')}>
            {ar ? surah.name : surah.englishName} · {t('ayah')} {number}
          </SheetTitle>
          <SheetDescription className="sr-only">{t('chooseReciter')}</SheetDescription>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="gap-0">
          <TabsList className="mx-5 grid h-11 grid-cols-2 rounded-xl">
            <TabsTrigger value="listen" className="gap-2 rounded-lg"><Headphones className="size-4" aria-hidden />{t('listen')}</TabsTrigger>
            <TabsTrigger value="tafsir" className="gap-2 rounded-lg"><ScrollText className="size-4" aria-hidden />{t('tafsir')}</TabsTrigger>
          </TabsList>

          <TabsContent value="listen" className="min-h-0">
            <ScrollArea className="h-[clamp(7rem,calc(100dvh-22rem),22rem)]">
              <ReciterList value={choice} onChange={setChoice} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="tafsir" className="min-h-0">
            <div className="px-5 pt-3">
              <Select value={String(settings.tafsirId)} onValueChange={v => update({ tafsirId: Number(v) })}>
                <SelectTrigger className="h-11 w-full rounded-xl" aria-label={t('defaultTafsir')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAFSIRS.map(x => <SelectItem key={x.id} value={String(x.id)}>{ar ? x.ar : x.en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <ScrollArea className="h-[clamp(7rem,calc(100dvh-22rem),22rem)]">
              <div className="px-5 py-4" aria-live="polite">
                {ayah && <p dir="rtl" className="mb-4 font-quran text-2xl text-primary">{ayah.ar}</p>}
                {tafsir.state === 'loading' && (
                  <div className="space-y-2" aria-label={t('loadingTafsir')}>
                    <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-11/12" /><Skeleton className="h-4 w-4/5" />
                  </div>
                )}
                {tafsir.state === 'error' && <p className="text-destructive">{t('error')}</p>}
                {tafsir.state === 'ok' && (
                  <p
                    dir={activeTafsir.dir}
                    className={cn('whitespace-pre-wrap', activeTafsir.dir === 'rtl' ? 'font-quran text-xl' : 'leading-8')}
                  >
                    {tafsir.text || t('tafsirEmpty')}
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="space-y-1 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {tab === 'listen' && (
            <Button className="h-12 w-full gap-2 rounded-xl text-base" onClick={startPlayback}>
              <Play className="size-5 fill-current rtl:-scale-x-100" aria-hidden />
              {t('playAyahWith', { n: number, name: ar ? (RECITERS.find(r => r.id === choice)?.ar ?? '') : (RECITERS.find(r => r.id === choice)?.en ?? '') })}
            </Button>
          )}
          <Button variant="ghost" className="h-11 w-full justify-center gap-2 rounded-xl" onClick={() => ayah && toggleBookmark(surah.number, number)}>
            {marked ? <BookmarkCheck className="size-5 text-gold" aria-hidden /> : <Bookmark className="size-5" aria-hidden />}
            {marked ? t('removeBookmark') : t('bookmark')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
