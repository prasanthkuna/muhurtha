import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans, Noto_Sans_Symbols_2 } from "next/font/google";
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
  title: "Muhūrta",
  description: "Your life has a story. Understand its chapters.",
  manifest: "/manifest.webmanifest",
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
      <body className={`${fraunces.variable} ${instrument.variable} ${symbols.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
