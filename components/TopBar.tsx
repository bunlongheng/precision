"use client";

import {
  UndoIcon,
  RedoIcon,
  DownloadIcon,
  SunIcon,
  MoonIcon,
  UploadIcon,
  ShareIcon,
} from "./icons";

export default function TopBar({
  theme,
  onToggleTheme,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReplace,
  onExport,
  onShare,
  onBack,
  name,
  onName,
  zoom,
  hasDoc,
  exporting,
}: {
  theme: "dark" | "light";
  onToggleTheme: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReplace: () => void;
  onExport: () => void;
  onShare: () => void;
  onBack: () => void;
  name: string;
  onName: (v: string) => void;
  zoom: number;
  hasDoc: boolean;
  exporting: boolean;
}) {
  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ink-dim)] transition-colors hover:bg-[var(--elevated)] hover:text-[var(--ink)] disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <header className="relative z-20 flex items-center justify-between gap-2 border-b border-[var(--hairline)] bg-[var(--panel)] px-3 py-2.5 sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          onClick={onBack}
          title="Projects"
          aria-label="Back to projects"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-transform hover:scale-105"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="2.4" fill="currentColor" />
            <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        {hasDoc ? (
          <input
            value={name}
            onChange={(e) => onName(e.target.value)}
            aria-label="Project name"
            className="min-w-0 max-w-[42vw] truncate rounded-md bg-transparent px-1.5 py-1 text-[14px] font-semibold text-[var(--ink)] outline-none hover:bg-[var(--elevated)] focus:bg-[var(--elevated)] sm:max-w-[220px]"
          />
        ) : (
          <span className="display text-[15px] font-extrabold tracking-[0.02em] text-[var(--ink)]">
            PRECISION
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {hasDoc && (
          <>
            <span className="mono mr-1 hidden text-[11px] text-[var(--ink-faint)] md:inline">
              {Math.round(zoom * 100)}%
            </span>
            <button className={iconBtn} onClick={onUndo} disabled={!canUndo} title="Undo (Cmd+Z)" aria-label="Undo">
              <UndoIcon width={18} height={18} />
            </button>
            <button className={iconBtn} onClick={onRedo} disabled={!canRedo} title="Redo (Cmd+Shift+Z)" aria-label="Redo">
              <RedoIcon width={18} height={18} />
            </button>
            <button className={`${iconBtn} hidden sm:flex`} onClick={onReplace} title="Replace photo" aria-label="Replace photo">
              <UploadIcon width={18} height={18} />
            </button>
            <span className="mx-1 hidden h-5 w-px bg-[var(--hairline)] sm:block" />
          </>
        )}
        <button className={iconBtn} onClick={onToggleTheme} title="Toggle theme" aria-label="Toggle theme">
          {theme === "dark" ? <SunIcon width={18} height={18} /> : <MoonIcon width={18} height={18} />}
        </button>
        {hasDoc && (
          <>
            <button
              className={iconBtn}
              onClick={onShare}
              title="Share (iMessage, AirDrop...)"
              aria-label="Share"
            >
              <ShareIcon width={18} height={18} />
            </button>
            <button
              type="button"
              onClick={onExport}
              disabled={exporting}
              className="ml-1 flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
            >
              <DownloadIcon width={16} height={16} />
              <span className="hidden sm:inline">{exporting ? "Saving..." : "Export"}</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
