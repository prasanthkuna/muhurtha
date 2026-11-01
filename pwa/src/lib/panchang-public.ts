export type PublicPanchang = {
  date: string;
  city: string;
  weekday: number;
  tithi: string;
  paksha: "shukla" | "krishna";
  nakshatra: string;
  nak_index: number;
  good: { start: string; end: string } | null;
  rahu: { start: string; end: string } | null;
};
