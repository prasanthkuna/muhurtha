import { cn } from "@/components/ui/cn";

export function ProseBlock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-paper px-5 py-5 text-[15px] leading-[1.65] text-ink-secondary shadow-[0_1px_0_rgba(36,32,25,0.04)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
