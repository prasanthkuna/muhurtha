import { DateTime } from "luxon";

/** Calendar date (YYYY-MM-DD) in the user's profile timezone. */
export function todayInTimezone(tz: string): string {
  const zone = tz?.trim() || "Asia/Kolkata";
  return DateTime.now().setZone(zone).toISODate() ?? DateTime.utc().toISODate()!;
}
