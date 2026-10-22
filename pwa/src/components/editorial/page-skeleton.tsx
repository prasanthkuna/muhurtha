/** Instant route feedback while the next screen's RSC payload loads. */
export function PageSkeleton() {
  return (
    <div className="space-y-4 py-2" aria-busy="true" aria-live="polite">
      <div className="h-3 w-24 animate-pulse rounded bg-gold-wash" />
      <div className="h-36 animate-pulse rounded-2xl border border-line bg-paper" />
      <div className="space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-gold-wash/70" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-gold-wash/70" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-gold-wash/70" />
      </div>
      <div className="h-24 animate-pulse rounded-2xl border border-line bg-paper" />
    </div>
  );
}
