"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, ExternalLink } from "@/components/celestial/muh-icon";
import { cn } from "@/components/ui/cn";

export function SettingsRow({
  href,
  external,
  onClick,
  icon,
  title,
  detail,
  trailing,
  className,
}: {
  href?: string;
  external?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  title: string;
  detail?: string;
  trailing?: ReactNode;
  className?: string;
}) {
  const inner = (
    <>
      {icon ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-wash/70 text-gold-text">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-medium text-ink">{title}</span>
        {detail ? <span className="mt-0.5 block text-xs text-ink-tertiary">{detail}</span> : null}
      </span>
      {trailing ?? (
        external ? (
          <ExternalLink className="h-4 w-4 shrink-0 text-ink-tertiary" aria-hidden />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-ink-tertiary" aria-hidden />
        )
      )}
    </>
  );

  const classes = cn(
    "flex min-h-[52px] w-full items-center gap-3 rounded-xl border border-line bg-paper px-3 py-2.5 transition-colors hover:border-gold-accent/35 hover:bg-gold-wash/20",
    className,
  );

  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} className={classes}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {inner}
    </button>
  );
}
