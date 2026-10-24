import type { Metadata } from "next";
import { LocaleProvider } from "@/context/locale-context";

export const metadata: Metadata = {
  title: "You're invited · Muhūrta Bond",
  description: "See how you two flow — your match, a monthly couple guide and one small thing to do together each day.",
  robots: { index: false, follow: false },
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
