import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Surah } from '@/lib/quran';
import { useSettings } from '@/context/settings';
import { useDownloads } from '@/context/downloads';
import { CircleCheck } from 'lucide-react';

interface Props {
  surah: Surah;
  index: number;
  onOpen: (surah: Surah) => void;
}

/** Eight-point star that frames the surah number. */
function NumberStar({ n }: { n: number }) {
  return (
    <span className="relative grid size-12 shrink-0 place-items-center text-gold" aria-hidden>
      <svg viewBox="0 0 48 48" className="absolute inset-0 size-full">
        <path d="M24 2l6 12.5L44 10l-4.5 14L44 38l-14-4.5L24 46l-6-12.5L4 38l4.5-14L4 10l14 4.5z" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
      <span className="relative text-sm font-semibold tabular-nums text-foreground">{n}</span>
    </span>
  );
}

export function SurahCard({ surah, index, onOpen }: Props) {
  const { settings, t } = useSettings();
  const { hasAny } = useDownloads();
  const ar = settings.lang === 'ar';
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpen(surah)}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen(surah))}
      style={{ ['--i' as string]: Math.min(index, 14) }}
      className="rise-in group flex min-h-16 flex-row items-center gap-4 rounded-2xl border-border/70 p-3.5 shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <NumberStar n={surah.number} />
      <div className="min-w-0 flex-1">
        <p className={ar ? 'ar-safe font-quran text-xl' : 'font-display text-xl leading-snug font-semibold'}>
          {ar ? surah.name : surah.englishName}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {ar ? surah.englishName : surah.englishNameTranslation} · {surah.numberOfAyahs} {t('ayahs')}
        </p>
      </div>
      {hasAny(surah.number) && <CircleCheck className="size-5 shrink-0 text-primary" aria-label={t('offlineSaved')} />}
      <Badge variant="secondary" className="shrink-0 rounded-full font-normal">
        {surah.revelationType === 'Meccan' ? t('meccan') : t('medinan')}
      </Badge>
    </Card>
  );
}
