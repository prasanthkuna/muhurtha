import { formatWindowRange } from "@/lib/format-time";
import type { TimingWindow } from "@/lib/today-types";

export function WindowTimePill({
  window: w,
  tone,
  className,
}: {
  window: TimingWindow;
  tone: "good" | "caution";
  className?: string;
}) {
  const styles =
    tone === "good"
      ? "border-success-ink/20 bg-success-wash text-success-ink"
      : "border-warning-ink/25 bg-warning-wash text-warning-ink";

  return (
    <span
      className={`inline-flex max-w-full flex-col rounded-full border px-3 py-1.5 text-xs font-semibold leading-tight ${styles} ${className ?? ""}`}
    >
      <span>{formatWindowRange(w.start, w.end)}</span>
      {w.label ? (
        <span className="mt-0.5 text-[10px] font-medium opacity-90">{w.label}</span>
      ) : null}
    </span>
  );
}

export function WindowPillRow({
  windows,
  tone,
  limit = 4,
}: {
  windows: TimingWindow[];
  tone: "good" | "caution";
  limit?: number;
}) {
  if (windows.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {windows.slice(0, limit).map((w, i) => (
        <WindowTimePill key={`${w.start}-${i}`} window={w} tone={tone} />
      ))}
    </div>
  );
}
