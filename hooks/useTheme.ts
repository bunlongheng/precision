"use client";

import { useCallback, useSyncExternalStore } from "react";

type Theme = "dark" | "light";

// Read the current theme straight from the <html data-theme> attribute (set
// before paint by the inline script in layout). useSyncExternalStore is the
// idiomatic way to subscribe React to that external DOM state - no effect, no
// hydration flash, and it reacts to changes from anywhere.

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return (document.documentElement.getAttribute("data-theme") as Theme) || "dark";
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "dark" as Theme);

  const toggle = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("precision-theme", next);
    } catch {
      /* storage blocked - theme still applies for the session */
    }
  }, [theme]);

  return { theme, toggle };
}
