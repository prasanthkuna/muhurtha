import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/components/ui/cn";

export function PrimaryButton({
  href,
  onClick,
  children,
  className,
  type = "button",
  ...rest
}: {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  type?: "button" | "submit";
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes = cn(
    "inline-flex min-h-11 items-center justify-center rounded-full bg-gold-button px-6 text-sm font-semibold text-ink transition-opacity hover:opacity-95 active:opacity-90",
    className,
  );
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} className={classes} {...rest}>
      {children}
    </button>
  );
}
