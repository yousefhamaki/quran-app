import { ChevronLeft, Settings as SettingsIcon, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSettings } from '@/context/settings';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onOpenSettings: () => void;
  onOpenAccount: () => void;
  signedIn: boolean;
}

export function AppHeader({ title, subtitle, onBack, onOpenSettings, onOpenAccount, signedIn }: Props) {
  const { t } = useSettings();
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-3xl items-center gap-2 px-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} aria-label={t('back')} className="size-11 shrink-0">
            <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden />
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="ar-safe truncate font-display text-2xl leading-tight font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onOpenAccount} aria-label={t('account')} className="relative size-11">
              <UserRound className="size-5" aria-hidden />
              {signedIn && <span className="absolute end-2.5 top-2.5 size-2 rounded-full bg-primary ring-2 ring-background" aria-hidden />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('account')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onOpenSettings} aria-label={t('settings')} className="size-11">
              <SettingsIcon className="size-5" aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('settings')}</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
