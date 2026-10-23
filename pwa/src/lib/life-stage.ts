/** Age band of the chart being viewed; drives child-safe purposes and sections. */
export type LifeStage = "infant" | "child" | "adult";

export function lifeStageFromDob(dob: string | null | undefined, now: Date = new Date()): LifeStage {
  if (!dob) return "adult";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob);
  if (!m) return "adult";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d)) age -= 1;
  if (!Number.isFinite(age) || age < 0) return "adult";
  if (age < 3) return "infant";
  if (age < 13) return "child";
  return "adult";
}

export function isChildStage(stage: LifeStage): boolean {
  return stage === "infant" || stage === "child";
}
