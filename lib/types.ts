// Core document model for the Precision editor. Kept framework-free so the pure
// logic in lib/* can be unit-tested with node:test (no DOM required).

export type Adjust = {
  brightness: number; // 0-200 (%), default 100
  contrast: number; // 0-200 (%), default 100
  saturate: number; // 0-200 (%), default 100
  grayscale: number; // 0-100 (%), default 0
  sepia: number; // 0-100 (%), default 0
  hue: number; // -180..180 (deg), default 0
  blur: number; // 0-20 (px), default 0
};

export const DEFAULT_ADJUST: Adjust = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  grayscale: 0,
  sepia: 0,
  hue: 0,
  blur: 0,
};

export type TextLayer = {
  id: string;
  type: "text";
  x: number; // doc coords, top-left of the text box
  y: number;
  text: string;
  color: string;
  fontFamily: string;
  fontSize: number; // doc px
  weight: number;
  italic: boolean;
  align: "left" | "center" | "right";
  rotation: number; // degrees
  opacity: number; // 0..1
  letterSpacing: number; // px
  background: string | null; // highlight color or null
};

export type ImageLayer = {
  id: string;
  type: "image";
  x: number;
  y: number;
  w: number;
  h: number;
  src: string;
  rotation: number;
  opacity: number;
  radius: number; // corner radius in doc px
};

export type Layer = TextLayer | ImageLayer;

export type EditorDoc = {
  width: number;
  height: number;
  baseSrc: string | null; // the background photo
  adjust: Adjust;
  layers: Layer[];
  background: string; // canvas backdrop color (behind any transparency)
};

export const EMPTY_DOC: EditorDoc = {
  width: 1080,
  height: 1080,
  baseSrc: null,
  adjust: { ...DEFAULT_ADJUST },
  layers: [],
  background: "#0d0d0f",
};
