"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as RPointerEvent,
} from "react";
import type { EditorDoc } from "@/lib/types";
import { fitContain, clamp, type Rect } from "@/lib/geometry";
import { rotatedDims, aspectRect, type Quarter } from "@/lib/crop";
import { renderExport, type ImageResolver, type RenderMasks } from "./render";
import { RotateLeftIcon, RotateRightIcon, CheckIcon, CloseIcon } from "./icons";

// Full-screen rotate + crop. Shows a WYSIWYG preview (base + brush + layers +
// filter) rotated by the chosen quarter-turn, with a draggable crop rect. On
// apply it hands the editor the quarter and the crop rect (in oriented-doc
// coords) to bake into a new base image.
type Props = {
  doc: EditorDoc;
  resolve: ImageResolver;
  masks: RenderMasks;
  onApply: (quarter: Quarter, crop: Rect) => void;
  onCancel: () => void;
};

const ASPECTS: { label: string; value: number | null }[] = [
  { label: "Free", value: null },
  { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "3:4", value: 3 / 4 },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
];

const MIN = 32; // smallest crop edge, in oriented-doc px
type Handle = "move" | "nw" | "ne" | "sw" | "se";

export default function CropOverlay({ doc, resolve, masks, onApply, onCancel }: Props) {
  const [quarter, setQuarter] = useState<Quarter>(0);
  const [aspect, setAspect] = useState<number | null>(null);
  const oriented = rotatedDims(doc.width, doc.height, quarter);
  const [crop, setCrop] = useState<Rect>(() => ({ x: 0, y: 0, w: doc.width, h: doc.height }));

  // WYSIWYG source: the fully composited canvas (base + masks + layers + adjust).
  const composited = useMemo(
    () => renderExport(doc, resolve, masks),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc, masks],
  );

  // The composited canvas rotated by the current quarter-turn, so the crop rect
  // is always measured in the upright, oriented space.
  const preview = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = oriented.w;
    c.height = oriented.h;
    const ctx = c.getContext("2d");
    if (ctx) {
      if (quarter === 1) {
        ctx.translate(oriented.w, 0);
        ctx.rotate(Math.PI / 2);
      } else if (quarter === 2) {
        ctx.translate(oriented.w, oriented.h);
        ctx.rotate(Math.PI);
      } else if (quarter === 3) {
        ctx.translate(0, oriented.h);
        ctx.rotate((3 * Math.PI) / 2);
      }
      ctx.drawImage(composited, 0, 0);
    }
    return c.toDataURL("image/png");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composited, quarter]);

  // Fit the oriented image into the available stage area.
  const stageRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setBox({ w: el.clientWidth, h: el.clientHeight }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fit = fitContain(oriented.w, oriented.h, Math.max(1, box.w), Math.max(1, box.h));
  const scale = fit.w / oriented.w;

  const rotate = (dir: 1 | -1) => {
    const q = (((quarter + dir) % 4) + 4) % 4 as Quarter;
    const od = rotatedDims(doc.width, doc.height, q);
    setQuarter(q);
    setCrop(aspectRect(od.w, od.h, aspect));
  };

  const pickAspect = (value: number | null) => {
    setAspect(value);
    setCrop(aspectRect(oriented.w, oriented.h, value));
  };

  // --- Crop rect dragging (in oriented-doc coords) --------------------------
  const drag = useRef<{ handle: Handle; sx: number; sy: number; start: Rect } | null>(null);

  const onHandleDown = (e: RPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const handle = (e.currentTarget as HTMLElement).dataset.handle as Handle;
    drag.current = { handle, sx: e.clientX, sy: e.clientY, start: { ...crop } };
  };

  const onDragMove = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / scale;
    const dy = (e.clientY - d.sy) / scale;
    const s = d.start;

    if (d.handle === "move") {
      setCrop({
        ...s,
        x: clamp(s.x + dx, 0, oriented.w - s.w),
        y: clamp(s.y + dy, 0, oriented.h - s.h),
      });
      return;
    }

    // Resize from a corner, keeping the opposite corner pinned.
    const right = d.handle === "ne" || d.handle === "se";
    const bottom = d.handle === "se" || d.handle === "sw";
    const ax = right ? s.x : s.x + s.w; // pinned x edge
    const ay = bottom ? s.y : s.y + s.h; // pinned y edge
    let px = clamp((right ? s.x + s.w : s.x) + dx, 0, oriented.w); // moving x edge
    let py = clamp((bottom ? s.y + s.h : s.y) + dy, 0, oriented.h); // moving y edge

    let w = Math.abs(px - ax);
    let h = Math.abs(py - ay);
    if (aspect) {
      // Honor the locked ratio, driven by the larger drag delta, and clamp so
      // the rect stays inside the image on both axes.
      if (w / aspect >= h) h = w / aspect;
      else w = h * aspect;
      w = Math.min(w, right ? oriented.w - ax : ax);
      h = w / aspect;
      h = Math.min(h, bottom ? oriented.h - ay : ay);
      w = h * aspect;
    }
    w = Math.max(MIN, w);
    h = Math.max(aspect ? MIN / aspect : MIN, h);
    px = right ? ax + w : ax - w;
    py = bottom ? ay + h : ay - h;
    setCrop({ x: Math.min(ax, px), y: Math.min(ay, py), w, h });
  };

  const onDragUp = () => {
    drag.current = null;
  };

  const handleDot =
    "absolute h-6 w-6 rounded-full border-2 border-white bg-[var(--accent)] shadow";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/92 backdrop-blur-sm">
      {/* header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          onClick={onCancel}
          aria-label="Cancel crop"
          className="flex h-10 items-center gap-1.5 rounded-lg px-3 text-[14px] font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <CloseIcon width={18} height={18} /> Cancel
        </button>
        <span className="mono text-[11px] uppercase tracking-[0.28em] text-white/50">
          Rotate &amp; crop
        </span>
        <button
          onClick={() => onApply(quarter, crop)}
          aria-label="Apply crop"
          className="flex h-10 items-center gap-1.5 rounded-lg px-4 text-[14px] font-semibold transition-transform hover:scale-[1.03] active:scale-95"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          <CheckIcon width={18} height={18} /> Done
        </button>
      </div>

      {/* stage */}
      <div
        ref={stageRef}
        className="relative min-h-0 flex-1 touch-none select-none px-5"
        onPointerMove={onDragMove}
        onPointerUp={onDragUp}
        onPointerCancel={onDragUp}
      >
        <div
          className="absolute"
          style={{ left: fit.x, top: fit.y, width: fit.w, height: fit.h }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" draggable={false} className="h-full w-full" />

          {/* dark scrim outside the crop rect (4 bands) */}
          {(() => {
            const cx = crop.x * scale;
            const cy = crop.y * scale;
            const cw = crop.w * scale;
            const ch = crop.h * scale;
            const scrim = "absolute bg-black/55";
            return (
              <>
                <div className={scrim} style={{ left: 0, top: 0, width: fit.w, height: cy }} />
                <div className={scrim} style={{ left: 0, top: cy + ch, width: fit.w, height: fit.h - cy - ch }} />
                <div className={scrim} style={{ left: 0, top: cy, width: cx, height: ch }} />
                <div className={scrim} style={{ left: cx + cw, top: cy, width: fit.w - cx - cw, height: ch }} />
              </>
            );
          })()}

          {/* crop rect + rule-of-thirds + handles */}
          <div
            className="absolute cursor-move border border-white/90"
            style={{ left: crop.x * scale, top: crop.y * scale, width: crop.w * scale, height: crop.h * scale }}
            data-handle="move"
            onPointerDown={onHandleDown}
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/3 top-0 h-full w-px bg-white/25" />
              <div className="absolute left-2/3 top-0 h-full w-px bg-white/25" />
              <div className="absolute top-1/3 left-0 w-full h-px bg-white/25" />
              <div className="absolute top-2/3 left-0 w-full h-px bg-white/25" />
            </div>
            <span className={handleDot} style={{ left: -12, top: -12 }} data-handle="nw" onPointerDown={onHandleDown} />
            <span className={handleDot} style={{ right: -12, top: -12 }} data-handle="ne" onPointerDown={onHandleDown} />
            <span className={handleDot} style={{ left: -12, bottom: -12 }} data-handle="sw" onPointerDown={onHandleDown} />
            <span className={handleDot} style={{ right: -12, bottom: -12 }} data-handle="se" onPointerDown={onHandleDown} />
          </div>
        </div>
      </div>

      {/* controls */}
      <div
        className="flex flex-col gap-3 px-4 py-4"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => rotate(-1)}
            aria-label="Rotate left"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <RotateLeftIcon width={20} height={20} />
          </button>
          <button
            onClick={() => rotate(1)}
            aria-label="Rotate right"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <RotateRightIcon width={20} height={20} />
          </button>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {ASPECTS.map((a) => {
            const on = aspect === a.value;
            return (
              <button
                key={a.label}
                onClick={() => pickAspect(a.value)}
                className="shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors"
                style={{
                  background: on ? "var(--accent)" : "rgba(255,255,255,0.1)",
                  color: on ? "var(--accent-ink)" : "rgba(255,255,255,0.85)",
                }}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
