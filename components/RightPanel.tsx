"use client";

import { useMemo } from "react";
import type { EditorDoc, Adjust, Layer, TextLayer, ImageLayer } from "@/lib/types";
import { PRESETS } from "@/lib/filters";
import { fitCover } from "@/lib/geometry";
import type { ImageResolver } from "./render";
import type { BrushState, ToolId } from "./editor-types";
import { Slider, Segmented, PanelSection, Swatch } from "./ui";
import { TrashIcon, LayersIcon } from "./icons";
import FilterThumb from "./FilterThumb";

const PALETTE = ["#ffffff", "#0d0d0f", "#c9f24d", "#ff6a4d", "#4d9dff", "#ffd23f", "#ff4da6"];
const FONTS = [
  { label: "Grotesque", value: "var(--font-display), sans-serif" },
  { label: "Mono", value: "var(--font-mono), monospace" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
];

type Props = {
  open: boolean;
  tool: ToolId;
  doc: EditorDoc;
  selected: Layer | null;
  brush: BrushState;
  brushCanUndo: boolean;
  resolve: ImageResolver;
  imgVersion: number;
  onAdjust: (patch: Partial<Adjust>, commit: boolean) => void;
  onPreset: (a: Adjust) => void;
  onResetAdjust: () => void;
  onBrush: (patch: Partial<BrushState>) => void;
  onBrushUndo: () => void;
  onBrushClear: () => void;
  onLayer: (id: string, patch: Partial<Layer>, commit: boolean) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onReorder: (id: string, dir: 1 | -1) => void;
  onSelectLayer: (id: string) => void;
};

export default function RightPanel(p: Props) {
  const { tool, doc, selected } = p;

  const showText = (tool === "select" || tool === "text") && selected?.type === "text";
  const showImage = (tool === "select" || tool === "image") && selected?.type === "image";

  return (
    <aside
      className={`${
        p.open ? "flex" : "hidden sm:flex"
      } order-2 max-h-[38dvh] w-full shrink-0 flex-col overflow-y-auto rounded-t-2xl border-t border-[var(--hairline)] bg-[var(--panel)] shadow-[0_-12px_40px_-20px_rgba(0,0,0,0.6)] sm:order-3 sm:max-h-none sm:w-[290px] sm:rounded-none sm:border-l sm:border-t-0 sm:shadow-none`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* grip handle (phone bottom sheet) */}
      <div className="sticky top-0 z-10 flex justify-center bg-[var(--panel)] py-2 sm:hidden">
        <span className="h-1 w-9 rounded-full bg-[var(--hairline-strong)]" />
      </div>
      {tool === "adjust" && (
        <AdjustPanel
          doc={doc}
          resolve={p.resolve}
          imgVersion={p.imgVersion}
          onAdjust={p.onAdjust}
          onPreset={p.onPreset}
          onReset={p.onResetAdjust}
        />
      )}
      {tool === "brush" && (
        <BrushPanel doc={doc} brush={p.brush} onBrush={p.onBrush} canUndo={p.brushCanUndo} onUndo={p.onBrushUndo} onClear={p.onBrushClear} />
      )}
      {showText && <TextPanel layer={selected as TextLayer} onLayer={p.onLayer} onDelete={p.onDelete} onDuplicate={p.onDuplicate} />}
      {showImage && <ImagePanel layer={selected as ImageLayer} onLayer={p.onLayer} onDelete={p.onDelete} onDuplicate={p.onDuplicate} onReorder={p.onReorder} />}
      {!showText && !showImage && (tool === "select" || tool === "text" || tool === "image") && (
        <LayersPanel doc={doc} onSelect={p.onSelectLayer} onDelete={p.onDelete} tool={tool} />
      )}
    </aside>
  );
}

function AdjustPanel({
  doc,
  resolve,
  imgVersion,
  onAdjust,
  onPreset,
  onReset,
}: {
  doc: EditorDoc;
  resolve: ImageResolver;
  imgVersion: number;
  onAdjust: (patch: Partial<Adjust>, commit: boolean) => void;
  onPreset: (a: Adjust) => void;
  onReset: () => void;
}) {
  const a = doc.adjust;
  const set = (k: keyof Adjust) => (v: number) => onAdjust({ [k]: v }, false);
  const commit = () => onAdjust({}, true);

  // A small, unfiltered source of the user's own photo that every filter tile
  // re-tints. Built once per image so 24 previews stay cheap.
  const sample = useMemo(() => {
    const src = doc.baseSrc;
    const img = src ? resolve(src) : null;
    if (!img) return null;
    const W = 200;
    const H = 150;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    const r = fitCover(img.naturalWidth, img.naturalHeight, W, H);
    ctx.drawImage(img, r.x, r.y, r.w, r.h);
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.baseSrc, imgVersion, resolve]);

  // Mark the tile whose look matches the current adjustments as active.
  const activeId = PRESETS.find(
    (pr) => JSON.stringify(pr.adjust) === JSON.stringify(a),
  )?.id;

  return (
    <>
      <PanelSection title="Filters">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
          {PRESETS.map((pr) => (
            <FilterThumb
              key={pr.id}
              source={sample}
              adjust={pr.adjust}
              name={pr.name}
              active={activeId === pr.id}
              onClick={() => onPreset(pr.adjust)}
            />
          ))}
        </div>
      </PanelSection>
      <PanelSection
        title="Adjust"
        action={
          <button onClick={onReset} className="mono text-[10px] uppercase tracking-widest text-[var(--ink-faint)] hover:text-[var(--accent-strong)]">
            reset
          </button>
        }
      >
        <div className="space-y-3.5">
          <Slider label="Brightness" value={a.brightness} min={0} max={200} suffix="%" onChange={set("brightness")} onCommit={commit} />
          <Slider label="Contrast" value={a.contrast} min={0} max={200} suffix="%" onChange={set("contrast")} onCommit={commit} />
          <Slider label="Saturation" value={a.saturate} min={0} max={200} suffix="%" onChange={set("saturate")} onCommit={commit} />
          <Slider label="Black & white" value={a.grayscale} min={0} max={100} suffix="%" onChange={set("grayscale")} onCommit={commit} />
          <Slider label="Sepia" value={a.sepia} min={0} max={100} suffix="%" onChange={set("sepia")} onCommit={commit} />
          <Slider label="Tint" value={a.hue} min={-180} max={180} suffix="deg" onChange={set("hue")} onCommit={commit} />
          <Slider label="Blur" value={a.blur} min={0} max={20} step={0.5} suffix="px" onChange={set("blur")} onCommit={commit} />
        </div>
      </PanelSection>
    </>
  );
}

function BrushPanel({
  doc,
  brush,
  onBrush,
  canUndo,
  onUndo,
  onClear,
}: {
  doc: EditorDoc;
  brush: BrushState;
  onBrush: (patch: Partial<BrushState>) => void;
  canUndo: boolean;
  onUndo: () => void;
  onClear: () => void;
}) {
  const blocked = !doc.baseSrc;
  const isBlur = brush.effect === "blur";
  return (
    <>
      <PanelSection title="Brush effect">
        <Segmented
          value={brush.effect}
          onChange={(e) => onBrush({ effect: e })}
          options={[
            { value: "color", label: "Color splash" },
            { value: "blur", label: "Blur" },
          ]}
        />
        <p className="mt-3 text-[12px] leading-relaxed text-[var(--ink-dim)]">
          {isBlur ? (
            <>
              Paint to <span style={{ color: "var(--accent-strong)" }}>blur</span> an area - hide a face or soften the background.
            </>
          ) : (
            <>
              The photo goes black and white. Paint to bring the{" "}
              <span style={{ color: "var(--accent-strong)" }}>original color</span> back only where you brush.
            </>
          )}
        </p>
        {blocked && (
          <p className="mt-3 rounded-lg border border-[var(--hairline)] bg-[var(--bg)] px-3 py-2 text-[11px] text-[var(--ink-faint)]">
            Drop a photo to use the brush.
          </p>
        )}
      </PanelSection>

      {!blocked && isBlur && (
        <PanelSection title="Blur style">
          <Segmented
            value={brush.blurType}
            onChange={(t) => onBrush({ blurType: t })}
            options={[
              { value: "soft", label: "Soft" },
              { value: "pixelate", label: "Pixels" },
              { value: "security", label: "Secure" },
            ]}
          />
          <p className="mt-2 text-[11px] text-[var(--ink-faint)]">
            {brush.blurType === "soft"
              ? "Smooth gaussian blur."
              : brush.blurType === "pixelate"
                ? "Mosaic pixel blocks."
                : "Scrambled pixels - unrecoverable, for redaction."}
          </p>
          <div className="mt-3.5">
            <Slider label="Strength" value={brush.blurStrength} min={5} max={100} suffix="%" onChange={(v) => onBrush({ blurStrength: v })} />
          </div>
        </PanelSection>
      )}

      {!blocked && (
        <PanelSection title="Brush">
          <div className="space-y-3.5">
            <Segmented
              value={brush.mode}
              onChange={(m) => onBrush({ mode: m })}
              options={[
                { value: "paint", label: isBlur ? "Paint blur" : "Paint color" },
                { value: "erase", label: "Erase" },
              ]}
            />
            <Slider label="Size" value={brush.size} min={10} max={400} suffix="px" onChange={(v) => onBrush({ size: v })} />
            <Slider label="Softness" value={Math.round((1 - brush.hardness) * 100)} min={0} max={100} suffix="%" onChange={(v) => onBrush({ hardness: 1 - v / 100 })} />
            <div className="flex gap-2 pt-1">
              <button onClick={onUndo} disabled={!canUndo} className="flex-1 rounded-lg border border-[var(--hairline)] px-3 py-2 text-[12px] font-medium text-[var(--ink-dim)] transition-colors hover:text-[var(--ink)] disabled:opacity-30">
                Undo stroke
              </button>
              <button onClick={onClear} className="flex-1 rounded-lg border border-[var(--hairline)] px-3 py-2 text-[12px] font-medium text-[var(--ink-dim)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)]">
                Clear all
              </button>
            </div>
          </div>
        </PanelSection>
      )}
    </>
  );
}

function TextPanel({
  layer,
  onLayer,
  onDelete,
  onDuplicate,
}: {
  layer: TextLayer;
  onLayer: (id: string, patch: Partial<Layer>, commit: boolean) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const set = (patch: Partial<TextLayer>, commit = true) => onLayer(layer.id, patch, commit);
  return (
    <>
      <PanelSection title="Text">
        <textarea
          value={layer.text}
          onChange={(e) => set({ text: e.target.value })}
          rows={2}
          className="w-full resize-none rounded-lg border border-[var(--hairline)] bg-[var(--bg)] px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
        />
      </PanelSection>
      <PanelSection title="Font">
        <div className="space-y-3">
          <Segmented value={layer.fontFamily} onChange={(f) => set({ fontFamily: f })} options={FONTS.map((f) => ({ value: f.value, label: f.label }))} />
          <div className="flex gap-2">
            <button onClick={() => set({ weight: layer.weight >= 700 ? 500 : 800 })} className="flex-1 rounded-lg border border-[var(--hairline)] py-1.5 text-[13px] font-bold" style={{ color: layer.weight >= 700 ? "var(--accent-strong)" : "var(--ink-dim)" }}>
              Bold
            </button>
            <button onClick={() => set({ italic: !layer.italic })} className="flex-1 rounded-lg border border-[var(--hairline)] py-1.5 text-[13px] italic" style={{ color: layer.italic ? "var(--accent-strong)" : "var(--ink-dim)" }}>
              Italic
            </button>
          </div>
          <Segmented value={layer.align} onChange={(al) => set({ align: al })} options={[
            { value: "left", label: "L" },
            { value: "center", label: "C" },
            { value: "right", label: "R" },
          ]} />
          <Slider label="Size" value={layer.fontSize} min={12} max={400} onChange={(v) => set({ fontSize: v }, false)} onCommit={() => set({})} />
          <Slider label="Spacing" value={layer.letterSpacing} min={-8} max={40} onChange={(v) => set({ letterSpacing: v }, false)} onCommit={() => set({})} />
          <Slider label="Rotation" value={layer.rotation} min={-180} max={180} suffix="deg" onChange={(v) => set({ rotation: v }, false)} onCommit={() => set({})} />
          <Slider label="Opacity" value={Math.round(layer.opacity * 100)} min={0} max={100} suffix="%" onChange={(v) => set({ opacity: v / 100 }, false)} onCommit={() => set({})} />
        </div>
      </PanelSection>
      <PanelSection title="Color">
        <div className="mb-3 flex flex-wrap gap-2">
          {PALETTE.map((c) => (
            <Swatch key={c} color={c} active={layer.color === c} onClick={() => set({ color: c })} />
          ))}
          <label className="grid h-7 w-7 cursor-pointer place-items-center rounded-full border border-dashed border-[var(--hairline-strong)] text-[var(--ink-faint)]">
            <input type="color" value={layer.color} onChange={(e) => set({ color: e.target.value })} className="sr-only" />
            +
          </label>
        </div>
        <button
          onClick={() => set({ background: layer.background ? null : "#0d0d0f" })}
          className="w-full rounded-lg border border-[var(--hairline)] py-2 text-[12px] font-medium text-[var(--ink-dim)] transition-colors hover:text-[var(--ink)]"
        >
          {layer.background ? "Remove highlight" : "Add highlight"}
        </button>
      </PanelSection>
      <LayerActions id={layer.id} onDelete={onDelete} onDuplicate={onDuplicate} />
    </>
  );
}

function ImagePanel({
  layer,
  onLayer,
  onDelete,
  onDuplicate,
  onReorder,
}: {
  layer: ImageLayer;
  onLayer: (id: string, patch: Partial<Layer>, commit: boolean) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onReorder: (id: string, dir: 1 | -1) => void;
}) {
  const set = (patch: Partial<ImageLayer>, commit = false) => onLayer(layer.id, patch, commit);
  const commit = () => onLayer(layer.id, {}, true);
  return (
    <>
      <PanelSection title="Image layer">
        <div className="space-y-3.5">
          <Slider label="Opacity" value={Math.round(layer.opacity * 100)} min={0} max={100} suffix="%" onChange={(v) => set({ opacity: v / 100 })} onCommit={commit} />
          <Slider label="Rotation" value={layer.rotation} min={-180} max={180} suffix="deg" onChange={(v) => set({ rotation: v })} onCommit={commit} />
          <Slider label="Corner radius" value={layer.radius} min={0} max={200} onChange={(v) => set({ radius: v })} onCommit={commit} />
          <div className="flex gap-2">
            <button onClick={() => onReorder(layer.id, 1)} className="flex-1 rounded-lg border border-[var(--hairline)] py-2 text-[12px] font-medium text-[var(--ink-dim)] hover:text-[var(--ink)]">
              Bring forward
            </button>
            <button onClick={() => onReorder(layer.id, -1)} className="flex-1 rounded-lg border border-[var(--hairline)] py-2 text-[12px] font-medium text-[var(--ink-dim)] hover:text-[var(--ink)]">
              Send back
            </button>
          </div>
        </div>
      </PanelSection>
      <LayerActions id={layer.id} onDelete={onDelete} onDuplicate={onDuplicate} />
    </>
  );
}

function LayerActions({ id, onDelete, onDuplicate }: { id: string; onDelete: (id: string) => void; onDuplicate: (id: string) => void }) {
  return (
    <PanelSection title="Layer">
      <div className="flex gap-2">
        <button onClick={() => onDuplicate(id)} className="flex-1 rounded-lg border border-[var(--hairline)] py-2 text-[12px] font-medium text-[var(--ink-dim)] hover:text-[var(--ink)]">
          Duplicate
        </button>
        <button onClick={() => onDelete(id)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--hairline)] py-2 text-[12px] font-medium text-[var(--ink-dim)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)]">
          <TrashIcon width={15} height={15} /> Delete
        </button>
      </div>
    </PanelSection>
  );
}

function LayersPanel({
  doc,
  onSelect,
  onDelete,
  tool,
}: {
  doc: EditorDoc;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  tool: ToolId;
}) {
  return (
    <PanelSection title="Layers">
      {doc.layers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <LayersIcon width={26} height={26} className="text-[var(--ink-faint)]" />
          <p className="text-[12px] leading-relaxed text-[var(--ink-faint)]">
            {tool === "text"
              ? "Tap the photo to drop a text block."
              : tool === "image"
                ? "Add an image to layer it on top."
                : "Text and image layers show up here."}
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {[...doc.layers].reverse().map((l) => (
            <li key={l.id}>
              <button
                onClick={() => onSelect(l.id)}
                className="flex w-full items-center justify-between rounded-lg border border-[var(--hairline)] bg-[var(--bg)] px-3 py-2 text-left text-[12px] text-[var(--ink-dim)] transition-colors hover:border-[var(--accent)] hover:text-[var(--ink)]"
              >
                <span className="truncate">{l.type === "text" ? `“${(l as TextLayer).text.slice(0, 18) || "Text"}”` : "Image layer"}</span>
                <TrashIcon
                  width={14}
                  height={14}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(l.id);
                  }}
                  className="shrink-0 hover:text-[var(--danger)]"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </PanelSection>
  );
}
