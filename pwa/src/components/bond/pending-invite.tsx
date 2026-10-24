"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { bondPost, PENDING_INVITE_KEY } from "@/lib/bond";
import { fill } from "@/lib/messages-bond";

/** After sign-in / onboarding, finish a partner invite opened from /join/<token>. */
export function PendingInviteAccept() {
  const { userId } = useAppData();
  const { t } = useLocale();
  const router = useRouter();
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    if (!userId) return;
    let token: string | null = null;
    try {
      token = localStorage.getItem(PENDING_INVITE_KEY);
    } catch {
      return;
    }
    if (!token) return;
    void (async () => {
      try {
        const r = await bondPost<{ partner_name: string }>("partner_invite_accept", { token });
        localStorage.removeItem(PENDING_INVITE_KEY);
        setNote(fill(t("join.accepted"), { name: r.partner_name }));
        router.push("/bond?src=invite");
      } catch (e) {
        const code = (e as { code?: string }).code ?? "";
        if (["invite_invalid", "invite_expired", "invite_own", "already_linked"].includes(code)) {
          localStorage.removeItem(PENDING_INVITE_KEY);
          setNote(t(code === "invite_own" ? "join.own" : code === "already_linked" ? "join.already" : code === "invite_expired" ? "join.expired" : "join.invalid"));
        }
      }
    })();
  }, [userId, router, t]);
  if (!note) return null;
  return (
    <div className="mb-3 rounded-2xl border border-gold-accent/30 bg-gold-wash/50 px-4 py-3 text-sm text-ink" role="status" onClick={() => setNote(null)}>
      {note}
    </div>
  );
}
