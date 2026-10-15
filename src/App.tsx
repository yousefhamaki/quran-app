import { useCallback, useEffect, useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { Home } from '@/components/home';
import { Reader } from '@/components/reader';
import { AyahSheet } from '@/components/ayah-sheet';
import { TafsirSheet } from '@/components/tafsir-sheet';
import { WordSheet } from '@/components/word-sheet';
import { DownloadSheet } from '@/components/download-sheet';
import { PlayerBar } from '@/components/player-bar';
import { SettingsSheet } from '@/components/settings-sheet';
import { MushafSettingsSheet } from '@/components/mushaf-settings-sheet';
import { MushafView } from '@/components/mushaf-view';
import { MorePage } from '@/components/more-page';
import { Onboarding, ONBOARDED_KEY } from '@/components/onboarding';
import { QueueSheet } from '@/components/queue-sheet';
import { setPlayerSheet } from '@/lib/ui-store';
import { loadJSON } from '@/lib/storage';
import type { Feature } from '@/lib/features';
import { PlanPage } from '@/components/plan-page';
import { DailyPage } from '@/components/daily-page';
import { PrayerPage } from '@/components/prayer-page';
import { CalendarPage } from '@/components/calendar-page';
import { AdhkarPage } from '@/components/adhkar-page';
import { BottomNav, NAV_HEIGHT, type Tab } from '@/components/bottom-nav';
import { RangeSheet } from '@/components/range-sheet';
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

const PAGE_TITLES = { plan: 'planTitle', daily: 'dailyTitle', prayer: 'prayerTitle', calendar: 'calendarTitle', adhkar: 'adhkarTitle', more: 'moreTitle' } as const;

export default function App() {
  const { settings, mushaf, t } = useSettings();
  const { user } = useAuth();
  const { markRead } = useLibrary();
  const { autoSurah, setSurahCounts, startRange, playing } = usePlayer();
  const { route, go, goPage } = useHashRoute();
  const online = useOnline();
  const { records } = useDownloads();
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [selectedAyah, setSelectedAyah] = useState<number | null>(null);
  const [tafsirAyah, setTafsirAyah] = useState<number | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Which settings the gear opens: in the reader the Mushaf ones (with a link to the general ones), elsewhere the general ones.
  // The More screen can ask for either.
  const [settingsScope, setSettingsScope] = useState<'auto' | 'mushaf' | 'general'>('auto');
  const [queueOpen, setQueueOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(() => loadJSON<boolean>(ONBOARDED_KEY, false) !== true);
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
  }, [surah, settings.translation]);

  useEffect(() => { if (route.surah && route.ayah) markRead(route.surah, route.ayah); }, [route.surah, route.ayah, markRead]);

  // Any sheet that was open belongs to the previous surah.
  useEffect(() => { setTafsirAyah(null); setSelectedAyah(null); setDownloadOpen(false); setRangeOpen(false); }, [route.surah]);

  // "Practice" from the memorization plan: loop the portion and open it in the reader.
  const practice = (surahNo: number, from: number, to: number) => {
    startRange({ surah: surahNo, from, to, rounds: 5 }, settings.reciter);
    go(surahNo, from);
  };

  // Bottom tabs on the four top-level screens; the reader and the sub-pages (calendar, adhkar) have their own back button.
  const tab: Tab | null = surah ? null : route.page === null ? 'quran' : route.page === 'daily' || route.page === 'prayer' || route.page === 'plan' || route.page === 'more' ? route.page : null;
  const selectTab = (next: Tab) => (next === 'quran' ? go(null) : goPage(next));

  // What the More screen can open (it owns no sheets itself).
  const openGeneral = () => { setSettingsScope('general'); setSettingsOpen(true); };
  const openFeature = (f: Feature) => {
    const target = f.target;
    switch (target.kind) {
      case 'page': goPage(target.page, target.param); break;
      case 'quran': go(null); break;
      case 'settings': openGeneral(); break;
      case 'mushafSettings': setSettingsScope('mushaf'); setSettingsOpen(true); break;
      case 'downloads': setQueueOpen(true); break;
      case 'player': if (playing) setPlayerSheet(true); else openGeneral(); break;
      case 'account': setAccountOpen(true); break;
      case 'setup': setSetupOpen(true); break;
    }
  };

  const sheetAyah = selectedAyah ? ayahs.find(a => a.number === selectedAyah) ?? null : null;

  return (
    <div className="min-h-dvh">
      <AppHeader
        title={route.page ? t(PAGE_TITLES[route.page]) : surah ? (ar ? surah.name : surah.englishName) : t('appName')}
        subtitle={surah ? `${ar ? surah.englishName : surah.englishNameTranslation} · ${surah.numberOfAyahs} ${t('ayahs')}` : undefined}
        onBack={surah || route.page === 'calendar' || route.page === 'adhkar' ? () => { setTafsirAyah(null); go(null); } : undefined}
        onOpenSettings={() => { setSettingsScope('auto'); setSettingsOpen(true); }}
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

      <main style={tab ? { paddingBottom: NAV_HEIGHT } : undefined}>
        {route.page === 'daily' ? (
          <DailyPage surahs={surahs} onOpen={(s, a) => go(s, a)} onOpenPage={goPage} initialTab={route.param} />
        ) : route.page === 'plan' ? (
          <PlanPage surahs={surahs} onPractice={practice} />
        ) : route.page === 'more' ? (
          <MorePage
            surahs={surahs}
            actions={{
              openFeature,
              openSettings: openGeneral,
              openMushafSettings: () => { setSettingsScope('mushaf'); setSettingsOpen(true); },
              openDownloads: () => setQueueOpen(true),
              openPlayer: () => (playing ? setPlayerSheet(true) : openGeneral()),
              openAccount: () => setAccountOpen(true),
              openSetup: () => setSetupOpen(true),
              openPage: p => goPage(p),
              openAyah: (s, a) => go(s, a),
            }}
          />
        ) : route.page === 'prayer' ? (
          <PrayerPage onOpenPage={goPage} initialTab={route.param} />
        ) : route.page === 'calendar' ? (
          <CalendarPage onOpenDaily={() => goPage('daily')} />
        ) : route.page === 'adhkar' ? (
          <AdhkarPage initial={route.param} />
        ) : surah ? (
          mushaf.view !== 'list' ? (
          <MushafView surahs={surahs} surah={surah.number} ayah={route.ayah ?? 1} onNavigate={(s, a) => go(s, a)} onOpenTafsir={setTafsirAyah} />
        ) : (
          <Reader surah={surah} focusAyah={route.ayah} onSelectAyah={setSelectedAyah} onOpenTafsir={setTafsirAyah} onOpenDownload={() => setDownloadOpen(true)} onOpenRange={() => setRangeOpen(true)} />
        )
        ) : (
          <Home surahs={surahs} loading={status === 'loading'} error={status === 'error'} onRetry={loadSurahs} onOpen={(s, a) => go(s, a)} onOpenPage={goPage} />
        )}
      </main>

      {surah && <AyahSheet surah={surah} ayah={sheetAyah} open={selectedAyah !== null} onOpenChange={o => !o && setSelectedAyah(null)} />}
      <WordSheet surahName={n => { const s = surahs.find(x => x.number === n); return s ? (ar ? s.name : s.englishName) : String(n); }} />
      {surah && <TafsirSheet surah={surah} ayahs={ayahs} ayahNumber={tafsirAyah} onAyahChange={setTafsirAyah} onClose={() => setTafsirAyah(null)} />}
      {surah && <RangeSheet surah={surah} open={rangeOpen} onOpenChange={setRangeOpen} suggestFrom={route.ayah ?? undefined} />}
      {surah && <DownloadSheet surah={surah} open={downloadOpen} onOpenChange={setDownloadOpen} />}
      <PlayerBar surahs={surahs} lifted={tab !== null} />
      {tab && <BottomNav active={tab} onSelect={selectTab} />}
      {settingsScope === 'mushaf' || (settingsScope === 'auto' && surah) ? (
        <MushafSettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} onOpenGeneral={() => setSettingsScope('general')} />
      ) : (
        <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} surahs={surahs} />
      )}
      <QueueSheet surahs={surahs} open={queueOpen} onOpenChange={setQueueOpen} />
      <Onboarding open={setupOpen} onClose={() => setSetupOpen(false)} />
      <AccountSheet open={accountOpen} onOpenChange={setAccountOpen} />
    </div>
  );
}
