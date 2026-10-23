import fs from "node:fs";
import path from "node:path";
import { createCanvas, GlobalFonts, Path2D, type SKRSContext2D } from "@napi-rs/canvas";
import { GLYPHS } from "@/lib/glyphs";
import {
  CARD_DIMENSIONS,
  CARD_LABELS,
  DEFAULT_GLYPH,
  type CardPayload,
  type CardSize,
} from "@/lib/share/card-types";

/**
 * Share-card renderer. Skia (via @napi-rs/canvas) with HarfBuzz shaping — chosen over
 * satori/ImageResponse because satori breaks Telugu and Devanagari conjuncts.
 */

const C = {
  canvas: "#F8F5EE",
  paper: "#FFFCF6",
  wash: "#F3E8D2",
  ink: "#242019",
  ink2: "#5E574E",
  ink3: "#8A7F70",
  gold: "#77541F",
  goldAccent: "#A67B35",
  goldButton: "#C59B4F",
  line: "#E3D3B0",
  good: "#285D46",
  goodWash: "#E4F0E7",
  avoid: "#A23B2C",
  avoidWash: "#F8E3DE",
};

const SERIF = "MuhSerif, MuhSerifTe, MuhSerifHi";
const SANS = "MuhSans, MuhSansTe, MuhSansHi";
const SANS_BOLD = "MuhSansB, MuhSansTeB, MuhSansHiB";

let fontsReady = false;

function fontDir(): string {
  const candidates = [
    path.join(process.cwd(), "assets/fonts"),
    path.join(process.cwd(), "pwa/assets/fonts"),
    path.join(__dirname, "../../../assets/fonts"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "NotoSerif-Bold.ttf"))) return c;
  }
  throw new Error(`share-card fonts not found (cwd ${process.cwd()})`);
}

function ensureFonts() {
  if (fontsReady) return;
  const dir = fontDir();
  const reg = (file: string, family: string) => GlobalFonts.registerFromPath(path.join(dir, file), family);
  reg("NotoSerif-Bold.ttf", "MuhSerif");
  reg("NotoSerifTelugu-Bold.ttf", "MuhSerifTe");
  reg("NotoSerifDevanagari-Bold.ttf", "MuhSerifHi");
  reg("NotoSans-Regular.ttf", "MuhSans");
  reg("NotoSansTelugu-Regular.ttf", "MuhSansTe");
  reg("NotoSansDevanagari-Regular.ttf", "MuhSansHi");
  reg("NotoSans-Bold.ttf", "MuhSansB");
  reg("NotoSansTelugu-Bold.ttf", "MuhSansTeB");
  reg("NotoSansDevanagari-Bold.ttf", "MuhSansHiB");
  fontsReady = true;
}

type Ctx = SKRSContext2D;

function wrap(ctx: Ctx, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width <= maxWidth || !cur) {
      cur = next;
    } else {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  const consumed = lines.join(" ").length;
  if (consumed < text.replace(/\s+/g, " ").trim().length && lines.length) {
    let last = lines[lines.length - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last.trimEnd()}…`;
  }
  return lines;
}

/** Shrink font size until the text fits in maxLines. */
function fitLines(
  ctx: Ctx,
  text: string,
  family: string,
  start: number,
  min: number,
  maxWidth: number,
  maxLines: number,
): { size: number; lines: string[] } {
  for (let size = start; size >= min; size -= 2) {
    ctx.font = `${size}px ${family}`;
    const lines = wrap(ctx, text, maxWidth, 99);
    if (lines.length <= maxLines) return { size, lines };
  }
  ctx.font = `${min}px ${family}`;
  return { size: min, lines: wrap(ctx, text, maxWidth, maxLines) };
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawGlyph(ctx: Ctx, d: string, cx: number, cy: number, size: number, color: string, stroke = 1.6) {
  ctx.save();
  const s = size / 24;
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = stroke;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke(new Path2D(d));
  ctx.restore();
}

function background(ctx: Ctx, w: number, h: number) {
  ctx.fillStyle = C.canvas;
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w * 0.5, h * 0.12, 10, w * 0.5, h * 0.12, Math.max(w, h) * 0.75);
  g.addColorStop(0, "rgba(243,232,210,0.95)");
  g.addColorStop(1, "rgba(248,245,238,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Faint star field — deterministic so the same card always renders identically.
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  ctx.fillStyle = "rgba(166,123,53,0.16)";
  for (let i = 0; i < 46; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = rnd() * 2.2 + 0.6;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const m = Math.round(Math.min(w, h) * 0.036);
  roundRect(ctx, m, m, w - 2 * m, h - 2 * m, 28);
  ctx.strokeStyle = C.goldAccent;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  const m2 = m + 12;
  roundRect(ctx, m2, m2, w - 2 * m2, h - 2 * m2, 20);
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Corner diamonds
  ctx.fillStyle = C.goldAccent;
  for (const [x, y] of [[m, h / 2], [w - m, h / 2]] as const) {
    ctx.beginPath();
    ctx.moveTo(x, y - 9);
    ctx.lineTo(x + 9, y);
    ctx.lineTo(x, y + 9);
    ctx.lineTo(x - 9, y);
    ctx.closePath();
    ctx.fill();
  }
  return m2;
}

function ornament(ctx: Ctx, cx: number, y: number, half: number) {
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - half, y);
  ctx.lineTo(cx - 16, y);
  ctx.moveTo(cx + 16, y);
  ctx.lineTo(cx + half, y);
  ctx.stroke();
  ctx.fillStyle = C.goldButton;
  ctx.beginPath();
  ctx.moveTo(cx, y - 8);
  ctx.lineTo(cx + 8, y);
  ctx.lineTo(cx, y + 8);
  ctx.lineTo(cx - 8, y);
  ctx.closePath();
  ctx.fill();
}

function verdictColors(v: CardPayload["data"]["verdict"]) {
  if (v === "good") return { ring: C.good, fill: C.goodWash, glyph: C.good };
  if (v === "avoid") return { ring: C.avoid, fill: C.avoidWash, glyph: C.avoid };
  return { ring: C.goldAccent, fill: C.wash, glyph: C.gold };
}

function medallion(ctx: Ctx, p: CardPayload, cx: number, cy: number, r: number) {
  const col = verdictColors(p.data.verdict);
  ctx.beginPath();
  ctx.arc(cx, cy, r + 14, 0, Math.PI * 2);
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = col.fill;
  ctx.fill();
  ctx.strokeStyle = col.ring;
  ctx.lineWidth = 3;
  ctx.stroke();
  // tick marks around the ring (nakshatra wheel nod: 27)
  ctx.strokeStyle = "rgba(166,123,53,0.45)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 27; i++) {
    const a = (i / 27) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r + 6), cy + Math.sin(a) * (r + 6));
    ctx.lineTo(cx + Math.cos(a) * (r + 11), cy + Math.sin(a) * (r + 11));
    ctx.stroke();
  }
  const glyph = GLYPHS[p.data.glyph ?? DEFAULT_GLYPH[p.type]];
  drawGlyph(ctx, glyph, cx, cy, r * 1.15, col.glyph, 1.5);
}

function brandRow(ctx: Ctx, p: CardPayload, x: number, y: number, right: number, scale = 1) {
  const L = CARD_LABELS[p.locale];
  drawGlyph(ctx, GLYPHS.chandra, x + 20 * scale, y, 40 * scale, C.goldAccent, 1.9);
  ctx.fillStyle = C.ink;
  ctx.font = `${Math.round(34 * scale)}px ${SERIF}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(L.brand, x + 52 * scale, y + 2);
  ctx.fillStyle = C.gold;
  ctx.font = `${Math.round(26 * scale)}px ${SANS_BOLD}`;
  ctx.textAlign = "right";
  ctx.fillText(L.eyebrow[p.type], right, y + 2);
  ctx.textAlign = "left";
}

function chipsRow(ctx: Ctx, chips: string[], cx: number, y: number, maxW: number, size: number) {
  ctx.font = `${size}px ${SANS_BOLD}`;
  const padX = size * 0.9;
  const h = size * 2.1;
  const gap = size * 0.6;
  let items = chips.map((t) => ({ t, w: ctx.measureText(t).width + padX * 2 }));
  while (items.length > 1 && items.reduce((a, b) => a + b.w, 0) + gap * (items.length - 1) > maxW) {
    items = items.slice(0, -1);
  }
  const total = items.reduce((a, b) => a + b.w, 0) + gap * (items.length - 1);
  let x = cx - total / 2;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  for (const it of items) {
    roundRect(ctx, x, y, it.w, h, h / 2);
    ctx.fillStyle = C.paper;
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = C.gold;
    ctx.fillText(it.t, x + it.w / 2, y + h / 2 + 1);
    x += it.w + gap;
  }
  ctx.textAlign = "left";
  return h;
}

function footerLines(p: CardPayload): { who?: string; birth?: string } {
  const L = CARD_LABELS[p.locale];
  const b = p.data.birth;
  return {
    who: p.data.name ? L.forName(p.data.name) : undefined,
    birth: b ? `${L.born} ${[b.date, b.time, b.place].filter(Boolean).join(" · ")}` : undefined,
  };
}

function renderPortrait(ctx: Ctx, p: CardPayload, w: number, h: number) {
  const inset = background(ctx, w, h);
  const pad = inset + 44;
  const cx = w / 2;
  const contentW = w - pad * 2;
  const tall = h > 1500;

  brandRow(ctx, p, pad, inset + 62, w - pad);

  // Footer block (bottom-up)
  const L = CARD_LABELS[p.locale];
  const foot = footerLines(p);
  const footerTop = h - inset - (foot.birth ? 190 : 150);
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad, footerTop);
  ctx.lineTo(w - pad, footerTop);
  ctx.stroke();
  ctx.textBaseline = "alphabetic";
  let fy = footerTop + 54;
  if (foot.who) {
    ctx.fillStyle = C.ink;
    ctx.font = `30px ${SANS_BOLD}`;
    ctx.fillText(foot.who, pad, fy);
  }
  ctx.textAlign = "right";
  ctx.fillStyle = C.gold;
  ctx.font = `28px ${SANS_BOLD}`;
  ctx.fillText(L.cta, w - pad, fy);
  ctx.textAlign = "left";
  if (foot.birth) {
    fy += 42;
    ctx.fillStyle = C.ink2;
    ctx.font = `26px ${SANS}`;
    ctx.fillText(wrap(ctx, foot.birth, contentW, 1)[0] ?? "", pad, fy);
  }
  fy += 44;
  ctx.fillStyle = C.ink3;
  ctx.font = `24px ${SANS}`;
  ctx.fillText("pwa-lyart-phi.vercel.app", pad, fy);

  // Measure the main stack, shrinking until it fits, then centre it between brand row and footer.
  const top = inset + 110;
  const bottom = footerTop - 36;
  const subtitleSize = tall ? 34 : 30;
  type Layout = {
    r: number;
    gaps: number;
    title: { size: number; lines: string[] };
    value: { size: number; lines: string[] } | null;
    body: { size: number; lines: string[] } | null;
    totalH: number;
  };
  const measure = (step: number): Layout => {
    const r = Math.max(70, (tall ? 130 : 104) - step * 8);
    const gaps = Math.max(18, (tall ? 46 : 34) - step * 3);
    const title = fitLines(ctx, p.data.title, SERIF, (tall ? 78 : 66) - step * 2, 40, contentW, 3);
    const value = p.data.value
      ? fitLines(ctx, p.data.value, SERIF, (tall ? 84 : 70) - step * 2, 38, contentW, 1)
      : null;
    const bodyLines = Math.max(2, (tall ? 7 : 5) - Math.floor(step / 2));
    const body = p.data.body
      ? fitLines(ctx, p.data.body, SANS, (tall ? 40 : 34) - step, 26, contentW - 40, bodyLines)
      : null;
    const blocks: number[] = [(r + 14) * 2, title.lines.length * title.size * 1.22];
    if (value) blocks.push(value.lines.length * value.size * 1.18);
    if (p.data.subtitle) blocks.push(subtitleSize * 1.3);
    if (body) blocks.push(34 + body.lines.length * body.size * 1.42);
    if (p.data.chips?.length) blocks.push(56);
    const totalH = blocks.reduce((x, y) => x + y, 0) + gaps * (blocks.length - 1);
    return { r, gaps, title, value, body, totalH };
  };
  let lay = measure(0);
  for (let step = 1; step <= 8 && lay.totalH > bottom - top; step++) lay = measure(step);
  const { r, gaps, title, value, body } = lay;
  let y = top + Math.max(0, (bottom - top - lay.totalH) / 2);

  medallion(ctx, p, cx, y + r + 14, r);
  y += (r + 14) * 2 + gaps;

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = C.ink;
  ctx.font = `${title.size}px ${SERIF}`;
  for (const line of title.lines) {
    ctx.fillText(line, cx, y);
    y += title.size * 1.22;
  }
  if (value) {
    y += gaps;
    ctx.fillStyle = p.data.verdict === "avoid" ? C.avoid : p.data.verdict === "good" ? C.good : C.gold;
    ctx.font = `${value.size}px ${SERIF}`;
    for (const line of value.lines) {
      ctx.fillText(line, cx, y);
      y += value.size * 1.18;
    }
  }
  if (p.data.subtitle) {
    y += gaps * 0.6;
    ctx.fillStyle = C.ink2;
    ctx.font = `${subtitleSize}px ${SANS_BOLD}`;
    ctx.fillText(wrap(ctx, p.data.subtitle, contentW, 1)[0] ?? "", cx, y);
    y += subtitleSize * 1.3;
  }
  if (body) {
    y += gaps;
    ornament(ctx, cx, y, 120);
    y += 24 + 10;
    ctx.fillStyle = C.ink2;
    ctx.font = `${body.size}px ${SANS}`;
    for (const line of body.lines) {
      ctx.fillText(line, cx, y);
      y += body.size * 1.42;
    }
  }
  if (p.data.chips?.length) {
    y += gaps;
    chipsRow(ctx, p.data.chips, cx, y, contentW, 26);
  }
  ctx.textAlign = "left";
}

function renderLandscape(ctx: Ctx, p: CardPayload, w: number, h: number) {
  const inset = background(ctx, w, h);
  const pad = inset + 36;
  const L = CARD_LABELS[p.locale];
  const r = 132;
  const mcx = pad + r + 20;
  medallion(ctx, p, mcx, h / 2 - 10, r);

  const x = mcx + r + 64;
  const right = w - pad;
  const colW = right - x;
  brandRow(ctx, p, x, inset + 46, right, 0.86);

  const title = fitLines(ctx, p.data.title, SERIF, 56, 36, colW, 2);
  const value = p.data.value ? fitLines(ctx, p.data.value, SERIF, 58, 36, colW, 1) : null;
  const bodyText = p.data.body ?? p.data.subtitle;
  const body = bodyText ? fitLines(ctx, bodyText, SANS, 30, 24, colW, value ? 2 : 3) : null;

  const blockH =
    title.lines.length * title.size * 1.2 +
    (value ? 18 + value.size * 1.15 : 0) +
    (body ? 22 + body.lines.length * body.size * 1.38 : 0);
  let y = Math.max(inset + 96, (h - blockH) / 2 - 6);
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillStyle = C.ink;
  ctx.font = `${title.size}px ${SERIF}`;
  for (const line of title.lines) {
    ctx.fillText(line, x, y);
    y += title.size * 1.2;
  }
  if (value) {
    y += 18;
    ctx.fillStyle = p.data.verdict === "avoid" ? C.avoid : p.data.verdict === "good" ? C.good : C.gold;
    ctx.font = `${value.size}px ${SERIF}`;
    ctx.fillText(value.lines[0] ?? "", x, y);
    y += value.size * 1.15;
  }
  if (body) {
    y += 22;
    ctx.fillStyle = C.ink2;
    ctx.font = `${body.size}px ${SANS}`;
    for (const line of body.lines) {
      ctx.fillText(line, x, y);
      y += body.size * 1.38;
    }
  }
  // footer
  ctx.textBaseline = "alphabetic";
  const fy = h - inset - 30;
  const foot = footerLines(p);
  ctx.fillStyle = C.ink2;
  ctx.font = `24px ${SANS_BOLD}`;
  if (foot.who) ctx.fillText(foot.who, x, fy);
  ctx.textAlign = "right";
  ctx.fillStyle = C.gold;
  ctx.fillText(L.cta, right, fy);
  ctx.textAlign = "left";
}

export async function renderCard(p: CardPayload, size: CardSize = "feed"): Promise<Buffer> {
  ensureFonts();
  const { w, h } = CARD_DIMENSIONS[size];
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  if (size === "og") renderLandscape(ctx, p, w, h);
  else renderPortrait(ctx, p, w, h);
  return canvas.encode("png");
}
