import type { EditorDoc, ImageLayer, TextLayer, Adjust } from "@/lib/types";
import { buildFilterCSS, applyAdjustPixels, boxBlur } from "@/lib/filters";
import type { BlurType } from "./editor-types";

// Safari ignores canvas ctx.filter, so detect it once and fall back to
// pixel-level filtering there. Cached after the first probe.
let _ctxFilterOk: boolean | null = null;
function ctxFilterSupported(): boolean {
  if (_ctxFilterOk !== null) return _ctxFilterOk;
  try {
    const src = document.createElement("canvas");
    src.width = 2;
    src.height = 1;
    const sx = src.getContext("2d")!;
    sx.fillStyle = "#ff0000";
    sx.fillRect(0, 0, 2, 1);
    const out = document.createElement("canvas");
    out.width = 2;
    out.height = 1;
    const ox = out.getContext("2d")!;
    ox.filter = "grayscale(1)";
    ox.drawImage(src, 0, 0);
    ox.filter = "none";
    const d = ox.getImageData(0, 0, 1, 1).data;
    _ctxFilterOk = Math.abs(d[0] - d[1]) < 12; // red turned gray => filter works
  } catch {
    _ctxFilterOk = false;
  }
  return _ctxFilterOk;
}

/** Draw an image with adjustments applied, cross-browser (ctx.filter or pixels). */
function drawAdjusted(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  w: number,
  h: number,
  adjust: Adjust,
) {
  if (ctxFilterSupported()) {
    ctx.filter = buildFilterCSS(adjust);
    ctx.drawImage(img, 0, 0, w, h);
    ctx.filter = "none";
    return;
  }
  // Safari fallback: draw plain, then filter the pixels by hand.
  ctx.drawImage(img, 0, 0, w, h);
  const id = ctx.getImageData(0, 0, w, h);
  applyAdjustPixels(id.data, adjust);
  if (adjust.blur > 0) boxBlur(id.data, w, h, adjust.blur);
  ctx.putImageData(id, 0, 0);
}

// Canvas rendering shared by the live stage and the exporter. Not pure (it
// touches the canvas API) so it lives outside lib/*, but it is deterministic:
// same doc + same images + same masks => identical pixels, which is exactly why
// export matches what the user sees on screen.

export type ImageResolver = (src: string) => HTMLImageElement | null;

// The two brush masks + their settings, passed together to keep signatures tidy.
export type RenderMasks = {
  colorMask: HTMLCanvasElement | null;
  colorInked: boolean;
  blurMask: HTMLCanvasElement | null;
  blurInked: boolean;
  blurType: BlurType;
  blurStrength: number;
};

export const NO_MASKS: RenderMasks = {
  colorMask: null,
  colorInked: false,
  blurMask: null,
  blurInked: false,
  blurType: "soft",
  blurStrength: 55,
};

/** Produce a blurred copy of `src` in the chosen style. */
function makeBlurred(
  src: HTMLCanvasElement,
  type: BlurType,
  strength: number,
  w: number,
  h: number,
): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d");
  if (!ctx) return out;

  if (type === "soft") {
    const px = 2 + strength * 0.45;
    if (ctxFilterSupported()) {
      ctx.filter = `blur(${px.toFixed(1)}px)`;
      ctx.drawImage(src, 0, 0, w, h);
      ctx.filter = "none";
    } else {
      ctx.drawImage(src, 0, 0, w, h);
      const id = ctx.getImageData(0, 0, w, h);
      boxBlur(id.data, w, h, px);
      ctx.putImageData(id, 0, 0);
    }
    return out;
  }

  // pixelate + security both mosaic first: draw tiny, scale up with no smoothing.
  const block = Math.max(3, Math.round(3 + strength * 0.6));
  const sw = Math.max(1, Math.round(w / block));
  const sh = Math.max(1, Math.round(h / block));
  const small = document.createElement("canvas");
  small.width = sw;
  small.height = sh;
  small.getContext("2d")?.drawImage(src, 0, 0, sw, sh);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, sw, sh, 0, 0, w, h);

  if (type === "security") {
    // Scramble each block with random noise so it cannot be reconstructed.
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const amp = 40 + strength;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * amp;
      d[i] = Math.min(255, Math.max(0, d[i] + n));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n));
    }
    ctx.putImageData(img, 0, 0);
  }
  return out;
}

/** Reveal a blurred copy of the current canvas only where the blur mask is inked. */
function applyBlurThroughMask(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  mask: HTMLCanvasElement,
  type: BlurType,
  strength: number,
) {
  const snap = document.createElement("canvas");
  snap.width = w;
  snap.height = h;
  snap.getContext("2d")?.drawImage(ctx.canvas, 0, 0);
  const blurred = makeBlurred(snap, type, strength, w, h);
  const temp = document.createElement("canvas");
  temp.width = w;
  temp.height = h;
  const tctx = temp.getContext("2d");
  if (!tctx) return;
  tctx.drawImage(blurred, 0, 0);
  tctx.globalCompositeOperation = "destination-in";
  tctx.drawImage(mask, 0, 0, w, h);
  ctx.drawImage(temp, 0, 0);
}

/** Render the photo base plus the color-splash and blur brush composites. */
export function renderBase(
  ctx: CanvasRenderingContext2D,
  doc: EditorDoc,
  resolve: ImageResolver,
  masks: RenderMasks = NO_MASKS,
) {
  const { width: w, height: h, adjust } = doc;
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = doc.background;
  ctx.fillRect(0, 0, w, h);

  if (doc.baseSrc) {
    const img = resolve(doc.baseSrc);
    if (img) {
      if (masks.colorMask && masks.colorInked) {
        // Black and white underneath...
        drawAdjusted(ctx, img, w, h, { ...adjust, grayscale: 100, sepia: 0 });
        // ...full-color version revealed only where the color mask has ink.
        const temp = document.createElement("canvas");
        temp.width = w;
        temp.height = h;
        const tctx = temp.getContext("2d");
        if (tctx) {
          drawAdjusted(tctx, img, w, h, { ...adjust, grayscale: 0 });
          tctx.globalCompositeOperation = "destination-in";
          tctx.drawImage(masks.colorMask, 0, 0, w, h);
          ctx.drawImage(temp, 0, 0);
        }
      } else {
        drawAdjusted(ctx, img, w, h, adjust);
      }
      // Blur brush: reveal a blurred copy of the composited photo where painted.
      if (masks.blurMask && masks.blurInked) {
        applyBlurThroughMask(ctx, w, h, masks.blurMask, masks.blurType, masks.blurStrength);
      }
    }
  }
  ctx.restore();
}

function renderImageLayer(
  ctx: CanvasRenderingContext2D,
  layer: ImageLayer,
  resolve: ImageResolver,
) {
  const img = resolve(layer.src);
  if (!img) return;
  const cx = layer.x + layer.w / 2;
  const cy = layer.y + layer.h / 2;
  ctx.save();
  ctx.globalAlpha = layer.opacity;
  ctx.translate(cx, cy);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.beginPath();
  ctx.roundRect(-layer.w / 2, -layer.h / 2, layer.w, layer.h, layer.radius);
  ctx.clip();
  ctx.drawImage(img, -layer.w / 2, -layer.h / 2, layer.w, layer.h);
  ctx.restore();
}

function renderTextLayer(ctx: CanvasRenderingContext2D, layer: TextLayer) {
  const lines = layer.text.split("\n");
  const lineHeight = layer.fontSize * 1.18;
  ctx.save();
  ctx.translate(layer.x, layer.y);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.globalAlpha = layer.opacity;
  ctx.font = `${layer.italic ? "italic " : ""}${layer.weight} ${layer.fontSize}px ${layer.fontFamily}`;
  ctx.textBaseline = "top";
  ctx.textAlign = layer.align;
  try {
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
      `${layer.letterSpacing}px`;
  } catch {
    /* letterSpacing unsupported - ignore */
  }
  const widths = lines.map((l) => ctx.measureText(l).width);
  const blockW = Math.max(1, ...widths);
  const anchorX = layer.align === "center" ? blockW / 2 : layer.align === "right" ? blockW : 0;

  lines.forEach((line, i) => {
    const y = i * lineHeight;
    if (layer.background) {
      const lw = widths[i];
      const bx = layer.align === "center" ? anchorX - lw / 2 : layer.align === "right" ? anchorX - lw : 0;
      ctx.fillStyle = layer.background;
      ctx.fillRect(bx - layer.fontSize * 0.2, y, lw + layer.fontSize * 0.4, lineHeight);
    }
    ctx.fillStyle = layer.color;
    ctx.fillText(line, anchorX, y);
  });
  ctx.restore();
}

export function renderLayers(
  ctx: CanvasRenderingContext2D,
  doc: EditorDoc,
  resolve: ImageResolver,
) {
  for (const layer of doc.layers) {
    if (layer.type === "image") renderImageLayer(ctx, layer, resolve);
    else renderTextLayer(ctx, layer);
  }
}

/** Full-resolution composite for export. Returns the finished canvas. */
export function renderExport(
  doc: EditorDoc,
  resolve: ImageResolver,
  masks: RenderMasks = NO_MASKS,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = doc.width;
  canvas.height = doc.height;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    renderBase(ctx, doc, resolve, masks);
    renderLayers(ctx, doc, resolve);
  }
  return canvas;
}
