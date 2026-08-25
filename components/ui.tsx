"use client";

import type { ReactNode } from "react";

// Small shared UI atoms. Themed entirely through the CSS variables defined in
// globals.css so light/dark is a single attribute flip.

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
  onCommit?: () => void;
}) {
  return (
    <label className="block select-none">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--ink-dim)]">
          {label}
        </span>
        <span className="mono text-[11px] text-[var(--ink)]">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        className="w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
      />
    </label>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-[var(--hairline)] bg-[var(--bg)] p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="flex-1 rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors"
            style={{
              background: active ? "var(--accent)" : "transparent",
              color: active ? "var(--accent-ink)" : "var(--ink-dim)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function PanelSection({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="border-b border-[var(--hairline)] px-4 py-4 last:border-b-0">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="display text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-dim)]">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Swatch({
  color,
  active,
  onClick,
}: {
  color: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`color ${color}`}
      className="h-7 w-7 rounded-full border transition-transform hover:scale-110"
      style={{
        background: color,
        borderColor: active ? "var(--accent)" : "var(--hairline-strong)",
        boxShadow: active ? "0 0 0 2px var(--accent)" : "none",
      }}
    />
  );
}
