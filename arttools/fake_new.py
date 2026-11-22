# stand-in pictures in the layouts the new art sheets should have, to test slicing and packing before the real ones arrive
import sys, os, random
from PIL import Image, ImageDraw
out = sys.argv[1]; os.makedirs(out, exist_ok=True); random.seed(7)
def col(): return tuple(random.randint(60, 230) for _ in range(3)) + (255,)
def grid(name, n, shape, rows=None):
    im = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0)); d = ImageDraw.Draw(im); c = 1024 // n; rc = 1024 // (rows or n); base = col()
    for r in range(rows or n):
        for k in range(n): shape(d, k * c, r * rc, c, rc, r, k, base if shape in (walker,) else col())
    im.save(os.path.join(out, name + '.png'))
def walker(d, x, y, w, h, r, k, c):   # a body, a head, and a nose showing which way the row faces
    cx, cy = x + w // 2 + (k - 1.5) * 4, y + h // 2; d.ellipse([cx - 40, cy - 20, cx + 40, cy + 90], fill=c); d.ellipse([cx - 28, cy - 80, cx + 28, cy - 24], fill=(240, 210, 180, 255))
    dx, dy = [(0, 14), (-30, 0), (30, 0), (0, -14)][r]; d.ellipse([cx + dx - 8, cy - 52 + dy - 8, cx + dx + 8, cy - 52 + dy + 8], fill=(200, 40, 40, 255) if r < 3 else c)
def blob(d, x, y, w, h, r, k, c): d.ellipse([x + w * .2, y + h * .25, x + w * .8, y + h * .8], fill=c); d.ellipse([x + w * .12, y + h * .35, x + w * .34, y + h * .6], fill=c)
def flat(d, x, y, w, h, r, k, c): d.ellipse([x + w * .15, y + h * .5, x + w * .85, y + h * .78], fill=c)
def house(d, x, y, w, h, r, k, c): d.rectangle([x + w * .15, y + h * .4, x + w * .85, y + h * .9], fill=c); d.polygon([(x + w * .1, y + h * .4), (x + w * .5, y + h * .1), (x + w * .9, y + h * .4)], fill=(150, 60, 50, 255)); d.rectangle([x + w * .44, y + h * .65, x + w * .56, y + h * .9], fill=(60, 40, 30, 255))
def tall(d, x, y, w, h, r, k, c): d.polygon([(x + w * .2, y + h * .9), (x + w * .5, y + h * (.1 + .2 * (k % 3) / 2)), (x + w * .8, y + h * .9)], fill=c)
def icon(d, x, y, w, h, r, k, c): d.rounded_rectangle([x + w * .25, y + h * .25, x + w * .75, y + h * .75], 18, fill=c)
for i in range(1, 13): grid(f'K{i:02d}', 4, walker)
for i in range(1, 9): grid(f'R{i:02d}', 4, walker); grid(f'L{i:02d}', 4, walker)
for i in range(1, 42): grid(f'Q{i:02d}', 4, walker)
for i in range(1, 12): grid(f'N{i:02d}', 2, flat)
for i in (11, 12, 13): grid(f'F{i}', 2, blob)
for i in (16, 17, 18): grid(f'C{i}', 2, house)
grid('D11', 4, tall, 3); grid('D12', 4, tall, 3); grid('B06', 4, walker); grid('H08', 4, icon); grid('H09', 4, icon); grid('M01', 4, icon)
for nm in ['G12', 'G13'] + [f'P{i:02d}' for i in range(1, 11)]:
    im = Image.new('RGB', (1024, 1024)); d = ImageDraw.Draw(im)
    for q, (x, y) in enumerate([(0, 0), (512, 0), (0, 512), (512, 512)]): d.rectangle([x, y, x + 512, y + 512], fill=col()[:3]); d.ellipse([x + 150, y + 110, x + 362, y + 360], fill=(235, 205, 175))
    im.save(os.path.join(out, nm + '.png'))
for i, c in enumerate([(30, 110, 70), (120, 30, 40), (30, 100, 110)], 1): Image.new('RGB', (1024, 1536), c).save(os.path.join(out, f'S{i:02d}.png'))
print(len(os.listdir(out)), 'stand-in sheets')
