"use client";

import { useRef, useState } from "react";
import Ambient from "./Ambient";

// The "Start editing" empty state - the first thing you see in a new project.
export default function DropZone({ onFile }: { onFile: (file: File) => void }) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pick = () => inputRef.current?.click();

  return (
    <div className="relative order-1 flex flex-1 flex-col items-center justify-center overflow-y-auto p-5 sm:order-2 sm:p-8">
      <Ambient />
      <div className="rise relative z-10 flex w-full max-w-2xl flex-col items-center text-center">
        {/* Photo-stack illustration */}
        <div className="floaty relative mb-7 h-28 w-36">
          <Sparkle className="absolute left-1 top-3 h-3.5 w-3.5 twinkle" />
          <Sparkle className="absolute right-2 top-0 h-2.5 w-2.5 twinkle" style={{ animationDelay: "0.8s" }} />
          <Sparkle className="absolute right-4 bottom-2 h-3 w-3 twinkle" style={{ animationDelay: "1.6s" }} />
          <svg viewBox="0 0 160 120" fill="none" className="h-full w-full" aria-hidden="true">
            <rect x="52" y="14" width="78" height="62" rx="9" stroke="var(--accent)" strokeWidth="3" opacity="0.4" />
            <rect x="34" y="30" width="82" height="66" rx="9" fill="var(--panel)" stroke="var(--accent)" strokeWidth="3" />
            <circle cx="55" cy="52" r="7" fill="var(--accent)" />
            <path d="M40 88l20-22 13 13 12-14 15 23H40z" fill="var(--accent)" opacity="0.85" />
          </svg>
          <span
            className="absolute -bottom-1 right-3 grid h-9 w-9 place-items-center rounded-full"
            style={{ background: "var(--accent)", color: "var(--accent-ink)", boxShadow: "0 0 20px var(--accent-glow)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
        </div>

        <h1 className="display text-[30px] font-extrabold tracking-tight text-[var(--ink)] sm:text-[38px]">
          Start editing
        </h1>
        <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-[var(--ink-dim)]">
          Drop an image here, paste from clipboard, or open a file to get started.
        </p>

        {/* Dropzone */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Drop or choose an image"
          onClick={pick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") pick();
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
          className="mt-8 flex w-full cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-6 py-12 transition-colors focus:outline-none focus-visible:border-[var(--accent)]"
          style={{
            borderColor: over ? "var(--accent)" : "var(--hairline-strong)",
            background: over ? "var(--accent-glow)" : "transparent",
          }}
        >
          <span className="grid h-14 w-14 place-items-center rounded-full border border-[var(--hairline-strong)] text-[var(--ink-dim)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4m0 0L8 8m4-4l4 4M4 20h16" />
            </svg>
          </span>
          <div className="mt-4 text-[16px] font-semibold text-[var(--ink)]">Drop your image here</div>
          <div className="mono mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            JPG, PNG, WebP, GIF up to 50MB
          </div>
        </div>

        {/* or */}
        <div className="my-6 flex w-full items-center gap-4">
          <span className="h-px flex-1" style={{ background: "var(--hairline)" }} />
          <span className="text-[12px] text-[var(--ink-faint)]">or</span>
          <span className="h-px flex-1" style={{ background: "var(--hairline)" }} />
        </div>

        <button
          type="button"
          onClick={pick}
          className="flex items-center gap-2.5 rounded-xl border border-[var(--hairline-strong)] px-6 py-3 text-[14px] font-semibold text-[var(--ink)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--elevated)]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
          Open Image
        </button>

        <div className="mt-7 flex items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--panel)] px-4 py-2 text-[12.5px] text-[var(--ink-dim)]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6M10 22h4M12 2a6 6 0 00-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0012 2z" />
          </svg>
          <span>
            Pro tip: paste an image <kbd className="mono rounded bg-[var(--elevated)] px-1.5 py-0.5 text-[11px] text-[var(--ink)]">Cmd V</kbd> to get started
          </span>
        </div>
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

function Sparkle({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="var(--accent)" className={className} style={style} aria-hidden="true">
      <path d="M12 0l2.5 9.5L24 12l-9.5 2.5L12 24l-2.5-9.5L0 12l9.5-2.5L12 0z" />
    </svg>
  );
}
