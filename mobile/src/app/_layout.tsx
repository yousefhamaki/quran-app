import '../global.css';

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
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
import { NotoSansArabic_400Regular, NotoSansArabic_500Medium, NotoSansArabic_600SemiBold } from '@expo-google-fonts/noto-sans-arabic';
import { PlayerBar, PlayerSheet } from '@/components/player';
import { AccountSheet } from '@/components/sheets/account-sheet';
import { AyahSheet } from '@/components/sheets/ayah-sheet';
import { DownloadSheet } from '@/components/sheets/download-sheet';
import { SettingsSheet } from '@/components/sheets/settings-sheet';
import { TafsirSheet } from '@/components/sheets/tafsir-sheet';
import { initStorage } from '@/lib/storage';
import { AuthProvider } from '@/context/auth';
import { DownloadsProvider } from '@/context/downloads';
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

function Shell() {
  const { isRTL } = useSettings();
  const { theme } = useUniwind();
  return (
    <LayoutDirection rtl={isRTL}>
      <View className="flex-1 bg-background">
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' }, animation: 'slide_from_right' }} />
        <PlayerBar />
        <AyahSheet />
        <TafsirSheet />
        <DownloadSheet />
        <SettingsSheet />
        <AccountSheet />
        <PlayerSheet />
        <FollowAutoSurah />
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
                      <UIProvider>
                        <Shell />
                      </UIProvider>
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
