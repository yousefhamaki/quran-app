import { BookOpen, Clock, Flame, GraduationCap, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TKey } from '@/lib/i18n';
import type { Page } from '@/hooks/use-hash-route';
import { useSettings } from '@/context/settings';

/** The five top-level destinations. Everything else (reader, calendar, adhkar) opens from one of them. */
export type Tab = 'quran' | Extract<Page, 'daily' | 'prayer' | 'plan' | 'more'>;

const TABS: { id: Tab; icon: typeof BookOpen; label: TKey }[] = [
  { id: 'quran', icon: BookOpen, label: 'navQuran' },
  { id: 'daily', icon: Flame, label: 'navDaily' },
  { id: 'prayer', icon: Clock, label: 'navPrayer' },
  { id: 'plan', icon: GraduationCap, label: 'navMemorize' },
  { id: 'more', icon: LayoutGrid, label: 'navMore' },
];

interface Props {
  active: Tab;
  onSelect: (tab: Tab) => void;
}

/** Bottom navigation (5 items, icon + label). Sits under the mini player. */
export function BottomNav({ active, onSelect }: Props) {
  const { t } = useSettings();
  return (
    <nav aria-label={t('navLabel')} className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
      <ul className="mx-auto flex max-w-3xl">
        {TABS.map(({ id, icon: Icon, label }) => {
          const on = id === active;
          return (
            <li key={id} className="flex-1">
              <button
                type="button"
                onClick={() => onSelect(id)}
                aria-current={on ? 'page' : undefined}
                className={cn('flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset', on ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
              >
                <span className={cn('grid h-7 w-14 place-items-center rounded-full transition-colors', on && 'bg-secondary')}>
                  <Icon className="size-5" aria-hidden />
                </span>
                {t(label)}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Height of the bar (4rem) — pages and the mini player leave this much room. */
export const NAV_HEIGHT = '4rem';
