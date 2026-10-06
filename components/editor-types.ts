export type ToolId = "select" | "adjust" | "crop" | "brush" | "text" | "image";

// The brush paints one of two effects onto a mask:
//  - color: the photo goes black & white, paint brings the original color back
//  - blur:  the photo stays as-is, paint blurs the area (3 blur styles)
export type BrushEffect = "color" | "blur";
export type BlurType = "soft" | "pixelate" | "security";

export type BrushState = {
  size: number; // diameter in doc px
  hardness: number; // 0..1 (edge softness)
  mode: "paint" | "erase"; // paint applies the effect, erase removes it
  effect: BrushEffect;
  blurType: BlurType;
  blurStrength: number; // 0..100
};

export const DEFAULT_BRUSH: BrushState = {
  size: 90,
  hardness: 0.7,
  mode: "paint",
  effect: "color",
  blurType: "soft",
  blurStrength: 55,
};
