"""Padded moon mark on canvas for flutter_native_splash (Android 12 safe zone)."""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app"
SRC = APP / "assets" / "icons" / "app_icon_foreground.png"
OUT = APP / "assets" / "icons" / "splash_mark.png"
SIZE = 1152
CANVAS_RGB = (248, 245, 238)


def main() -> None:
    canvas = Image.new("RGBA", (SIZE, SIZE), (*CANVAS_RGB, 255))
    fg = Image.open(SRC).convert("RGBA")
    data = fg.load()
    assert data is not None
    for y in range(fg.height):
        for x in range(fg.width):
            r, g, b, a = data[x, y]
            if r < 28 and g < 28 and b < 28:
                data[x, y] = (*CANVAS_RGB, 0)
    side = int(SIZE * 0.28)
    fg = fg.resize((side, side), Image.Resampling.LANCZOS)
    ox = (SIZE - fg.width) // 2
    oy = (SIZE - fg.height) // 2
    canvas.paste(fg, (ox, oy), fg)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUT, optimize=True)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
