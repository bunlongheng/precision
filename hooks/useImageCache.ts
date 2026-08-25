"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Loads every image the document references and hands back a synchronous
 * resolver for the renderer. Bumps `version` when a new image finishes decoding
 * so the stage recomposites once pixels are actually available.
 */
export function useImageCache(srcs: string[]) {
  const cache = useRef<Map<string, HTMLImageElement>>(new Map());
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    for (const src of srcs) {
      if (!src || cache.current.has(src)) continue;
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        if (cancelled) return;
        cache.current.set(src, img);
        setVersion((v) => v + 1);
      };
      img.src = src;
    }
    return () => {
      cancelled = true;
    };
  }, [srcs]);

  const resolve = useCallback(
    (src: string) => cache.current.get(src) ?? null,
    // version is intentionally a dep so consumers re-run once images decode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  return { resolve, version };
}
