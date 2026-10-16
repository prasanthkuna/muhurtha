import os
import re
import urllib.request
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]

# Design system colors
BG_HEX = "#080704"
BG = (8, 7, 4)
SURFACE = (23, 17, 7)
GOLD = (230, 184, 92)
GOLD_SOFT = (255, 217, 138)
CREAM = (245, 232, 200)
CREAM_MUTED = (205, 187, 148)

# Input path
MASTER_ICON_PATH = Path(r"C:\Users\PrashanthKuna\.gemini\antigravity\brain\e059c262-ad0f-464e-a5a3-93b20dba6c2c\master_app_icon_1783319556443.png")

# Output paths
APP_ICON = ROOT / "app/assets/icons/app_icon.png"
APP_ICON_FG = ROOT / "app/assets/icons/app_icon_foreground.png"
APP_ICON_BG = ROOT / "app/assets/icons/app_icon_background.png"
SPLASH_LOGO = ROOT / "app/assets/icons/splash_logo.png"
NOTIF_ICON = ROOT / "app/assets/icons/notification_icon.png"
WORDMARK = ROOT / "app/assets/brand/wordmark_light.png"

PLAY_ICON = ROOT / "play/assets/play_store_icon.png"
FEATURE_GRAPHIC = ROOT / "play/assets/feature_graphic.png"
SCREENSHOT_EN = ROOT / "play/assets/screenshots/en-IN/01-today.png"

# Cache for downloaded fonts
CACHE_DIR = ROOT / ".gemini/cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

def download_fonts():
    """Download Fraunces and Instrument Sans fonts from Google Fonts CDN."""
    print("Fetching fonts from Google Fonts...")
def download_url(url, dest):
    """Download a URL to a file with a timeout."""
    print(f"Downloading {url} to {dest}...", flush=True)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            with open(dest, 'wb') as f:
                f.write(response.read())
        print(f"Successfully downloaded {dest.name}", flush=True)
        return True
    except Exception as e:
        print(f"Failed to download {url}: {e}", flush=True)
        return False

def download_fonts():
    """Download Fraunces and Instrument Sans fonts from Google Fonts CDN."""
    print("Fetching fonts from Google Fonts...", flush=True)
    css_url = (
        "https://fonts.googleapis.com/css2?"
        "family=Fraunces:opsz,wght@9..144,700&"
        "family=Instrument+Sans:wght@400;600&display=swap"
    )
    req = urllib.request.Request(css_url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            css_content = response.read().decode("utf-8")
    except Exception as e:
        print(f"Error fetching Google Fonts CSS: {e}. Falling back to standard fonts.", flush=True)
        return None, None, None

    # Parse TTF URLs from CSS
    font_urls = re.findall(r'url\((https://fonts\.gstatic\.com/s/[^)]+\.ttf)\)', css_content)
    
    fraunces_path = CACHE_DIR / "Fraunces-Bold.ttf"
    sans_reg_path = CACHE_DIR / "InstrumentSans-Regular.ttf"
    sans_semi_path = CACHE_DIR / "InstrumentSans-SemiBold.ttf"

    # We expect 3 fonts in the response
    if len(font_urls) >= 3:
        # download them
        for url, dest in zip(font_urls[:3], [fraunces_path, sans_reg_path, sans_semi_path]):
            if not dest.exists():
                download_url(url, dest)
        return fraunces_path, sans_reg_path, sans_semi_path
    else:
        # Fallback extraction logic using font-family name matches
        # Let's search CSS for Fraunces and Instrument Sans font faces
        matches = re.finditer(r"font-family:\s*'([^']+)';.*?font-weight:\s*(\d+);.*?src:\s*url\((https://[^\)]+)\)", css_content, re.DOTALL)
        for m in matches:
            family, weight, url = m.groups()
            if "Fraunces" in family and weight == "700" and not fraunces_path.exists():
                download_url(url, fraunces_path)
            elif "Instrument Sans" in family:
                if weight == "400" and not sans_reg_path.exists():
                    download_url(url, sans_reg_path)
                elif weight == "600" and not sans_semi_path.exists():
                    download_url(url, sans_semi_path)

        if fraunces_path.exists() and sans_reg_path.exists() and sans_semi_path.exists():
            return fraunces_path, sans_reg_path, sans_semi_path
            
    print("Could not download all exact fonts, will fall back.", flush=True)
    return None, None, None

def get_fonts():
    """Get loaded ImageFont objects."""
    fraunces, sans_reg, sans_semi = download_fonts()
    if fraunces and fraunces.exists():
        f_bold = lambda size: ImageFont.truetype(str(fraunces), size)
        s_reg = lambda size: ImageFont.truetype(str(sans_reg), size)
        s_semi = lambda size: ImageFont.truetype(str(sans_semi), size)
    else:
        # Fallback to system fonts
        f_bold = lambda size: ImageFont.load_default()
        s_reg = lambda size: ImageFont.load_default()
        s_semi = lambda size: ImageFont.load_default()
    return f_bold, s_reg, s_semi

def extract_foreground(img_path, output_path):
    """
    Extract the gold foreground element from the app icon by keying out the black and white backgrounds.
    Uses color-based segmentation to isolate the gold crescent moon, and applies a Gaussian blur to the
    alpha mask to restore beautiful anti-aliased edges.
    """
    print(f"Extracting foreground from {img_path.name}...")
    img = Image.open(img_path).convert("RGBA")
    w, h = img.size

    # Create binary mask for gold pixels
    mask = Image.new("L", (w, h), 0)
    mask_data = mask.load()
    img_data = img.load()

    for y in range(h):
        for x in range(w):
            r, g, b, a = img_data[x, y]
            # Check if pixel is gold:
            # Gold color has high red, medium green, low blue (r > g > b) and not too dark/bright
            is_gold = (r > 70 and g > 50 and r > g and g > b and (r - b) > 20)
            if is_gold:
                mask_data[x, y] = 255

    # Smooth the mask to get beautiful anti-aliased edges
    mask_smoothed = mask.filter(ImageFilter.GaussianBlur(radius=1.2))

    # Construct final transparent foreground image
    fg = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    fg_data = fg.load()
    
    # Paint pixels with the original color but with the smoothed mask as alpha
    for y in range(h):
        for x in range(w):
            r, g, b, a = img_data[x, y]
            alpha = mask_smoothed.getpixel((x, y))
            if alpha > 0:
                fg_data[x, y] = (r, g, b, alpha)

    # Save transparent foreground
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fg.save(output_path, "PNG", optimize=True)
    print(f"Saved foreground icon to {output_path}")

def generate_background(output_path):
    """Generate a solid background matching #080704 with a very soft radial glow."""
    print("Generating adaptive background...")
    width, height = 1024, 1024
    img = Image.new("RGB", (width, height), BG)
    d = ImageDraw.Draw(img)
    
    # Draw a very soft radial gradient of elevated background
    # center is top-right (800, 200)
    cx, cy = 800, 200
    for r in range(600, 0, -4):
        alpha = int(20 * (1.0 - r / 600.0))
        # blend BG and SURFACE
        color = tuple(int(BG[i] + (SURFACE[i] - BG[i]) * (1.0 - r / 600.0)) for i in range(3))
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path, "PNG")
    print(f"Saved background icon to {output_path}")

def generate_notification_icon(fg_path, output_path):
    """Generate a monochrome white silhouette of the icon mark."""
    print("Generating notification icon...")
    img = Image.open(fg_path).convert("RGBA")
    data = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = data[x, y]
            if a > 0:
                data[x, y] = (255, 255, 255, a)
    
    # Resize to 96x96
    notif = img.resize((96, 96), Image.Resampling.LANCZOS)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    notif.save(output_path, "PNG", optimize=True)
    
    # Also save to Android drawable resource path
    res_path = ROOT / "app/android/app/src/main/res/drawable/notification_icon.png"
    res_path.parent.mkdir(parents=True, exist_ok=True)
    notif.save(res_path, "PNG", optimize=True)
    print(f"Saved notification icon to {output_path} and drawable resource")

def generate_splash_logo(fg_path, output_path, f_bold):
    """Generate splash logo with transparent background containing the gold mark and wordmark."""
    print("Generating splash logo...")
    # Load foreground and resize it to ~260x260
    fg = Image.open(fg_path)
    mark = fg.resize((260, 260), Image.Resampling.LANCZOS)
    
    # Create 512x512 transparent canvas
    splash = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    # Paste mark at center top
    splash.alpha_composite(mark, ((512 - 260) // 2, 80))
    
    # Draw text "Muhūrta" below
    d = ImageDraw.Draw(splash)
    font_wordmark = f_bold(48)
    text = "Muhūrta"
    bbox = d.textbbox((0, 0), text, font=font_wordmark)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    
    # Draw text centered at Y = 380
    d.text(((512 - tw) // 2, 380), text, font=font_wordmark, fill=CREAM)
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    splash.save(output_path, "PNG", optimize=True)
    print(f"Saved splash logo to {output_path}")

def generate_wordmark(fg_path, output_path, f_bold, s_reg):
    """Generate the brand wordmark asset."""
    print("Generating brand wordmark...")
    # Create 1200x320 transparent canvas
    img = Image.new("RGBA", (1200, 320), (0, 0, 0, 0))
    
    # Paste a small version of the gold crescent on the left
    fg = Image.open(fg_path)
    mark = fg.resize((180, 180), Image.Resampling.LANCZOS)
    img.alpha_composite(mark, (80, (320 - 180) // 2))
    
    # Draw "Muhūrta" and subline
    d = ImageDraw.Draw(img)
    font_wm = f_bold(100)
    font_sub = s_reg(26)
    
    d.text((280, 75), "Muhūrta", font=font_wm, fill=CREAM)
    d.text((285, 195), "purpose-first timing", font=font_sub, fill=CREAM_MUTED)
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path, "PNG", optimize=True)
    print(f"Saved brand wordmark to {output_path}")

def generate_feature_graphic(screenshot_path, output_path, f_bold, s_reg, s_semi):
    """Composite the Play Store feature graphic."""
    print("Compositing feature graphic...")
    # 1. Create background
    width, height = 1024, 500
    img = Image.new("RGBA", (width, height), BG)
    d = ImageDraw.Draw(img)
    
    # Radial background gradient from top-right to bottom-left
    cx, cy = 900, -100
    for r in range(1000, 0, -5):
        alpha = int(40 * (1.0 - r / 1000.0))
        color = tuple(int(BG[i] + (SURFACE[i] - BG[i]) * (1.0 - r / 1000.0)) for i in range(3))
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
        
    # Subtle gold horizontal divider line near bottom
    d.line((60, 440, 520, 440), fill=((*GOLD, 60)), width=1)

    # 2. Render typography on the left
    d.text((60, 100), "Muhūrta", font=f_bold(72), fill=CREAM)
    
    tagline1 = "First check your past."
    tagline2 = "Then choose the right time."
    d.text((60, 200), tagline1, font=s_semi(34), fill=CREAM)
    d.text((60, 245), tagline2, font=s_semi(34), fill=GOLD)
    
    subline = "Daily Jyotish timing for India"
    d.text((60, 315), subline, font=s_reg(22), fill=CREAM_MUTED)

    # 3. Composite phone screenshot inside a gold frame on the right
    if screenshot_path.exists():
        print(f"Loading screenshot from {screenshot_path}...")
        ss = Image.open(screenshot_path).convert("RGBA")
        
        # Target phone dimensions: height 410, width 410 * 9/16 = 230
        ss_h = 410
        ss_w = 230
        ss_resized = ss.resize((ss_w, ss_h), Image.Resampling.LANCZOS)
        
        # Create phone container frame
        frame_w = ss_w + 16
        frame_h = ss_h + 16
        frame_x = 690
        frame_y = 45
        
        # Draw frame rounded rectangle (warm gold border)
        frame_img = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
        fd = ImageDraw.Draw(frame_img)
        fd.rounded_rectangle((0, 0, frame_w, frame_h), radius=22, fill=(15, 12, 7, 255), outline=GOLD, width=3)
        
        # Clip screenshot to have rounded corners inside the frame
        mask = Image.new("L", (ss_w, ss_h), 0)
        md = ImageDraw.Draw(mask)
        md.rounded_rectangle((0, 0, ss_w, ss_h), radius=16, fill=255)
        
        ss_clipped = Image.new("RGBA", (ss_w, ss_h), (0, 0, 0, 0))
        ss_clipped.paste(ss_resized, (0, 0), mask=mask)
        
        # Paste screenshot inside frame
        frame_img.alpha_composite(ss_clipped, (8, 8))
        
        # Paste the whole framed device onto the feature graphic
        img.alpha_composite(frame_img, (frame_x, frame_y))
    else:
        print(f"Warning: Screenshot {screenshot_path} not found! Drawing placeholder frame.")
        frame_w = 246
        frame_h = 426
        frame_x = 690
        frame_y = 45
        d.rounded_rectangle((frame_x, frame_y, frame_x + frame_w, frame_y + frame_h), radius=22, fill=SURFACE, outline=GOLD, width=3)
        d.text((frame_x + 30, frame_y + 200), "[App Screenshot]", font=s_reg(22), fill=CREAM_MUTED)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(output_path, "PNG")
    print(f"Saved feature graphic to {output_path}")

def main():
    if not MASTER_ICON_PATH.exists():
        print(f"Error: Master icon not found at {MASTER_ICON_PATH}!")
        return

    # Create app directories
    APP_ICON.parent.mkdir(parents=True, exist_ok=True)
    WORDMARK.parent.mkdir(parents=True, exist_ok=True)
    PLAY_ICON.parent.mkdir(parents=True, exist_ok=True)

    # 1. Extract transparent foreground first directly from the master image
    extract_foreground(MASTER_ICON_PATH, APP_ICON_FG)

    # 2. Generate adaptive background
    generate_background(APP_ICON_BG)

    # 3. Create the opaque app icon by compositing foreground over the correct warm black background
    print(f"Creating opaque launcher icon {APP_ICON}...")
    opaque_icon = Image.new("RGBA", (1024, 1024), (8, 7, 4, 255))
    fg_img = Image.open(APP_ICON_FG)
    opaque_icon.alpha_composite(fg_img)
    opaque_icon.convert("RGB").save(APP_ICON, "PNG")

    # 4. Generate notification icon
    generate_notification_icon(APP_ICON_FG, NOTIF_ICON)

    # 5. Get Google Fonts
    f_bold, s_reg, s_semi = get_fonts()

    # 6. Generate splash logo
    generate_splash_logo(APP_ICON_FG, SPLASH_LOGO, f_bold)

    # 7. Generate brand wordmark
    generate_wordmark(APP_ICON_FG, WORDMARK, f_bold, s_reg)

    # 8. Generate Play Store high-res icon (512x512 downscaled from the corrected opaque app icon)
    print(f"Generating Play Store icon to {PLAY_ICON}...")
    play_icon_img = opaque_icon.resize((512, 512), Image.Resampling.LANCZOS)
    play_icon_img.convert("RGB").save(PLAY_ICON, "PNG", optimize=True)

    # 9. Generate Feature Graphic
    generate_feature_graphic(SCREENSHOT_EN, FEATURE_GRAPHIC, f_bold, s_reg, s_semi)

    print("\nAll store and brand assets generated successfully!")

if __name__ == "__main__":
    main()
