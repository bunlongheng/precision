"use client";

import { useEffect } from "react";
import { CloseIcon } from "./icons";

const TOOLS: [string, string][] = [
  ["Select & move", "Drag text and image layers; resize from the corner handle."],
  ["Adjust & filters", "24 one-tap looks plus brightness, contrast, tint, blur and more. On phones, flick the photo to flip filters."],
  ["Rotate & crop", "Turn the photo 90° and crop to any ratio (1:1, 4:5, 16:9...)."],
  ["Color-splash brush", "The photo goes black & white - paint to bring the color back."],
  ["Blur brush", "Paint to blur an area - soft, pixelate, or secure (scrambled)."],
  ["Text", "Tap the canvas to drop a caption, then style it in the panel."],
  ["Image layer", "Stack a photo on top of your photo."],
];

const KEYS: [string, string][] = [
  ["Cmd / Ctrl + V", "Paste an image to start or add a layer"],
  ["Cmd / Ctrl + Z", "Undo"],
  ["Cmd / Ctrl + Shift + Z", "Redo"],
  ["V A C B T I", "Jump to a tool (C = rotate & crop)"],
  ["Delete", "Remove the selected layer"],
];

export default function HelpModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="rise relative z-10 max-h-[86dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--hairline)] bg-[var(--panel)] p-6 sm:p-7"
        style={{ boxShadow: "var(--shadow)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="display text-[20px] font-extrabold text-[var(--ink)]">How to use Precision</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ink-dim)] hover:bg-[var(--elevated)] hover:text-[var(--ink)]">
            <CloseIcon width={18} height={18} />
          </button>
        </div>

        <h3 className="mono mb-2 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">Tools</h3>
        <ul className="mb-5 space-y-2">
          {TOOLS.map(([name, desc]) => (
            <li key={name} className="flex gap-3 rounded-lg border border-[var(--hairline)] bg-[var(--bg)] px-3 py-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
              <span className="text-[13px] text-[var(--ink-dim)]">
                <span className="font-semibold text-[var(--ink)]">{name}.</span> {desc}
              </span>
            </li>
          ))}
        </ul>

        <h3 className="mono mb-2 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">Shortcuts</h3>
        <ul className="space-y-1.5">
          {KEYS.map(([k, desc]) => (
            <li key={k} className="flex items-center justify-between gap-3 text-[13px]">
              <span className="text-[var(--ink-dim)]">{desc}</span>
              <kbd className="mono shrink-0 rounded bg-[var(--elevated)] px-2 py-1 text-[11px] text-[var(--ink)]">{k}</kbd>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-center text-[12px] text-[var(--ink-faint)]">
          Everything stays on your device - projects save locally and never upload.
        </p>
      </div>
    </div>
  );
}
