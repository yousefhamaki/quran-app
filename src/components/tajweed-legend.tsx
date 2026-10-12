import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TAJWEED_RULES, tajweedColor } from '@/lib/tajweed';
import { useSettings } from '@/context/settings';
import { useTheme } from '@/context/theme';

/** Collapsible guide that shows what each tajweed colour means. */
export function TajweedLegend() {
  const { settings, t } = useSettings();
  const { resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ar = settings.lang === 'ar';

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-11 gap-2 rounded-xl px-3 text-primary"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <ChevronDown className={open ? 'size-4 rotate-180 transition-transform' : 'size-4 transition-transform'} aria-hidden />
        {open ? t('hideGuide') : t('tajweedGuide')}
      </Button>
      {open && (
        <ul className="grid gap-1.5 rounded-2xl bg-muted p-3 sm:grid-cols-2">
          {TAJWEED_RULES.map(rule => (
            <li key={rule.cls} className="flex items-center gap-3 text-sm">
              <span
                className="grid size-7 shrink-0 place-items-center rounded-full bg-background font-quran text-lg leading-none"
                style={{ color: tajweedColor(rule.cls, resolvedTheme === 'dark') }}
                aria-hidden
              >
                ●
              </span>
              <span>{ar ? rule.ar : rule.en}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
