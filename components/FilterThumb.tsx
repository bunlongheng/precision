"use client";

import { useEffect, useRef } from "react";
import type { Adjust } from "@/lib/types";
import { applyAdjustPixels, boxBlur } from "@/lib/filters";
import { fitCover } from "@/lib/geometry";

// A single filter tile: a live thumbnail of the user's own photo with the
// preset applied, so you see the look instead of guessing from a word.
export default function FilterThumb({
  source,
  adjust,
  name,
  active,
  onClick,
}: {
  source: HTMLCanvasElement | null;
  adjust: Adjust;
  name: string;
  active: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const W = 168;
    const H = 126;
    c.width = W;
    c.height = H;
    ctx.clearRect(0, 0, W, H);
    if (!source) return;
    const r = fitCover(source.width, source.height, W, H);
    // Pixel-filter the tiny thumb so previews match on Safari (ctx.filter no-op).
    ctx.drawImage(source, r.x, r.y, r.w, r.h);
    const id = ctx.getImageData(0, 0, W, H);
    applyAdjustPixels(id.data, adjust);
    if (adjust.blur > 0) boxBlur(id.data, W, H, adjust.blur);
    ctx.putImageData(id, 0, 0);
  }, [source, adjust]);

  return (
    <button
      type="button"
      onClick={onClick}
      title={name}
      className="group relative w-[100px] shrink-0 overflow-hidden rounded-lg border transition-transform hover:scale-[1.03] sm:w-auto sm:shrink"
      style={{
        borderColor: active ? "var(--accent)" : "var(--hairline)",
        boxShadow: active ? "0 0 0 1px var(--accent), 0 0 12px var(--accent-glow)" : "none",
      }}
    >
      <canvas ref={ref} className="checker block aspect-[4/3] w-full object-cover" />
      <span
        className="absolute inset-x-0 bottom-0 px-1.5 py-1 text-[10px] font-semibold"
        style={{
          color: active ? "var(--accent-ink)" : "#fff",
          background: active
            ? "var(--accent)"
            : "linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0))",
        }}
      >
        {name}
      </span>
    </button>
  );
}
