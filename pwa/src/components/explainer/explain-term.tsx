"use client";

import { useState } from "react";
import { ExplainSheet, type ExplainScreen } from "@/components/explainer/explain-sheet";

/** A word you can tap to see what it means (opens the three-layer Explain sheet). */
export function ExplainTerm({ term, screen, value, children }: { term: string; screen: ExplainScreen; value?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid={`term-${term}`}
        className="underline decoration-gold-accent/60 decoration-dotted underline-offset-4 hover:decoration-gold-accent"
      >
        {children}
      </button>
      <ExplainSheet term={term} screen={screen} value={value} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
