export function LoadingState({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-ink-secondary">
      <div className="h-8 w-8 animate-pulse rounded-full bg-gold-wash" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
