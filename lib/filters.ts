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
];

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}
