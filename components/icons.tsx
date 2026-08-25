import type { SVGProps } from "react";

// Minimal, consistent line icons (1.6 stroke, round joins). Kept inline so the
// app ships zero icon-font weight - part of the "light and fast" promise.

type P = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={20}
      height={20}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const CursorIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 3l7 17 2.5-6.5L20 11 4 3z" />
  </Svg>
);
export const TextIcon = (p: P) => (
  <Svg {...p}>
    <path d="M5 6V5h14v1M12 5v14M9 19h6" />
  </Svg>
);
export const ImageIcon = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9" r="1.6" />
    <path d="M21 16l-5-5-9 9" />
  </Svg>
);
export const BrushIcon = (p: P) => (
  <Svg {...p}>
    <path d="M15 4l5 5-8.5 8.5a3 3 0 01-1.6.8L4 20l1.7-5.4a3 3 0 01.8-1.6L15 4z" />
    <path d="M13 6l5 5" />
  </Svg>
);
export const SlidersIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M18 18h2" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="16" cy="18" r="2" />
  </Svg>
);
export const UndoIcon = (p: P) => (
  <Svg {...p}>
    <path d="M9 7L4 12l5 5M4 12h11a5 5 0 010 10h-1" />
  </Svg>
);
export const RedoIcon = (p: P) => (
  <Svg {...p}>
    <path d="M15 7l5 5-5 5M20 12H9a5 5 0 000 10h1" />
  </Svg>
);
export const DownloadIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
  </Svg>
);
export const SunIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
);
export const MoonIcon = (p: P) => (
  <Svg {...p}>
    <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
  </Svg>
);
export const TrashIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </Svg>
);
export const UploadIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 21V9m0 0L8 13m4-4l4 4M4 3h16" />
  </Svg>
);
export const PlusIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const CloseIcon = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const LayersIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5" />
  </Svg>
);
export const EraserIcon = (p: P) => (
  <Svg {...p}>
    <path d="M7 21h10M5 15l6-6 8 8-4 4H9l-4-4zM11 9l4 4" />
  </Svg>
);
export const ShareIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 3v13M12 3L8 7M12 3l4 4M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7" />
  </Svg>
);
export const HelpIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9a2.5 2.5 0 013.9-2c1.3.9 1.1 2.3.1 3.1-.7.6-1.5 1-1.5 2M12 17h.01" />
  </Svg>
);
