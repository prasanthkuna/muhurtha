import { Suspense } from "react";
import { WelcomeClient } from "./welcome-client";

export default function WelcomePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-canvas" />}>
      <WelcomeClient />
    </Suspense>
  );
}
