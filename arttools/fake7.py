# stand-ins for kit pass 7, in the layouts the real sheets should have: used to test slicing, packing and the game hooks before the art arrives
import sys, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
out = sys.argv[1]; os.makedirs(out, exist_ok=True); random.seed(11); rs = np.random.RandomState(5)
def col(): return tuple(random.randint(60, 230) for _ in range(3)) + (255,)
def grid(name, n, shape, rows=None, same=False):
    im = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0)); d = ImageDraw.Draw(im); c = 1024 // n; rc = 1024 // (rows or n); base = col()
    for r in range(rows or n):
        for k in range(n): shape(d, k * c, r * rc, c, rc, r, k, base if same else col())
    im.save(os.path.join(out, name + '.png'))
def walker(d, x, y, w, h, r, k, c):
    cx, cy = x + w // 2 + (k - 1.5) * 4, y + h // 2; d.ellipse([cx - 40, cy - 20, cx + 40, cy + 90], fill=c); d.ellipse([cx - 28, cy - 80, cx + 28, cy - 24], fill=(240, 210, 180, 255))
    dx, dy = [(-22, 12), (22, 12), (-22, -12), (22, -12)][r]; d.ellipse([cx + dx - 8, cy - 52 + dy - 8, cx + dx + 8, cy - 52 + dy + 8], fill=(200, 40, 40, 255))
def person(d, x, y, w, h, r, k, c): cx, cy = x + w // 2, y + h // 2; d.ellipse([cx - 40, cy - 20, cx + 40, cy + 90], fill=c); d.ellipse([cx - 28, cy - 80, cx + 28, cy - 24], fill=(240, 210, 180, 255)); d.rectangle([cx - 34, cy - 92, cx + 34, cy - 74], fill=(200, 170, 80, 255))
def blob(d, x, y, w, h, r, k, c): d.ellipse([x + w * .2, y + h * .3, x + w * .8, y + h * .75], fill=c); d.ellipse([x + w * .1, y + h * .3, x + w * .32, y + h * .52], fill=c); d.rectangle([x + w * .3, y + h * .7, x + w * .36, y + h * .88], fill=c); d.rectangle([x + w * .64, y + h * .7, x + w * .7, y + h * .88], fill=c)
def house(d, x, y, w, h, r, k, c): d.rectangle([x + w * .15, y + h * .4, x + w * .85, y + h * .9], fill=c); d.polygon([(x + w * .1, y + h * .4), (x + w * .5, y + h * .1), (x + w * .9, y + h * .4)], fill=(150, 60, 50, 255)); d.rectangle([x + w * .44, y + h * .65, x + w * .56, y + h * .9], fill=(60, 40, 30, 255))
def thing(d, x, y, w, h, r, k, c): t = (r * 4 + k) % 3; (d.rounded_rectangle([x + w * .25, y + h * .35, x + w * .75, y + h * .8], 14, fill=c) if t == 0 else d.polygon([(x + w * .22, y + h * .82), (x + w * .5, y + h * .2), (x + w * .78, y + h * .82)], fill=c) if t == 1 else d.ellipse([x + w * .2, y + h * .45, x + w * .8, y + h * .8], fill=c))
def icon(d, x, y, w, h, r, k, c): d.rounded_rectangle([x + w * .25, y + h * .25, x + w * .75, y + h * .75], 18, fill=c); d.ellipse([x + w * .4, y + h * .4, x + w * .6, y + h * .6], fill=(255, 255, 255, 200))
def frame(d, x, y, w, h, r, k, c):
    cx, cy = x + w / 2, y + h / 2
    if r == 0: rr = 20 + k * 22; d.ellipse([cx - rr, cy - rr * .55, cx + rr, cy + rr * .55], outline=(255, 255, 255, 255 - k * 45), width=5)
    elif r == 1: d.ellipse([cx - 26, cy - 14 - [0, 40, 10, -4][k], cx + 26, cy + 14 - [0, 40, 10, -4][k]], fill=(190, 200, 215, 255))
    elif r == 2: s = [40, 26, 10, 26][k]; d.polygon([(cx, cy), (cx - s, cy - 34), (cx - s, cy + 30)], fill=(250, 250, 240, 255)); d.polygon([(cx, cy), (cx + s, cy - 34), (cx + s, cy + 30)], fill=(250, 250, 240, 255)); d.rectangle([cx - 3, cy - 26, cx + 3, cy + 26], fill=(60, 50, 40, 255))
    else: s = [60, 40, 16, 40][k]; d.polygon([(cx - 8, cy), (cx - s, cy - 22), (cx - s + 14, cy + 12)], fill=(120, 90, 60, 255)); d.polygon([(cx + 8, cy), (cx + s, cy - 22), (cx + s - 14, cy + 12)], fill=(120, 90, 60, 255)); d.ellipse([cx - 12, cy - 28, cx + 12, cy + 30], fill=(100, 72, 48, 255))
for i in range(1, 9): grid(f'T{i:02d}', 4, walker, same=True)
grid('B07', 4, person)
for i in (19, 20, 21, 22): grid(f'C{i}', 2, house)
for i in (13, 14, 15, 16): grid(f'D{i}', 4, thing, 3)
grid('F14', 2, blob); grid('F15', 2, blob); grid('H10', 4, icon); grid('H11', 4, icon); grid('M02', 4, frame)
for nm in ['G14', 'G15']:
    im = Image.new('RGB', (1024, 1024)); d = ImageDraw.Draw(im)
    for q, (x, y) in enumerate([(0, 0), (512, 0), (0, 512), (512, 512)]): d.rectangle([x, y, x + 512, y + 512], fill=(214, 190, 150)); d.ellipse([x + 150, y + 110, x + 362, y + 360], fill=(235, 205, 175)); d.rectangle([x + 140, y + 90, x + 372, y + 150], fill=col()[:3])
    im.save(os.path.join(out, nm + '.png'))
# mountain ranges: a jagged massif with a lit and a shaded side to every summit, thinning to nothing at the foot
RC = [((128, 128, 132), 0), ((120, 122, 128), 0), ((134, 132, 130), 0), ((150, 160, 172), 1), ((156, 166, 178), 1), ((148, 158, 170), 1), ((52, 46, 46), 2), ((186, 120, 80), 3), ((204, 132, 78), 3), ((112, 138, 92), 4)]
for n, (c, kind) in enumerate(RC, 1):
    W, H = 1536, 1024; im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im); R2 = random.Random(n * 7)
    peaks = sorted([(R2.uniform(.12, .88) * W, R2.uniform(.12, .5) * H, R2.uniform(.16, .3) * W) for _ in range(3 if n in (3, 5) else 9)], key=lambda p: p[1])
    if n in (2, 6): peaks = sorted([((i + .5) / 9 * W, R2.uniform(.2, .42) * H, .14 * W) for i in range(9)], key=lambda p: p[1])
    if n in (3, 5): peaks = [(W * .5, H * .08, W * .34), (W * .24, H * .5, W * .2), (W * .78, H * .52, W * .2)]
    sh = lambda c, f: tuple(min(255, int(v * f)) for v in c) + (255,)
    for (px, py, pw) in sorted(peaks, key=lambda p: -p[1])[::-1]:
        base = H * .9; flat = kind == 3
        L = [(px - pw, base), (px - pw * (.35 if flat else .08), py), (px, py if flat else py - 0), (px + R2.uniform(-.1, .1) * pw, base)]; Rr = [(px, py), (px + pw * (.35 if flat else .08), py), (px + pw, base), (px + R2.uniform(-.1, .1) * pw, base)]
        d.polygon(L, fill=sh(c, 1.12)); d.polygon(Rr, fill=sh(c, .66))
        if kind == 1 or (kind == 0 and py < H * .2): d.polygon([(px - pw * .2, py + (base - py) * .22), (px, py), (px + pw * .2, py + (base - py) * .22), (px, py + (base - py) * .3)], fill=(246, 249, 251, 255))
        if kind == 2: d.line([(px, py), (px - pw * .2, base * .8)], fill=(255, 140, 40, 255), width=6)
        if kind == 4: 
            for _ in range(5): tx, ty = px + R2.uniform(-.5, .5) * pw, R2.uniform(py + 80, base - 20); d.polygon([(tx - 14, ty), (tx, ty - 44), (tx + 14, ty)], fill=(40, 84, 50, 255))
    a = np.array(im); fade = np.clip((H * .92 - np.arange(H)) / (H * .1), 0, 1)[:, None]; a[:, :, 3] = (a[:, :, 3] * fade).astype(np.uint8); Image.fromarray(a, 'RGBA').save(os.path.join(out, f'U{n:02d}.png'))
# ground textures: coloured noise, deliberately not seamless, so the packer's own wrap is what gets tested
GC = [(96, 150, 70), (64, 124, 58), (196, 178, 96), (84, 96, 62), (92, 84, 52), (150, 116, 78), (136, 132, 124), (226, 208, 160), (224, 196, 132), (240, 244, 248), (196, 206, 212), (124, 124, 126), (52, 48, 50), (96, 196, 196), (36, 92, 150), (228, 226, 220), (60, 68, 88), (104, 74, 48), (150, 116, 76)]
for n, c in enumerate(GC, 1):
    base = rs.rand(64, 64, 1) * .5 + rs.rand(64, 64, 3) * .12; fine = rs.rand(1024, 1024, 1) * .22
    lo = np.asarray(Image.fromarray((base * 255).astype(np.uint8)).resize((1024, 1024), Image.BICUBIC)).astype(np.float32) / 255
    a = np.clip((0.62 + lo + fine) * np.array(c)[None, None, :], 0, 255).astype(np.uint8); im = Image.fromarray(a, 'RGB')
    d = ImageDraw.Draw(im)
    if n in (7, 16):
        for y in range(0, 1024, 128):
            for x in range(-64, 1024, 128): d.rounded_rectangle([x + (y // 128 % 2) * 64 + 5, y + 5, x + (y // 128 % 2) * 64 + 123, y + 123], 26, outline=(70, 70, 66), width=6)
    if n in (18, 19):
        for y in range(0, 1024, 64): d.line([(0, y), (1024, y)], fill=tuple(int(v * .55) for v in c), width=9)
    if n in (14, 15):
        for _ in range(60): x, y = random.randint(0, 1000), random.randint(0, 1000); d.arc([x, y, x + 90, y + 34], 200, 340, fill=(235, 250, 255), width=4)
    im.save(os.path.join(out, f'V{n:02d}.png'))
print(len(os.listdir(out)), 'stand-in sheets')
