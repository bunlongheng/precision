import type { CollageCell, CollageTemplateId } from "./types.ts";
import type { Rect } from "./geometry.ts";

// Collage templates as normalized cell rects (0..1). The stage turns these into
// pixel rects at render/export time. Pure data + math so it is unit-testable.

type Norm = { nx: number; ny: number; nw: number; nh: number };

const TEMPLATES: Record<CollageTemplateId, Norm[]> = {
  single: [{ nx: 0, ny: 0, nw: 1, nh: 1 }],
  "side-by-side": [
    { nx: 0, ny: 0, nw: 0.5, nh: 1 },
    { nx: 0.5, ny: 0, nw: 0.5, nh: 1 },
  ],
  stacked: [
    { nx: 0, ny: 0, nw: 1, nh: 0.5 },
    { nx: 0, ny: 0.5, nw: 1, nh: 0.5 },
  ],
  "grid-2x2": [
    { nx: 0, ny: 0, nw: 0.5, nh: 0.5 },
    { nx: 0.5, ny: 0, nw: 0.5, nh: 0.5 },
    { nx: 0, ny: 0.5, nw: 0.5, nh: 0.5 },
    { nx: 0.5, ny: 0.5, nw: 0.5, nh: 0.5 },
  ],
  triptych: [
    { nx: 0, ny: 0, nw: 1 / 3, nh: 1 },
    { nx: 1 / 3, ny: 0, nw: 1 / 3, nh: 1 },
    { nx: 2 / 3, ny: 0, nw: 1 / 3, nh: 1 },
  ],
  "big-left": [
    { nx: 0, ny: 0, nw: 0.6, nh: 1 },
    { nx: 0.6, ny: 0, nw: 0.4, nh: 0.5 },
    { nx: 0.6, ny: 0.5, nw: 0.4, nh: 0.5 },
  ],
  "film-strip": [
    { nx: 0, ny: 0, nw: 0.25, nh: 1 },
    { nx: 0.25, ny: 0, nw: 0.25, nh: 1 },
    { nx: 0.5, ny: 0, nw: 0.25, nh: 1 },
    { nx: 0.75, ny: 0, nw: 0.25, nh: 1 },
  ],
};

export type CollageMeta = {
  id: CollageTemplateId;
  name: string;
  count: number;
};

export const COLLAGE_LIST: CollageMeta[] = (
  Object.keys(TEMPLATES) as CollageTemplateId[]
).map((id) => ({
  id,
  name: id
    .split("-")
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(" "),
  count: TEMPLATES[id].length,
}));

export function templateCount(id: CollageTemplateId): number {
  return TEMPLATES[id].length;
}

/** Fresh, empty cells for a template. */
export function makeCells(id: CollageTemplateId): CollageCell[] {
  return TEMPLATES[id].map((n) => ({
    ...n,
    src: null,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  }));
}

/**
 * Re-shape existing cells into a new template, carrying over as many filled
 * images as possible so switching layouts never loses a user's photos.
 */
export function reshapeCells(id: CollageTemplateId, prev: CollageCell[]): CollageCell[] {
  const next = makeCells(id);
  for (let i = 0; i < next.length && i < prev.length; i++) {
    next[i].src = prev[i].src;
    next[i].offsetX = prev[i].offsetX;
    next[i].offsetY = prev[i].offsetY;
    next[i].scale = prev[i].scale;
  }
  return next;
}

/** Pixel rect for a cell inside a `w x h` document, inset by `gap` on every edge. */
export function cellRect(cell: CollageCell, w: number, h: number, gap: number): Rect {
  const half = gap / 2;
  const x = cell.nx * w + (cell.nx > 0 ? half : gap);
  const y = cell.ny * h + (cell.ny > 0 ? half : gap);
  const right = (cell.nx + cell.nw) * w - (cell.nx + cell.nw < 1 ? half : gap);
  const bottom = (cell.ny + cell.nh) * h - (cell.ny + cell.nh < 1 ? half : gap);
  return { x, y, w: Math.max(0, right - x), h: Math.max(0, bottom - y) };
}
