import { cn } from "@/components/ui/cn";
import { ICON } from "@/design-system/icon-sizes";

type IconProps = { className?: string; active?: boolean };

function stroke(active?: boolean) {
  return active ? ICON.tabStrokeActive : ICON.tabStroke;
}

/** Editorial tab icons — Material-style outlines, gold fill when active. */
export function NavIconDecode({ className, active }: IconProps) {
  const s = stroke(active);
  return (
    <svg className={cn("h-6 w-6 shrink-0", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 4h12a1 1 0 0 1 1 1v15a1 1 0 0 1-1.45.89L12 18.5l-5.55 2.39A1 1 0 0 1 5 20V5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth={s}
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.12 : 0}
      />
      <path d="M8 7h8M8 10.5h6" stroke="currentColor" strokeWidth={s} strokeLinecap="round" />
    </svg>
  );
}

export function NavIconLife({ className, active }: IconProps) {
  const s = stroke(active);
  return (
    <svg className={cn("h-6 w-6 shrink-0", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 18h18M6 18V8l4-3 4 5 5-4v12"
        stroke="currentColor"
        strokeWidth={s}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="17" cy="7" r="1.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={s} />
    </svg>
  );
}

export function NavIconToday({ className, active }: IconProps) {
  const s = stroke(active);
  return (
    <svg className={cn("h-6 w-6 shrink-0", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="4.25"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={s}
      />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M4.5 4.5l1.55 1.55M17.95 17.95l1.55 1.55M2.5 12h2.2M19.3 12h2.2M4.5 19.5l1.55-1.55M17.95 6.05l1.55-1.55"
        stroke="currentColor"
        strokeWidth={s}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function NavIconTiming({ className, active }: IconProps) {
  const s = stroke(active);
  return (
    <svg className={cn("h-6 w-6 shrink-0", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth={s} />
      <path
        d="M12 7.5v4.5l3 2"
        stroke="currentColor"
        strokeWidth={s}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {active ? (
        <circle cx="12" cy="12" r="1.25" fill="currentColor" />
      ) : null}
    </svg>
  );
}

export function NavIconAsk({ className, active }: IconProps) {
  const s = stroke(active);
  return (
    <svg className={cn("h-6 w-6 shrink-0", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 4h14a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-4 3.5V5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth={s}
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.1 : 0}
      />
      <path
        d="M8 8.5h8M8 12h5.5"
        stroke="currentColor"
        strokeWidth={s}
        strokeLinecap="round"
      />
      <path
        d="M15.5 15.5l2.5 2.5"
        stroke="currentColor"
        strokeWidth={s}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function NavIconSettings({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-[22px] w-[22px] shrink-0", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={ICON.tabStroke}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
      />
    </svg>
  );
}
