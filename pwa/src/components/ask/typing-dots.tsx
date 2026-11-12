"use client";

/** Three pulsing dots while the first words of an answer are on their way. */
export function TypingDots({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-normal text-ink-tertiary" role="status" data-testid="typing-dots">
      <span className="inline-flex gap-1" aria-hidden>
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-text [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-text [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-text" />
      </span>
      <span>{label}</span>
    </span>
  );
}
