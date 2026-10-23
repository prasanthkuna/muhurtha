import type { CardPayload, CardSize } from "@/lib/share/card-types";

export type CreatedShare = {
  id: string;
  url: string;
  imageUrl: string;
  ogImageUrl: string;
  caption: string;
};

export async function createShareCard(payload: Omit<CardPayload, "v">): Promise<CreatedShare> {
  const res = await fetch("/api/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = new Error(json.error?.toString() ?? `share_${res.status}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return json as unknown as CreatedShare;
}

export async function revokeShareCard(id: string): Promise<void> {
  await fetch("/api/share", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}

export function cardImageUrl(id: string, size: CardSize): string {
  return `/api/card/${id}?size=${size}`;
}

export async function cardFile(id: string, size: CardSize, type: string): Promise<File> {
  const res = await fetch(cardImageUrl(id, size));
  if (!res.ok) throw new Error(`image_${res.status}`);
  const blob = await res.blob();
  return new File([blob], `muhurta-${type}-${size}.png`, { type: "image/png" });
}

export function canShareFiles(file: File): boolean {
  try {
    return typeof navigator !== "undefined" && !!navigator.canShare && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export function whatsappHref(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
