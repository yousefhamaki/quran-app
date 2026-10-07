import { useState } from 'react';
import { View } from 'react-native';
import { CloudCheck, CloudOff, LogOut } from 'lucide-react-native';
import { Sheet } from '@/components/sheet';
import { Chips } from '@/components/chips';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { ApiError } from '@/lib/backend';
import { useAuth } from '@/context/auth';
import { useSettings } from '@/context/settings';
import { useUI } from '@/context/ui';

function Field({ label, hint, ...props }: { label: string; hint?: string } & React.ComponentProps<typeof Input>) {
  return (
    <View className="gap-2">
      <Label nativeID={label}>{label}</Label>
      <Input accessibilityLabel={label} className="h-11 rounded-xl" {...props} />
      {hint ? <Text className="text-xs text-muted-foreground">{hint}</Text> : null}
    </View>
  );
}

export function AccountSheet() {
  const { accountOpen, setAccountOpen } = useUI();
  const { user, syncAvailable, busy, signIn, signUp, signOut } = useAuth();
  const { t } = useSettings();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      if (mode === 'signin') await signIn(email.trim(), password);
      else await signUp(name.trim(), email.trim(), password);
      setPassword('');
      setAccountOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('error'));
    }
  }

  return (
    <Sheet
      open={accountOpen}
      onClose={() => setAccountOpen(false)}
      title={t('account')}
      description={user ? t('syncOn') : syncAvailable ? t('syncOff') : t('syncUnavailable')}
    >
      <View className="gap-5 pb-2">
        {!syncAvailable && (
          <View className="flex-row items-center gap-3 rounded-2xl bg-muted p-4">
            <Icon as={CloudOff} className="size-5 text-muted-foreground" />
            <Text className="flex-1 text-sm text-muted-foreground">{t('syncUnavailable')}</Text>
          </View>
        )}

        {syncAvailable && user && (
          <View className="gap-4">
            <View className="flex-row items-center gap-4 rounded-2xl bg-secondary p-4">
              <View className="size-12 items-center justify-center rounded-full bg-primary">
                <Text className="text-lg font-semibold text-primary-foreground">{user.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View className="flex-1">
                <Text numberOfLines={1} className="font-medium">{user.name}</Text>
                <Text numberOfLines={1} className="text-sm text-muted-foreground">{user.email}</Text>
              </View>
              <Icon as={CloudCheck} className="size-5 text-primary" />
            </View>
            <Button variant="outline" className="h-11 rounded-xl" onPress={() => { void signOut(); setAccountOpen(false); }}>
              <Icon as={LogOut} className="size-4" />
              <Text>{t('signOut')}</Text>
            </Button>
          </View>
        )}

        {syncAvailable && !user && (
          <View className="gap-4">
            <Chips
              label={t('account')}
              value={mode}
              onChange={m => { setMode(m); setError(null); }}
              options={[
                { value: 'signin', label: t('signIn') },
                { value: 'signup', label: t('signUp') },
              ]}
            />
            {mode === 'signup' && <Field label={t('name')} value={name} onChangeText={setName} autoComplete="name" textContentType="name" />}
            <Field label={t('email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
            <Field
              label={t('password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              textContentType={mode === 'signin' ? 'password' : 'newPassword'}
              hint={mode === 'signup' ? t('passwordHint') : undefined}
            />
            {error ? <Text accessibilityRole="alert" className="text-sm text-destructive">{error}</Text> : null}
            <Button size="lg" className="h-12 rounded-xl" disabled={busy || !email || !password || (mode === 'signup' && !name)} onPress={() => void submit()}>
              <Text className="text-base">{busy ? t('loading') : mode === 'signin' ? t('signIn') : t('signUp')}</Text>
            </Button>
          </View>
        )}
      </View>
    </Sheet>
  );
}
