// Pure geometry helpers shared by the stage renderer and pointer handling.
// No DOM references so they stay unit-testable.

export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export const clamp = (n: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, n));

/** Fit a source (sw x sh) inside a box (bw x bh) preserving aspect ratio (contain). */
export function fitContain(sw: number, sh: number, bw: number, bh: number): Rect {
  if (sw <= 0 || sh <= 0) return { x: 0, y: 0, w: bw, h: bh };
  const scale = Math.min(bw / sw, bh / sh);
  const w = sw * scale;
  const h = sh * scale;
  return { x: (bw - w) / 2, y: (bh - h) / 2, w, h };
}

/** Cover a box (bw x bh) with a source (sw x sh), cropping the overflow. */
export function fitCover(sw: number, sh: number, bw: number, bh: number): Rect {
  if (sw <= 0 || sh <= 0) return { x: 0, y: 0, w: bw, h: bh };
  const scale = Math.max(bw / sw, bh / sh);
  const w = sw * scale;
  const h = sh * scale;
  return { x: (bw - w) / 2, y: (bh - h) / 2, w, h };
}

/**
 * Cap a document to a maximum edge while preserving aspect ratio. Keeping the
 * working document small is the core of the "faster, lighter" promise - a 6000px
 * phone photo becomes at most `maxEdge` before any pixels are touched.
 */
export function capSize(w: number, h: number, maxEdge: number): { w: number; h: number } {
  if (w <= 0 || h <= 0) return { w: maxEdge, h: maxEdge };
  const longest = Math.max(w, h);
  if (longest <= maxEdge) return { w: Math.round(w), h: Math.round(h) };
  const scale = maxEdge / longest;
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

/** Rotate a point around a center by `deg` degrees. */
export function rotatePoint(p: Point, center: Point, deg: number): Point {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

/** Is a point inside an axis-aligned rect (optionally rotated around its center)? */
export function hitRect(p: Point, rect: Rect, rotation = 0): boolean {
  const center = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  const local = rotation ? rotatePoint(p, center, -rotation) : p;
  return (
    local.x >= rect.x &&
    local.x <= rect.x + rect.w &&
    local.y >= rect.y &&
    local.y <= rect.y + rect.h
  );
}

/** Map a screen point on the stage element to document coordinates. */
export function screenToDoc(
  screen: Point,
  stageRect: Rect,
  docW: number,
  docH: number,
): Point {
  const fit = fitContain(docW, docH, stageRect.w, stageRect.h);
  const scale = fit.w / docW;
  return {
    x: (screen.x - stageRect.x - fit.x) / scale,
    y: (screen.y - stageRect.y - fit.y) / scale,
  };
}
