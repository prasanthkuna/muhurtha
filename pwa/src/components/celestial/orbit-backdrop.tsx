/** Subtle orbital rings behind celestial cards (Flutter _OrbitLines parity). */
export function OrbitBackdrop({ className }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`}
      aria-hidden
      preserveAspectRatio="none"
    >
      <circle
        cx="82%"
        cy="18%"
        r="32%"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        className="text-gold-accent/[0.07]"
      />
      <circle
        cx="78%"
        cy="16%"
        r="22%"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        className="text-gold-accent/[0.06]"
      />
      <circle
        cx="18%"
        cy="84%"
        r="28%"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        className="text-gold-accent/[0.06]"
      />
    </svg>
  );
}
