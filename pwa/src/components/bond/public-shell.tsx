"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLocale } from "@/context/locale-context";
import { cn } from "@/components/ui/cn";
import type { AppLocale } from "@/lib/locale";

const LANGS: { id: AppLocale; label: string }[] = [
  { id: "en", label: "EN" },
  { id: "te", label: "తెలుగు" },
  { id: "hi", label: "हिंदी" },
];

/** Frame for the public /match and /join pages (no app chrome, language preview only). */
export function PublicShell({ children }: { children: ReactNode }) {
  const { locale, previewLocale } = useLocale();
  return (
    <div className="min-h-dvh bg-canvas" lang={locale}>
      <header className="mx-auto flex max-w-lg items-center justify-between px-5 pt-5">
        <Link href="/" className="font-serif text-lg text-ink">Muhūrta</Link>
        <div className="flex gap-1 rounded-full border border-line bg-paper p-0.5">
          {LANGS.map((l) => (
            <button key={l.id} type="button" onClick={() => previewLocale(l.id)} className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", locale === l.id ? "bg-gold-wash text-gold-text" : "text-ink-tertiary")}>
              {l.label}
            </button>
          ))}
        </div>
      </header>
      <main className="mx-auto max-w-lg px-5 pb-16 pt-6">{children}</main>
    </div>
  );
}
