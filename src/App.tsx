import { useCallback, useEffect, useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { Home } from '@/components/home';
import { Reader } from '@/components/reader';
import { AyahSheet } from '@/components/ayah-sheet';
import { TafsirSheet } from '@/components/tafsir-sheet';
import { DownloadSheet } from '@/components/download-sheet';
import { PlayerBar } from '@/components/player-bar';
import { SettingsSheet } from '@/components/settings-sheet';
import { AccountSheet } from '@/components/account-sheet';
import { useHashRoute } from '@/hooks/use-hash-route';
import { useOnline } from '@/hooks/use-online';
import { useDownloads } from '@/context/downloads';
import { WifiOff } from 'lucide-react';
import { useSettings } from '@/context/settings';
import { useAuth } from '@/context/auth';
import { useLibrary } from '@/context/library';
import { usePlayer } from '@/context/player';
import { fetchSurah, fetchSurahs, type Ayah, type Surah } from '@/lib/quran';

export default function App() {
  const { settings, t } = useSettings();
  const { user } = useAuth();
  const { markRead } = useLibrary();
  const { autoSurah, setSurahCounts } = usePlayer();
  const { route, go } = useHashRoute();
  const online = useOnline();
  const { records } = useDownloads();
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [selectedAyah, setSelectedAyah] = useState<number | null>(null);
  const [tafsirAyah, setTafsirAyah] = useState<number | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const loadSurahs = useCallback(() => {
    setStatus('loading');
    fetchSurahs().then(s => { setSurahs(s); setStatus('ok'); }).catch(() => setStatus('error'));
  }, []);
  useEffect(loadSurahs, [loadSurahs]);

  useEffect(() => { if (surahs.length) setSurahCounts(surahs.map(s => s.numberOfAyahs)); }, [surahs, setSurahCounts]);
  // When playback rolls over into the next surah on its own, show that surah.
  useEffect(() => { if (autoSurah) go(autoSurah.surah); }, [autoSurah?.n]); // eslint-disable-line react-hooks/exhaustive-deps

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
  useEffect(() => { setTafsirAyah(null); setSelectedAyah(null); setDownloadOpen(false); }, [route.surah]);

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

      {!online && (
        <div role="status" className="border-b bg-secondary px-4 py-2.5 text-secondary-foreground">
          <p className="mx-auto flex max-w-3xl items-start gap-2 text-sm">
            <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              {t('offlineBanner')}
              {records.length > 0 && !surah && <span className="mt-0.5 block text-xs text-muted-foreground">{t('offlineTapHint')}</span>}
            </span>
          </p>
        </div>
      )}

      <main>
        {surah ? (
          <Reader surah={surah} focusAyah={route.ayah} onSelectAyah={setSelectedAyah} onOpenTafsir={setTafsirAyah} onOpenDownload={() => setDownloadOpen(true)} />
        ) : (
          <Home surahs={surahs} loading={status === 'loading'} error={status === 'error'} onRetry={loadSurahs} onOpen={(s, a) => go(s, a)} />
        )}
      </main>

      {surah && <AyahSheet surah={surah} ayah={sheetAyah} open={selectedAyah !== null} onOpenChange={o => !o && setSelectedAyah(null)} />}
      {surah && <TafsirSheet surah={surah} ayahs={ayahs} ayahNumber={tafsirAyah} onAyahChange={setTafsirAyah} onClose={() => setTafsirAyah(null)} />}
      {surah && <DownloadSheet surah={surah} open={downloadOpen} onOpenChange={setDownloadOpen} />}
      <PlayerBar surahs={surahs} />
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} surahs={surahs} />
      <AccountSheet open={accountOpen} onOpenChange={setAccountOpen} />
    </div>
  );
}
