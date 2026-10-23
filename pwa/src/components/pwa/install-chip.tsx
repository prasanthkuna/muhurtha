"use client";

import { useEffect, useState } from "react";
import { Glyph } from "@/components/ui/glyph";
import { InstallSheet } from "@/components/pwa/install-sheet";
import { useLocale } from "@/context/locale-context";
import { installDismissedRecently, usePwaInstall } from "@/lib/pwa-install";
import { cn } from "@/components/ui/cn";

/**
 * "Install" affordance, shown only in a browser tab (never in the installed app).
 * `variant="banner"` is the Welcome-page card; `force` ignores the 14-day dismissal (Settings).
 */
export function InstallChip({
  className,
  variant = "chip",
  force = false,
}: {
  className?: string;
  variant?: "chip" | "banner" | "row";
  force?: boolean;
}) {
  const { t } = useLocale();
  const { ready, standalone, installed, canPrompt } = usePwaInstall();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    setHidden(!force && installDismissedRecently());
  }, [force, open]);

  if (!ready || standalone || (installed && !open) || (hidden && !open)) return null;

  const trigger =
    variant === "banner" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="install-banner"
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border border-gold-accent/35 bg-paper px-4 py-3 text-left shadow-sm",
          className,
        )}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-wash text-gold-text">
          <Glyph name="install" size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{t("install.title")}</span>
          <span className="block truncate text-xs text-ink-secondary">{t("install.body")}</span>
        </span>
        <span className="rounded-full bg-gold-button px-3 py-1.5 text-xs font-semibold text-ink">{t("install.chip")}</span>
      </button>
    ) : variant === "row" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="install-row"
        className={cn(
          "flex min-h-12 w-full items-center gap-3 rounded-2xl border border-line bg-paper px-4 py-3 text-left text-sm font-medium text-ink",
          className,
        )}
      >
        <Glyph name="install" size={18} className="text-gold-text" />
        <span className="flex-1">{t("install.button")}</span>
        {canPrompt ? <span className="h-2 w-2 rounded-full bg-success-ink" aria-hidden /> : null}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="install-chip"
        className={cn(
          "inline-flex min-h-9 items-center gap-1.5 rounded-full bg-gold-button px-3 text-xs font-semibold text-ink shadow-sm",
          className,
        )}
      >
        <Glyph name="install" size={15} />
        {t("install.chip")}
      </button>
    );

  return (
    <>
      {trigger}
      <InstallSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
