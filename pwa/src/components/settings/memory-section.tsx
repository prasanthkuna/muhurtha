"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/context/locale-context";

type Item = { id: string; fact: string; source: string; created_at: string };

async function post(action: string, body: Record<string, unknown> = {}) {
  const r = await fetch("/api/engine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...body }) });
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) throw new Error(String(j.error ?? "failed"));
  return j;
}

/** Consent-based memory: only facts the user saved. List, add and remove; nothing automatic. */
export function MemorySection() {
  const { t } = useLocale();
  const [items, setItems] = useState<Item[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const j = await post("memory_list");
      setItems(Array.isArray(j.items) ? (j.items as Item[]) : []);
    } catch {
      setItems([]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="space-y-2" data-testid="memory-section">
      <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-tertiary">{t("live.memoryTitle")}</h2>
      <div className="rounded-2xl border border-line bg-paper px-4 py-3">
        <p className="text-xs text-ink-tertiary">{t("live.memoryHint")}</p>
        {items && items.length === 0 ? <p className="mt-2 text-sm text-ink-secondary">{t("live.memoryEmpty")}</p> : null}
        <ul className="mt-2 divide-y divide-line/70">
          {(items ?? []).map((m) => (
            <li key={m.id} className="flex min-h-11 items-center justify-between gap-3 text-sm text-ink">
              <span>{m.fact}</span>
              <button
                type="button"
                className="shrink-0 text-xs font-semibold text-warning-ink"
                onClick={() => {
                  void post("memory_delete", { id: m.id }).then(load).catch(() => {});
                }}
              >
                {t("live.memoryRemove")}
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const f = draft.trim();
            if (f.length < 2) return;
            setBusy(true);
            void post("memory_save", { fact: f, source: "settings" })
              .then(() => {
                setDraft("");
                return load();
              })
              .catch(() => {})
              .finally(() => setBusy(false));
          }}
        >
          <input
            value={draft}
            maxLength={200}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("live.memoryAdd")}
            className="min-h-11 flex-1 rounded-xl border border-line bg-canvas px-3 text-sm outline-none focus:ring-2 focus:ring-gold-text/25"
          />
          <button type="submit" disabled={busy} className="rounded-xl bg-gold-button px-4 text-sm font-semibold text-ink disabled:opacity-50">
            {t("common.save")}
          </button>
        </form>
      </div>
    </section>
  );
}
