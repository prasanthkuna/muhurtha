"use client";

import Link from "next/link";
import { ChevronLeft } from "@/components/celestial/muh-icon";
import { PageHeader } from "@/components/editorial/page-header";
import { ProseBlock } from "@/components/editorial/prose-block";
import { useLocale } from "@/context/locale-context";

export default function DisclaimerPage() {
  const { t } = useLocale();

  return (
    <div className="space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm font-medium text-gold-text"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
        {t("settings.title")}
      </Link>
      <PageHeader title={t("legal.disclaimerTitle")} subtitle={t("legal.disclaimerIntro")} />
      <ProseBlock>
        <div className="space-y-4 text-sm leading-relaxed text-ink-secondary">
          <p>{t("legal.bodyTiming")}</p>
          <p>{t("legal.bodyAsk")}</p>
          <p>{t("legal.bodyDecode")}</p>
          <p>{t("legal.bodyGeneral")}</p>
        </div>
      </ProseBlock>
    </div>
  );
}
