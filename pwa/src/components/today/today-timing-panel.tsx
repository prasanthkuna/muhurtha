"use client";

import { useState } from "react";
import { formatWindowClock } from "@/lib/format-time";
import type { TimingWindow } from "@/lib/today-types";

function WindowRail({
  title,
  tone,
  windows,
}: {
  title: string;
  tone: "good" | "caution";
  windows: TimingWindow[];
}) {
  if (windows.length === 0) return null;
  const bg = tone === "good" ? "bg-success-wash" : "bg-warning-wash";
  const ink = tone === "good" ? "text-success-ink" : "text-warning-ink";

  return (
    <div className={`rounded-2xl ${bg} px-4 py-4`}>
      <p className={`text-xs font-semibold uppercase ${ink}`}>{title}</p>
      <ul className="mt-3 space-y-3">
        {windows.slice(0, 4).map((w, i) => (
          <li key={`${w.start}-${i}`} className="text-sm text-ink-secondary">
            <span className="font-medium text-ink">
              {formatWindowClock(w.start)} – {formatWindowClock(w.end)}
            </span>
            {w.label ? <span className="text-ink-tertiary"> · {w.label}</span> : null}
            {w.whyItWorks ? (
              <p className="mt-1 text-xs leading-relaxed text-ink-tertiary">{w.whyItWorks}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TodayTimingPanel({
  goodWindows,
  cautionWindows,
  betterFor,
  beCareful,
  goodTitle = "Good windows",
  cautionTitle = "Caution windows",
}: {
  goodWindows: TimingWindow[];
  cautionWindows: TimingWindow[];
  betterFor: string[];
  beCareful: string[];
  goodTitle?: string;
  cautionTitle?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = goodWindows[0];

  return (
    <section className="space-y-3">
      {preview ? (
        <p className="text-sm font-semibold text-ink">
          {goodTitle}: {formatWindowClock(preview.start)}–{formatWindowClock(preview.end)}
          {preview.label ? ` (${preview.label})` : ""}
        </p>
      ) : (
        <p className="text-sm text-ink-secondary">
          Set your current city in Settings to unlock clock-time good and caution windows.
        </p>
      )}

      {(betterFor.length > 0 || beCareful.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {betterFor.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase text-success-ink">Better for</p>
              <p className="mt-1 text-sm text-ink-secondary">{betterFor.slice(0, 3).join(" · ")}</p>
            </div>
          ) : null}
          {beCareful.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase text-warning-ink">Be careful</p>
              <p className="mt-1 text-sm text-ink-secondary">{beCareful.slice(0, 3).join(" · ")}</p>
            </div>
          ) : null}
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-sm font-medium text-gold-text underline-offset-4 hover:underline"
      >
        {expanded ? "Hide full timeline" : "Show full timeline"}
      </button>

      {expanded ? (
        <div className="space-y-3">
          <WindowRail title={goodTitle} tone="good" windows={goodWindows} />
          <WindowRail title={cautionTitle} tone="caution" windows={cautionWindows} />
        </div>
      ) : null}
    </section>
  );
}
