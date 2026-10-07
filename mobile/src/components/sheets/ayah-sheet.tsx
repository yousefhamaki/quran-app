import { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck, Play } from 'lucide-react-native';
import { Sheet } from '@/components/sheet';
import { ReciterList } from '@/components/reciter-list';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { RECITERS } from '@/lib/quran';
import { useLibrary } from '@/context/library';
import { usePlayer } from '@/context/player';
import { useSettings } from '@/context/settings';
import { useSurahs } from '@/context/surahs';
import { useUI } from '@/context/ui';

/** Reciter choice + bookmark for one ayah. (Tafsir has its own sheet, one tap from each ayah.) */
export function AyahSheet() {
  const { options, setOptions } = useUI();
  const { settings, update, t, isRTL } = useSettings();
  const { isBookmarked, toggleBookmark } = useLibrary();
  const { play } = usePlayer();
  const { byNumber } = useSurahs();
  const [choice, setChoice] = useState(settings.reciter);
  const surah = options ? byNumber(options.surah) : undefined;

  // Each time the sheet opens, start from the saved reciter; the user picks, then presses Play.
  useEffect(() => { if (options) setChoice(settings.reciter); }, [options]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!options || !surah) return null;
  const marked = isBookmarked(options.surah, options.ayah);
  const chosen = RECITERS.find(r => r.id === choice);
  const close = () => setOptions(null);

  return (
    <Sheet
      open
      onClose={close}
      quranTitle={isRTL}
      title={`${isRTL ? surah.name : surah.englishName} · ${options.ayah}`}
      description={t('chooseReciter')}
      footer={
        <>
          <Button
            size="lg"
            className="h-12 rounded-xl"
            onPress={() => {
              update({ reciter: choice }); // the chosen reciter becomes the saved one
              play(options.surah, options.ayah, choice);
              close();
            }}
          >
            <Icon as={Play} className="size-5 fill-primary-foreground text-primary-foreground" />
            <Text className="text-base">{t('playAyahWith', { n: options.ayah, name: chosen ? (isRTL ? chosen.ar : chosen.en) : '' })}</Text>
          </Button>
          <Button variant="ghost" className="h-11 rounded-xl" onPress={() => toggleBookmark(options.surah, options.ayah)}>
            <Icon as={marked ? BookmarkCheck : Bookmark} className={marked ? 'size-5 text-gold' : 'size-5'} />
            <Text>{marked ? t('removeBookmark') : t('bookmark')}</Text>
          </Button>
        </>
      }
    >
      <ReciterList value={choice} onChange={setChoice} />
    </Sheet>
  );
}
