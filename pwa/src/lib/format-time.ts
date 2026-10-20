/** Format engine window start/end (ISO or HH:mm) for display. */
export function formatWindowClock(value: string | undefined): string {
  if (!value) return "";
  const iso = Date.parse(value);
  if (!Number.isNaN(iso)) {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  const m = value.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return value;
  const h = Number(m[1]);
  const min = m[2];
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${min} ${ampm}`;
}
