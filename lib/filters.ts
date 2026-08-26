import type { Adjust } from "./types.ts";
import { DEFAULT_ADJUST } from "./types.ts";

// Filters are expressed as a CSS `filter` string and handed to the canvas 2D
// context (`ctx.filter = ...`). That path is GPU-accelerated in every modern
// browser, so heavy per-pixel loops are avoided entirely - this is what keeps
// Precision fast and light even on an iPad.

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Build the canvas/CSS filter string for a set of adjustments. */
export function buildFilterCSS(adjust: Adjust): string {
  const parts: string[] = [];
  if (adjust.brightness !== 100) parts.push(`brightness(${round(adjust.brightness / 100)})`);
  if (adjust.contrast !== 100) parts.push(`contrast(${round(adjust.contrast / 100)})`);
  if (adjust.saturate !== 100) parts.push(`saturate(${round(adjust.saturate / 100)})`);
  if (adjust.grayscale > 0) parts.push(`grayscale(${round(adjust.grayscale / 100)})`);
  if (adjust.sepia > 0) parts.push(`sepia(${round(adjust.sepia / 100)})`);
  if (adjust.hue !== 0) parts.push(`hue-rotate(${round(adjust.hue)}deg)`);
  if (adjust.blur > 0) parts.push(`blur(${round(adjust.blur)}px)`);
  return parts.length ? parts.join(" ") : "none";
}

/**
 * The same adjustments with grayscale forced to 100%. Used as the desaturated
 * base for the color-splash brush: the photo renders black and white, then the
 * painted mask reveals the fully-colored version on top.
 */
export function buildBaseBWFilterCSS(adjust: Adjust): string {
  return buildFilterCSS({ ...adjust, grayscale: 100, sepia: 0 });
}

export type Preset = {
  id: string;
  name: string;
  adjust: Adjust;
};

const preset = (id: string, name: string, over: Partial<Adjust>): Preset => ({
  id,
  name,
  adjust: { ...DEFAULT_ADJUST, ...over },
});

// A tight, opinionated set of looks - PicMonkey/BeFunky style one-tap tones.
export const PRESETS: Preset[] = [
  preset("original", "Original", {}),
  preset("mono", "Mono", { grayscale: 100, contrast: 110 }),
  preset("silver", "Silver", { grayscale: 100, brightness: 108, contrast: 95 }),
  preset("noir", "Noir", { grayscale: 100, contrast: 145, brightness: 92 }),
  preset("sepia", "Sepia", { sepia: 80, contrast: 105, brightness: 104 }),
  preset("vintage", "Vintage", { sepia: 45, saturate: 80, contrast: 92, brightness: 105 }),
  preset("warm", "Warm", { hue: -8, saturate: 118, brightness: 104 }),
  preset("cool", "Cool", { hue: 12, saturate: 108, brightness: 102 }),
  preset("vivid", "Vivid", { saturate: 150, contrast: 112 }),
  preset("fade", "Fade", { saturate: 78, contrast: 88, brightness: 110 }),
  preset("punch", "Punch", { contrast: 128, saturate: 128 }),
  preset("dream", "Dream", { blur: 1.2, brightness: 108, saturate: 115 }),
  // Cooler, more cinematic looks
  preset("cinema", "Cinema", { contrast: 118, saturate: 106, hue: -6, brightness: 97 }),
  preset("frost", "Frost", { hue: 20, saturate: 88, brightness: 109, contrast: 96 }),
  preset("golden", "Golden", { sepia: 28, saturate: 122, brightness: 106, hue: -12 }),
  preset("moody", "Moody", { brightness: 90, contrast: 122, saturate: 82 }),
  preset("matte", "Matte", { contrast: 86, brightness: 106, saturate: 92, sepia: 12 }),
  preset("retro", "Retro", { sepia: 38, saturate: 116, contrast: 106, hue: -14 }),
  preset("aqua", "Aqua", { hue: 28, saturate: 116, brightness: 103, contrast: 104 }),
  preset("neon", "Neon", { saturate: 168, contrast: 122, hue: 10 }),
  preset("blush", "Blush", { hue: -16, saturate: 112, brightness: 107, contrast: 98 }),
  preset("mint", "Mint", { hue: 34, saturate: 104, brightness: 105, contrast: 99 }),
  preset("steel", "Steel", { grayscale: 32, hue: 14, contrast: 110, brightness: 101 }),
  preset("sunset", "Sunset", { sepia: 32, hue: -16, saturate: 128, brightness: 105 }),
];

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

// Safari/WebKit ignores canvas `ctx.filter`, so the CSS-filter path is a no-op
// there. This applies the same adjustments by hand, pixel by pixel, in the same
// order as buildFilterCSS (brightness -> contrast -> saturate -> grayscale ->
// sepia -> hue). Blur is separate (it needs a convolution). Mutates in place.
export function applyAdjustPixels(data: Uint8ClampedArray, a: Adjust): void {
  const br = a.brightness / 100;
  const co = a.contrast / 100;
  const sa = a.saturate / 100;
  const gr = a.grayscale / 100;
  const se = a.sepia / 100;
  const needHue = a.hue !== 0;
  const rad = (a.hue * Math.PI) / 180;
  const cH = Math.cos(rad);
  const sH = Math.sin(rad);
  // SVG hue-rotate matrix
  const m0 = 0.213 + cH * 0.787 - sH * 0.213;
  const m1 = 0.715 - cH * 0.715 - sH * 0.715;
  const m2 = 0.072 - cH * 0.072 + sH * 0.928;
  const m3 = 0.213 - cH * 0.213 + sH * 0.143;
  const m4 = 0.715 + cH * 0.285 + sH * 0.14;
  const m5 = 0.072 - cH * 0.072 - sH * 0.283;
  const m6 = 0.213 - cH * 0.213 - sH * 0.787;
  const m7 = 0.715 - cH * 0.715 + sH * 0.715;
  const m8 = 0.072 + cH * 0.928 + sH * 0.072;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    if (br !== 1) { r *= br; g *= br; b *= br; }
    if (co !== 1) { r = (r - 128) * co + 128; g = (g - 128) * co + 128; b = (b - 128) * co + 128; }
    if (sa !== 1) {
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = l + (r - l) * sa; g = l + (g - l) * sa; b = l + (b - l) * sa;
    }
    if (gr > 0) {
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r += (l - r) * gr; g += (l - g) * gr; b += (l - b) * gr;
    }
    if (se > 0) {
      const sr = 0.393 * r + 0.769 * g + 0.189 * b;
      const sg = 0.349 * r + 0.686 * g + 0.168 * b;
      const sb = 0.272 * r + 0.534 * g + 0.131 * b;
      r += (sr - r) * se; g += (sg - g) * se; b += (sb - b) * se;
    }
    if (needHue) {
      const nr = m0 * r + m1 * g + m2 * b;
      const ng = m3 * r + m4 * g + m5 * b;
      const nb = m6 * r + m7 * g + m8 * b;
      r = nr; g = ng; b = nb;
    }
    data[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    data[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    data[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
  }
}

/**
 * Separable box blur over RGBA pixels (in place-ish via a copy). A cheap stand-in
 * for CSS blur() on Safari. `radius` is clamped for performance.
 */
export function boxBlur(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(24, Math.max(1, Math.round(radius)));
  const pass = (src: Uint8ClampedArray, dst: Uint8ClampedArray, w: number, h: number, horizontal: boolean) => {
    const len = horizontal ? w : h;
    const lines = horizontal ? h : w;
    const div = r * 2 + 1;
    for (let line = 0; line < lines; line++) {
      for (let ch = 0; ch < 3; ch++) {
        let sum = 0;
        const idx = (pos: number) =>
          (horizontal ? line * w + pos : pos * w + line) * 4 + ch;
        for (let k = -r; k <= r; k++) sum += src[idx(Math.min(len - 1, Math.max(0, k)))];
        for (let p = 0; p < len; p++) {
          dst[idx(p)] = sum / div;
          const add = src[idx(Math.min(len - 1, p + r + 1))];
          const sub = src[idx(Math.max(0, p - r))];
          sum += add - sub;
        }
      }
    }
  };
  const tmp = new Uint8ClampedArray(data);
  pass(data, tmp, width, height, true);
  pass(tmp, data, width, height, false);
}
