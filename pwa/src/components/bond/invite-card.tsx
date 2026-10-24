"use client";

import { useState } from "react";
import { useLocale } from "@/context/locale-context";
import { bondPost, type LinkView } from "@/lib/bond";
import { fill } from "@/lib/messages-bond";

/** Owner-only: create the partner invite link and send it (WhatsApp / share / copy). */
export function InviteCard({ link, myName, onChanged }: { link: LinkView; myName: string; onChanged: () => void }) {
  const { t } = useLocale();
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  if (link.role !== "owner" || link.status === "linked") return null;

  async function create() {
    setBusy(true);
    try {
      const r = await bondPost<{ path: string }>("partner_invite_create");
      setUrl(`${window.location.origin}${r.path}`);
      onChanged();
    } finally {
      setBusy(false);
    }
  }
  const message = url ? fill(t("bond.invite.message"), { url, me: myName }) : "";

  return (
    <section className="rounded-3xl border border-dashed border-gold-accent/40 bg-paper px-5 py-5" data-testid="invite-card">
      <h3 className="font-serif text-lg text-ink">{fill(t("bond.invite.title"), { name: link.partner_name })}</h3>
      <p className="mt-1 text-sm text-ink-secondary">{t("bond.invite.sub")}</p>
      {link.status === "invited" && !url ? <p className="mt-2 text-xs font-medium text-gold-text">{fill(t("bond.invite.pending"), { name: link.partner_name })}</p> : null}
      {url ? (
        <div className="mt-3 space-y-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#25D366] text-sm font-semibold text-white"
            data-testid="invite-whatsapp"
          >
            {t("bond.invite.whatsapp")}
          </a>
          <button
            type="button"
            onClick={async () => {
              if (navigator.share) {
                await navigator.share({ text: message }).catch(() => undefined);
                return;
              }
              await navigator.clipboard?.writeText(url);
              setCopied(true);
            }}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-line text-sm font-semibold text-ink"
          >
            {copied ? t("bond.invite.copied") : t("bond.invite.copy")}
          </button>
          <p className="text-center text-[11px] text-ink-tertiary">{t("bond.invite.expires")}</p>
        </div>
      ) : (
        <button type="button" disabled={busy} onClick={() => void create()} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gold-button text-sm font-semibold text-ink disabled:opacity-60" data-testid="invite-create">
          {t("bond.invite.cta")}
        </button>
      )}
    </section>
  );
}
