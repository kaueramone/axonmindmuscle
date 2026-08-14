import type { Metadata, Viewport } from "next";
import { Geist_Mono, Jura, Outfit } from "next/font/google";

import { ServiceWorker } from "@/components/service-worker";
import { ThemeProvider, themeScript } from "@/components/theme";
import { SITE_URL } from "@/lib/utils";

import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const jura = Jura({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jura",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AXON Mind-Muscle",
    template: "%s · AXON",
  },
  description:
    "Entre a intenção e a contração existe um caminho mensurável. Treino de musculação prescrito a partir de evidência revista por pares.",
  applicationName: "AXON",
  appleWebApp: {
    capable: true,
    title: "AXON",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-64.png", sizes: "64x64", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#05070C" },
    { media: "(prefers-color-scheme: light)", color: "#F3F6FA" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt"
      data-theme="dark"
      suppressHydrationWarning
      className={`${outfit.variable} ${jura.variable} ${geistMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
