"use client";

import { ChevronDown } from "@/components/celestial/muh-icon";
import { cn } from "@/components/ui/cn";

/** Text toggle with a rotating chevron so expandable sections read as expandable. */
export function DisclosureButton({
  open,
  onToggle,
  children,
  className,
}: {
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-gold-text underline-offset-4 hover:underline",
        className,
      )}
    >
      {children}
      <ChevronDown
        className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")}
        aria-hidden
      />
    </button>
  );
}
