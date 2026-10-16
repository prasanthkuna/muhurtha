"""DEPRECATED — Pillow + Windows fonts ≠ shipped Flutter UI. Do not use.

Use docs/store-assets-checklist.md § Pro approach instead:
  - golden_screenshot / integration_test for store screenshots
  - Flutter BrandMark export or Figma for launcher icon
  - Figma feature graphic with real screenshot in device frame
"""
from __future__ import annotations

import json
import math
import random
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]

BG = (8, 7, 4)
BG_ELEVATED = (15, 12, 7)
SURFACE = (23, 17, 7)
SURFACE_SOFT = (33, 24, 13)
GOLD = (230, 184, 92)
GOLD_DEEP = (185, 130, 46)
GOLD_SOFT = (255, 217, 138)
CREAM = (245, 232, 200)
CREAM_MUTED = (205, 187, 148)
GREEN = (122, 194, 128)
AMBER = (240, 176, 74)

FONT_DIR = Path("C:/Windows/Fonts")
FONT_REGULAR = FONT_DIR / "segoeui.ttf"
FONT_BOLD = FONT_DIR / "segoeuib.ttf"
FONT_SEMIBOLD = FONT_DIR / "seguisb.ttf"
FONT_LIGHT = FONT_DIR / "segoeuil.ttf"
FONT_SERIF = FONT_DIR / "georgia.ttf"
FONT_SERIF_BOLD = FONT_DIR / "georgiab.ttf"
FONT_TELUGU = FONT_DIR / "Nirmala.ttc"


def ensure_dirs() -> None:
    for path in [
        ROOT / "app/assets/icons",
        ROOT / "app/assets/brand",
        ROOT / "play/assets/screenshots/en-IN",
    ]:
        path.mkdir(parents=True, exist_ok=True)


def font(size: int, weight: str = "regular", script: str = "latin") -> ImageFont.FreeTypeFont:
    if script == "te" and FONT_TELUGU.exists():
        return ImageFont.truetype(str(FONT_TELUGU), size=size)
    path = {
        "light": FONT_LIGHT,
        "regular": FONT_REGULAR,
        "semibold": FONT_SEMIBOLD if FONT_SEMIBOLD.exists() else FONT_BOLD,
        "bold": FONT_BOLD,
        "serif": FONT_SERIF,
        "serif_bold": FONT_SERIF_BOLD,
    }[weight]
    return ImageFont.truetype(str(path), size=size)


def rgba(color: tuple[int, int, int], alpha: int = 255) -> tuple[int, int, int, int]:
    return (*color, alpha)


def blend(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    t = max(0.0, min(1.0, t))
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def radial_background(
    width: int,
    height: int,
    base: tuple[int, int, int] = BG,
    center: tuple[float, float] = (0.72, 0.16),
    strength: float = 0.52,
) -> Image.Image:
    scale = 4
    small = Image.new("RGB", (max(1, width // scale), max(1, height // scale)), base)
    px = small.load()
    cx = center[0] * small.width
    cy = center[1] * small.height
    max_d = math.hypot(max(cx, small.width - cx), max(cy, small.height - cy))
    for y in range(small.height):
        for x in range(small.width):
            d = math.hypot(x - cx, y - cy) / max_d
            warm = (1.0 - d) ** 2.2 * strength
            corner = (y / small.height) * 0.12
            c = blend(base, SURFACE_SOFT, warm)
            c = blend(c, BG_ELEVATED, corner)
            px[x, y] = c
    img = small.resize((width, height), Image.Resampling.BICUBIC)
    grain_w = max(1, width // 6)
    grain_h = max(1, height // 6)
    noise = Image.new("L", (grain_w, grain_h), 128)
    noise_px = noise.load()
    for gy in range(grain_h):
        for gx in range(grain_w):
            v = 128 + (((gx * 37 + gy * 19 + gx * gy * 7) % 31) - 15)
            noise_px[gx, gy] = v
    noise = noise.resize((width, height), Image.Resampling.NEAREST)
    noise_alpha = Image.new("L", (width, height), 16)
    grain = Image.merge("RGBA", (noise, noise, noise, noise_alpha))
    return Image.alpha_composite(img.convert("RGBA"), grain)


def save_png(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG", optimize=True)


def downsample(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    return img.resize(size, Image.Resampling.LANCZOS)


def draw_arc_with_caps(
    draw: ImageDraw.ImageDraw,
    box: tuple[float, float, float, float],
    start: float,
    end: float,
    fill: tuple[int, int, int, int],
    width: int,
) -> None:
    draw.arc(box, start=start, end=end, fill=fill, width=width)
    cx = (box[0] + box[2]) / 2
    cy = (box[1] + box[3]) / 2
    rx = (box[2] - box[0]) / 2
    ry = (box[3] - box[1]) / 2
    r = width / 2
    for angle in (start, end):
        rad = math.radians(angle)
        x = cx + rx * math.cos(rad)
        y = cy + ry * math.sin(rad)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=fill)


def draw_mark(
    img: Image.Image,
    center: tuple[float, float],
    size: float,
    color: tuple[int, int, int] = GOLD,
    accent: tuple[int, int, int] = GOLD_SOFT,
    white: bool = False,
    ring: bool = False,
) -> None:
    d = ImageDraw.Draw(img)
    cx, cy = center
    main = rgba((255, 255, 255) if white else color, 242)
    soft = rgba((255, 255, 255) if white else accent, 232)
    dim = rgba((255, 255, 255) if white else color, 92)

    if ring:
        r = size * 0.43
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=rgba(color, 92), width=max(2, int(size * 0.016)))
        r2 = size * 0.35
        d.ellipse((cx - r2, cy - r2, cx + r2, cy + r2), outline=rgba(color, 38), width=max(1, int(size * 0.008)))

    stroke = max(6, int(size * 0.052))
    moon_box = (
        cx - size * 0.29,
        cy - size * 0.37,
        cx + size * 0.25,
        cy + size * 0.39,
    )
    draw_arc_with_caps(d, moon_box, 102, 278, main, stroke)

    orbit_box = (
        cx - size * 0.40,
        cy - size * 0.24,
        cx + size * 0.42,
        cy + size * 0.24,
    )
    draw_arc_with_caps(d, orbit_box, 205, 342, dim, max(3, int(size * 0.016)))

    flame = [
        (cx + size * 0.095, cy - size * 0.115),
        (cx + size * 0.035, cy + size * 0.015),
        (cx + size * 0.105, cy + size * 0.122),
        (cx + size * 0.175, cy + size * 0.010),
    ]
    d.polygon(flame, fill=soft)
    d.line(flame + [flame[0]], fill=main, width=max(2, int(size * 0.012)), joint="curve")

    bowl = (
        cx - size * 0.12,
        cy + size * 0.08,
        cx + size * 0.29,
        cy + size * 0.26,
    )
    draw_arc_with_caps(d, bowl, 12, 168, main, max(5, int(size * 0.032)))
    d.line(
        (cx - size * 0.135, cy + size * 0.238, cx + size * 0.285, cy + size * 0.238),
        fill=main,
        width=max(5, int(size * 0.027)),
    )

    star_cx = cx + size * 0.245
    star_cy = cy - size * 0.235
    sr = size * 0.026
    d.ellipse((star_cx - sr, star_cy - sr, star_cx + sr, star_cy + sr), fill=soft)
    for angle in (0, 90, 45, 135):
        rad = math.radians(angle)
        inner = sr * 1.8
        outer = sr * 3.1
        d.line(
            (
                star_cx + math.cos(rad) * inner,
                star_cy + math.sin(rad) * inner,
                star_cx + math.cos(rad) * outer,
                star_cy + math.sin(rad) * outer,
            ),
            fill=main,
            width=max(2, int(size * 0.008)),
        )


def draw_wordmark(img: Image.Image, xy: tuple[int, int], size: int, color: tuple[int, int, int, int] = rgba(CREAM)) -> None:
    d = ImageDraw.Draw(img)
    d.text(xy, "Muh\u016brta", font=font(size, "serif_bold"), fill=color)


def text_bbox(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont) -> tuple[int, int, int, int]:
    return draw.textbbox((0, 0), text, font=fnt)


def text_width(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont) -> int:
    b = text_bbox(draw, text, fnt)
    return b[2] - b[0]


def wrap_text(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if text_width(draw, candidate, fnt) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_text_block(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    fnt: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int, int],
    max_width: int,
    line_gap: int = 8,
) -> int:
    x, y = xy
    ascent, descent = fnt.getmetrics()
    line_h = ascent + descent + line_gap
    for line in wrap_text(draw, text, fnt, max_width):
        draw.text((x, y), line, font=fnt, fill=fill)
        y += line_h
    return y


def rounded(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    fill: tuple[int, int, int, int],
    outline: tuple[int, int, int, int] | None = None,
    width: int = 1,
    radius: int = 28,
) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def chip(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, fill: tuple[int, int, int, int], script: str = "latin") -> int:
    f = font(28, "semibold", script)
    x, y = xy
    w = text_width(draw, text, f) + 44
    rounded(draw, (x, y, x + w, y + 58), fill=fill, outline=rgba(GOLD, 46), radius=29)
    draw.text((x + 22, y + 11), text, font=f, fill=rgba(CREAM))
    return x + w + 14


def generate_icons() -> None:
    bg = radial_background(1024, 1024, BG, center=(0.68, 0.12), strength=0.62)
    d = ImageDraw.Draw(bg)
    d.ellipse((92, 92, 932, 932), outline=rgba(GOLD, 44), width=4)
    d.ellipse((150, 150, 874, 874), outline=rgba(GOLD, 24), width=2)
    draw_mark(bg, (512, 492), 760, ring=True)
    save_png(bg.convert("RGB"), ROOT / "app/assets/icons/app_icon.png")

    foreground = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    draw_mark(foreground, (512, 512), 640)
    save_png(foreground, ROOT / "app/assets/icons/app_icon_foreground.png")

    background = radial_background(1024, 1024, BG, center=(0.68, 0.10), strength=0.50)
    save_png(background.convert("RGB"), ROOT / "app/assets/icons/app_icon_background.png")

    splash = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    draw_mark(splash, (256, 206), 300)
    sd = ImageDraw.Draw(splash)
    wm = font(56, "serif_bold")
    label = "Muh\u016brta"
    tw = text_width(sd, label, wm)
    sd.text(((512 - tw) / 2, 358), label, font=wm, fill=rgba(CREAM))
    save_png(splash, ROOT / "app/assets/icons/splash_logo.png")

    play = downsample(bg.convert("RGB"), (512, 512))
    save_png(play, ROOT / "play/assets/play_store_icon.png")

    notif = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    draw_mark(notif, (48, 48), 84, white=True)
    save_png(notif, ROOT / "app/assets/icons/notification_icon.png")
    save_png(notif, ROOT / "app/android/app/src/main/res/drawable/notification_icon.png")

    wordmark = Image.new("RGBA", (1200, 320), (0, 0, 0, 0))
    draw_mark(wordmark, (145, 160), 230)
    draw_wordmark(wordmark, (285, 76), 126)
    wd = ImageDraw.Draw(wordmark)
    wd.text((292, 214), "purpose-first timing", font=font(31, "regular"), fill=rgba(CREAM_MUTED, 230))
    save_png(wordmark, ROOT / "app/assets/brand/wordmark_light.png")


def generate_feature_graphic() -> None:
    img = radial_background(1024, 500, BG, center=(0.22, 0.14), strength=0.62)
    d = ImageDraw.Draw(img)
    draw_mark(img, (190, 245), 310, ring=True)
    draw_wordmark(img, (365, 92), 64)
    tagline = "First check your past. Then choose the right time."
    draw_text_block(d, (365, 190), tagline, font(50, "semibold"), rgba(CREAM), 560, line_gap=6)
    d.line((365, 414, 912, 414), fill=rgba(GOLD, 92), width=2)
    save_png(img.convert("RGB"), ROOT / "play/assets/feature_graphic.png")


def base_screen(title: str, subtitle: str, active: str = "Today", script: str = "latin") -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = radial_background(1080, 1920, BG, center=(0.78, 0.08), strength=0.46)
    d = ImageDraw.Draw(img)
    d.text((54, 28), "9:41", font=font(28, "semibold"), fill=rgba(CREAM, 225))
    d.rounded_rectangle((900, 34, 974, 60), radius=12, outline=rgba(CREAM, 180), width=2)
    d.rounded_rectangle((978, 41, 986, 53), radius=4, fill=rgba(CREAM, 180))
    d.rounded_rectangle((906, 40, 958, 54), radius=7, fill=rgba(GREEN, 210))

    draw_mark(img, (78, 128), 76)
    d.text((128, 96), "Muh\u016brta", font=font(35, "serif_bold"), fill=rgba(CREAM))
    d.text((54, 182), title, font=font(66, "bold", script), fill=rgba(CREAM))
    draw_text_block(d, (58, 267), subtitle, font(31, "regular", script), rgba(CREAM_MUTED), 910, line_gap=4)

    nav_y = 1766
    rounded(d, (48, nav_y, 1032, 1874), fill=rgba((11, 10, 7), 235), outline=rgba(GOLD, 28), radius=38)
    labels = ["Decode", "Life", "Today", "Timing", "Ask"]
    for idx, label in enumerate(labels):
        x = 92 + idx * 188
        is_active = label == active
        if is_active:
            rounded(d, (x - 24, nav_y + 18, x + 116, nav_y + 88), fill=rgba(SURFACE_SOFT, 245), outline=rgba(GOLD, 48), radius=28)
        dot = rgba(GOLD if is_active else CREAM_MUTED, 230 if is_active else 130)
        d.ellipse((x + 32, nav_y + 32, x + 48, nav_y + 48), fill=dot)
        d.text((x, nav_y + 56), label, font=font(22, "semibold"), fill=rgba(CREAM if is_active else CREAM_MUTED, 230))
    return img, d


def info_card(
    d: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    eyebrow: str,
    title: str,
    body: str,
    accent: tuple[int, int, int] = GOLD,
) -> None:
    rounded(d, box, fill=rgba(SURFACE, 238), outline=rgba(accent, 58), width=2, radius=34)
    x1, y1, x2, _ = box
    d.text((x1 + 34, y1 + 30), eyebrow.upper(), font=font(22, "semibold"), fill=rgba(accent, 220))
    d.text((x1 + 34, y1 + 72), title, font=font(38, "bold"), fill=rgba(CREAM))
    draw_text_block(d, (x1 + 34, y1 + 128), body, font(27), rgba(CREAM_MUTED), x2 - x1 - 68, line_gap=3)


def screenshot_today() -> None:
    img, d = base_screen("Today", "One main line, one useful window, one caution.", "Today")
    rounded(d, (54, 372, 1026, 786), fill=rgba(SURFACE, 240), outline=rgba(GOLD, 68), width=2, radius=40)
    d.text((90, 412), "Good / Caution split", font=font(28, "semibold"), fill=rgba(GOLD))
    d.text((90, 466), "Use the morning to send, plan, and begin.", font=font(48, "bold"), fill=rgba(CREAM))
    rounded(d, (90, 570, 512, 724), fill=rgba((18, 34, 20), 224), outline=rgba(GREEN, 70), radius=28)
    d.text((122, 602), "GOOD WINDOW", font=font(20, "semibold"), fill=rgba(GREEN))
    d.text((122, 636), "8:15 - 10:05 AM", font=font(35, "bold"), fill=rgba(CREAM))
    d.text((122, 682), "Plan, pitch, send", font=font(25), fill=rgba(CREAM_MUTED))
    rounded(d, (568, 570, 990, 724), fill=rgba((44, 25, 13), 224), outline=rgba(AMBER, 78), radius=28)
    d.text((600, 602), "CAUTION", font=font(20, "semibold"), fill=rgba(AMBER))
    d.text((600, 636), "2:40 - 4:10 PM", font=font(35, "bold"), fill=rgba(CREAM))
    d.text((600, 682), "Delay big commitments", font=font(25), fill=rgba(CREAM_MUTED))
    x = 62
    for text in ["Moon in Pushya", "Daylight focus", "High clarity"]:
        x = chip(d, (x, 828), text, rgba(SURFACE_SOFT, 230))
    info_card(d, (54, 930, 1026, 1192), "Better for", "Career moves, admin, clean starts", "Keep the ask simple; today rewards direct action.")
    info_card(d, (54, 1230, 1026, 1518), "Be careful with", "Emotional negotiations after lunch", "If the matter is delicate, draft it now and send tomorrow morning.", AMBER)
    save_png(img.convert("RGB"), ROOT / "play/assets/screenshots/en-IN/01-today.png")


def screenshot_decode() -> None:
    img, d = base_screen("Your Decode", "First it should feel like okay, this is me. Then timing earns trust.", "Decode")
    rounded(d, (54, 382, 1026, 760), fill=rgba(SURFACE, 240), outline=rgba(GOLD, 68), width=2, radius=40)
    d.text((90, 424), "CORE PATTERN", font=font(22, "semibold"), fill=rgba(GOLD))
    draw_text_block(d, (90, 472), "You move fastest when the plan has meaning.", font(50, "bold"), rgba(CREAM), 840, line_gap=2)
    draw_text_block(d, (90, 620), "When pressure rises, simplify the next step instead of proving the whole future at once.", font(30), rgba(CREAM_MUTED), 840, line_gap=4)
    info_card(d, (54, 812, 500, 1112), "Signal", "Builder mind", "You trust what has structure and a visible path.")
    info_card(d, (580, 812, 1026, 1112), "Stretch", "Overthinking", "Timing helps when emotion starts running the meeting.", AMBER)
    info_card(d, (54, 1162, 1026, 1488), "Use today for", "A first version, not the final verdict", "Start the move while the window is supportive; refine after feedback.")
    save_png(img.convert("RGB"), ROOT / "play/assets/screenshots/en-IN/02-decode.png")


def screenshot_life_map() -> None:
    img, d = base_screen("Life Map", "Check the past first, then understand the chapter you are in now.", "Life")
    rounded(d, (54, 372, 1026, 1516), fill=rgba(SURFACE, 236), outline=rgba(GOLD, 58), width=2, radius=40)
    d.text((90, 414), "PHASE TIMELINE", font=font(22, "semibold"), fill=rgba(GOLD))
    x = 154
    d.line((x, 510, x, 1390), fill=rgba(GOLD, 76), width=4)
    items = [
        ("Past pattern", "2017 - 2024", "Learning through responsibility"),
        ("Current chapter", "2025 - 2027", "Visibility grows when your work is specific"),
        ("Next opening", "Late 2027", "Partnerships become more useful"),
    ]
    for i, (name, years, body) in enumerate(items):
        y = 510 + i * 310
        active = i == 1
        d.ellipse((x - 28, y - 28, x + 28, y + 28), fill=rgba(GOLD if active else SURFACE_SOFT, 255), outline=rgba(GOLD, 170), width=3)
        bx = 230
        rounded(d, (bx, y - 72, 950, y + 162), fill=rgba(SURFACE_SOFT if active else BG_ELEVATED, 232), outline=rgba(GOLD, 68 if active else 30), radius=28)
        d.text((bx + 34, y - 42), years, font=font(22, "semibold"), fill=rgba(GOLD))
        d.text((bx + 34, y - 2), name, font=font(37, "bold"), fill=rgba(CREAM))
        draw_text_block(d, (bx + 34, y + 50), body, font(27), rgba(CREAM_MUTED), 640)
    save_png(img.convert("RGB"), ROOT / "play/assets/screenshots/en-IN/03-life-map.png")


def screenshot_timing() -> None:
    img, d = base_screen("Your Timing Plan", "Week focus, month strategy, and what to use now.", "Timing")
    x = 60
    for label in ["Work", "Money", "Travel"]:
        x = chip(d, (x, 380), label, rgba(SURFACE_SOFT, 245))
    rounded(d, (54, 482, 1026, 846), fill=rgba(SURFACE, 240), outline=rgba(GOLD, 66), width=2, radius=40)
    d.text((90, 526), "BEST NEXT WINDOW", font=font(22, "semibold"), fill=rgba(GOLD))
    d.text((90, 576), "Tomorrow morning", font=font(51, "bold"), fill=rgba(CREAM))
    d.text((90, 644), "7:50 - 9:20 AM", font=font(42, "semibold"), fill=rgba(GOLD_SOFT))
    draw_text_block(d, (90, 708), "Good for a clear ask, payment follow-up, or sending the first version.", font(29), rgba(CREAM_MUTED), 840)
    info_card(d, (54, 900, 1026, 1166), "Month strategy", "Build in public, decide in private", "Let visibility create options, then choose on a calm day.")
    info_card(d, (54, 1212, 1026, 1504), "Avoid window", "Friday late evening", "Do not make the money decision while tired; sleep on it.", AMBER)
    save_png(img.convert("RGB"), ROOT / "play/assets/screenshots/en-IN/04-timing.png")


def screenshot_ask() -> None:
    img, d = base_screen("Ask", "One clean answer, not a long horoscope.", "Ask")
    rounded(d, (104, 390, 976, 568), fill=rgba(SURFACE_SOFT, 240), outline=rgba(GOLD, 42), radius=34)
    draw_text_block(d, (142, 428), "Should I schedule the investor call this week?", font(34, "semibold"), rgba(CREAM), 780)
    rounded(d, (54, 648, 1026, 1248), fill=rgba(SURFACE, 240), outline=rgba(GOLD, 68), width=2, radius=40)
    d.text((90, 690), "ANSWER", font=font(22, "semibold"), fill=rgba(GOLD))
    draw_text_block(d, (90, 742), "Yes, but use the first half of Thursday.", font(48, "bold"), rgba(CREAM), 840)
    info_card(d, (90, 926, 990, 1114), "Best time", "9:05 - 10:35 AM", "Keep the pitch short and ask for one next step.")
    d.text((90, 1168), "Better option: send the deck tonight, call tomorrow.", font=font(27), fill=rgba(CREAM_MUTED))
    rounded(d, (54, 1320, 1026, 1518), fill=rgba((18, 34, 20), 224), outline=rgba(GREEN, 60), radius=34)
    d.text((92, 1360), "Free question left today: 1", font=font(32, "semibold"), fill=rgba(CREAM))
    d.text((92, 1412), "Upgrade for deeper follow-ups and future timing.", font=font(27), fill=rgba(CREAM_MUTED))
    save_png(img.convert("RGB"), ROOT / "play/assets/screenshots/en-IN/05-ask.png")


def screenshot_share() -> None:
    img, d = base_screen("Share preview", "A clean story card with no private birth details.", "Today")
    rounded(d, (90, 380, 990, 1510), fill=rgba(BG, 250), outline=rgba(GOLD, 140), width=4, radius=46)
    d.ellipse((704, 466, 936, 698), outline=rgba(GOLD, 42), width=2)
    draw_mark(img, (810, 574), 188)
    d.text((146, 466), "Muh\u016brta", font=font(42, "serif_bold"), fill=rgba(CREAM))
    d.text((146, 548), "TODAY'S SIGNAL", font=font(24, "semibold"), fill=rgba(GOLD))
    draw_text_block(d, (146, 608), "Use the morning for the move that needs clarity.", font(54, "bold"), rgba(CREAM), 670, line_gap=2)
    rounded(d, (146, 912, 878, 1098), fill=rgba(SURFACE, 230), outline=rgba(GOLD, 50), radius=30)
    d.text((184, 952), "Good time", font=font(24, "semibold"), fill=rgba(GOLD))
    d.text((184, 994), "8:15 - 10:05 AM", font=font(38, "bold"), fill=rgba(CREAM))
    d.text((184, 1044), "Plan, pitch, send", font=font(26), fill=rgba(CREAM_MUTED))
    draw_text_block(d, (146, 1170), "A simple start beats a perfect delay.", font(34, "semibold"), rgba(CREAM_MUTED), 700)
    d.text((146, 1404), "muhurta.app", font=font(26, "semibold"), fill=rgba(GOLD_SOFT))
    save_png(img.convert("RGB"), ROOT / "play/assets/screenshots/en-IN/06-share.png")


def screenshot_telugu() -> None:
    loc = json.loads((ROOT / "app/lib/l10n/app_te.arb").read_text(encoding="utf-8"))
    img, d = base_screen(loc["v3TodayTitle"], loc["v3TodaySub"], "Today", script="te")
    rounded(d, (54, 382, 1026, 828), fill=rgba(SURFACE, 240), outline=rgba(GOLD, 68), width=2, radius=40)
    d.text((90, 430), loc["todayBetterFor"], font=font(30, "semibold", "te"), fill=rgba(GOLD))
    draw_text_block(d, (90, 494), loc["concernGoodBadTiming"], font(46, "bold", "te"), rgba(CREAM), 820, line_gap=2)
    rounded(d, (90, 638, 990, 762), fill=rgba(SURFACE_SOFT, 235), outline=rgba(GOLD, 42), radius=26)
    d.text((122, 676), loc["loadingTodayWindows"], font=font(30, "regular", "te"), fill=rgba(CREAM_MUTED))
    rounded(d, (54, 900, 1026, 1180), fill=rgba(SURFACE, 238), outline=rgba(GOLD, 58), width=2, radius=34)
    d.text((88, 944), loc["v3TimingTitle"], font=font(28, "semibold", "te"), fill=rgba(GOLD))
    d.text((88, 998), "9:05 - 10:35 AM", font=font(42, "bold"), fill=rgba(CREAM))
    draw_text_block(d, (88, 1060), loc["loadingTodayWindows"], font(30, "regular", "te"), rgba(CREAM_MUTED), 820)

    rounded(d, (54, 1228, 1026, 1508), fill=rgba(SURFACE, 238), outline=rgba(AMBER, 72), width=2, radius=34)
    d.text((88, 1272), loc["validationWrongTiming"], font=font(28, "semibold", "te"), fill=rgba(AMBER))
    d.text((88, 1328), loc["todayHeader"], font=font(42, "bold", "te"), fill=rgba(CREAM))
    draw_text_block(d, (88, 1392), loc["v3TodaySub"], font(30, "regular", "te"), rgba(CREAM_MUTED), 820)
    save_png(img.convert("RGB"), ROOT / "play/assets/screenshots/en-IN/07-telugu.png")


def screenshot_paywall() -> None:
    img, d = base_screen("Unlock full timing", "Plus gives daily power use. Pro unlocks future phases and the full Life Map.", "Ask")
    rounded(d, (54, 384, 1026, 642), fill=rgba(SURFACE, 240), outline=rgba(GOLD, 70), width=2, radius=40)
    d.text((90, 430), "PRO", font=font(24, "semibold"), fill=rgba(GOLD))
    d.text((90, 478), "Future phases, deeper Ask, full timing.", font=font(43, "bold"), fill=rgba(CREAM))
    d.text((90, 566), "\u20b9199/month", font=font(36, "semibold"), fill=rgba(GOLD_SOFT))
    rounded(d, (54, 712, 1026, 984), fill=rgba(SURFACE_SOFT, 238), outline=rgba(GOLD, 44), radius=34)
    d.text((90, 760), "Plus", font=font(38, "bold"), fill=rgba(CREAM))
    d.text((90, 820), "\u20b999/month", font=font(32, "semibold"), fill=rgba(GOLD))
    draw_text_block(d, (90, 884), "Daily timing, more Ask, and supportive windows.", font(28), rgba(CREAM_MUTED), 780)
    rounded(d, (54, 1036, 1026, 1366), fill=rgba((18, 34, 20), 224), outline=rgba(GREEN, 70), radius=34)
    d.text((90, 1084), "Pro", font=font(42, "bold"), fill=rgba(CREAM))
    d.text((90, 1148), "Best for planning ahead", font=font(30, "semibold"), fill=rgba(GREEN))
    draw_text_block(d, (90, 1200), "Unlock future phases, month strategy, and the complete Life Map.", font(29), rgba(CREAM_MUTED), 800)
    rounded(d, (98, 1444, 982, 1532), fill=rgba(GOLD, 245), radius=32)
    d.text((344, 1462), "Upgrade to Pro", font=font(35, "bold"), fill=rgba(BG))
    save_png(img.convert("RGB"), ROOT / "play/assets/screenshots/en-IN/08-paywall.png")


def generate_screenshots() -> None:
    screenshot_today()
    screenshot_decode()
    screenshot_life_map()
    screenshot_timing()
    screenshot_ask()
    screenshot_share()
    screenshot_telugu()
    screenshot_paywall()


def main() -> None:
    random.seed(42)
    ensure_dirs()
    generate_icons()
    generate_feature_graphic()
    generate_screenshots()


if __name__ == "__main__":
    main()
