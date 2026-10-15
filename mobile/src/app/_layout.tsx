import '../global.css';

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Notifications from 'expo-notifications';
import { Stack, usePathname, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LayoutDirection, useUniwind } from 'uniwind';
import { AmiriQuran_400Regular } from '@expo-google-fonts/amiri-quran';
import { CormorantGaramond_600SemiBold } from '@expo-google-fonts/cormorant-garamond';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { NotoNaskhArabic_600SemiBold } from '@expo-google-fonts/noto-naskh-arabic';
import { ScheherazadeNew_400Regular } from '@expo-google-fonts/scheherazade-new';
import { NotoSansArabic_400Regular, NotoSansArabic_500Medium, NotoSansArabic_600SemiBold } from '@expo-google-fonts/noto-sans-arabic';
import { BottomNav, NAV_HEIGHT, useShowNav } from '@/components/bottom-nav';
import { PlayerBar, PlayerSheet } from '@/components/player';
import { Onboarding } from '@/components/sheets/onboarding';
import { AccountSheet } from '@/components/sheets/account-sheet';
import { AyahSheet } from '@/components/sheets/ayah-sheet';
import { DownloadSheet } from '@/components/sheets/download-sheet';
import { SettingsSheets } from '@/components/sheets/settings-sheet';
import { TafsirSheet } from '@/components/sheets/tafsir-sheet';
import { WordSheet } from '@/components/sheets/word-sheet';
import { RangeSheet } from '@/components/sheets/range-sheet';
import { initStorage, loadJSON, saveJSON } from '@/lib/storage';
import { AuthProvider } from '@/context/auth';
import { DownloadsProvider } from '@/context/downloads';
import { HabitProvider } from '@/context/habit';
import { PrayerProvider } from '@/context/prayer';
import { HifzProvider } from '@/context/hifz';
import { LibraryProvider } from '@/context/library';
import { PlayerProvider, usePlayer } from '@/context/player';
import { SettingsProvider, useSettings } from '@/context/settings';
import { SurahsProvider } from '@/context/surahs';
import { ToastProvider } from '@/context/toast';
import { UIProvider } from '@/context/ui';

void SplashScreen.preventAutoHideAsync();

/** When playback rolls into the next surah by itself, show that surah. */
function FollowAutoSurah() {
  const router = useRouter();
  const { autoSurah } = usePlayer();
  useEffect(() => {
    if (autoSurah) router.replace({ pathname: '/surah/[id]', params: { id: String(autoSurah.surah) } });
  }, [autoSurah?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Tapping the daily-ayah reminder opens that ayah in the reader. */
function OpenReminderTarget() {
  const router = useRouter();
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const open = (response: Notifications.NotificationResponse) => {
      // The "last response" is remembered by the OS, so make sure one tap only opens the reader once.
      const id = response.notification.request.identifier;
      if (loadJSON<string>('quran.lastNotification', '') === id) return;
      saveJSON('quran.lastNotification', id);
      const data = response.notification.request.content.data;
      const surah = Number(data?.surah);
      const ayah = Number(data?.ayah);
      if (surah >= 1 && surah <= 114) router.push({ pathname: '/surah/[id]', params: { id: String(surah), ayah: String(ayah || 1) } });
    };
    // The app was closed and the notification launched it.
    void Notifications.getLastNotificationResponseAsync().then(r => { if (r) open(r); });
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [router]);
  return null;
}

/**
 * The app stays in portrait, except in the Mushaf view when the user allows landscape (Mushaf settings).
 * Web has no orientation lock.
 */
function OrientationGuard() {
  const pathname = usePathname();
  const { mushaf } = useSettings();
  const free = pathname.startsWith('/surah') && mushaf.view !== 'list' && mushaf.allowLandscape;
  useEffect(() => {
    if (Platform.OS === 'web') return;
    void (free ? ScreenOrientation.unlockAsync() : ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)).catch(() => {});
  }, [free]);
  return null;
}

function Shell() {
  const { isRTL } = useSettings();
  const showNav = useShowNav();
  const { theme } = useUniwind();
  return (
    <LayoutDirection rtl={isRTL}>
      <View className="flex-1 bg-background">
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' }, animation: 'slide_from_right' }} />
        <PlayerBar lifted={showNav} />
        {showNav ? <BottomNav /> : null}
        <AyahSheet />
        <TafsirSheet />
        <WordSheet />
        <DownloadSheet />
        <RangeSheet />
        <SettingsSheets />
        <OrientationGuard />
        <AccountSheet />
        <Onboarding />
        <PlayerSheet />
        <FollowAutoSurah />
        <OpenReminderTarget />
      </View>
    </LayoutDirection>
  );
}

export default function RootLayout() {
  const [storageReady, setStorageReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    AmiriQuran_400Regular,
    CormorantGaramond_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    NotoNaskhArabic_600SemiBold,
    NotoSansArabic_400Regular,
    ScheherazadeNew_400Regular,
    NotoSansArabic_500Medium,
    NotoSansArabic_600SemiBold,
  });

  useEffect(() => { void initStorage().then(() => setStorageReady(true)); }, []);
  const ready = storageReady && (fontsLoaded || !!fontError);
  useEffect(() => { if (ready) void SplashScreen.hideAsync(); }, [ready]);
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <LibraryProvider>
            <ToastProvider>
              <AuthProvider>
                <DownloadsProvider>
                  <PlayerProvider>
                    <SurahsProvider>
                      <HifzProvider>
                        <HabitProvider>
                          <PrayerProvider>
                            <UIProvider>
                              <Shell />
                            </UIProvider>
                          </PrayerProvider>
                        </HabitProvider>
                      </HifzProvider>
                    </SurahsProvider>
                  </PlayerProvider>
                </DownloadsProvider>
              </AuthProvider>
            </ToastProvider>
          </LibraryProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
