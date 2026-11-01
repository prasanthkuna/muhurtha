import { Suspense } from "react";
import { LocaleProvider } from "@/context/locale-context";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <Suspense fallback={<div className="min-h-dvh bg-canvas" />}>{children}</Suspense>
    </LocaleProvider>
  );
}
