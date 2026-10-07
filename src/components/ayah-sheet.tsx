import { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck, Play } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { RECITERS, type Ayah, type Surah } from '@/lib/quran';
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

/** Reciter choice + bookmark for one ayah. (Tafsir has its own sheet, reachable straight from each ayah.) */
export function AyahSheet({ surah, ayah, open, onOpenChange }: Props) {
  const { settings, update, t } = useSettings();
  const { isBookmarked, toggleBookmark } = useLibrary();
  const { play } = usePlayer();
  const [choice, setChoice] = useState(settings.reciter);
  const ar = settings.lang === 'ar';
  const number = ayah?.number ?? 0;
  const marked = ayah ? isBookmarked(surah.number, number) : false;

  // Each time the sheet opens, start from the saved reciter; the user picks, then presses Play.
  useEffect(() => { if (open) setChoice(settings.reciter); }, [open, number]); // eslint-disable-line react-hooks/exhaustive-deps

  function startPlayback() {
    update({ reciter: choice }); // the chosen reciter becomes the saved one
    play(surah.number, number, choice);
    onOpenChange(false);
  }

  const chosen = RECITERS.find(r => r.id === choice);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] w-full max-w-3xl gap-0 overflow-y-auto rounded-t-3xl p-0 [&>*]:shrink-0">
        <SheetHeader className="px-5 pt-5 pb-3 text-start">
          <SheetTitle className={cn('text-xl', ar ? 'font-quran' : 'font-display')}>
            {ar ? surah.name : surah.englishName} · {t('ayah')} {number}
          </SheetTitle>
          <SheetDescription>{t('chooseReciter')}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[clamp(7rem,calc(100dvh-20rem),24rem)]">
          <ReciterList value={choice} onChange={setChoice} />
        </ScrollArea>

        <div className="space-y-1 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button className="h-12 w-full gap-2 rounded-xl text-base" onClick={startPlayback}>
            <Play className="size-5 fill-current rtl:-scale-x-100" aria-hidden />
            {t('playAyahWith', { n: number, name: chosen ? (ar ? chosen.ar : chosen.en) : '' })}
          </Button>
          <Button variant="ghost" className="h-11 w-full justify-center gap-2 rounded-xl" onClick={() => ayah && toggleBookmark(surah.number, number)}>
            {marked ? <BookmarkCheck className="size-5 text-gold" aria-hidden /> : <Bookmark className="size-5" aria-hidden />}
            {marked ? t('removeBookmark') : t('bookmark')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
