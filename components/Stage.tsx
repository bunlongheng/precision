"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as RPointerEvent,
  type RefObject,
} from "react";
import type { EditorDoc, ImageLayer, Layer, TextLayer } from "@/lib/types";
import { fitContain, clamp } from "@/lib/geometry";
import { buildFilterCSS } from "@/lib/filters";
import { renderBase, ImageResolver, type RenderMasks } from "./render";
import type { BrushState, ToolId } from "./editor-types";

type Props = {
  doc: EditorDoc;
  tool: ToolId;
  selectedId: string | null;
  resolve: ImageResolver;
  imgVersion: number;
  masks: RenderMasks;
  activeMaskRef: RefObject<HTMLCanvasElement | null>;
  colorVersion: number;
  blurVersion: number;
  brush: BrushState;
  editingId: string | null;
  onSelect: (id: string | null) => void;
  onLayerChange: (id: string, patch: Partial<Layer>, commit: boolean) => void;
  onCreateTextAt: (x: number, y: number) => void;
  onEditText: (id: string, text: string) => void;
  onEditingChange: (id: string | null) => void;
  onScrubStart: () => void;
  onScrub: (steps: number) => void;
  onScrubEnd: () => void;
  onBrushBegin: () => void;
  onBrushPaint: () => void;
  onBrushEnd: () => void;
};

const PAD = 40;
const MAX_ZOOM = 6;

type View = { z: number; tx: number; ty: number };
type Box = { w: number; h: number; pad: number };
type Fit = { x: number; y: number; w: number; h: number };

// Keep the photo centered at 1x and bounded (never flung off screen) when zoomed.
// At z = 1 this returns { tx: 0, ty: 0 }, so filters/looks always stay centered.
function clampTo(z: number, tx: number, ty: number, box: Box, fit: Fit): View {
  const layoutLeft = box.pad + fit.x;
  const layoutTop = box.pad + fit.y;
  const wrapW = box.w + box.pad * 2;
  const wrapH = box.h + box.pad * 2;
  const sw = fit.w * z;
  const sh = fit.h * z;
  const nx = sw <= wrapW ? (wrapW - sw) / 2 - layoutLeft : clamp(tx, wrapW - sw - layoutLeft, -layoutLeft);
  const ny = sh <= wrapH ? (wrapH - sh) / 2 - layoutTop : clamp(ty, wrapH - sh - layoutTop, -layoutTop);
  return { z, tx: nx, ty: ny };
}

export default function Stage(props: Props) {
  const { doc, tool, resolve, imgVersion, masks, activeMaskRef, colorVersion, blurVersion } = props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0, pad: PAD });
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  // Pan/zoom of the photo: z = scale multiplier (1 = fit), tx/ty = CSS-px offset.
  const [view, setView] = useState<View>({ z: 1, tx: 0, ty: 0 });

  // Track the workspace size so the document is always centered and contained.
  // Phones get a tiny pad so the photo fills the space instead of floating small.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const pad = el.clientWidth < 640 ? 10 : PAD;
      setBox({ w: el.clientWidth - pad * 2, h: el.clientHeight - pad * 2, pad });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fit = fitContain(doc.width, doc.height, Math.max(1, box.w), Math.max(1, box.h));
  const scale = fit.w / doc.width; // doc px -> CSS px at zoom 1
  const cssFilter = buildFilterCSS(doc.adjust);

  // Recomposite the base canvas whenever anything visual changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = doc.width;
    canvas.height = doc.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderBase(ctx, doc, resolve, masks);
  }, [doc, resolve, imgVersion, masks, colorVersion, blurVersion]);

  // Clamp for display so a resize never leaves the photo stranded off-center
  // (Stage is keyed on the photo in the parent, so zoom resets on a new photo).
  const shown = clampTo(view.z, view.tx, view.ty, box, fit);

  // Refs the once-attached native touch/wheel listeners read for live values.
  const live = useRef({ tool, hasBase: !!doc.baseSrc, props });
  const viewRef = useRef(view);
  const geomRef = useRef({ box, fit });
  const touchCountRef = useRef(0);
  useEffect(() => {
    live.current = { tool, hasBase: !!doc.baseSrc, props };
    viewRef.current = view;
    geomRef.current = { box, fit };
  });

  // Clamp a candidate view against the live geometry (used by gesture handlers).
  const clampView = useCallback(
    (z: number, tx: number, ty: number): View => clampTo(z, tx, ty, geomRef.current.box, geomRef.current.fit),
    [],
  );

  // Map a screen point to document coordinates. Reads the frame's live rect, so
  // it stays correct through any pan/zoom transform (rect reflects the scale).
  const toDoc = useCallback(
    (clientX: number, clientY: number) => {
      const rect = frameRef.current!.getBoundingClientRect();
      const s = rect.width / doc.width;
      return { x: (clientX - rect.left) / s, y: (clientY - rect.top) / s };
    },
    [doc.width],
  );

  // --- Brush ----------------------------------------------------------------
  const painting = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const paintDab = useCallback(
    (x: number, y: number, pressure: number, penType: boolean) => {
      const mask = activeMaskRef.current;
      if (!mask) return;
      const ctx = mask.getContext("2d");
      if (!ctx) return;
      const pr = penType && pressure > 0 ? 0.35 + pressure * 0.65 : 1;
      const r = (props.brush.size / 2) * pr;
      ctx.globalCompositeOperation =
        props.brush.mode === "erase" ? "destination-out" : "source-over";
      if (props.brush.hardness >= 1) {
        ctx.fillStyle = "#fff";
      } else {
        const inner = r * clamp(props.brush.hardness, 0, 0.98);
        const g = ctx.createRadialGradient(x, y, inner, x, y, r);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
      }
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    },
    [activeMaskRef, props.brush],
  );

  const strokeTo = useCallback(
    (x: number, y: number, pressure: number, pen: boolean) => {
      const p0 = last.current ?? { x, y };
      const dist = Math.hypot(x - p0.x, y - p0.y);
      const steps = Math.max(1, Math.floor(dist / (props.brush.size * 0.22)));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        paintDab(p0.x + (x - p0.x) * t, p0.y + (y - p0.y) * t, pressure, pen);
      }
      last.current = { x, y };
    },
    [paintDab, props.brush.size],
  );

  // Drag across the photo to live-scrub filters (Snapchat/Instagram). One filter
  // per ~54px of horizontal drag; the photo + name update as the finger moves.
  const STEP_PX = 54;
  const swipe = useRef<{ x: number; steps: number; started: boolean } | null>(null); // mouse scrub
  const mpan = useRef<{ sx: number; sy: number; v0: View } | null>(null); // mouse pan (zoomed)
  const press = useRef<{ x: number; y: number } | null>(null); // tap detection

  // Touch pinch-zoom + pan, and 1-finger scrub/pan, via native listeners
  // (passive:false so preventDefault works and iOS delivers the moves). Pinch
  // works in every mode; a 2nd finger cancels any in-progress brush stroke.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let mode: "scrub" | "pan" | "pinch" | null = null;
    let sx = 0, sy = 0, steps = 0, scrubStarted = false;
    let d0 = 0;
    let m0 = { x: 0, y: 0 };
    let v0: View = { z: 1, tx: 0, ty: 0 };

    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const mid = (t: TouchList) => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 });
    const frameOrigin = () => {
      const wr = el.getBoundingClientRect();
      const g = geomRef.current;
      return { x: wr.left + g.box.pad + g.fit.x, y: wr.top + g.box.pad + g.fit.y };
    };
    const cancelBrush = () => {
      if (painting.current) {
        painting.current = false;
        last.current = null;
        live.current.props.onBrushEnd();
      }
    };

    const start = (e: TouchEvent) => {
      touchCountRef.current = e.touches.length;
      const L = live.current;
      if (e.touches.length === 2) {
        cancelBrush();
        mode = "pinch";
        d0 = dist(e.touches);
        m0 = mid(e.touches);
        v0 = { ...viewRef.current };
        return;
      }
      if (e.touches.length === 1) {
        if (!L.hasBase || L.tool === "brush" || L.tool === "text") { mode = null; return; }
        if ((e.target as Element | null)?.closest?.("[data-layer]")) { mode = null; return; }
        sx = e.touches[0].clientX;
        sy = e.touches[0].clientY;
        v0 = { ...viewRef.current };
        steps = 0;
        scrubStarted = false;
        mode = viewRef.current.z > 1 ? "pan" : "scrub";
      }
    };

    const move = (e: TouchEvent) => {
      if (mode === "pinch") {
        if (e.touches.length < 2) return;
        e.preventDefault();
        const d = dist(e.touches);
        const m = mid(e.touches);
        const fo = frameOrigin();
        const nz = clamp((v0.z * d) / (d0 || 1), 1, MAX_ZOOM);
        const lx = (m0.x - fo.x - v0.tx) / v0.z;
        const ly = (m0.y - fo.y - v0.ty) / v0.z;
        setView(clampView(nz, m.x - fo.x - nz * lx, m.y - fo.y - nz * ly));
        return;
      }
      if (mode === "pan") {
        if (e.touches.length !== 1) return;
        e.preventDefault();
        setView(clampView(viewRef.current.z, v0.tx + (e.touches[0].clientX - sx), v0.ty + (e.touches[0].clientY - sy)));
        return;
      }
      if (mode === "scrub") {
        if (e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - sx;
        const dy = e.touches[0].clientY - sy;
        if (Math.abs(dx) < 14 || Math.abs(dx) < Math.abs(dy) * 1.1) return;
        e.preventDefault();
        if (!scrubStarted) {
          scrubStarted = true;
          live.current.props.onScrubStart();
        }
        const st = Math.round(-dx / STEP_PX);
        if (st !== steps) {
          steps = st;
          live.current.props.onScrub(st);
        }
      }
    };

    const end = (e: TouchEvent) => {
      touchCountRef.current = e.touches.length;
      if (mode === "scrub" && scrubStarted) live.current.props.onScrubEnd();
      // Lifting one finger of a pinch: keep panning with the remaining finger so
      // the photo doesn't jump.
      if (mode === "pinch" && e.touches.length === 1) {
        const L = live.current;
        if (L.tool !== "brush" && L.tool !== "text" && viewRef.current.z > 1) {
          sx = e.touches[0].clientX;
          sy = e.touches[0].clientY;
          v0 = { ...viewRef.current };
          mode = "pan";
          return;
        }
      }
      if (e.touches.length === 0) mode = null;
    };

    // Trackpad / mouse wheel zoom, focused on the cursor.
    const wheel = (e: WheelEvent) => {
      if (!live.current.hasBase) return;
      e.preventDefault();
      const fo = frameOrigin();
      const v = viewRef.current;
      const nz = clamp(v.z * Math.exp(-e.deltaY * 0.0015), 1, MAX_ZOOM);
      const lx = (e.clientX - fo.x - v.tx) / v.z;
      const ly = (e.clientY - fo.y - v.ty) / v.z;
      setView(clampView(nz, e.clientX - fo.x - nz * lx, e.clientY - fo.y - nz * ly));
    };

    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end, { passive: true });
    el.addEventListener("touchcancel", end, { passive: true });
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
      el.removeEventListener("wheel", wheel);
    };
  }, [clampView]);

  const framePointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    const { x, y } = toDoc(e.clientX, e.clientY);
    if (tool === "brush" && doc.baseSrc) {
      if (touchCountRef.current >= 2) return; // let a pinch take over
      e.preventDefault();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      painting.current = true;
      last.current = null;
      props.onBrushBegin();
      strokeTo(x, y, e.pressure, e.pointerType === "pen");
      props.onBrushPaint();
      return;
    }
    if (tool === "text") {
      props.onCreateTextAt(x, y);
      return;
    }
    if (e.target === frameRef.current || e.target === canvasRef.current) {
      press.current = { x: e.clientX, y: e.clientY };
      if (e.pointerType === "mouse") {
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
        if (shown.z > 1) mpan.current = { sx: e.clientX, sy: e.clientY, v0: { ...shown } };
        else swipe.current = { x: e.clientX, steps: 0, started: false };
      }
    }
  };

  const framePointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (tool === "brush") {
      const { x, y } = toDoc(e.clientX, e.clientY);
      setCursor({ x, y });
      if (painting.current && touchCountRef.current < 2) {
        strokeTo(x, y, e.pressure, e.pointerType === "pen");
        props.onBrushPaint();
      }
      return;
    }
    if (mpan.current) {
      setView(clampView(viewRef.current.z, mpan.current.v0.tx + (e.clientX - mpan.current.sx), mpan.current.v0.ty + (e.clientY - mpan.current.sy)));
      return;
    }
    const s = swipe.current; // mouse scrub only (touch handled natively)
    if (!s || !doc.baseSrc) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) < 14) return;
    if (!s.started) {
      s.started = true;
      props.onScrubStart();
    }
    const steps = Math.round(-dx / STEP_PX);
    if (steps !== s.steps) {
      s.steps = steps;
      props.onScrub(steps);
    }
  };

  const endStroke = (e: RPointerEvent<HTMLDivElement>) => {
    if (painting.current) {
      painting.current = false;
      last.current = null;
      props.onBrushEnd();
    }
    const s = swipe.current;
    swipe.current = null;
    const panned = !!mpan.current;
    mpan.current = null;
    if (s?.started) props.onScrubEnd();
    const pr = press.current;
    press.current = null;
    if (pr && !s?.started && !panned && Math.abs(e.clientX - pr.x) < 8 && Math.abs(e.clientY - pr.y) < 8) {
      props.onSelect(null); // a tap deselects
      props.onEditingChange(null);
    }
  };

  const brushActive = tool === "brush" && !!doc.baseSrc;
  const zoomed = shown.z > 1.01;

  return (
    <div
      ref={wrapRef}
      className="relative order-1 min-h-0 flex-1 overflow-hidden sm:order-2"
      style={{ touchAction: "none" }}
    >
      <div
        ref={frameRef}
        className="absolute overflow-hidden rounded-[3px]"
        style={{
          left: box.pad + fit.x,
          top: box.pad + fit.y,
          width: fit.w,
          height: fit.h,
          transform: `translate(${shown.tx}px, ${shown.ty}px) scale(${shown.z})`,
          transformOrigin: "0 0",
          boxShadow: "var(--shadow)",
          touchAction: "none",
          cursor: brushActive ? "none" : zoomed ? "grab" : tool === "text" ? "text" : "default",
        }}
        onPointerDown={framePointerDown}
        onPointerMove={framePointerMove}
        onPointerUp={endStroke}
        onPointerLeave={() => setCursor(null)}
        onPointerCancel={endStroke}
      >
        {/* The whole composited canvas (base photo + all layers) is filtered
            together, so an Instagram-style look also covers image/text layers.
            CSS filters work on Safari (unlike canvas ctx.filter). */}
        <div className="absolute inset-0" style={{ filter: cssFilter }}>
          <canvas
            ref={canvasRef}
            className="checker block h-full w-full touch-none select-none"
            style={{ width: fit.w, height: fit.h }}
          />
          {doc.layers.map((layer) => (
            <LayerView
              key={layer.id}
              layer={layer}
              scale={scale}
              tool={tool}
              selected={props.selectedId === layer.id}
              editing={props.editingId === layer.id}
              docW={doc.width}
              docH={doc.height}
              toDoc={toDoc}
              onSelect={props.onSelect}
              onChange={props.onLayerChange}
              onEditText={props.onEditText}
              onEditingChange={props.onEditingChange}
            />
          ))}
        </div>

        {/* Brush ring cursor */}
        {brushActive && cursor && (
          <div
            className="pointer-events-none absolute rounded-full"
            style={{
              left: cursor.x * scale,
              top: cursor.y * scale,
              width: props.brush.size * scale,
              height: props.brush.size * scale,
              transform: "translate(-50%, -50%)",
              border: "1.5px solid var(--accent)",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.4), 0 0 14px var(--accent-glow)",
              background:
                props.brush.mode === "erase" ? "rgba(255,106,77,0.12)" : "var(--accent-glow)",
            }}
          />
        )}
      </div>

      {/* Zoom badge + reset (pinch, or wheel/trackpad, to zoom; drag to pan) */}
      {zoomed && (
        <button
          type="button"
          onClick={() => setView({ z: 1, tx: 0, ty: 0 })}
          className="mono absolute bottom-3 right-3 z-20 rounded-full px-3 py-1.5 text-[12px] font-semibold shadow-lg"
          style={{ background: "var(--accent)", color: "var(--accent-ink)", paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
        >
          {Math.round(shown.z * 100)}% · Reset
        </button>
      )}
    </div>
  );
}

// --- Individual overlay layer --------------------------------------------------

function LayerView({
  layer,
  scale,
  tool,
  selected,
  editing,
  docW,
  docH,
  toDoc,
  onSelect,
  onChange,
  onEditText,
  onEditingChange,
}: {
  layer: Layer;
  scale: number;
  tool: ToolId;
  selected: boolean;
  editing: boolean;
  docW: number;
  docH: number;
  toDoc: (x: number, y: number) => { x: number; y: number };
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<Layer>, commit: boolean) => void;
  onEditText: (id: string, text: string) => void;
  onEditingChange: (id: string | null) => void;
}) {
  const drag = useRef<{ ox: number; oy: number; lx: number; ly: number } | null>(null);
  const resize = useRef<{ sx: number; sy: number; w: number; h: number } | null>(null);
  const interactive = tool === "select";

  const onDown = (e: RPointerEvent<HTMLElement>) => {
    if (!interactive || editing) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    onSelect(layer.id);
    const p = toDoc(e.clientX, e.clientY);
    drag.current = { ox: p.x - layer.x, oy: p.y - layer.y, lx: layer.x, ly: layer.y };
  };
  const onMove = (e: RPointerEvent<HTMLElement>) => {
    if (resize.current && layer.type === "image") {
      const p = toDoc(e.clientX, e.clientY);
      const w = Math.max(24, p.x - layer.x);
      const ratio = resize.current.h / resize.current.w;
      onChange(layer.id, { w, h: w * ratio }, false);
      return;
    }
    if (!drag.current) return;
    const p = toDoc(e.clientX, e.clientY);
    // Keep the layer within the canvas (its "arrangement cutoff") - at least a
    // sliver stays on screen so it can't be lost off-edge.
    const lw = layer.type === "image" ? layer.w : 40;
    const lh = layer.type === "image" ? layer.h : 40;
    const nx = clamp(p.x - drag.current.ox, -lw + 24, docW - 24);
    const ny = clamp(p.y - drag.current.oy, -lh + 24, docH - 24);
    onChange(layer.id, { x: nx, y: ny }, false);
  };
  const onUp = () => {
    if (drag.current || resize.current) onChange(layer.id, {}, true);
    drag.current = null;
    resize.current = null;
  };

  const common = {
    "data-layer": "1", // so the filter-swipe skips touches that land on a layer
    onPointerDown: onDown,
    onPointerMove: onMove,
    onPointerUp: onUp,
    onPointerCancel: onUp,
  };

  if (layer.type === "text") {
    const t = layer as TextLayer;
    return (
      <div
        {...common}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onEditingChange(t.id);
        }}
        className="absolute origin-top-left whitespace-pre"
        style={{
          left: t.x * scale,
          top: t.y * scale,
          transform: `rotate(${t.rotation}deg)`,
          transformOrigin: "top left",
          color: t.color,
          fontFamily: t.fontFamily,
          fontWeight: t.weight,
          fontStyle: t.italic ? "italic" : "normal",
          fontSize: t.fontSize * scale,
          lineHeight: 1.18,
          letterSpacing: t.letterSpacing * scale,
          textAlign: t.align,
          opacity: t.opacity,
          background: t.background ?? "transparent",
          padding: t.background ? `0 ${t.fontSize * 0.2 * scale}px` : 0,
          outline: selected ? "1.5px solid var(--accent)" : "none",
          outlineOffset: 3,
          cursor: interactive ? "move" : "default",
          touchAction: "none",
          userSelect: editing ? "text" : "none",
        }}
        contentEditable={editing}
        suppressContentEditableWarning
        onBlur={(e) => {
          onEditText(t.id, e.currentTarget.textContent ?? "");
          onEditingChange(null);
        }}
      >
        {t.text}
      </div>
    );
  }

  const im = layer as ImageLayer;
  return (
    <div
      {...common}
      className="absolute"
      style={{
        left: im.x * scale,
        top: im.y * scale,
        width: im.w * scale,
        height: im.h * scale,
        transform: `rotate(${im.rotation}deg)`,
        transformOrigin: "center",
        opacity: im.opacity,
        outline: selected ? "1.5px solid var(--accent)" : "none",
        outlineOffset: 2,
        cursor: interactive ? "move" : "default",
        touchAction: "none",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={im.src}
        alt=""
        draggable={false}
        className="h-full w-full select-none object-cover"
        style={{ borderRadius: im.radius * scale }}
      />
      {selected && interactive && (
        <span
          onPointerDown={(e) => {
            e.stopPropagation();
            (e.target as Element).setPointerCapture?.(e.pointerId);
            resize.current = { sx: e.clientX, sy: e.clientY, w: im.w, h: im.h };
          }}
          onPointerMove={onMove}
          onPointerUp={onUp}
          className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-full"
          style={{ background: "var(--accent)", border: "2px solid var(--bg)" }}
        />
      )}
    </div>
  );
}
