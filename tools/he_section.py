"""Procedural H&E-stained skin section for the microscope slide opening.
Output: site/assets/he-section.webp (transparent background, 2400x900)."""
import numpy as np, math, random
from PIL import Image, ImageDraw, ImageFilter

random.seed(7); np.random.seed(7)
S = 2                      # supersample
W, H = 2400 * S, 900 * S
img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

def smooth_noise(n, scale, amp):
    pts = np.random.randn(n // scale + 3)
    xs = np.arange(n) / scale
    i = xs.astype(int); f = xs - i
    f = f * f * (3 - 2 * f)
    return (pts[i] * (1 - f) + pts[i + 1] * f) * amp

X = np.arange(W)
surf = 150 * S + smooth_noise(W, 260 * S, 16 * S) + smooth_noise(W, 60 * S, 4 * S)
bottom = 830 * S + smooth_noise(W, 200 * S, 22 * S)
left = 70 * S; right = W - 70 * S
# rete ridges hang down from the epidermis
phase = smooth_noise(W, 300 * S, 1.5)
rete = np.maximum(0, np.sin(X * 2 * math.pi / (95 * S) + phase)) ** 2.2
dej = surf + 62 * S + rete * 46 * S + smooth_noise(W, 40 * S, 4 * S)
corneum = surf + 16 * S
subcut = bottom - 190 * S + smooth_noise(W, 180 * S, 20 * S)

def ragged(xs):  # fade ragged left/right ends
    return (xs > left + smooth_noise(1, 1, 0)[0]) & (xs < right)

# --- dermis base
for x in range(left, right, 2):
    d.line([(x, dej[x]), (x, subcut[x])], fill=(239, 160, 190, 255), width=2)
# --- subcutis base (pale, fat walls drawn later)
for x in range(left, right, 2):
    d.line([(x, subcut[x]), (x, bottom[x])], fill=(250, 220, 232, 235), width=2)
# --- epidermis base
for x in range(left, right, 2):
    d.line([(x, corneum[x]), (x, dej[x])], fill=(196, 132, 190, 255), width=2)
# --- stratum corneum, basket weave
for x in range(left, right, 2):
    d.line([(x, surf[x]), (x, corneum[x])], fill=(232, 182, 214, 255), width=2)
for k in range(220):
    x0 = random.randint(left, right - 80 * S); L = random.randint(30, 120) * S
    yy = surf[x0] + random.uniform(2, 14) * S
    d.line([(x0, yy), (x0 + L, yy + random.uniform(-3, 3) * S)], fill=(205, 140, 190, 200), width=S)

# --- collagen fibres: wavy eosin strokes
for k in range(2600):
    x0 = random.uniform(left, right); y0 = random.uniform(0, 1)
    top = dej[int(x0)] + 10 * S; bot = subcut[int(x0)] - 6 * S
    if bot <= top: continue
    y0 = top + (bot - top) * y0
    L = random.uniform(40, 140) * S; ang = random.gauss(0, 0.35)
    pts = []
    for t in np.linspace(0, 1, 9):
        px = x0 + math.cos(ang) * L * t; py = y0 + math.sin(ang) * L * t + math.sin(t * 9 + k) * 3 * S
        if px >= right or px < left: break
        if py < dej[int(px)] + 4 * S or py > subcut[int(px)]: break
        pts.append((px, py))
    if len(pts) > 2:
        c = random.choice([(226, 120, 160, 150), (248, 186, 208, 170), (214, 104, 146, 120)])
        d.line(pts, fill=c, width=random.choice([S, 2 * S, 3 * S]))

def ell(cx, cy, rx, ry, col, ang=0):
    pts = [(cx + rx * math.cos(t) * math.cos(ang) - ry * math.sin(t) * math.sin(ang),
            cy + rx * math.cos(t) * math.sin(ang) + ry * math.sin(t) * math.cos(ang)) for t in np.linspace(0, 2 * math.pi, 14)]
    d.polygon(pts, fill=col)

# --- epidermal nuclei, dense, basal row darker
for k in range(9000):
    x = random.randint(left, right - 1)
    top = corneum[x] + 6 * S; bot = dej[x] - 2 * S
    if bot <= top: continue
    y = random.uniform(top, bot)
    depth = (y - top) / max(1, bot - top)
    col = (70, 34, 120, int(170 + 70 * depth))
    ell(x, y, random.uniform(2.4, 3.6) * S * (1.2 - 0.4 * depth), random.uniform(2.0, 3.0) * S, col, random.uniform(0, 3))
for x in range(left, right, int(5 * S)):
    y = dej[x] - 3 * S
    ell(x + random.uniform(-1, 1) * S, y, 2.6 * S, 3.4 * S, (58, 26, 104, 240), random.uniform(-0.3, 0.3))

# --- dermal fibroblast nuclei and inflammatory cells
for k in range(900):
    x = random.randint(left, right - 1); top = dej[x] + 8 * S; bot = subcut[x] - 8 * S
    if bot <= top: continue
    y = random.uniform(top, bot)
    ell(x, y, random.uniform(3, 6) * S, 1.6 * S, (80, 40, 130, 210), random.uniform(-0.5, 0.5))

# --- blood vessels: rings with red cells
for k in range(46):
    x = random.randint(left + 40 * S, right - 40 * S); top = dej[x] + 30 * S; bot = subcut[x] - 30 * S
    if bot <= top: continue
    y = random.uniform(top, bot); r = random.uniform(7, 18) * S
    d.ellipse([x - r, y - r * 0.7, x + r, y + r * 0.7], fill=(252, 230, 236, 255), outline=(190, 90, 140, 255), width=2 * S)
    for j in range(int(r / S / 3)):
        ell(x + random.uniform(-r, r) * 0.5, y + random.uniform(-r, r) * 0.3, 2.4 * S, 2.4 * S, (214, 60, 86, 255))
    for j in range(4):
        a = random.uniform(0, 6.28)
        ell(x + math.cos(a) * r, y + math.sin(a) * r * 0.7, 2.6 * S, 1.4 * S, (70, 34, 120, 230), a)

# --- hair follicle with sebaceous gland
def follicle(x_top, length, ang):
    xs, ys = [], []
    for t in np.linspace(0, 1, 60):
        xs.append(x_top + math.sin(ang) * length * t); ys.append(surf[int(x_top)] + math.cos(ang) * length * t)
    for i in range(len(xs)):
        r = 26 * S if i < 54 else 26 * S + (i - 54) * 5 * S
        d.ellipse([xs[i] - r, ys[i] - r * 0.5, xs[i] + r, ys[i] + r * 0.5], fill=(150, 90, 170, 255))
    for i in range(len(xs)):
        r = 15 * S
        d.ellipse([xs[i] - r, ys[i] - r * 0.4, xs[i] + r, ys[i] + r * 0.4], fill=(222, 170, 205, 255))
    for i in range(0, len(xs) - 4):
        d.line([(xs[i], ys[i]), (xs[i + 1], ys[i + 1])], fill=(150, 98, 60, 255), width=8 * S)
    for k in range(500):
        i = random.randint(0, len(xs) - 1); a = random.uniform(0, 6.28); rr = random.uniform(16, 24) * S
        ell(xs[i] + math.cos(a) * rr, ys[i] + math.sin(a) * rr * 0.5, 2.6 * S, 2.2 * S, (60, 28, 108, 220))
    # sebaceous lobules
    gx, gy = xs[22] + 48 * S, ys[22]
    for k in range(5):
        cx = gx + random.uniform(-14, 26) * S; cy = gy + random.uniform(-26, 30) * S; R = random.uniform(20, 30) * S
        d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=(246, 214, 230, 255), outline=(170, 100, 160, 255), width=2 * S)
        for j in range(16):
            a = random.uniform(0, 6.28); rr = random.uniform(0, R * 0.8)
            ell(cx + math.cos(a) * rr, cy + math.sin(a) * rr, 1.8 * S, 1.8 * S, (90, 46, 140, 200))
            d.ellipse([cx + math.cos(a) * rr - 5 * S, cy + math.sin(a) * rr - 5 * S, cx + math.cos(a) * rr + 5 * S, cy + math.sin(a) * rr + 5 * S], outline=(214, 160, 200, 160), width=S)
follicle(1520 * S, 520 * S, 0.32)
follicle(640 * S, 470 * S, 0.22)

# --- subcutaneous fat: voronoi-ish walls
pts = [(random.uniform(left, right), random.uniform(0, 1)) for _ in range(380)]
for (px, t) in pts:
    x = int(px); top = subcut[x]; bot = bottom[x]
    if bot <= top + 10 * S: continue
    y = top + (bot - top) * t; R = random.uniform(16, 30) * S
    poly = [(x + R * math.cos(a) * random.uniform(0.85, 1.1), y + R * math.sin(a) * random.uniform(0.85, 1.1)) for a in np.linspace(0, 6.28, 9)[:-1]]
    d.polygon(poly, fill=(255, 246, 250, 210), outline=(226, 140, 176, 255))
    if random.random() < 0.25: ell(poly[0][0], poly[0][1], 2.5 * S, 1.6 * S, (80, 40, 130, 220))

# mask everything outside the section outline
mask = Image.new("L", (W, H), 0); md = ImageDraw.Draw(mask)
outline = [(x, surf[x]) for x in range(left, right, 6)] + [(x, bottom[x]) for x in range(right - 1, left, -6)]
md.polygon(outline, fill=255)
# ragged ends
for side in (left, right):
    for k in range(30):
        y = random.uniform(150, 840) * S; r = random.uniform(10, 34) * S
        md.ellipse([side - r, y - r, side + r, y + r], fill=0)
mask = mask.filter(ImageFilter.GaussianBlur(1.5 * S))
a = np.array(img.split()[3]).astype(np.float32) * (np.array(mask).astype(np.float32) / 255)
img.putalpha(Image.fromarray(a.astype(np.uint8)))
img = img.filter(ImageFilter.GaussianBlur(0.6 * S))
img = img.resize((W // S, H // S), Image.LANCZOS)
img.save("/home/claude/cicm/site/assets/he-section.webp", quality=88, method=6)
img.convert("RGBA").save("/home/claude/cicm/trace/he.png")
print("ok")
