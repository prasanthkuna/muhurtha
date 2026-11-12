export type SavedPlan = {
  id: string;
  purposeType: string;
  purposeLabel: string;
  eventDate: string;
  cityLabel: string;
  windowStart?: string;
  windowEnd?: string;
  method?: string;
  createdAt: string;
};

const KEY = "muh_saved_plans_v1";

function readAll(): SavedPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedPlan[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(plans: SavedPlan[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(plans));
}

export function listSavedPlans(): SavedPlan[] {
  return readAll().sort((a, b) => b.eventDate.localeCompare(a.eventDate));
}

/** Server copy (saved_events) powers the day-before reminder; local storage stays the source for the list. */
function syncServer(action: "saved_event_save" | "saved_event_delete", body: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  void fetch("/api/engine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  }).catch(() => {});
}

export function savePlan(plan: Omit<SavedPlan, "id" | "createdAt">): SavedPlan {
  const row: SavedPlan = {
    ...plan,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  writeAll([row, ...readAll()]);
  syncServer("saved_event_save", {
    client_id: row.id,
    title: row.purposeLabel,
    event_date: row.eventDate,
    purpose: row.purposeType,
    window_start: row.windowStart,
    window_end: row.windowEnd,
  });
  return row;
}

export function deleteSavedPlan(id: string) {
  writeAll(readAll().filter((p) => p.id !== id));
  syncServer("saved_event_delete", { client_id: id });
}
