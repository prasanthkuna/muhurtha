import { cn } from "@/components/ui/cn";

type IconProps = { className?: string; active?: boolean };

const iconBox = "h-[22px] w-[22px] shrink-0";

export function NavIconDecode({ className, active }: IconProps) {
  return (
    <svg
      className={cn(iconBox, className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.6}
      aria-hidden
    >
      <path d="M12 3l7 4v10l-7 4-7-4V7l7-4z" />
      <path d="M12 7v10M5 7l7 4 7-4" />
    </svg>
  );
}

export function NavIconLife({ className, active }: IconProps) {
  return (
    <svg
      className={cn(iconBox, className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.6}
      aria-hidden
    >
      <path d="M4 19V5M20 19V9M12 19V3M4 19h16" strokeLinecap="round" />
    </svg>
  );
}

export function NavIconToday({ className, active }: IconProps) {
  return (
    <svg
      className={cn(iconBox, className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.6}
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" fill={active ? "currentColor" : "none"} />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

export function NavIconTiming({ className, active }: IconProps) {
  return (
    <svg
      className={cn(iconBox, className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.6}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" />
    </svg>
  );
}

export function NavIconAsk({ className, active }: IconProps) {
  return (
    <svg
      className={cn(iconBox, className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.6}
      aria-hidden
    >
      <path d="M4 5h16v10H8l-4 4V5z" strokeLinejoin="round" />
    </svg>
  );
}

export function NavIconSettings({ className }: { className?: string }) {
  return (
    <svg
      className={cn(iconBox, className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
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
