import type { Metadata } from "next";
import { LocaleProvider } from "@/context/locale-context";

export const metadata: Metadata = {
  title: "Free Guna Milan — are you two a match? · Muhūrta",
  description: "36-guna Ashtakoota match from your birth stars in 10 seconds. Free, private, in English, తెలుగు and हिंदी.",
  openGraph: { title: "Are you two a match? · Muhūrta", description: "Free 36-guna match from your birth stars.", siteName: "Muhūrta" },
};

export default function MatchLayout({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
