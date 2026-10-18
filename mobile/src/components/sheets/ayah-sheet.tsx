import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Bookmark, BookmarkCheck, Mic, Play, Share2 } from 'lucide-react-native';
import { ShareCard, type ShareCardData } from '@/components/share-card';
import { useAyahs } from '@/hooks/use-ayahs';
import { useToast } from '@/context/toast';
import { Sheet } from '@/components/sheet';
import { ReciterList } from '@/components/reciter-list';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { HIGHLIGHT_COLORS, type HighlightColor } from '@/lib/study';
import { RECITERS, translationDir } from '@/lib/quran';
import { useLibrary } from '@/context/library';
import { usePlayer } from '@/context/player';
import { useSettings } from '@/context/settings';
import { useSurahs } from '@/context/surahs';
import { useUI } from '@/context/ui';

const HL_DOT: Record<HighlightColor, string> = { yellow: '#facc15', green: '#34d399', blue: '#38bdf8', pink: '#f472b6' };
const HL_LABEL = { yellow: 'hlYellow', green: 'hlGreen', blue: 'hlBlue', pink: 'hlPink' } as const;

/** Reciter choice + bookmark for one ayah. (Tafsir has its own sheet, one tap from each ayah.) */
export function AyahSheet() {
  const { options, setOptions, setRecord } = useUI();
  const { settings, update, t, isRTL } = useSettings();
  const { isBookmarked, toggleBookmark, annotationOf, setHighlight, setNote } = useLibrary();
  const [draft, setDraft] = useState('');
  const toast = useToast();
  const [card, setCard] = useState<ShareCardData | null>(null);
  const { play } = usePlayer();
  const { byNumber } = useSurahs();
  const [choice, setChoice] = useState(settings.reciter);
  const surah = options ? byNumber(options.surah) : undefined;
  const { ayahs } = useAyahs(options?.surah ?? null);

  // Each time the sheet opens, start from the saved reciter; the user picks, then presses Play.
  useEffect(() => { if (options) { setChoice(settings.reciter); setDraft(annotationOf(options.surah, options.ayah)?.note ?? ''); } }, [options]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!options || !surah) return null;
  const marked = isBookmarked(options.surah, options.ayah);
  const chosen = RECITERS.find(r => r.id === choice);
  const shareImage = () => {
    const a = ayahs.find(x => x.number === options.ayah);
    if (!a) return;
    setCard({
      ar: a.ar,
      translation: settings.showTranslation ? a.en : undefined,
      translationRtl: translationDir(settings.translation) === 'rtl',
      reference: `${isRTL ? surah.name : surah.englishName} · ${options.ayah}`,
    });
  };
  const close = () => { setNote(options.surah, options.ayah, draft); setOptions(null); };

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
          <Button variant="ghost" className="h-11 rounded-xl" onPress={() => { const target = { surah: options.surah, ayah: options.ayah, index: 0 }; close(); setRecord(target); }}>
            <Icon as={Mic} className="size-5" />
            <Text>{t('recordTitle')}</Text>
          </Button>
          <Button variant="ghost" className="h-11 rounded-xl" disabled={!!card || ayahs.length === 0} onPress={shareImage}>
            <Icon as={Share2} className="size-5" />
            <Text>{t('shareAyah')}</Text>
          </Button>
        </>
      }
    >
      <View className="mb-4 gap-3">
        <View accessibilityRole="radiogroup" accessibilityLabel={t('highlight')} className="flex-row items-center gap-3">
          {HIGHLIGHT_COLORS.map(c => {
            const on = annotationOf(options.surah, options.ayah)?.color === c;
            return (
              <Pressable key={c} onPress={() => setHighlight(options.surah, options.ayah, on ? null : c)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${t('highlight')}: ${t(HL_LABEL[c])}`} className="size-11 items-center justify-center">
                <View className={cn('size-8 rounded-full', on && 'border-2 border-foreground')} style={{ backgroundColor: HL_DOT[c] }} />
              </Pressable>
            );
          })}
        </View>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onBlur={() => setNote(options.surah, options.ayah, draft)}
          placeholder={t('notePlaceholder')}
          accessibilityLabel={t('noteAdd')}
          multiline
          textAlignVertical="top"
          className="min-h-20 rounded-xl border border-input bg-background p-3 text-base text-foreground"
          placeholderTextColor="#8a8f98"
        />
      </View>
      <ReciterList value={choice} onChange={setChoice} />
      {card ? <ShareCard {...card} onDone={ok => { setCard(null); if (!ok) toast.error(t('shareFailed')); }} /> : null}
    </Sheet>
  );
}
