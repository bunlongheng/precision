"use client";

import type { EditorDoc, Adjust, Layer, TextLayer, ImageLayer } from "@/lib/types";
import { PRESETS } from "@/lib/filters";
import { COLLAGE_LIST } from "@/lib/collage";
import type { BrushState, ToolId } from "./editor-types";
import { Slider, Segmented, PanelSection, Swatch } from "./ui";
import { TrashIcon, LayersIcon } from "./icons";

const PALETTE = ["#ffffff", "#0d0d0f", "#c9f24d", "#ff6a4d", "#4d9dff", "#ffd23f", "#ff4da6"];
const FONTS = [
  { label: "Grotesque", value: "var(--font-display), sans-serif" },
  { label: "Mono", value: "var(--font-mono), monospace" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
];

type Props = {
  tool: ToolId;
  doc: EditorDoc;
  selected: Layer | null;
  brush: BrushState;
  brushCanUndo: boolean;
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
  onCollage: (id: EditorDoc["collage"]) => void;
  onDocBg: (color: string) => void;
  onSelectLayer: (id: string) => void;
};

export default function RightPanel(p: Props) {
  const { tool, doc, selected } = p;

  const showText = (tool === "select" || tool === "text") && selected?.type === "text";
  const showImage = (tool === "select" || tool === "image") && selected?.type === "image";

  return (
    <aside className="flex w-full shrink-0 flex-col overflow-y-auto border-t border-[var(--hairline)] bg-[var(--panel)] sm:w-[290px] sm:border-l sm:border-t-0">
      {tool === "adjust" && <AdjustPanel doc={doc} onAdjust={p.onAdjust} onPreset={p.onPreset} onReset={p.onResetAdjust} />}
      {tool === "brush" && (
        <BrushPanel doc={doc} brush={p.brush} onBrush={p.onBrush} canUndo={p.brushCanUndo} onUndo={p.onBrushUndo} onClear={p.onBrushClear} />
      )}
      {tool === "collage" && <CollagePanel doc={doc} onCollage={p.onCollage} onBg={p.onDocBg} />}
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
  onAdjust,
  onPreset,
  onReset,
}: {
  doc: EditorDoc;
  onAdjust: (patch: Partial<Adjust>, commit: boolean) => void;
  onPreset: (a: Adjust) => void;
  onReset: () => void;
}) {
  const a = doc.adjust;
  const set = (k: keyof Adjust) => (v: number) => onAdjust({ [k]: v }, false);
  const commit = () => onAdjust({}, true);
  return (
    <>
      <PanelSection title="Filters">
        <div className="grid grid-cols-3 gap-1.5">
          {PRESETS.map((pr) => (
            <button
              key={pr.id}
              type="button"
              onClick={() => onPreset(pr.adjust)}
              className="rounded-lg border border-[var(--hairline)] bg-[var(--bg)] px-1 py-2 text-[11px] font-medium text-[var(--ink-dim)] transition-colors hover:border-[var(--accent)] hover:text-[var(--ink)]"
            >
              {pr.name}
            </button>
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
  const blocked = doc.collage !== "single" || !doc.baseSrc;
  return (
    <>
      <PanelSection title="Color splash">
        <p className="mb-3 text-[12px] leading-relaxed text-[var(--ink-dim)]">
          The photo goes black and white. Paint to bring the{" "}
          <span style={{ color: "var(--accent-strong)" }}>original color</span> back only where you brush.
        </p>
        {blocked && (
          <p className="rounded-lg border border-[var(--hairline)] bg-[var(--bg)] px-3 py-2 text-[11px] text-[var(--ink-faint)]">
            Drop a single photo (not a collage) to use the color-splash brush.
          </p>
        )}
      </PanelSection>
      {!blocked && (
        <PanelSection title="Brush">
          <div className="space-y-3.5">
            <Segmented
              value={brush.mode}
              onChange={(m) => onBrush({ mode: m })}
              options={[
                { value: "paint", label: "Paint color" },
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

function CollagePanel({
  doc,
  onCollage,
  onBg,
}: {
  doc: EditorDoc;
  onCollage: (id: EditorDoc["collage"]) => void;
  onBg: (c: string) => void;
}) {
  return (
    <>
      <PanelSection title="Layout">
        <div className="grid grid-cols-3 gap-2">
          {COLLAGE_LIST.map((t) => {
            const active = doc.collage === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onCollage(t.id)}
                title={t.name}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border p-1 text-[9px] transition-colors"
                style={{
                  borderColor: active ? "var(--accent)" : "var(--hairline)",
                  background: active ? "var(--accent-glow)" : "var(--bg)",
                  color: active ? "var(--ink)" : "var(--ink-dim)",
                }}
              >
                <span className="mono text-[13px]">{t.count}</span>
                <span className="leading-tight">{t.name}</span>
              </button>
            );
          })}
        </div>
      </PanelSection>
      <PanelSection title="Backdrop">
        <div className="flex flex-wrap gap-2">
          {PALETTE.map((c) => (
            <Swatch key={c} color={c} active={doc.background === c} onClick={() => onBg(c)} />
          ))}
          <label className="grid h-7 w-7 cursor-pointer place-items-center rounded-full border border-dashed border-[var(--hairline-strong)] text-[var(--ink-faint)]">
            <input type="color" value={doc.background} onChange={(e) => onBg(e.target.value)} className="sr-only" />
            +
          </label>
        </div>
      </PanelSection>
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
