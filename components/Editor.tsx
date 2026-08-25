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
import { reshapeCells, makeCells } from "@/lib/collage";
import { saveProject, type SavedProject } from "@/lib/projectStore";
import { useTheme } from "@/hooks/useTheme";
import { useImageCache } from "@/hooks/useImageCache";
import { renderExport } from "./render";
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

  // --- Color-splash mask (imperative offscreen canvas) ----------------------
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const [maskInked, setMaskInked] = useState(false);
  const [maskVersion, setMaskVersion] = useState(0);
  const brushSnaps = useRef<ImageData[]>([]);
  const [brushCanUndo, setBrushCanUndo] = useState(false);

  useEffect(() => {
    if (!initial) return;
    const { width, height } = initial.doc;
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    maskRef.current = c;
    if (initial.mask) {
      loadImage(initial.mask).then((img) => {
        c.getContext("2d")?.drawImage(img, 0, 0);
        setMaskInked(true);
        setMaskVersion((v) => v + 1);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const freshMask = useCallback((w: number, h: number) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    maskRef.current = c;
    brushSnaps.current = [];
    setBrushCanUndo(false);
    setMaskInked(false);
    setMaskVersion((v) => v + 1);
  }, []);

  const maskHasInk = useCallback(() => {
    const c = maskRef.current;
    if (!c) return false;
    const ctx = c.getContext("2d");
    if (!ctx) return false;
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    for (let i = 3; i < data.length; i += 64) if (data[i] > 4) return true;
    return false;
  }, []);

  // --- Image cache ----------------------------------------------------------
  const srcs = useMemo(() => {
    const s: string[] = [];
    if (doc.baseSrc) s.push(doc.baseSrc);
    for (const c of doc.cells) if (c.src) s.push(c.src);
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
      freshMask(w, h);
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
    [freshMask, mutate],
  );

  const onCollage = useCallback(
    (next: EditorDoc["collage"]) =>
      mutate((d) => {
        if (next === "single") {
          const first = d.cells[0]?.src ?? d.baseSrc;
          return { ...d, collage: "single", cells: [], baseSrc: first };
        }
        const source = d.cells.length ? d.cells : makeCells(next);
        const cells = reshapeCells(next, source);
        if (!d.cells.length && d.baseSrc) cells[0].src = d.baseSrc;
        return { ...d, collage: next, cells, baseSrc: null };
      }),
    [mutate],
  );

  const onCellPick = useCallback(
    (index: number) =>
      openFilePicker(async (file) => {
        const src = await fileToDataURL(file);
        mutate((d) => ({
          ...d,
          cells: d.cells.map((c, i) =>
            i === index ? { ...c, src, offsetX: 0, offsetY: 0, scale: 1 } : c,
          ),
        }));
      }),
    [mutate],
  );

  // --- Brush callbacks ------------------------------------------------------
  const onBrushBegin = useCallback(() => {
    const c = maskRef.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) {
      brushSnaps.current.push(ctx.getImageData(0, 0, c.width, c.height));
      if (brushSnaps.current.length > 24) brushSnaps.current.shift();
      setBrushCanUndo(true);
    }
  }, []);
  const onBrushPaint = useCallback(() => setMaskVersion((v) => v + 1), []);
  const onBrushEnd = useCallback(() => setMaskInked(true), []);
  const onBrushUndo = useCallback(() => {
    const snap = brushSnaps.current.pop();
    const c = maskRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    if (snap) ctx.putImageData(snap, 0, 0);
    else ctx.clearRect(0, 0, c.width, c.height);
    setBrushCanUndo(brushSnaps.current.length > 0);
    setMaskInked(maskHasInk());
    setMaskVersion((v) => v + 1);
  }, [maskHasInk]);
  const onBrushClear = useCallback(() => {
    onBrushBegin();
    const c = maskRef.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setMaskInked(false);
    setMaskVersion((v) => v + 1);
  }, [onBrushBegin]);

  // --- Undo / redo ----------------------------------------------------------
  const doUndo = useCallback(() => {
    if (tool === "brush" && brushCanUndo) onBrushUndo();
    else setHist((h) => histUndo(h));
  }, [tool, brushCanUndo, onBrushUndo]);
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
      const map: Record<string, ToolId> = { v: "select", a: "adjust", b: "brush", t: "text", i: "image", c: "collage" };
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
            if (!doc.baseSrc && doc.collage === "single") loadBase(file);
            else addSticker(file);
            break;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [doc.baseSrc, doc.collage, loadBase, addSticker]);

  // Selecting the image tool immediately prompts for a file.
  const onTool = useCallback(
    (t: ToolId) => {
      if (t === "image") openFilePicker(addSticker);
      else setTool(t);
    },
    [addSticker],
  );

  // --- Export & share -------------------------------------------------------
  const buildBlob = useCallback((): Promise<Blob | null> => {
    const canvas = renderExport(doc, resolve, maskRef.current, maskInked);
    return new Promise((res) => canvas.toBlob((b) => res(b), "image/png"));
  }, [doc, resolve, maskInked]);

  const onExport = useCallback(async () => {
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
  }, [buildBlob, name]);

  const onShare = useCallback(async () => {
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
  }, [buildBlob, name, onExport]);

  // --- Autosave -------------------------------------------------------------
  const hasContent = !!doc.baseSrc || doc.collage !== "single";
  useEffect(() => {
    if (!hasContent) return;
    const t = setTimeout(async () => {
      const full = renderExport(doc, resolve, maskRef.current, maskInked);
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
        mask: maskInked && maskRef.current ? maskRef.current.toDataURL() : null,
      });
      onSaved();
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, maskVersion, maskInked, name]);

  const selected = doc.layers.find((l) => l.id === selectedId) ?? null;
  const showDrop = !doc.baseSrc && doc.collage === "single";

  return (
    <div className="relative z-10 flex h-[100dvh] flex-col">
      <TopBar
        theme={theme}
        onToggleTheme={toggle}
        canUndo={canUndo(hist) || (tool === "brush" && brushCanUndo)}
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
      <div className="flex min-h-0 flex-1 flex-col-reverse sm:flex-row">
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
            maskRef={maskRef}
            maskInked={maskInked}
            maskVersion={maskVersion}
            brush={brush}
            editingId={editingId}
            onSelect={setSelectedId}
            onLayerChange={onLayerChange}
            onCreateTextAt={onCreateTextAt}
            onEditText={(id, text) => onLayerChange(id, { text }, true)}
            onEditingChange={setEditingId}
            onCellPick={onCellPick}
            onBrushBegin={onBrushBegin}
            onBrushPaint={onBrushPaint}
            onBrushEnd={onBrushEnd}
          />
        )}
        {!showDrop && (
          <RightPanel
            tool={tool}
            doc={doc}
            selected={selected}
            brush={brush}
            brushCanUndo={brushCanUndo}
            onAdjust={onAdjust}
            onPreset={onPreset}
            onResetAdjust={onResetAdjust}
            onBrush={(patch) => setBrush((b) => ({ ...b, ...patch }))}
            onBrushUndo={onBrushUndo}
            onBrushClear={onBrushClear}
            onLayer={onLayerChange}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onReorder={onReorder}
            onCollage={onCollage}
            onDocBg={(c) => mutate((d) => ({ ...d, background: c }))}
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
