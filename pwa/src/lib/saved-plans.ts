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

export function savePlan(plan: Omit<SavedPlan, "id" | "createdAt">): SavedPlan {
  const row: SavedPlan = {
    ...plan,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  writeAll([row, ...readAll()]);
  return row;
}

export function deleteSavedPlan(id: string) {
  writeAll(readAll().filter((p) => p.id !== id));
}
