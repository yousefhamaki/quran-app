import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { Volume2 } from 'lucide-react-native';
import { Sheet } from '@/components/sheet';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { fetchWordMeanings, type WordMeaning } from '@/lib/quran';
import { useSettings } from '@/context/settings';
import { useSurahs } from '@/context/surahs';
import { useUI } from '@/context/ui';

let wordPlayer: AudioPlayer | null = null;

/** Meaning, transliteration and audio of the tapped word, with every other word of the ayah one tap away. */
export function WordSheet() {
  const { word: target, setWord } = useUI();
  const { t, isRTL } = useSettings();
  const { byNumber } = useSurahs();
  const [words, setWords] = useState<WordMeaning[] | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    setWords(null);
    fetchWordMeanings(target.surah).then(all => !cancelled && setWords(all[target.ayah - 1] ?? [])).catch(() => !cancelled && setWords([]));
    return () => { cancelled = true; };
  }, [target?.surah, target?.ayah]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (target) setIndex(target.index); }, [target?.surah, target?.ayah, target?.index]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!target) return null;
  const s = byNumber(target.surah);
  const current = words?.[index];
  const listen = () => {
    if (!current?.audio) return;
    try { wordPlayer?.remove(); } catch { /* already released */ }
    wordPlayer = createAudioPlayer({ uri: current.audio });
    wordPlayer.play();
  };

  return (
    <Sheet open tall onClose={() => setWord(null)} title={t('wordTitle')} description={`${s ? (isRTL ? s.name : s.englishName) : ''} · ${t('ayah')} ${target.ayah}`}>
      <View className="gap-5 pb-8">
        {!words ? (
          <Text className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">…</Text>
        ) : !current ? (
          <Text className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">{t('wordNone')}</Text>
        ) : (
          <View className="items-center gap-2 rounded-3xl bg-secondary p-5" accessibilityLiveRegion="polite">
            <Text className="font-quran" style={{ fontSize: 48, lineHeight: 90, writingDirection: 'rtl' }}>{current.text}</Text>
            {current.transliteration ? <Text className="text-lg italic text-secondary-foreground">{current.transliteration}</Text> : null}
            <Text className="text-center text-xl font-medium">{current.translation || t('wordNone')}</Text>
            {current.audio ? (
              <Button variant="outline" className="mt-2 h-11 rounded-full" onPress={listen}>
                <Icon as={Volume2} className="size-4" />
                <Text>{t('wordListen')}</Text>
              </Button>
            ) : null}
          </View>
        )}

        {words && words.length > 0 ? (
          <View className="gap-2">
            <Text accessibilityRole="header" className="text-sm font-medium text-muted-foreground">{t('wordAllWords')}</Text>
            <View className="flex-row flex-wrap gap-2" style={{ direction: 'rtl' }}>
              {words.map((w, i) => (
                <Pressable
                  key={i}
                  onPress={() => setIndex(i)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: i === index }}
                  className={cn('min-h-14 min-w-14 items-center justify-center rounded-2xl border border-border px-3 py-1.5 active:bg-accent', i === index && 'border-primary bg-secondary')}
                >
                  <Text className="font-quran" style={{ fontSize: 22, lineHeight: 40 }}>{w.text}</Text>
                  <Text numberOfLines={1} className="max-w-24 text-[11px] text-muted-foreground">{w.translation}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        <Text className="text-xs text-muted-foreground">{t('wordSource')}</Text>
      </View>
    </Sheet>
  );
}
