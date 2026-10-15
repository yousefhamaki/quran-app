import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Sheet } from '@/components/sheet';
import { Chips } from '@/components/chips';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { TOTAL_PAGES } from '@/lib/mushaf';
import { HIZB_STARTS, hizbOf } from '@/lib/study';
import { useSettings } from '@/context/settings';
import { useSurahs } from '@/context/surahs';

type Mode = 'page' | 'juz' | 'hizb';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Current place, to mark the juz/hizb you are in. */
  surah: number;
  ayah: number;
  onPage: (page: number) => void;
  onAyah: (surah: number, ayah: number) => void;
}

/** Jump to a page, juz' or hizb. */
export function JumpSheet({ open, onClose, surah, ayah, onPage, onAyah }: Props) {
  const { t, isRTL } = useSettings();
  const { byNumber } = useSurahs();
  const [mode, setMode] = useState<Mode>('juz');
  const [page, setPage] = useState('');
  const hizb = hizbOf(surah, ayah);
  const fmt = (n: number) => (isRTL ? n.toLocaleString('ar-EG') : String(n));
  const nameOf = (n: number) => { const s = byNumber(n); return s ? (isRTL ? s.name : s.englishName) : `#${n}`; };
  const valid = Number(page) >= 1 && Number(page) <= TOTAL_PAGES;
  const items = Array.from({ length: mode === 'juz' ? 30 : 60 }, (_, i) => i + 1);

  return (
    <Sheet open={open} tall onClose={onClose} title={t('goToTitle')}>
      <View className="gap-4 pb-6">
        <Chips<Mode>
          label={t('goToTitle')}
          value={mode}
          onChange={setMode}
          options={[{ value: 'juz', label: t('goJuz') }, { value: 'hizb', label: t('goHizb') }, { value: 'page', label: t('goPage') }]}
        />
        {mode === 'page' ? (
          <View className="flex-row items-center gap-2">
            <TextInput
              value={page}
              onChangeText={v => setPage(v.replace(/\D/g, '').slice(0, 3))}
              keyboardType="number-pad"
              placeholder={t('goPageHint')}
              accessibilityLabel={t('goPageHint')}
              className="h-12 flex-1 rounded-xl border border-input bg-background px-4 text-center text-lg text-foreground"
              placeholderTextColor="#8a8f98"
            />
            <Button className="h-12 rounded-xl px-6" disabled={!valid} onPress={() => { onPage(Number(page)); onClose(); }}>
              <Text>{t('goPageButton')}</Text>
            </Button>
          </View>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {items.map(n => {
              const [s, a] = mode === 'juz' ? HIZB_STARTS[(n - 1) * 2] : HIZB_STARTS[n - 1];
              const here = mode === 'juz' ? Math.ceil(hizb / 2) === n : hizb === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => { onAyah(s, a); onClose(); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: here }}
                  className={cn('min-h-14 w-[48.5%] justify-center rounded-2xl border border-border px-4 py-2 active:bg-accent', here && 'border-primary bg-secondary')}
                >
                  <Text className="font-medium">{t(mode === 'juz' ? 'goJuzN' : 'goHizbN', { n: fmt(n) })}</Text>
                  <Text className="text-xs text-muted-foreground">{nameOf(s)} · {fmt(a)}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </Sheet>
  );
}
