import type { EditorDoc, ImageLayer, TextLayer } from "@/lib/types";
import { buildFilterCSS, buildBaseBWFilterCSS } from "@/lib/filters";
import { cellRect } from "@/lib/collage";
import { fitCover } from "@/lib/geometry";

// Canvas rendering shared by the live stage and the exporter. Not pure (it
// touches the canvas API) so it lives outside lib/*, but it is deterministic:
// same doc + same images + same mask => identical pixels, which is exactly why
// export matches what the user sees on screen.

export type ImageResolver = (src: string) => HTMLImageElement | null;

export const COLLAGE_GAP = 14;

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  offsetX: number,
  offsetY: number,
  scale: number,
) {
  const base = fitCover(img.naturalWidth, img.naturalHeight, w, h);
  const dw = base.w * scale;
  const dh = base.h * scale;
  const dx = x + base.x - (dw - base.w) / 2 + offsetX;
  const dy = y + base.y - (dh - base.h) / 2 + offsetY;
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** Render the photo / collage base plus the color-splash brush composite. */
export function renderBase(
  ctx: CanvasRenderingContext2D,
  doc: EditorDoc,
  resolve: ImageResolver,
  mask: HTMLCanvasElement | null,
  maskInked: boolean,
) {
  const { width: w, height: h, adjust } = doc;
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = doc.background;
  ctx.fillRect(0, 0, w, h);

  if (doc.collage !== "single") {
    for (const cell of doc.cells) {
      const r = cellRect(cell, w, h, COLLAGE_GAP);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.w, r.h, 6);
      ctx.clip();
      const img = cell.src ? resolve(cell.src) : null;
      if (img) {
        ctx.filter = buildFilterCSS(adjust);
        drawCover(ctx, img, r.x, r.y, r.w, r.h, cell.offsetX, cell.offsetY, cell.scale);
        ctx.filter = "none";
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.fillRect(r.x, r.y, r.w, r.h);
      }
      ctx.restore();
    }
    ctx.restore();
    return;
  }

  if (doc.baseSrc) {
    const img = resolve(doc.baseSrc);
    if (img) {
      if (mask && maskInked) {
        // Black and white underneath...
        ctx.filter = buildBaseBWFilterCSS(adjust);
        ctx.drawImage(img, 0, 0, w, h);
        ctx.filter = "none";
        // ...full-color version revealed only where the mask has ink.
        const temp = document.createElement("canvas");
        temp.width = w;
        temp.height = h;
        const tctx = temp.getContext("2d");
        if (tctx) {
          tctx.filter = buildFilterCSS({ ...adjust, grayscale: 0 });
          tctx.drawImage(img, 0, 0, w, h);
          tctx.filter = "none";
          tctx.globalCompositeOperation = "destination-in";
          tctx.drawImage(mask, 0, 0, w, h);
          ctx.drawImage(temp, 0, 0);
        }
      } else {
        ctx.filter = buildFilterCSS(adjust);
        ctx.drawImage(img, 0, 0, w, h);
        ctx.filter = "none";
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
  mask: HTMLCanvasElement | null,
  maskInked: boolean,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = doc.width;
  canvas.height = doc.height;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    renderBase(ctx, doc, resolve, mask, maskInked);
    renderLayers(ctx, doc, resolve);
  }
  return canvas;
}
