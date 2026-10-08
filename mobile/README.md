# Quran App — Mobile (Android & iOS)

React Native app built with **Expo (SDK 57)**, **Expo Router**, **Uniwind** (Tailwind v4 for React Native) and **React Native Reusables** (the shadcn/ui port for React Native). It mirrors the web app in the repo root: same design tokens (emerald on ivory, gold ornament), same features, Arabic (RTL) and English (LTR).

It is shipped as **standalone native builds** (`.apk` / `.ipa`) that you can share through **Diawi** — it does not use Expo Go.

## Features

Tap-to-play with your saved reciter · play a whole surah · continuous play + auto-next surah · repeat each ayah N times · pause between ayahs ("your turn") · sleep timer · memorize mode · tafsir (4 sources) · surah + full-text search · bookmarks and "continue reading" · offline downloads (text + audio) with an "Available offline" section · background audio with lock-screen controls · light/dark/system theme · optional account sync with `../backend`.

## Structure

```
mobile/
  src/app/            Expo Router screens: index.tsx (home), surah/[id].tsx (reader), _layout.tsx (providers + sheets)
  src/components/     app components; ui/ = React Native Reusables (shadcn-style) primitives
  src/components/sheets/   settings, account, ayah options, tafsir, offline download
  src/context/        settings, library, player (expo-audio), downloads, auth, toast, ui
  src/lib/            quran API, offline storage (expo-file-system), backend client, i18n, storage
  android/            generated native Android project (expo prebuild)
  ios/                generated on a Mac, see below
```

## Develop

```bash
cd mobile
npm install
npm run web          # quick UI preview in a browser (audio + layout; offline downloads need a device)
npm run android      # build & run on a connected Android device / emulator (expo run:android)
```

Optional account sync: copy `.env.example` to `.env`, set `EXPO_PUBLIC_API_URL` to a URL the **phone** can reach (e.g. `http://192.168.1.10:4000/api` on the same Wi-Fi, or your deployed backend).

## Build an Android APK for Diawi

Requirements: JDK 17 and the Android SDK (`ANDROID_HOME`, e.g. `%LOCALAPPDATA%\Android\Sdk`).

```bash
cd mobile
npx expo prebuild --platform android      # only needed after changing app.json / plugins / native deps
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

The APK is written to `android/app/build/outputs/apk/release/app-release.apk`. Upload it at https://www.diawi.com and share the link.

Notes
- `-PreactNativeArchitectures=arm64-v8a` builds for 64-bit ARM phones (almost every phone since 2017) and keeps the build fast. Drop the flag to include 32-bit ARM and x86 emulators (larger APK, longer build).
- The release build is signed with the debug keystore that `expo prebuild` generates. That is fine for Diawi testing; create your own keystore before publishing to Google Play.
- Android needs "install unknown apps" allowed for the browser used to open the Diawi link.

## Build an iOS IPA for Diawi

Diawi only installs **ad-hoc / enterprise signed** IPAs, so you need an Apple Developer account ($99/year) and each test device's UDID registered.

**Option A — EAS Build (works from Windows, no Mac needed)**

```bash
npm install -g eas-cli
cd mobile
eas login
eas device:create                          # register testers' iPhones (UDID)
eas build --platform ios --profile preview # produces an ad-hoc .ipa
eas build --platform android --profile preview   # optional: cloud APK instead of local
```

Download the `.ipa` from the EAS build page and upload it to Diawi.

**Option B — on a Mac**

```bash
cd mobile
npx expo prebuild --platform ios           # creates the ios/ folder (Expo only generates it on macOS)
open ios/*.xcworkspace                     # Xcode: set your Team, then Product → Archive → Distribute App → Ad Hoc
```

Export the `.ipa` and upload it to Diawi. The bundle id is `com.Anspire.Quran` (change it in `app.json` → `ios.bundleIdentifier` / `android.package`).

## Implementation notes

- **Audio:** `expo-audio` with background playback and lock-screen controls (`shouldPlayInBackground`, `setActiveForLockScreen`).
- **Offline:** audio is saved to `documentDirectory/quran-audio/<reciter>/<surah>/<ayah>.mp3` (`expo-file-system`); text/tafsir responses you open are cached as files. Network state comes from `@react-native-community/netinfo`, so "Wi-Fi without internet" counts as offline. Auto-next surah follows the mushaf order online and jumps to the next *downloaded* surah offline.
- **RTL:** Uniwind's `<LayoutDirection rtl>` flips the layout when Arabic is selected; no app restart is needed.
- **Fonts:** Amiri Quran (ayah text), Cormorant Garamond (headings), Inter / Noto Sans Arabic (UI), loaded with `expo-font`. React Native needs one font file per weight, so `components/ui/text.tsx` maps weight utilities onto the loaded files.
- **Sheets:** bottom sheets are built on the native `Modal` (`components/sheet.tsx`) so they work on iOS, Android and web.
