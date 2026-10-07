import { useMemo } from 'react';
import { Check, Pin, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { RECITERS, type Reciter } from '@/lib/quran';
import { useSettings } from '@/context/settings';

/** Pinned reciters first (in pin order), then everyone else. */
export function useOrderedReciters() {
  const { pinned } = useSettings();
  return useMemo(() => {
    const pins = pinned.map(id => RECITERS.find(r => r.id === id)).filter((r): r is Reciter => !!r);
    return { pinned: pins, others: RECITERS.filter(r => !pinned.includes(r.id)) };
  }, [pinned]);
}

interface Props {
  /** The reciter chosen for the next play (not necessarily the default). */
  value: string;
  onChange: (reciterId: string) => void;
}

export function ReciterList({ value, onChange }: Props) {
  const { settings, pinned: pinnedIds, update, togglePin, t } = useSettings();
  const { pinned, others } = useOrderedReciters();
  const ar = settings.lang === 'ar';

  const row = (r: Reciter) => {
    const selected = r.id === value;
    const isDefault = r.id === settings.reciter;
    const isPinned = pinnedIds.includes(r.id);
    const name = ar ? r.ar : r.en;
    return (
      <li key={r.id} className={cn('flex items-center gap-1 rounded-xl pe-1 transition-colors', selected && 'bg-accent')}>
        <button
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={() => onChange(r.id)}
          className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 text-start hover:bg-accent/70 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span
            className={cn('grid size-6 shrink-0 place-items-center rounded-full border', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input')}
            aria-hidden
          >
            {selected && <Check className="size-3.5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate">{name}</span>
            {isDefault && <span className="block text-xs text-gold-foreground">{t('isDefault')}</span>}
          </span>
        </button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0"
              aria-pressed={isDefault}
              aria-label={`${t('setDefault')}: ${name}`}
              onClick={() => update({ reciter: r.id })}
            >
              <Star className={cn('size-5', isDefault ? 'fill-gold text-gold' : 'text-muted-foreground')} aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isDefault ? t('isDefault') : t('setDefault')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0"
              aria-pressed={isPinned}
              aria-label={`${isPinned ? t('unpin') : t('pin')}: ${name}`}
              onClick={() => togglePin(r.id)}
            >
              <Pin className={cn('size-5', isPinned ? 'fill-primary text-primary' : 'text-muted-foreground')} aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isPinned ? t('unpin') : t('pin')}</TooltipContent>
        </Tooltip>
      </li>
    );
  };

  return (
    <div role="radiogroup" aria-label={t('chooseReciter')} className="space-y-3 px-3 py-3">
      {pinned.length > 0 && (
        <section>
          <h4 className="mb-1 px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('pinned')}</h4>
          <ul className="space-y-1">{pinned.map(row)}</ul>
        </section>
      )}
      <section>
        {pinned.length > 0 && <h4 className="mb-1 px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('allReciters')}</h4>}
        <ul className="space-y-1">{others.map(row)}</ul>
      </section>
    </div>
  );
}
