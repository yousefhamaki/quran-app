# Quran App — Design System (Master)

Source of truth for the UI. Generated with the **ui-ux-pro-max** skill (`--design-system`, dials: variance 3 / motion 4 / density 4), then adapted by hand: the generator returned a generic "scroll-triggered storytelling" pattern and a luxury-fashion font pairing, neither of which fits a reading app. The product-type, typography (`Arabic Elegant`) and shadcn-stack searches were used instead; where no database match existed for "Islamic" the closest ("Church/Religious Organization → Accessible & Ethical + Soft UI Evolution, secondary Minimalism") was adapted.

## Product
Bilingual (Arabic RTL / English LTR) Quran reader with per-ayah audio, tafsir, search and optional account sync. Used for long, calm reading sessions, often one-handed on a phone, often at night.

## Style
**Soft UI Evolution + Minimalism.** Generous whitespace, one primary action per screen, soft shadows, 16px+ radii. Ornament (gold) is decorative only — never carries meaning or text on its own.

## Color (semantic tokens in `src/index.css`)
| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | `#faf7f0` ivory | `#0c1512` | page |
| `card` | `#ffffff` | `#121e19` | surfaces |
| `foreground` | `#1c2a24` | `#eaf1ec` | text (≥ 12:1) |
| `muted-foreground` | `#5b6b63` | `#9db0a6` | secondary text (≥ 4.5:1) |
| `primary` | `#0b5d4b` emerald | `#4fc596` | actions, focus ring |
| `accent` | `#e6f1ec` | `#1f3a2e` | hover / selected rows |
| `gold` / `gold-foreground` | `#b7892b` / `#7a5a12` | `#e0b65a` / `#e9c978` | ayah markers, bookmarks, bismillah |
| `destructive` | `#c0392b` | `#ef6a5b` | errors |

Rules: never hard-code hex in components; always semantic tokens. Both themes ship complete; theme = light / dark / system (`src/context/theme.tsx`, no-flash inline script in `index.html`).

## Typography
- **Quran text:** Amiri Quran (`font-quran`), size user-controlled via `--ayah-size` (20–60px, default 32), line-height 2.3.
- **Headings:** Cormorant Garamond → Noto Naskh Arabic (`font-display`).
- **UI/body:** Inter → Noto Sans Arabic (`font-sans`), 16px base, 1.5 line-height.
- Translation text is always `dir="ltr"`; Quran text is always `dir="rtl"`, independent of UI language.

## Layout
Mobile-first, single column up to `max-w-3xl`; surah grid 1 col → 2 cols at `sm`. Use **logical** utilities (`ms-/me-/ps-/pe-/start/end`, `rtl:` variants) — never `left/right` — so Arabic flips correctly. Sticky glass header (64px), floating glass player bar with safe-area padding. Spacing scale: 4/8/12/16/24/32.

## Components — all from shadcn/ui (`src/components/ui`)
Button, Input, Sheet, Tabs, Select, Switch, Slider, Badge, Card, ScrollArea, Skeleton, Tooltip, Sonner, ToggleGroup, Label, Separator, DropdownMenu, Dialog, Drawer. App components compose these; no hand-rolled primitives.

| Surface | Pattern |
|---|---|
| Ayah actions (listen / tafsir / bookmark) | `Sheet` side=bottom with `Tabs` |
| Settings, Account | `Sheet` side=right |
| Reciter / tafsir / speed pickers | `Select` / `ToggleGroup` |
| Loading | `Skeleton` that mirrors the final layout (no layout shift) |
| Feedback | `sonner` toast for sign-in/out; inline `role="alert"` for form errors |

## Interaction & motion
- Touch targets ≥ 44px; icon-only buttons always have `aria-label` (+ Tooltip on desktop).
- Visible focus ring (`ring-[3px] ring-ring/50`) on every interactive element; full keyboard operation.
- Motion 150–400ms, ease-out; entrance = fade + 10px rise with 30ms stagger (`.rise-in`); playing ayah gets a slow pulse. **All motion disabled under `prefers-reduced-motion`.**
- Deep links: `#/s/<surah>[/<ayah>]`; browser back returns to the surah list.

## Accessibility checklist (pre-delivery)
- [x] Text contrast ≥ 4.5:1 in both themes; gold used only decoratively or with `gold-foreground`
- [x] No emoji icons — Lucide SVG only
- [x] `cursor-pointer` on clickables, hover/focus/active states
- [x] RTL + LTR verified; `lang`/`dir` set on `<html>`
- [x] Reduced motion respected
- [x] Responsive 375 / 768 / 1024+
- [x] `aria-live` on search results and tafsir; sheets labelled
