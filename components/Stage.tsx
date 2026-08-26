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
  onBrushBegin: () => void;
  onBrushPaint: () => void;
  onBrushEnd: () => void;
};

const PAD = 40;

export default function Stage(props: Props) {
  const { doc, tool, resolve, imgVersion, masks, activeMaskRef, colorVersion, blurVersion } = props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  // Track the workspace size so the document is always centered and contained.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setBox({ w: el.clientWidth - PAD * 2, h: el.clientHeight - PAD * 2 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fit = fitContain(doc.width, doc.height, Math.max(1, box.w), Math.max(1, box.h));
  const scale = fit.w / doc.width;

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

  const toDoc = useCallback(
    (clientX: number, clientY: number) => {
      const rect = frameRef.current!.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale,
      };
    },
    [scale],
  );

  // --- Color-splash brush ---------------------------------------------------
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

  const framePointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    const { x, y } = toDoc(e.clientX, e.clientY);
    if (tool === "brush" && doc.baseSrc) {
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
    // Clicking empty space deselects.
    if (e.target === frameRef.current || e.target === canvasRef.current) {
      props.onSelect(null);
      props.onEditingChange(null);
    }
  };

  const framePointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (tool === "brush") {
      const { x, y } = toDoc(e.clientX, e.clientY);
      setCursor({ x, y });
      if (painting.current) {
        strokeTo(x, y, e.pressure, e.pointerType === "pen");
        props.onBrushPaint();
      }
    }
  };

  const endStroke = () => {
    if (painting.current) {
      painting.current = false;
      last.current = null;
      props.onBrushEnd();
    }
  };

  const brushActive = tool === "brush" && !!doc.baseSrc;

  return (
    <div
      ref={wrapRef}
      className="relative order-1 min-h-0 flex-1 overflow-hidden sm:order-2"
      style={{ touchAction: brushActive ? "none" : "auto" }}
    >
      <div
        ref={frameRef}
        className="absolute overflow-hidden rounded-[3px]"
        style={{
          left: PAD + fit.x,
          top: PAD + fit.y,
          width: fit.w,
          height: fit.h,
          boxShadow: "var(--shadow)",
          cursor: brushActive ? "none" : tool === "text" ? "text" : "default",
        }}
        onPointerDown={framePointerDown}
        onPointerMove={framePointerMove}
        onPointerUp={endStroke}
        onPointerLeave={() => setCursor(null)}
        onPointerCancel={endStroke}
      >
        <canvas
          ref={canvasRef}
          className="checker block h-full w-full touch-none select-none"
          style={{ width: fit.w, height: fit.h }}
        />

        {/* Overlay layers (text + images), rendered top of the base canvas */}
        {doc.layers.map((layer) => (
          <LayerView
            key={layer.id}
            layer={layer}
            scale={scale}
            tool={tool}
            selected={props.selectedId === layer.id}
            editing={props.editingId === layer.id}
            toDoc={toDoc}
            onSelect={props.onSelect}
            onChange={props.onLayerChange}
            onEditText={props.onEditText}
            onEditingChange={props.onEditingChange}
          />
        ))}

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
    onChange(layer.id, { x: p.x - drag.current.ox, y: p.y - drag.current.oy }, false);
  };
  const onUp = () => {
    if (drag.current || resize.current) onChange(layer.id, {}, true);
    drag.current = null;
    resize.current = null;
  };

  const common = {
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
