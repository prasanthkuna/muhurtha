import { cn } from "@/components/ui/cn";
import type { ReactNode, SelectHTMLAttributes, InputHTMLAttributes } from "react";

export const fieldClass =
  "w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink shadow-sm outline-none transition-[box-shadow,border-color] focus:border-gold-accent/50 focus:ring-2 focus:ring-gold-text/20";

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <span className="text-xs font-medium text-ink-tertiary" {...(htmlFor ? { id: `${htmlFor}-label` } : {})}>
      {children}
    </span>
  );
}

export function MuhField({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5" htmlFor={htmlFor}>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      {children}
      {hint ? <p className="text-[11px] text-ink-tertiary">{hint}</p> : null}
    </label>
  );
}

export function MuhInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldClass, props.className)} />;
}

export function MuhSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(fieldClass, "appearance-none bg-[length:1rem]", props.className)} />;
}

export function MuhSegment({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            value === o.id
              ? "bg-gold-wash text-gold-text"
              : "border border-line bg-paper text-ink-secondary",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
