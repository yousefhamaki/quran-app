# Quran App | القرآن الكريم

A premium, bilingual (Arabic / English) Quran web app. Read any surah, tap an ayah, and choose which sheikh recites it.

- **Frontend:** React 19 + Vite + TypeScript + Tailwind v4 + **shadcn/ui** (design system in [`design-system/quran-app/MASTER.md`](design-system/quran-app/MASTER.md))
- **Mobile (Android & iOS):** React Native + Expo + Uniwind + React Native Reusables in [`mobile/`](mobile/README.md), shipped as APK/IPA builds for Diawi
- **Backend (optional sync):** Express + TypeScript following the Hamaki SOLID standard — see [`backend/`](backend/README.md)

## Features

- All 114 surahs, Arabic (Uthmani) text with English Sahih International translation
- Tap any ayah to play it instantly with your saved reciter and settings (tap again to pause); the ⋯ button opens reciter, tafsir and bookmark. "Play surah" starts from ayah 1. Continuous play, speed 0.75x–1.5x
- Every choice is remembered on the device: reciter, speed, text size, theme, language, tafsir, pause, repeat, memorize mode, pinned reciters
- **Offline downloads**: save a surah (text + audio for your reciter) and listen without internet. Saved surahs are listed under "Available offline" on the home screen and marked with a check; an offline banner appears when you lose connection. Manage storage in Settings. Anything you open is also cached for reading, and the service worker keeps the app shell and fonts so it opens offline (production build)
- **Sleep timer** (5–60 min with a 5-second fade-out, or stop at the end of the surah) and **continue to the next surah** automatically for hands-free listening. Online it follows the mushaf order; offline it jumps to the next surah you have downloaded (for the same reciter), skipping the rest
- **Memorize mode**: blurs the Arabic text so you recite from memory; reveal one ayah or all of them with the eye buttons
- **Repeat each ayah** 2×, 3×, 5×, 7×, 10× or forever, with a "Repeat 2/5" indicator, for memorizing
- **Pause between ayahs**: set Normal or 1–60 seconds of silence after each ayah (with a live "Your turn" countdown) so you can repeat it yourself; works with continuous play and repeat-ayah
- **Tafsir button on every ayah**: opens a dedicated reader with all sources one tap away (Al-Muyassar, As-Saadi, Ibn Kathir Arabic, Ibn Kathir English) and previous/next ayah navigation; your source choice is remembered
- Surah-name filter and full-text search across every ayah (Arabic or English) with highlighted matches
- "Continue reading", bookmarks, adjustable text size, show/hide translation
- Light / dark / system theme, Arabic (RTL) and English (LTR) UI, deep links (`#/s/2/255`)
- Installable PWA
- Optional account: sync bookmarks, reading progress and settings across devices

## Free APIs (no key required)

| Purpose | API |
|---|---|
| Quran text + translation + search | [AlQuran Cloud](https://alquran.cloud/api) |
| Tafsir | [Quran.com API v4](https://api.quran.com/api/v4) |
| Per-ayah audio | [EveryAyah](https://everyayah.com) |

Reciters are listed in [`src/lib/quran.ts`](src/lib/quran.ts); add more by appending an EveryAyah folder name.

## Run the frontend

```bash
npm install
npm run dev        # http://localhost:5173
```

The app works fully as a guest. To enable account sync, run the backend and set the API URL:

```bash
cp .env.example .env.local     # VITE_API_URL=http://localhost:4000/api
```

## Run the backend

See [`backend/README.md`](backend/README.md) (needs MongoDB; `docker-compose.yml` included).

## Scripts

```bash
npm run typecheck   # tsc --noEmit
npm run build       # typecheck + production build to dist/
npm run preview     # serve the production build
```

## Deploy (Vercel)

The frontend lives at the repo root. Set `VITE_API_URL` in the Vercel project's environment variables if you host the backend; otherwise leave it unset and the app runs guest-only.

## Share the dev server (Cloudflare Quick Tunnel)

```bash
cloudflared tunnel --url http://localhost:5173
```

`*.trycloudflare.com` hosts are already allowed in [`vite.config.ts`](vite.config.ts).
