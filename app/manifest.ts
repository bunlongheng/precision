import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Precision - photo editor",
    short_name: "Precision",
    description:
      "Fast, lightweight photo editor: black & white tone, 24 filters, text, image layers, the color-splash brush, and a blur brush.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0d0d0f",
    theme_color: "#0d0d0f",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
