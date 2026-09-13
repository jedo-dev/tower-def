"""Slice the generated Warcraft-style UI kit sheet into individual assets.

Usage: python tools/ui-kit/slice_kit.py src/assets/ui-kit/warcraft-kit-v1.png
Writes PNGs to public/assets/ui/kit/. Buttons get their baked-in label erased by
stretching a text-free column across the middle, so they can be used as 9-slice.
"""
import sys
from pathlib import Path
from PIL import Image, ImageChops

SRC = Path(sys.argv[1])
OUT = Path('public/assets/ui/kit')
OUT.mkdir(parents=True, exist_ok=True)
im = Image.open(SRC).convert('RGB')
BG = im.getpixel((5, 5))

GLOW = 12  # px of glow kept around a button body on the common canvas

def with_alpha(rgb, core_rect=None, k=3):
    global BG
    """Turn the flat sheet background into transparency. Pixels inside core_rect
    stay opaque; outside, alpha grows with the distance from the background color."""
    px = rgb.load()
    out = Image.new('RGBA', rgb.size)
    op = out.load()
    w, h = rgb.size
    for y in range(h):
        for x in range(w):
            r, g, b_ = px[x, y]
            d = max(abs(r - BG[0]), abs(g - BG[1]), abs(b_ - BG[2]))
            inside = core_rect and core_rect[0] <= x < core_rect[2] and core_rect[1] <= y < core_rect[3]
            a = 255 if inside else min(255, d * k)
            op[x, y] = (r, g, b_, a)
    return out

def bbox(region, thr=14, pad=3):
    x0, y0, x1, y1 = region
    crop = im.crop(region)
    diff = ImageChops.difference(crop, Image.new('RGB', crop.size, BG)).convert('L')
    diff = diff.point(lambda v: 255 if v > thr else 0)
    b = diff.getbbox()
    if not b:
        raise SystemExit(f'empty region {region}')
    return (x0 + b[0] - pad, y0 + b[1] - pad, x0 + b[2] + pad, y0 + b[3] + pad)

def save(name, region, alpha=False, **kw):
    b = bbox(region, **kw)
    crop = im.crop(b)
    (with_alpha(crop) if alpha else crop).save(OUT / f'{name}.png')
    print(f'{name:24} {b}  {b[2]-b[0]}x{b[3]-b[1]}')
    return b

GLYPH_SPAN = {}

def save_button_clean(name, region, tone, glow_pad=3, frame=14, margin=4):
    """Crop a button and erase the label. The glyph span is detected on the
    normal state (relative to the button body) and reused for hover/pressed."""
    b = bbox(region, thr=14, pad=glow_pad)          # with glow
    core = bbox(region, thr=70, pad=0)              # button body only
    btn = im.crop(b)
    w, h = btn.size
    cx0 = core[0] - b[0]
    if tone not in GLYPH_SPAN:
        lum = btn.convert('L')
        y_a, y_b = int(h * 0.25), int(h * 0.75)
        x_a, x_b = cx0 + frame, w - (b[2] - core[2]) - frame
        def peak(x):
            return max(lum.getpixel((x, y)) for y in range(y_a, y_b))
        thr_glyph = min(peak(x_a), peak(x_a + 1), peak(x_a + 2)) + 30
        cols = [x for x in range(x_a, x_b) if peak(x) > thr_glyph]
        span = (cols[0] - cx0 - margin, cols[-1] - cx0 + margin + 1) if cols else None
        if span:
            GLYPH_SPAN[tone] = span   # a textless state (confirm-normal) must not poison the cache
    else:
        span = GLYPH_SPAN[tone]
    if span:
        gl, gr = cx0 + span[0], cx0 + span[1]
        strip = btn.crop((gl - 3, 0, gl, h)).resize((gr - gl, h), Image.LANCZOS)
        btn.paste(strip, (gl, 0))
    # Common canvas: body centered with GLOW px around, so every state slices the same.
    cw, ch = core[2] - core[0], core[3] - core[1]
    canvas = Image.new('RGB', (cw + 2 * GLOW, ch + 2 * GLOW), BG)
    ox, oy = GLOW - cx0, GLOW - (core[1] - b[1])
    canvas.paste(btn, (ox, oy))
    with_alpha(canvas, core_rect=(GLOW + 2, GLOW + 2, GLOW + cw - 2, GLOW + ch - 2)).save(OUT / f'{name}.png')
    print(f'{name:24} body {cw}x{ch} canvas {canvas.size}  span={span}')

save('gem', (115, 65, 160, 100), pad=1, alpha=True)

# --- panels ---
# The tall and wide frames carry the gem on their top edge; patch it with a clean
# stretch of the same edge so the top slice can be repeated horizontally.
def patch_gem(x0, x1, y0, y1, src_x0, src_x1):
    patch = im.crop((src_x0, y0, src_x1, y1)).resize((x1 - x0, y1 - y0), Image.LANCZOS)
    im.paste(patch, (x0, y0))
patch_gem(108, 168, 65, 110, 170, 230)
patch_gem(440, 500, 65, 110, 502, 562)
save('panel-tall', (25, 65, 255, 450))
save('panel-wide', (262, 65, 675, 228))
save('panel-square', (262, 236, 480, 450))

# --- buttons (normal / hover / pressed) ---
rows = {'primary': (562, 652), 'confirm': (678, 766), 'secondary': (793, 882), 'danger': (908, 996)}
cols = {'normal': (22, 165), 'hover': (160, 305), 'pressed': (298, 440)}
for tone, (y0, y1) in rows.items():
    for state, (x0, x1) in cols.items():
        save_button_clean(f'btn-{tone}-{state}', (x0, y0, x1, y1), tone)

# --- small square buttons ---
small = ['prev', 'next', 'gear', 'close', 'check']
xs = [(448, 503), (503, 558), (558, 610), (610, 660), (660, 715)]
for (name, (x0, x1)) in zip(small, xs):
    save(f'small-{name}', (x0, 518, x1, 578))
    save(f'small-{name}-pressed', (x0, 580, x1, 640))

# --- tabs ---
save('tabs', (448, 725, 720, 780))

# --- chips & badges ---
save('chip-gold', (750, 72, 875, 150))
save('badge-level', (895, 72, 980, 150))
save('badge-cost', (750, 155, 875, 212))
save('slot-skull', (890, 160, 990, 260))
save('slot-empty', (755, 215, 870, 330))
save('dot-on', (900, 280, 937, 318))
save('dot-off', (938, 280, 975, 318))

# --- slider & toggle ---
save('slider', (745, 385, 995, 425))
save('toggle-off', (750, 435, 860, 495))
save('toggle-on', (880, 435, 995, 495))

# --- icons 3x4 ---
icons = [['coin', 'heart', 'hourglass'], ['trophy', 'star', 'gear'], ['gear2', 'skull', 'sword'], ['shield', 'chevron-up', 'chevron-down']]
ix = [(755, 825), (830, 905), (908, 985)]
iy = [(555, 625), (625, 690), (690, 755), (755, 815)]
for r, names in enumerate(icons):
    for c, n in enumerate(names):
        save(f'icon-{n}', (ix[c][0], iy[r][0], ix[c][1], iy[r][1]))

# --- bars ---
save('bar-green', (745, 868, 995, 905))
save('bar-amber', (745, 908, 995, 945))
save('bar-red', (745, 948, 995, 990))

# --- bare icons (coin / heart without the square frame) for the HUD resource row ---
for n in ('coin', 'heart'):
    ic = Image.open(OUT / f'icon-{n}.png').convert('RGB')
    w, h = ic.size
    inner = ic.crop((int(w * 0.24), int(h * 0.24), int(w * 0.76), int(h * 0.76)))
    # inside the frame the fill is the dark plate, not the sheet background
    saved = BG
    BG = inner.getpixel((2, 2))
    with_alpha(inner, k=4).save(OUT / f'icon-{n}-bare.png')
    BG = saved
    print(f'icon-{n}-bare'.ljust(24), inner.size)
