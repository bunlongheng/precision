// Pure math for the rotate + crop operation. The doc is first rotated by `q`
// quarter-turns clockwise, then cropped to a rect measured in that rotated
// ("oriented") space. Kept DOM-free so it is unit-testable with node:test - the
// canvas baking that consumes these helpers lives in the editor.

import type { Point, Rect } from "./geometry";

export type Quarter = 0 | 1 | 2 | 3;

/** Document dimensions after `q` quarter-turns (width/height swap on odd turns). */
export function rotatedDims(w: number, h: number, q: Quarter): { w: number; h: number } {
  return q % 2 === 0 ? { w, h } : { w: h, h: w };
}

/**
 * Map a point in the original doc space (W x H) to the new cropped canvas space
 * for a rotate(`q`)+`crop` operation. Same transform the canvas baking applies,
 * so layers land exactly where their pixels do.
 */
export function mapPoint(
  px: number,
  py: number,
  W: number,
  H: number,
  q: Quarter,
  crop: Rect,
): Point {
  let rx: number;
  let ry: number;
  if (q === 1) {
    rx = H - py;
    ry = px;
  } else if (q === 2) {
    rx = W - px;
    ry = H - py;
  } else if (q === 3) {
    rx = py;
    ry = W - px;
  } else {
    rx = px;
    ry = py;
  }
  return { x: rx - crop.x, y: ry - crop.y };
}

/** The largest rect of a given aspect (w/h) centered in a W x H box. `null` = full box. */
export function aspectRect(W: number, H: number, aspect: number | null): Rect {
  if (!aspect || aspect <= 0) return { x: 0, y: 0, w: W, h: H };
  let w = W;
  let h = W / aspect;
  if (h > H) {
    h = H;
    w = H * aspect;
  }
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
}
