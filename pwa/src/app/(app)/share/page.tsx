"use client";

import { PageHeader } from "@/components/editorial/page-header";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { ProseBlock } from "@/components/editorial/prose-block";
import { LoadingState } from "@/components/editorial/loading-state";
import { useAppData, useEngineBody } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { useState } from "react";

export default function SharePage() {
  const { t } = useLocale();
  const engineBody = useEngineBody();
  const { views, loading, error, pack } = useAppData();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setCopyMsg(null);
    try {
      const res = await fetch("/api/engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(engineBody("share_card_generate", { surface: "decode" })),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) throw new Error(json.error?.toString() ?? "Share failed");
      const previewBlock = pack?.content?.free_preview;
      const previewText =
        typeof previewBlock === "object" && previewBlock !== null
          ? (previewBlock as Record<string, unknown>).decode_hit?.toString()
          : "";
      const hook =
        json.shareHook?.toString() ||
        json.headline?.toString() ||
        views?.displayHook ||
        previewText ||
        "";
      setPreview(hook);
    } catch (e) {
      setPreview(e instanceof Error ? e.message : "Could not build share card");
    } finally {
      setBusy(false);
    }
  }

  async function onShare() {
    if (!preview) return;
    const text = `${preview}\n\n${t("share.footer")}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Muhūrta", text });
        return;
      } catch {
        /* fall through */
      }
    }
    await navigator.clipboard.writeText(text);
    setCopyMsg(t("share.copied"));
  }

  if (loading) return <LoadingState message={t("share.loading")} />;
  if (error || !views) {
    return <PageHeader title={t("share.title")} subtitle={error ?? "Unavailable"} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t("share.eyebrow")} title={t("share.title")} subtitle={t("share.subtitle")} />

      <ProseBlock className="border-gold-accent/20 bg-gradient-to-br from-paper to-gold-wash/15">
        <p className="text-sm text-ink-secondary">{t("share.privacy")}</p>
        <p className="mt-4 font-serif text-xl leading-snug text-ink">
          {preview ?? views.displayHook}
        </p>
      </ProseBlock>

      <div className="flex flex-col gap-2">
        <PrimaryButton type="button" onClick={() => void generate()} className="w-full">
          {busy ? t("share.building") : t("share.build")}
        </PrimaryButton>
        {preview ? (
          <PrimaryButton type="button" onClick={() => void onShare()} className="w-full bg-paper text-gold-text ring-1 ring-line">
            {t("share.shareNow")}
          </PrimaryButton>
        ) : null}
        {copyMsg ? <p className="text-sm text-success-ink">{copyMsg}</p> : null}
      </div>
    </div>
  );
}
