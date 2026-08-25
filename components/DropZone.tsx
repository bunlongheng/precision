"use client";

import { useRef, useState } from "react";
import { UploadIcon } from "./icons";

const FEATURES = [
  "Black & white tone + one-tap filters",
  "Color-splash brush - paint the color back",
  "Text, image layers & collage layouts",
  "iPad & Apple Pencil ready",
];

export default function DropZone({ onFile }: { onFile: (file: File) => void }) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative z-10 flex flex-1 items-center justify-center p-5 sm:p-10">
      <div
        role="button"
        tabIndex={0}
        aria-label="Add a photo"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f && f.type.startsWith("image/")) onFile(f);
        }}
        className="rise flex w-full max-w-xl cursor-pointer flex-col items-center rounded-3xl border-2 border-dashed px-6 py-14 text-center transition-colors focus:outline-none focus-visible:border-[var(--accent)] sm:px-14"
        style={{
          borderColor: over ? "var(--accent)" : "var(--hairline-strong)",
          background: over ? "var(--accent-glow)" : "var(--panel)",
        }}
      >
        <span
          className="mb-6 grid h-16 w-16 place-items-center rounded-2xl"
          style={{ background: "var(--accent)", color: "var(--accent-ink)", boxShadow: "0 0 32px var(--accent-glow)" }}
        >
          <UploadIcon width={30} height={30} />
        </span>
        <h1 className="display text-[26px] font-extrabold tracking-tight text-[var(--ink)] sm:text-[32px]">
          Drop a photo to begin
        </h1>
        <p className="mono mt-2 text-[11px] uppercase tracking-[0.24em] text-[var(--ink-faint)]">
          or tap to browse - PNG, JPG, WEBP
        </p>
        <ul className="mt-8 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <li
              key={f}
              className="flex items-center gap-2 rounded-xl border border-[var(--hairline)] bg-[var(--bg)] px-3 py-2.5 text-left text-[12.5px] text-[var(--ink-dim)]"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
              {f}
            </li>
          ))}
        </ul>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
