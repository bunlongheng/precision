export type ToolId = "select" | "adjust" | "brush" | "text" | "image" | "collage";

export type BrushState = {
  size: number; // diameter in doc px
  hardness: number; // 0..1 (edge softness)
  mode: "paint" | "erase"; // paint reveals color, erase returns to B&W
};

export const DEFAULT_BRUSH: BrushState = { size: 90, hardness: 0.7, mode: "paint" };
