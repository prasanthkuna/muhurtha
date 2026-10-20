import { cn } from "@/components/ui/cn";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <header className={cn("mb-8 space-y-2", className)}>
      {eyebrow ? (
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-gold-text">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-serif text-[1.75rem] leading-tight text-ink">{title}</h1>
      {subtitle ? (
        <p className="text-base leading-relaxed text-ink-secondary">{subtitle}</p>
      ) : null}
    </header>
  );
}
