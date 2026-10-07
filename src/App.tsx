import { useCallback, useEffect, useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { Home } from '@/components/home';
import { Reader } from '@/components/reader';
import { AyahSheet } from '@/components/ayah-sheet';
import { TafsirSheet } from '@/components/tafsir-sheet';
import { PlayerBar } from '@/components/player-bar';
import { SettingsSheet } from '@/components/settings-sheet';
import { AccountSheet } from '@/components/account-sheet';
import { useHashRoute } from '@/hooks/use-hash-route';
import { useSettings } from '@/context/settings';
import { useAuth } from '@/context/auth';
import { useLibrary } from '@/context/library';
import { fetchSurah, fetchSurahs, type Ayah, type Surah } from '@/lib/quran';

export default function App() {
  const { settings, t } = useSettings();
  const { user } = useAuth();
  const { markRead } = useLibrary();
  const { route, go } = useHashRoute();
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [selectedAyah, setSelectedAyah] = useState<number | null>(null);
  const [tafsirAyah, setTafsirAyah] = useState<number | null>(null);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const loadSurahs = useCallback(() => {
    setStatus('loading');
    fetchSurahs().then(s => { setSurahs(s); setStatus('ok'); }).catch(() => setStatus('error'));
  }, []);
  useEffect(loadSurahs, [loadSurahs]);

  const surah = route.surah ? surahs.find(s => s.number === route.surah) ?? null : null;
  const ar = settings.lang === 'ar';

  // The ayah sheet needs the ayah text; the reader caches it in the fetch layer's HTTP cache.
  useEffect(() => {
    if (!surah) { setAyahs([]); return; }
    let cancelled = false;
    fetchSurah(surah.number).then(list => !cancelled && setAyahs(list)).catch(() => {});
    return () => { cancelled = true; };
  }, [surah]);

  useEffect(() => { if (route.surah && route.ayah) markRead(route.surah, route.ayah); }, [route.surah, route.ayah, markRead]);

  // Any sheet that was open belongs to the previous surah.
  useEffect(() => { setTafsirAyah(null); setSelectedAyah(null); }, [route.surah]);

  const sheetAyah = selectedAyah ? ayahs.find(a => a.number === selectedAyah) ?? null : null;

  return (
    <div className="min-h-dvh">
      <AppHeader
        title={surah ? (ar ? surah.name : surah.englishName) : t('appName')}
        subtitle={surah ? `${ar ? surah.englishName : surah.englishNameTranslation} · ${surah.numberOfAyahs} ${t('ayahs')}` : undefined}
        onBack={surah ? () => { setTafsirAyah(null); go(null); } : undefined}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAccount={() => setAccountOpen(true)}
        signedIn={!!user}
      />

      <main>
        {surah ? (
          <Reader surah={surah} focusAyah={route.ayah} onSelectAyah={setSelectedAyah} onOpenTafsir={setTafsirAyah} />
        ) : (
          <Home surahs={surahs} loading={status === 'loading'} error={status === 'error'} onRetry={loadSurahs} onOpen={(s, a) => go(s, a)} />
        )}
      </main>

      {surah && <AyahSheet surah={surah} ayah={sheetAyah} open={selectedAyah !== null} onOpenChange={o => !o && setSelectedAyah(null)} />}
      {surah && <TafsirSheet surah={surah} ayahs={ayahs} ayahNumber={tafsirAyah} onAyahChange={setTafsirAyah} onClose={() => setTafsirAyah(null)} />}
      <PlayerBar surahs={surahs} />
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      <AccountSheet open={accountOpen} onOpenChange={setAccountOpen} />
    </div>
  );
}
