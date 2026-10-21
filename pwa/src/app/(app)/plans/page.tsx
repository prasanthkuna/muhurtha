"use client";

import { PageHeader } from "@/components/editorial/page-header";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { ProseBlock } from "@/components/editorial/prose-block";
import { useLocale } from "@/context/locale-context";
import { deleteSavedPlan, listSavedPlans } from "@/lib/saved-plans";
import { formatWindowRange } from "@/lib/format-time";
import { useMemo, useState } from "react";

export default function PlansPage() {
  const { t } = useLocale();
  const [version, setVersion] = useState(0);
  const plans = useMemo(() => listSavedPlans(), [version]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("plans.eyebrow")}
        title={t("plans.title")}
        subtitle={t("plans.subtitle")}
      />

      {plans.length === 0 ? (
        <ProseBlock>
          <p className="text-sm text-ink-secondary">{t("plans.empty")}</p>
          <PrimaryButton href="/timing" className="mt-4">
            {t("plans.goTiming")}
          </PrimaryButton>
        </ProseBlock>
      ) : (
        <ul className="space-y-3">
          {plans.map((p) => (
            <li
              key={p.id}
              className="rounded-2xl border border-line bg-paper p-4 shadow-[0_8px_24px_rgba(36,32,25,0.04)]"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-text">
                {p.purposeLabel}
              </p>
              <p className="mt-1 font-serif text-lg text-ink">{p.eventDate}</p>
              <p className="mt-1 text-sm text-ink-secondary">{p.cityLabel || "—"}</p>
              {p.windowStart && p.windowEnd ? (
                <p className="mt-2 text-sm text-success-ink">
                  {formatWindowRange(p.windowStart, p.windowEnd)}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  deleteSavedPlan(p.id);
                  setVersion((x) => x + 1);
                }}
                className="mt-3 text-xs font-semibold text-warning-ink"
              >
                {t("plans.delete")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
