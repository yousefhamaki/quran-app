import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Repeat } from 'lucide-react-native';
import { Chips } from '@/components/chips';
import { Field } from '@/components/section';
import { Sheet } from '@/components/sheet';
import { Stepper } from '@/components/stepper';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { usePlayer } from '@/context/player';
import { useSettings } from '@/context/settings';
import { useSurahs } from '@/context/surahs';
import { useUI } from '@/context/ui';

const ROUNDS = [2, 3, 5, 7, 10, 0]; // 0 = until stopped

/** Pick ayahs "from … to" and how many times to loop them as one block. */
export function RangeSheet() {
  const { rangeFor, rangeFrom, setRangeFor } = useUI();
  const { settings, t, isRTL } = useSettings();
  const { startRange } = usePlayer();
  const { byNumber } = useSurahs();
  const surah = rangeFor ? byNumber(rangeFor) : undefined;
  const total = surah?.numberOfAyahs ?? 1;
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(3);
  const [rounds, setRounds] = useState(3);

  useEffect(() => {
    if (!rangeFor) return;
    const start = Math.min(Math.max(1, rangeFrom ?? 1), total);
    setFrom(start);
    setTo(Math.min(total, start + 2));
  }, [rangeFor, rangeFrom, total]);

  if (!rangeFor || !surah) return null;
  const changeFrom = (v: number) => { setFrom(v); if (to < v) setTo(v); };
  const changeTo = (v: number) => { setTo(v); if (from > v) setFrom(v); };
  const roundLabel = (n: number) => (n === 0 ? '∞' : `${n}×`);

  return (
    <Sheet
      open
      onClose={() => setRangeFor(null)}
      quranTitle={false}
      title={t('rangeTitle')}
      description={`${isRTL ? surah.name : surah.englishName} · ${t('rangeHint')}`}
      footer={
        <Button
          size="lg"
          className="h-12 rounded-xl"
          onPress={() => {
            startRange({ surah: surah.number, from, to, rounds }, settings.reciter);
            setRangeFor(null);
          }}
        >
          <Icon as={Repeat} className="size-5 text-primary-foreground" />
          <Text className="text-base">{from === to ? t('rangeSingle', { from }) : t('rangeStart', { from, to })}</Text>
        </Button>
      }
    >
      <View className="gap-5 pb-2">
        <Field label={t('rangeFrom')}>
          <Stepper label={t('rangeFrom')} value={from} min={1} max={total} onChange={changeFrom} big={total > 20} />
        </Field>
        <Field label={t('rangeTo')}>
          <Stepper label={t('rangeTo')} value={to} min={1} max={total} onChange={changeTo} big={total > 20} />
        </Field>
        <Field label={t('rangeRounds')}>
          <Chips label={t('rangeRounds')} value={rounds} onChange={setRounds} options={ROUNDS.map(n => ({ value: n, label: roundLabel(n) }))} />
        </Field>
      </View>
    </Sheet>
  );
}
