"use client";

import { useSearchParams } from "next/navigation";
import { PrimaryButton } from "@/components/editorial/primary-button";

export function WelcomeClient() {
  const params = useSearchParams();
  const next = params.get("next") || "/today";
  const authHref = `/auth?next=${encodeURIComponent(next.startsWith("/") ? next : "/today")}`;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-x-clip bg-canvas px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(4rem,env(safe-area-inset-top))]">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-gold-text">
        Muhūrta
      </p>
      <h1 className="mt-4 font-serif text-4xl leading-[1.1] text-ink">
        Your life has a story.
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-secondary">
        Quiet gold editorial readings — decode who you are, walk your life chapters,
        and return each day with clear timing.
      </p>
      <div className="mt-auto pt-12">
        <PrimaryButton href={authHref} className="w-full">
          Continue with phone
        </PrimaryButton>
      </div>
    </div>
  );
}
