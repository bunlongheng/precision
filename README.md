# Precision

A fast, lightweight browser photo editor. Drop an image, tone it black and white, apply filters, add text, build collages, layer images, and brush the original color back with the selective-color brush. iPad and Apple Pencil ready. Everything runs on your device.

![Precision - painting color back onto a black and white photo with the color-splash brush](docs/screenshots/hero-color-splash.png)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-149eca?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript)
![Tests](https://img.shields.io/badge/tests-23%20unit%20%2B%2010%20e2e-c9f24d)
![Deploy](https://img.shields.io/badge/Vercel-live-000?logo=vercel)

**Live:** [precision-bheng.vercel.app](https://precision-bheng.vercel.app)

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Project layout](#project-layout)
- [Design decisions and trade-offs](#design-decisions-and-trade-offs)
- [License](#license)

## Features

- **Color-splash brush** - the photo drops to black and white; paint to bring the original color back only where you brush. Paint and erase modes, adjustable size and softness, Apple Pencil pressure, per-stroke undo.
- **Blur brush** - paint to blur an area (hide a face, soften a background) in 3 styles: **soft** (gaussian), **pixelate** (mosaic), and **secure** (scrambled pixels for redaction), with a strength control.
- **Tone and filters** - 24 one-tap looks (Noir, Silver, Sepia, Vintage, Cinema, Frost, Golden, Moody, Neon, Sunset, ...) plus brightness, contrast, saturation, black and white, sepia, tint, and blur sliders. Each filter shows a live preview of your own photo.
- **Text** - multi-line captions with font, weight, italic, alignment, size, letter spacing, rotation, opacity, color, and highlight.
- **Image layers** - drop images on top of images, then move, resize, rotate, round the corners, reorder, and duplicate.
- **Projects** - every project (images and the brush masks) is saved locally in the browser. A gallery lets you resume or delete past work.
- **Export and share** - download a PNG, or share straight to iMessage / AirDrop through the native share sheet.
- **Owner-only access** - optional passcode or Google sign-in gate (off by default; the app runs open).
- **Light and dark**, responsive, and iPad friendly.

![Live filter previews of your own photo](docs/screenshots/filters.png)

## Architecture

Precision is a fully client-side editor. Pure, framework-free logic lives in `lib/*` and is unit-tested; a single deterministic canvas renderer is shared by the live stage and the exporter, so what you see is exactly what you save. Images never leave the device.

```mermaid
flowchart LR
    User([You / iPad]) -->|HTTPS| Next[Next.js App]
    Next -.->|optional session| Auth[Auth.js - Google, owner only]
    Next --> Shell[AppShell - projects gallery]
    Shell --> Editor[Editor - state, history, files]
    Editor --> Render[Canvas renderer]
    Editor --> Lib[lib/* pure logic]
    Editor --> IDB[(IndexedDB - resume)]
    Render --> Export[PNG export / native share]
    Next -.->|deploy| Vercel((Vercel))
```

| Layer | Role |
|-------|------|
| `lib/*` | Pure, tested logic: filters, geometry, undo/redo history, color, project store |
| `components/render.ts` | Deterministic canvas compositor (base + color-splash + blur) shared by the live stage and export |
| `components/*.tsx` | UI: Editor orchestrator, Stage (canvas + pointer/brush), TopBar, Toolbar, RightPanel, DropZone |
| `hooks/*` | Image cache, theme (`useSyncExternalStore`), and the reusable paint-mask hook |
| `auth.ts` + `app/api/auth` | Optional owner-only passcode / Google sign-in |

### How the color-splash brush works

The brush is the heart of the app, and it is a two-draw composite rather than a per-pixel loop:

```mermaid
sequenceDiagram
    participant U as You
    participant S as Stage
    participant M as Mask canvas
    participant R as Renderer
    U->>S: paint a stroke
    S->>M: draw soft white dabs at the stroke
    R->>R: draw the photo in black and white
    R->>R: draw the full-color photo, kept only where the mask has ink (destination-in)
    R-->>U: color shows through exactly where you painted
```

## Tech stack

- **Next.js 16** (App Router) and **React 19**
- **TypeScript** (strict) and **Tailwind CSS v4**
- **HTML5 Canvas 2D** for all rendering (GPU `ctx.filter`, no heavy image libraries)
- **Auth.js** (NextAuth v5) for optional Google sign-in
- **IndexedDB** for local-first project storage
- **node:test** (23 unit tests) and **Playwright** (10 e2e, desktop + iPad)
- **Vercel** hosting, **GitHub Actions** CI

## Quick start

```bash
git clone https://github.com/bunlongheng/precision.git
cd precision
npm install
npm run dev
```

Open [http://localhost:3040](http://localhost:3040). Drop a photo and start editing - no account or setup required.

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # 23 unit tests (node:test)
npm run test:e2e    # 10 Playwright specs
```

## Configuration

No environment variables are required - the app runs fully open by default. To lock it to the owner, copy `.env.example` to `.env.local` and set either a passcode or Google OAuth:

| Env var | Required | Purpose |
|---------|----------|---------|
| `AUTH_ACCESS_CODE` | passcode gate | A shared secret; the app then shows an unlock screen |
| `AUTH_GOOGLE_ID` | Google gate | Google OAuth client id |
| `AUTH_GOOGLE_SECRET` | to enable auth | Google OAuth client secret |
| `AUTH_SECRET` | when auth is on | Session encryption secret (`openssl rand -base64 32`) |
| `AUTH_OWNER_EMAIL` | optional | The only email allowed to sign in |

When the Google values are unset, sign-in is disabled and the editor is open. When they are set, only `AUTH_OWNER_EMAIL` can hold a session.

## Project layout

```
precision/
  app/
    layout.tsx          # fonts, metadata, theme bootstrap
    page.tsx            # auth gate -> SignIn or AppShell
    manifest.ts         # PWA / add-to-home-screen
    api/auth/[...nextauth]/route.ts
  components/
    AppShell.tsx        # projects gallery + view switch
    Editor.tsx          # state, history, brush masks, files, export, share
    Stage.tsx           # canvas + pointer handling + color-splash / blur brush
    render.ts           # canvas compositor (live + export)
    FilterThumb.tsx     # live per-filter preview of your photo
    TopBar / Toolbar / RightPanel / DropZone / SignIn / HelpModal / Ambient / ui / icons
  lib/
    types.ts filters.ts geometry.ts history.ts color.ts projectStore.ts
  hooks/
    useImageCache.ts useTheme.ts usePaintMask.ts
  tests/                # 28 node:test unit tests
  e2e/                  # 10 Playwright specs
  auth.ts               # optional owner-only Google sign-in
```

## Design decisions and trade-offs

| Decision | Chosen | Alternative | Why this trade-off | Cost we accept |
|----------|--------|-------------|--------------------|----------------|
| Rendering | Native Canvas 2D + `ctx.filter` | fabric.js / konva | Tiny bundle, GPU filters, "fast and light" | More manual layer math |
| Filters | CSS filter string | per-pixel JS loops | Hardware accelerated, smooth on iPad | Limited to CSS filter primitives |
| Storage | IndexedDB, images as data URLs | server + database | Local-first, private, zero backend | No cross-device sync |
| Working size | Cap imports to 2048px | full-resolution edit | Keeps every operation fast | Very large prints lose detail |
| Auth | Optional, fail-open | always required | App deploys and demos without credentials | Must set env to actually lock it |

---

<div align="center">

<a href="https://bunlongheng.com"><img src="https://img.shields.io/badge/-bunlongheng.com-3A3A3C?style=for-the-badge&amp;labelColor=2A2A2C&amp;logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAMAAABF0y%2BmAAADAFBMVEXx8vLq6v%2F19fX09PT8%2Ff309PT5%2BfnAwMBMaXHx8vL19fX5%2Bfny8vL09PT39%2Ff6%2Bfn6%2Bvr09PTx8fH4%2BPn%2F8vLy8%2FP09PTz8%2FPy8vL%2F%2F%2F%2Fz9PTz9PP19fby8vP19PXz8%2FT19%2Fb08%2FTx8vLy8vL09vby8%2FL29vf19fTv8PDz9vb7%2Bvn%2F%2Ff%2F9%2Ff3w8vH29fb%2F%2FP339%2Ff5%2Bfn59%2Ff19PT09PR7rao3VF3%2F%2Fv8AKDR6sqsBV1vv8fL4%2BPiux8b8%2Bvq90NDy8%2FR%2BlpppnZyZqrACLTxclZJSkI9en5ssZ2luqaUAeWgqbW4BX1gCfG0%2Fa3QaVG0MN0UKNUKUpKsGpYMAKjoRQ1UDf3AQRloJqIgEm32d0cUBg3ElbnQIln8eVWgrmIdP0KzF5d5s2acdfHwppJCP5MMXl4Tz8%2FLv8%2FP39%2FiewL5%2BqahYf4IrTFZkk5KlxsREiIYAHiqDnKFmnJowc3IdVllvpKK7zc3D2tnk5%2BmuycdwpKKuub2yv8Ly%2B%2FkAMT7z%2Bvjq7e09gH93q6kGdWpGgoJZmJSlw8M7c3WwyceTw76w1M8mYmpFfX8lW2AFOEpGiYhxqqRrqaRb2rdIsZ8AVE91jpU7d3t3saqBoKhako4AWVEcUlg3aWwDupAHb2YwmIkPP1ERSVA7WmZ8tq8HT14oZW%2BYuLsMl3wQT10ROksENUc8Z3MJSGVLh4dqpJ%2BXr7U51awUgHM4v6ad1MkPuJZAiowVd3IEhnZH0aoYrI05p5sDtYwkzZ8EPViYxsRel5USbHAIgmwIM0gQamzU4uF2malQi4oWQFQ1zaYrp4UXlYwfiHoyxqFE1q4qeX4yn5JIxKkdrX1b1rAbWGvd5Oh91sRijpomsJEVc3Ukc34dqIcwuJVKwZIXkoQZcXlNv5g%2BqZUZvpNl2rPG9N0WkIoNqouW4sVPwp%2BM0b6h0ssfq4d%2F1r8hpo%2Fh9e4AamUjnI9avaBixqgklYWSwL4xtItUxplYl5qZ58mq78wMgnYXfnlOmJaR1L%2Bj78ny9fS%2FrXQPAAAAFXRSTlP7Brvx%2FsJhAgD87r4U72C4uGH8vhRDodYHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAC6UlEQVQokS2Sd3BUVRSHb0KS3QRCiZw5t%2By9j33zXjZkyUs2uekhEAi9dwRCL4JUEQRFAQUs9A4WOopKU0GpFoqCBZUivaqoFKkWLIS5GX7%2FfnPO78yZj%2Fj8UTViK6HggvNgSGuluEZRKbZqlN9H%2FFWiWUzIFQK5fhjOIRTDoqv4ia86S4q3KSByHdSqIhxofBKr5iNxLMm2bQqWVkorJ%2BAkO46nkQJhceSRmCTDvKJIJBLJzMxMLU6POJ4eBPF1KpNEbdt2Cms4LCcnZ%2FX6D3d%2BsKJJ7VSlNLoqgbjUtmkKKxlVmpf3bsFXW3d1b77gueJAQIPQBCilkMKemNi23Ts9T35%2FaMe2rsvmTypylGUFCSIYWJLXrm2nUwOPfNO5w%2B73Okxnjqe0JigQEL3JizoeONr%2F2u99vju4fd1rdZnyspQmnGvAUBprWNqz348%2FhXN%2F6P1%2By4Uvs%2FJkpRQRwpJBRVn7vf16Dfitz5XevQqWt3yalXtKaRIUQmglWfsu5y7%2BMrDs0TMftWo1ZVy64xioOVpcIdt8%2Fvqvf9%2F859KJsrLmrzA%2BOKC0IkFEtJza7JOfr%2FYd0P9G98tdOxe0Hp9qJrOIBgDuOeEtp%2F%2B4d%2FvWX%2F%2F9u%2B%2FtlaUTmOWZg7SQEEyuFe52%2BML9O3cZO%2F5xl06zn2VcadOJUqJTzt7a82XfP7sx9vmGNm1m1MstV4IHCVAAoTLqL1372ddn%2Fz%2B2v%2FWq12c1fSpsaeQWAZAANntxzuI3e3zbo8XGpm%2FMnNqiXrh%2BljaPd6UUabkjps19tdGnX2zKb9b4pTFDCzOMLmYtpW5h%2BpCRTeYtyV%2BT36zx808OL4xYGoFrkqDTbJpSXLdRgwbPZL%2BQnT129OOPFVEEsAMJpHKdeKMJgJSAiALdjJANQKnRJI4R6boAKEwLCiGoBBegQjBftQo1KQWOlplFKSV9qGaF1NpAE7QQESTlMSy6pp%2F4%2FFFVYxMNRBTaiM0tkImxNaL8vgfDR8gvoYRaxgAAAABJRU5ErkJggg%3D%3D" alt="bunlongheng.com"></a>
<a href="https://www.linkedin.com/in/bunlongheng/"><img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"></a>
<a href="https://www.instagram.com/ibunlong/"><img src="https://img.shields.io/badge/Instagram-C13584?style=for-the-badge&logo=instagram&logoColor=white" alt="Instagram"></a>
<a href="mailto:bheng.code@gmail.com"><img src="https://img.shields.io/badge/Email-2E7D32?style=for-the-badge&logo=gmail&logoColor=white" alt="Email"></a>

<br>

Built by **[Bunlong](https://bunlongheng.com)** &nbsp;&middot;&nbsp; [more apps](https://bunlongheng.com/projects)

</div>
