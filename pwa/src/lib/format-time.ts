/** Normalize API wall clock to HH:mm (drop seconds). */
export function clockHm(value: string): string {
  const t = value.trim();
  const segs = t.split(":");
  if (segs.length >= 3) {
    return `${segs[0].padStart(2, "0")}:${segs[1].padStart(2, "0")}`;
  }
  if (segs.length === 2) return t;
  return t;
}

/** 12-hour clock with AM/PM (expects HH:mm, HH:mm:ss, or ISO). */
export function formatWindowClock(value: string | undefined): string {
  if (!value) return "";
  const iso = Date.parse(value);
  if (!Number.isNaN(iso)) {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  const m = value.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return value;
  let h = Number(m[1]);
  const min = m[2];
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${min} ${ampm}`;
}

export function formatWindowRange(start: string, end: string): string {
  return `${formatWindowClock(start)} – ${formatWindowClock(end)}`;
}

/** Replace HH:mm and HH:mm:ss ranges in prose with 12-hour display. */
export function formatTimesInString(text: string): string {
  if (!text) return text;
  return text.replace(
    /(\d{1,2}:\d{2})(?::\d{2})?\s*[-–]\s*(\d{1,2}:\d{2})(?::\d{2})?/g,
    (_, a: string, b: string) => formatWindowRange(a, b),
  ).replace(/\b(\d{1,2}:\d{2})(?::\d{2})?\b/g, (m) => formatWindowClock(m));
}
