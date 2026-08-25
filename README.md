# Precision

A fast, lightweight browser photo editor. Drop an image, tone it black and white, apply filters, add text, build collages, layer images, and brush the original color back with the selective-color brush. iPad and Apple Pencil ready.

- **Color-splash brush** - the photo goes black and white; paint to bring the original color back only where you brush (BeFunky style).
- **Tone & filters** - one-tap looks (Noir, Sepia, Vintage, ...) plus brightness, contrast, saturation, black and white, sepia, tint, and blur.
- **Text, collages & image layers** - captions with full typography, 7 collage layouts, and images stacked on images.
- **Local-first** - projects (with images and the brush mask) are saved in the browser via IndexedDB. Nothing leaves your device.
- **Share** - export a PNG or share straight to iMessage / AirDrop via the native share sheet.
- **Owner-only** - optional Google sign-in locked to a single account.

## Stack

Next.js 16 (App Router) - React 19 - TypeScript - Tailwind v4 - Canvas 2D - Auth.js

## Develop

```bash
npm install
npm run dev        # http://localhost:3031
npm run typecheck
npm run lint
npm test
```

## Auth (optional)

Copy `.env.example` to `.env.local` and fill the Google OAuth values to lock the app to `AUTH_OWNER_EMAIL`. Leave them unset to run open.
