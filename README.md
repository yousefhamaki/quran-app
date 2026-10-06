# Quran App | القرآن الكريم

A bilingual (Arabic / English) Quran web app. Read any surah, tap an ayah, and choose which sheikh recites it.

## Features

- All 114 surahs, Arabic (Uthmani) text with English Sahih International translation
- Tap any ayah → pick from 10 reciters → that ayah plays in their voice
- Tafsir for any ayah: Al-Muyassar, As-Saadi, Ibn Kathir (Arabic) and Ibn Kathir (English)
- Continuous play, playback speed (0.75x–1.5x)
- Search surahs by name or number (diacritic-insensitive)
- Bookmarks, remembered reciter / language / speed
- Arabic (RTL) and English (LTR) UI, light/dark mode
- Installable PWA

## Free APIs (no key required)

| Purpose | API |
|---|---|
| Quran text + translation | [AlQuran Cloud](https://alquran.cloud/api) |
| Tafsir | [Quran.com API v4](https://api.quran.com/api/v4) |
| Per-ayah audio | [EveryAyah](https://everyayah.com) |

Reciters are listed in [`src/api.js`](src/api.js); add more by appending an EveryAyah folder name.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Build

```bash
npm run build     # outputs to dist/
npm run preview   # serve the production build
```

## Share the dev server (Cloudflare Quick Tunnel)

```bash
cloudflared tunnel --url http://localhost:5173
```

`*.trycloudflare.com` hosts are already allowed in [`vite.config.js`](vite.config.js).

## Tech

React 18 + Vite. No backend.
