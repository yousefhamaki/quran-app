import { useState, type FormEvent } from 'react';
import { CloudCheck, CloudOff, LogOut, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth';
import { useSettings } from '@/context/settings';
import { ApiError } from '@/lib/backend';

export function AccountSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user, syncAvailable, busy, signIn, signUp, signOut } = useAuth();
  const { t } = useSettings();
  const [mode, setMode] = useState('signin');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>, kind: 'signin' | 'signup') {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email'));
    const password = String(form.get('password'));
    try {
      if (kind === 'signin') await signIn(email, password);
      else await signUp(String(form.get('name')), email, password);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('error'));
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4 text-start">
          <SheetTitle className="font-display text-2xl">{t('account')}</SheetTitle>
          <SheetDescription>{user ? t('syncOn') : syncAvailable ? t('syncOff') : t('syncUnavailable')}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 p-5">
          {!syncAvailable && (
            <div className="flex items-center gap-3 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
              <CloudOff className="size-5 shrink-0" aria-hidden />
              <span>{t('syncUnavailable')}</span>
            </div>
          )}

          {syncAvailable && user && (
            <div className="space-y-5">
              <div className="flex items-center gap-4 rounded-2xl bg-secondary p-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-lg font-semibold text-primary-foreground" aria-hidden>
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{user.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                </div>
                <CloudCheck className="ms-auto size-5 shrink-0 text-primary" aria-label={t('syncOn')} />
              </div>
              <Button variant="outline" className="h-11 w-full gap-2 rounded-xl" onClick={() => { void signOut(); onOpenChange(false); }}>
                <LogOut className="size-4" aria-hidden /> {t('signOut')}
              </Button>
            </div>
          )}

          {syncAvailable && !user && (
            <Tabs value={mode} onValueChange={v => { setMode(v); setError(null); }}>
              <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl">
                <TabsTrigger value="signin" className="rounded-lg">{t('signIn')}</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg">{t('signUp')}</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={e => submit(e, 'signin')} className="mt-5 space-y-4">
                  <Field id="si-email" name="email" type="email" label={t('email')} autoComplete="email" />
                  <Field id="si-password" name="password" type="password" label={t('password')} autoComplete="current-password" />
                  {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" disabled={busy} className="h-11 w-full rounded-xl">
                    {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} {t('signIn')}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={e => submit(e, 'signup')} className="mt-5 space-y-4">
                  <Field id="su-name" name="name" type="text" label={t('name')} autoComplete="name" />
                  <Field id="su-email" name="email" type="email" label={t('email')} autoComplete="email" />
                  <Field id="su-password" name="password" type="password" label={t('password')} autoComplete="new-password" hint={t('passwordHint')} minLength={8} />
                  {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" disabled={busy} className="h-11 w-full rounded-xl">
                    {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} {t('signUp')}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ id, label, hint, ...props }: { id: string; label: string; hint?: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} required className="h-11 rounded-xl" aria-describedby={hint ? `${id}-hint` : undefined} {...props} />
      {hint && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
