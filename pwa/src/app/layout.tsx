import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans, Noto_Sans_Symbols_2 } from "next/font/google";
import { SwRegister } from "@/components/pwa/sw-register";
import { INSTALL_CAPTURE_SCRIPT } from "@/lib/install-capture";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
});

const symbols = Noto_Sans_Symbols_2({
  variable: "--font-symbols",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://pwa-lyart-phi.vercel.app"),
  title: "Muhūrta",
  description: "Your life has a story. Understand its chapters.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Muhūrta",
  },
};

export const viewport: Viewport = {
  themeColor: "#F8F5EE",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* Capture beforeinstallprompt before hydration (Chrome may fire it very early). */}
        <script dangerouslySetInnerHTML={{ __html: INSTALL_CAPTURE_SCRIPT }} />
      </head>
      <body className={`${fraunces.variable} ${instrument.variable} ${symbols.variable} antialiased`}>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
