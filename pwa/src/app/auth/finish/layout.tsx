import { Suspense } from "react";
import { LoadingState } from "@/components/editorial/loading-state";

export default function AuthFinishLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<LoadingState message="Signing you in…" />}>{children}</Suspense>;
}
