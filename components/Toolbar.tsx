"use client";

import type { ToolId } from "./editor-types";
import { CursorIcon, SlidersIcon, CropIcon, BrushIcon, TextIcon, ImageIcon } from "./icons";

const TOOLS: { id: ToolId; label: string; Icon: typeof CursorIcon; key: string }[] = [
  { id: "select", label: "Select & move", Icon: CursorIcon, key: "V" },
  { id: "adjust", label: "Adjust & filters", Icon: SlidersIcon, key: "A" },
  { id: "crop", label: "Rotate & crop", Icon: CropIcon, key: "C" },
  { id: "brush", label: "Brush (color splash & blur)", Icon: BrushIcon, key: "B" },
  { id: "text", label: "Add text", Icon: TextIcon, key: "T" },
  { id: "image", label: "Add image layer", Icon: ImageIcon, key: "I" },
];

export default function Toolbar({
  tool,
  onTool,
  disabled,
}: {
  tool: ToolId;
  onTool: (t: ToolId) => void;
  disabled: boolean;
}) {
  return (
    <nav
      className="order-3 flex flex-row justify-around gap-1 border-t border-[var(--hairline)] bg-[var(--panel)] px-2 py-1.5 sm:order-1 sm:flex-col sm:justify-start sm:border-r sm:border-t-0 sm:px-2 sm:py-3"
      style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
    >
      {TOOLS.map(({ id, label, Icon, key }) => {
        const active = tool === id;
        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onTool(id)}
            title={`${label}  (${key})`}
            aria-label={label}
            aria-pressed={active}
            className="group relative flex h-11 max-w-[68px] flex-1 items-center justify-center rounded-xl transition-colors disabled:opacity-30 sm:w-11 sm:max-w-none sm:flex-none"
            style={{
              background: active ? "var(--accent)" : "transparent",
              color: active ? "var(--accent-ink)" : "var(--ink-dim)",
            }}
          >
            <Icon />
            {active && (
              <span
                className="absolute inset-0 -z-10 rounded-xl"
                style={{ boxShadow: "0 0 18px var(--accent-glow)" }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
