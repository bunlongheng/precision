import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Space_Mono } from "next/font/google";
import "./globals.css";
import SwRegister from "./sw-register";

// Self-hosted at build time by next/font, so `font-src 'self'` in the CSP holds.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const body = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
  display: "swap",
});

const SITE = "https://precision-bheng.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Precision - fast, lightweight photo editor",
  description:
    "A fast, lightweight browser photo editor. Drop an image, tone it black and white, apply 24 filters, add text, layer images, brush the original color back, and blur areas with the blur brush. iPad and Apple Pencil ready.",
  applicationName: "Precision",
  keywords: [
    "photo editor",
    "color splash",
    "selective color",
    "black and white",
    "blur brush",
    "image filters",
    "browser editor",
  ],
  authors: [{ name: "Bunlong Heng" }],
  openGraph: {
    title: "Precision - fast, lightweight photo editor",
    description:
      "Drop, tone, filter, text, layer, brush color back, and blur areas. Fast, light, iPad-ready.",
    url: SITE,
    siteName: "Precision",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Precision - fast, lightweight photo editor",
    description:
      "Drop, tone, filter, text, layer, brush color back, and blur areas.",
  },
  appleWebApp: {
    capable: true,
    title: "Precision",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0d0d0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Set the theme before paint so there is no flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('precision-theme');if(t){document.documentElement.setAttribute('data-theme',t)}}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${display.variable} ${body.variable} ${mono.variable} grain antialiased`}
      >
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
