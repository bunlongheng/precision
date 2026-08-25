"use client";

import { useCallback, useRef, useState } from "react";

// A single brush mask: an imperative offscreen canvas (kept out of React state
// for paint performance) plus the React signals the renderer needs - whether it
// has ink, a version bump per stroke, and a bounded per-stroke undo stack.
export function usePaintMask() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [inked, setInked] = useState(false);
  const [version, setVersion] = useState(0);
  const snaps = useRef<ImageData[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const fresh = useCallback((w: number, h: number) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    ref.current = c;
    snaps.current = [];
    setCanUndo(false);
    setInked(false);
    setVersion((v) => v + 1);
  }, []);

  const hasInk = useCallback(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return false;
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    for (let i = 3; i < data.length; i += 64) if (data[i] > 4) return true;
    return false;
  }, []);

  const begin = useCallback(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) {
      snaps.current.push(ctx.getImageData(0, 0, c.width, c.height));
      if (snaps.current.length > 24) snaps.current.shift();
      setCanUndo(true);
    }
  }, []);

  const paint = useCallback(() => setVersion((v) => v + 1), []);
  const end = useCallback(() => setInked(true), []);

  const undo = useCallback(() => {
    const snap = snaps.current.pop();
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    if (snap) ctx.putImageData(snap, 0, 0);
    else ctx.clearRect(0, 0, c.width, c.height);
    setCanUndo(snaps.current.length > 0);
    setInked(hasInk());
    setVersion((v) => v + 1);
  }, [hasInk]);

  const clear = useCallback(() => {
    begin();
    const c = ref.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setInked(false);
    setVersion((v) => v + 1);
  }, [begin]);

  const loadFrom = useCallback((dataUrl: string, w: number, h: number) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    ref.current = c;
    const img = new Image();
    img.onload = () => {
      c.getContext("2d")?.drawImage(img, 0, 0);
      setInked(true);
      setVersion((v) => v + 1);
    };
    img.src = dataUrl;
  }, []);

  const toDataURL = useCallback(
    () => (inked && ref.current ? ref.current.toDataURL() : null),
    [inked],
  );

  return { ref, inked, version, canUndo, fresh, begin, paint, end, undo, clear, loadFrom, toDataURL };
}

export type PaintMask = ReturnType<typeof usePaintMask>;
