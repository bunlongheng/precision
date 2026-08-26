"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { EditorDoc, Adjust, Layer, TextLayer, ImageLayer } from "@/lib/types";
import { EMPTY_DOC, DEFAULT_ADJUST } from "@/lib/types";
import {
  createHistory,
  push,
  replace,
  undo as histUndo,
  redo as histRedo,
  canUndo,
  canRedo,
} from "@/lib/history";
import { capSize } from "@/lib/geometry";
import { saveProject, type SavedProject } from "@/lib/projectStore";
import { useTheme } from "@/hooks/useTheme";
import { useImageCache } from "@/hooks/useImageCache";
import { usePaintMask } from "@/hooks/usePaintMask";
import { renderExport, type RenderMasks } from "./render";
import { DEFAULT_BRUSH, type BrushState, type ToolId } from "./editor-types";
import Stage from "./Stage";
import Toolbar from "./Toolbar";
import TopBar from "./TopBar";
import RightPanel from "./RightPanel";
import DropZone from "./DropZone";
import HelpModal from "./HelpModal";

let counter = 0;
const genId = () => `${Date.now().toString(36)}-${(counter++).toString(36)}`;

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function openFilePicker(onFile: (file: File) => void) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = () => {
    const f = input.files?.[0];
    if (f) onFile(f);
  };
  input.click();
}

export default function Editor({
  initial,
  onExit,
  onSaved,
}: {
  initial: SavedProject | null;
  onExit: () => void;
  onSaved: () => void;
}) {
  const { theme, toggle } = useTheme();
  const [hist, setHist] = useState(() => createHistory(initial?.doc ?? EMPTY_DOC));
  const doc = hist.present;
  const [tool, setTool] = useState<ToolId>(initial ? "adjust" : "select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [brush, setBrush] = useState<BrushState>(DEFAULT_BRUSH);
  const [exporting, setExporting] = useState(false);
  const [name, setName] = useState(initial?.name ?? "Untitled");
  const [showHelp, setShowHelp] = useState(false);
  const projectId = useRef(initial?.id ?? genId());

  // --- Brush masks: color-splash + blur (each an imperative offscreen canvas) --
  const color = usePaintMask();
  const blur = usePaintMask();

  useEffect(() => {
    if (!initial) return;
    const { width, height } = initial.doc;
    color.fresh(width, height);
    blur.fresh(width, height);
    if (initial.mask) color.loadFrom(initial.mask, width, height);
    if (initial.blurMask) blur.loadFrom(initial.blurMask, width, height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const freshMasks = useCallback(
    (w: number, h: number) => {
      color.fresh(w, h);
      blur.fresh(w, h);
    },
    [color, blur],
  );

  // The mask + undo controls for whichever effect the brush is currently on.
  const active = brush.effect === "blur" ? blur : color;

  // The masks bundle handed to the renderer (both composited every frame).
  const masks: RenderMasks = {
    colorMask: color.ref.current,
    colorInked: color.inked,
    blurMask: blur.ref.current,
    blurInked: blur.inked,
    blurType: brush.blurType,
    blurStrength: brush.blurStrength,
  };

  // --- Image cache ----------------------------------------------------------
  const srcs = useMemo(() => {
    const s: string[] = [];
    if (doc.baseSrc) s.push(doc.baseSrc);
    for (const l of doc.layers) if (l.type === "image") s.push(l.src);
    return s;
  }, [doc]);
  const { resolve, version: imgVersion } = useImageCache(srcs);

  // --- Document mutation ----------------------------------------------------
  const mutate = useCallback((fn: (d: EditorDoc) => EditorDoc, commit = true) => {
    setHist((h) => {
      const next = fn(h.present);
      return commit ? push(h, next) : replace(h, next);
    });
  }, []);

  const onAdjust = useCallback(
    (patch: Partial<Adjust>, commit: boolean) =>
      mutate((d) => ({ ...d, adjust: { ...d.adjust, ...patch } }), commit),
    [mutate],
  );
  const onPreset = useCallback(
    (a: Adjust) => mutate((d) => ({ ...d, adjust: { ...a } })),
    [mutate],
  );
  const onResetAdjust = useCallback(
    () => mutate((d) => ({ ...d, adjust: { ...DEFAULT_ADJUST } })),
    [mutate],
  );

  const onLayerChange = useCallback(
    (id: string, patch: Partial<Layer>, commit: boolean) =>
      mutate(
        (d) => ({
          ...d,
          layers: d.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)),
        }),
        commit,
      ),
    [mutate],
  );
  const onDelete = useCallback(
    (id: string) => {
      mutate((d) => ({ ...d, layers: d.layers.filter((l) => l.id !== id) }));
      setSelectedId((s) => (s === id ? null : s));
    },
    [mutate],
  );
  const onDuplicate = useCallback(
    (id: string) =>
      mutate((d) => {
        const l = d.layers.find((x) => x.id === id);
        if (!l) return d;
        const copy = { ...l, id: genId(), x: l.x + 24, y: l.y + 24 } as Layer;
        return { ...d, layers: [...d.layers, copy] };
      }),
    [mutate],
  );
  const onReorder = useCallback(
    (id: string, dir: 1 | -1) =>
      mutate((d) => {
        const idx = d.layers.findIndex((l) => l.id === id);
        const j = idx + dir;
        if (idx < 0 || j < 0 || j >= d.layers.length) return d;
        const layers = [...d.layers];
        [layers[idx], layers[j]] = [layers[j], layers[idx]];
        return { ...d, layers };
      }),
    [mutate],
  );

  const onCreateTextAt = useCallback(
    (x: number, y: number) => {
      const id = genId();
      mutate((d) => {
        const layer: TextLayer = {
          id,
          type: "text",
          x,
          y,
          text: "Your text",
          color: "#ffffff",
          fontFamily: "var(--font-display), sans-serif",
          fontSize: Math.max(28, Math.round(d.width * 0.08)),
          weight: 800,
          italic: false,
          align: "left",
          rotation: 0,
          opacity: 1,
          letterSpacing: 0,
          background: null,
        };
        return { ...d, layers: [...d.layers, layer] };
      });
      setSelectedId(id);
      setTool("select");
    },
    [mutate],
  );

  const addSticker = useCallback(
    async (file: File) => {
      const src = await fileToDataURL(file);
      const img = await loadImage(src);
      const id = genId();
      mutate((d) => {
        const w = d.width * 0.42;
        const h = w * (img.naturalHeight / img.naturalWidth);
        const layer: ImageLayer = {
          id,
          type: "image",
          src,
          x: (d.width - w) / 2,
          y: (d.height - h) / 2,
          w,
          h,
          rotation: 0,
          opacity: 1,
          radius: 0,
        };
        return { ...d, layers: [...d.layers, layer] };
      });
      setSelectedId(id);
      setTool("select");
    },
    [mutate],
  );

  const loadBase = useCallback(
    async (file: File) => {
      const src = await fileToDataURL(file);
      const img = await loadImage(src);
      const { w, h } = capSize(img.naturalWidth, img.naturalHeight, 2048);
      freshMasks(w, h);
      mutate((d) => ({
        ...EMPTY_DOC,
        background: d.background,
        width: w,
        height: h,
        baseSrc: src,
      }));
      setSelectedId(null);
      setTool("adjust");
    },
    [freshMasks, mutate],
  );

  // --- Brush callbacks (routed to whichever mask the brush effect is on) -----
  const onBrushBegin = useCallback(() => active.begin(), [active]);
  const onBrushPaint = useCallback(() => active.paint(), [active]);
  const onBrushEnd = useCallback(() => active.end(), [active]);

  // --- Undo / redo ----------------------------------------------------------
  const doUndo = useCallback(() => {
    if (tool === "brush" && active.canUndo) active.undo();
    else setHist((h) => histUndo(h));
  }, [tool, active]);
  const doRedo = useCallback(() => setHist((h) => histRedo(h)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing =
        el.isContentEditable || el.tagName === "INPUT" || el.tagName === "TEXTAREA";
      if (typing) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) doRedo();
        else doUndo();
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        onDelete(selectedId);
        return;
      }
      const map: Record<string, ToolId> = { v: "select", a: "adjust", b: "brush", t: "text", i: "image" };
      const t = map[e.key.toLowerCase()];
      if (t) setTool(t);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doUndo, doRedo, onDelete, selectedId]);

  // Paste an image (Cmd/Ctrl+V): start a new photo when empty, else drop it in
  // as an image layer.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of Array.from(items)) {
        if (it.type.startsWith("image/")) {
          const file = it.getAsFile();
          if (file) {
            e.preventDefault();
            if (!doc.baseSrc) loadBase(file);
            else addSticker(file);
            break;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [doc.baseSrc, loadBase, addSticker]);

  // Selecting the image tool immediately prompts for a file.
  const onTool = useCallback(
    (t: ToolId) => {
      if (t === "image") openFilePicker(addSticker);
      else setTool(t);
    },
    [addSticker],
  );

  // --- Export & share (plain handlers; the React compiler memoizes them) -----
  const buildBlob = (): Promise<Blob | null> => {
    const canvas = renderExport(doc, resolve, masks);
    return new Promise((res) => canvas.toBlob((b) => res(b), "image/png"));
  };

  const onExport = async () => {
    setExporting(true);
    const b = await buildBlob();
    if (b) {
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name || "precision"}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExporting(false);
  };

  const onShare = async () => {
    const b = await buildBlob();
    if (!b) return;
    const file = new File([b], `${name || "precision"}.png`, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: "Precision", text: name });
        return;
      } catch {
        /* user cancelled - fall through to download */
      }
    }
    onExport();
  };

  // --- Autosave -------------------------------------------------------------
  const hasContent = !!doc.baseSrc;
  useEffect(() => {
    if (!hasContent) return;
    const t = setTimeout(async () => {
      const full = renderExport(doc, resolve, masks);
      // Crisp gallery thumbnail: cap the long edge at 720px (sharp on retina)
      // and use high-quality smoothing so cards read clean, not soft.
      const scale = Math.min(1, 720 / Math.max(full.width, full.height));
      const tc = document.createElement("canvas");
      tc.width = Math.max(1, Math.round(full.width * scale));
      tc.height = Math.max(1, Math.round(full.height * scale));
      const tctx = tc.getContext("2d");
      if (tctx) {
        tctx.imageSmoothingEnabled = true;
        tctx.imageSmoothingQuality = "high";
        tctx.drawImage(full, 0, 0, tc.width, tc.height);
      }
      await saveProject({
        id: projectId.current,
        name: name || "Untitled",
        updatedAt: Date.now(),
        thumb: tc.toDataURL("image/jpeg", 0.92),
        doc,
        mask: color.toDataURL(),
        blurMask: blur.toDataURL(),
      });
      onSaved();
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, color.version, color.inked, blur.version, blur.inked, name]);

  const selected = doc.layers.find((l) => l.id === selectedId) ?? null;
  const showDrop = !doc.baseSrc;
  // On phones the panel is a bottom sheet - only open it when it has something
  // to show, so the photo stays full-screen otherwise (Instagram/Facebook style).
  const panelOpen = tool === "adjust" || tool === "brush" || !!selected;

  return (
    <div className="relative z-10 flex h-[100dvh] flex-col">
      <TopBar
        theme={theme}
        onToggleTheme={toggle}
        canUndo={canUndo(hist) || (tool === "brush" && active.canUndo)}
        canRedo={canRedo(hist)}
        onUndo={doUndo}
        onRedo={doRedo}
        onReplace={() => openFilePicker(loadBase)}
        onExport={onExport}
        onShare={onShare}
        onBack={onExit}
        onHelp={() => setShowHelp(true)}
        name={name}
        onName={setName}
        zoom={1}
        hasDoc={hasContent}
        exporting={exporting}
      />
      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        <Toolbar tool={tool} onTool={onTool} disabled={showDrop} />
        {showDrop ? (
          <DropZone onFile={loadBase} />
        ) : (
          <Stage
            doc={doc}
            tool={tool}
            selectedId={selectedId}
            resolve={resolve}
            imgVersion={imgVersion}
            masks={masks}
            activeMaskRef={active.ref}
            colorVersion={color.version}
            blurVersion={blur.version}
            brush={brush}
            editingId={editingId}
            onSelect={setSelectedId}
            onLayerChange={onLayerChange}
            onCreateTextAt={onCreateTextAt}
            onEditText={(id, text) => onLayerChange(id, { text }, true)}
            onEditingChange={setEditingId}
            onBrushBegin={onBrushBegin}
            onBrushPaint={onBrushPaint}
            onBrushEnd={onBrushEnd}
          />
        )}
        {!showDrop && (
          <RightPanel
            open={panelOpen}
            tool={tool}
            doc={doc}
            selected={selected}
            brush={brush}
            brushCanUndo={active.canUndo}
            resolve={resolve}
            imgVersion={imgVersion}
            onAdjust={onAdjust}
            onPreset={onPreset}
            onResetAdjust={onResetAdjust}
            onBrush={(patch) => setBrush((b) => ({ ...b, ...patch }))}
            onBrushUndo={active.undo}
            onBrushClear={active.clear}
            onLayer={onLayerChange}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onReorder={onReorder}
            onSelectLayer={(id) => {
              setSelectedId(id);
              setTool("select");
            }}
          />
        )}
      </div>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
