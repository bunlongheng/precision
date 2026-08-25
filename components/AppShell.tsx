"use client";

import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import {
  listProjects,
  getProject,
  deleteProject,
  type ProjectMeta,
  type SavedProject,
} from "@/lib/projectStore";
import { useTheme } from "@/hooks/useTheme";
import Editor from "./Editor";
import Ambient from "./Ambient";
import { SunIcon, MoonIcon, PlusIcon, TrashIcon } from "./icons";

type User = { name: string; email: string } | null;

function relTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d < 7 ? `${d}d ago` : new Date(ts).toLocaleDateString();
}

export default function AppShell({ user, authEnabled }: { user: User; authEnabled: boolean }) {
  const { theme, toggle } = useTheme();
  const [view, setView] = useState<"home" | "editor">("home");
  const [current, setCurrent] = useState<SavedProject | null>(null);
  const [projects, setProjects] = useState<ProjectMeta[]>([]);

  const refresh = useCallback(() => {
    listProjects().then(setProjects);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const open = useCallback(async (id: string) => {
    const p = await getProject(id);
    setCurrent(p);
    setView("editor");
  }, []);

  const create = useCallback(() => {
    setCurrent(null);
    setView("editor");
  }, []);

  const remove = useCallback(
    async (id: string) => {
      await deleteProject(id);
      refresh();
    },
    [refresh],
  );

  if (view === "editor") {
    return (
      <Editor
        initial={current}
        onExit={() => {
          setView("home");
          refresh();
        }}
        onSaved={refresh}
      />
    );
  }

  const initials =
    (user?.name || user?.email || "P")
      .split(/[\s@.]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "P";

  return (
    <div className="relative min-h-[100dvh]">
      <Ambient />
      <header
        className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-8"
        style={{
          paddingTop: "max(1rem, env(safe-area-inset-top))",
          paddingLeft: "max(1.25rem, env(safe-area-inset-left))",
          paddingRight: "max(1.25rem, env(safe-area-inset-right))",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="12" r="2.4" fill="currentColor" />
              <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="display text-[18px] font-extrabold tracking-[0.02em]">PRECISION</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggle} aria-label="Toggle theme" className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ink-dim)] hover:bg-[var(--elevated)] hover:text-[var(--ink)]">
            {theme === "dark" ? <SunIcon width={18} height={18} /> : <MoonIcon width={18} height={18} />}
          </button>
          {authEnabled && user && (
            <div className="flex items-center gap-2">
              <span className="mono grid h-9 w-9 place-items-center rounded-full border border-[var(--hairline-strong)] text-[12px] text-[var(--ink)]">
                {initials}
              </span>
              <button onClick={() => signOut()} className="rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[var(--ink-dim)] hover:text-[var(--ink)]">
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-16 sm:px-8">
        <div className="rise py-10 sm:py-14">
          <p className="mono text-[11px] uppercase tracking-[0.28em] text-[var(--accent-strong)]">Workspace</p>
          <h1 className="display mt-2 text-[34px] font-extrabold leading-[1.05] tracking-tight sm:text-[46px]">
            {user?.name ? `Welcome back, ${user.name.split(" ")[0]}.` : "Your photo studio."}
          </h1>
          <p className="mt-3 max-w-lg text-[15px] text-[var(--ink-dim)]">
            Pick up where you left off, or start something new. Everything stays on your device.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <button
            onClick={create}
            className="rise group flex aspect-square flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--hairline-strong)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-glow)]"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full transition-transform group-hover:scale-110" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
              <PlusIcon width={24} height={24} />
            </span>
            <span className="text-[13px] font-semibold text-[var(--ink)]">New project</span>
          </button>

          {projects.map((p) => (
            <div key={p.id} className="rise group relative overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--panel)]" style={{ boxShadow: "var(--shadow)" }}>
              <button onClick={() => open(p.id)} className="block w-full text-left">
                <div className="checker aspect-square w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumb} alt={p.name} className="h-full w-full object-cover" />
                </div>
                <div className="px-3 py-2.5">
                  <div className="truncate text-[13px] font-semibold text-[var(--ink)]">{p.name}</div>
                  <div className="mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">{relTime(p.updatedAt)}</div>
                </div>
              </button>
              <button
                onClick={() => remove(p.id)}
                aria-label="Delete project"
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-[var(--bg)]/80 text-[var(--ink-dim)] opacity-0 backdrop-blur transition-opacity hover:text-[var(--danger)] group-hover:opacity-100"
              >
                <TrashIcon width={16} height={16} />
              </button>
            </div>
          ))}
        </div>

        {projects.length === 0 && (
          <p className="mt-8 text-center text-[13px] text-[var(--ink-faint)]">
            No projects yet. Start a new one to see it saved here.
          </p>
        )}
      </main>
    </div>
  );
}
