# Quran App | القرآن الكريم

A premium, bilingual (Arabic / English) Quran web app. Read any surah, tap an ayah, and choose which sheikh recites it.

- **Frontend:** React 19 + Vite + TypeScript + Tailwind v4 + **shadcn/ui** (design system in [`design-system/quran-app/MASTER.md`](design-system/quran-app/MASTER.md))
- **Backend (optional sync):** Express + TypeScript following the Hamaki SOLID standard — see [`backend/`](backend/README.md)

## Features

- All 114 surahs, Arabic (Uthmani) text with English Sahih International translation
- Tap any ayah → pick from 10 reciters → that ayah plays in their voice; continuous play, speed 0.75x–1.5x
- **Repeat each ayah** 2×, 3×, 5×, 7×, 10× or forever, with a "Repeat 2/5" indicator, for memorizing
- **Pause between ayahs**: set Normal or 1–60 seconds of silence after each ayah (with a live "Your turn" countdown) so you can repeat it yourself; works with continuous play and repeat-ayah
- Tafsir for any ayah: Al-Muyassar, As-Saadi, Ibn Kathir (Arabic) and Ibn Kathir (English)
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
