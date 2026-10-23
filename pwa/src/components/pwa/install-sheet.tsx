"use client";

import { useEffect, useState } from "react";
import { Glyph } from "@/components/ui/glyph";
import { useLocale } from "@/context/locale-context";
import { dismissInstall, usePwaInstall } from "@/lib/pwa-install";

/** Themed install sheet: Chrome's real prompt when available, otherwise menu steps. */
export function InstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLocale();
  const { canPrompt, promptInstall, installed } = usePwaInstall();
  const [manual, setManual] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) {
      setManual(false);
      setDone(false);
    }
  }, [open]);

  useEffect(() => {
    if (installed) setDone(true);
  }, [installed]);

  if (!open) return null;

  async function install() {
    const r = await promptInstall();
    if (r === "accepted") setDone(true);
    else if (r === "unavailable") setManual(true);
    else onClose();
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-ink/45 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 cursor-default" aria-label={t("install.later")} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        data-testid="install-sheet"
        className="relative w-full max-w-lg rounded-t-3xl border border-line bg-canvas px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl sm:rounded-3xl"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line sm:hidden" />
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" width={56} height={56} className="h-14 w-14 rounded-2xl border border-line" />
          <div>
            <h2 id="install-title" className="font-serif text-xl font-semibold text-ink">
              {t("install.title")}
            </h2>
            <p className="text-xs text-ink-tertiary">pwa-lyart-phi.vercel.app</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-ink-secondary">{t("install.body")}</p>

        {done ? (
          <p className="mt-4 rounded-xl bg-success-wash px-4 py-3 text-sm font-medium text-success-ink">{t("install.done")}</p>
        ) : manual || !canPrompt ? (
          <div className="mt-4 rounded-2xl border border-line bg-paper p-4">
            <p className="text-sm font-semibold text-ink">{t("install.manualTitle")}</p>
            <ol className="mt-2 space-y-2 text-sm text-ink-secondary">
              {[t("install.step1"), t("install.step2"), t("install.step3")].map((s, i) => (
                <li key={s} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-wash text-xs font-bold text-gold-text">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-ink-tertiary">{t("install.manualNote")}</p>
          </div>
        ) : null}

        <div className="mt-5 flex gap-2">
          {!done && canPrompt && !manual ? (
            <button
              type="button"
              onClick={() => void install()}
              data-testid="install-confirm"
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gold-button text-sm font-semibold text-ink"
            >
              <Glyph name="install" size={18} />
              {t("install.button")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              if (!done) dismissInstall();
              onClose();
            }}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-line bg-paper text-sm font-semibold text-gold-text"
          >
            {done ? t("shareCard.close") : t("install.later")}
          </button>
        </div>
      </div>
    </div>
  );
}
