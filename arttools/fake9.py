# stand-ins for kit passes 8 and 9, in the layouts the real sheets should have
import sys, os, random
from PIL import Image, ImageDraw
sys.argv = sys.argv[:2]; out = sys.argv[1]; os.makedirs(out, exist_ok=True)
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fake7.py')).read().split('for i in range(1, 9): grid(')[0].replace("out = sys.argv[1]; os.makedirs(out, exist_ok=True); ", '')
exec(src)
def gridwh(name, W, H, rows, cols, shape, same=False, bg=None):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im); c, rc = W // cols, H // rows; base = col()
    for r in range(rows):
        for k in range(cols): shape(d, k * c, r * rc, c, rc, r, k, base if same else col())
    im.save(os.path.join(out, name + '.png'))
for hro in range(8):
    for dd in range(8):
        def wk(d, x, y, w, h, r, k, c, dd=dd):
            cx, cy = x + w // 2, y + h // 2 + 20; d.ellipse([cx - 40, cy - 20, cx + 40, cy + 120 - r * 10], fill=c); d.ellipse([cx - 28, cy - 80, cx + 28, cy - 24], fill=(240, 210, 180, 255))
            import math; a = [90, 135, 180, 225, 270, 315, 0, 45][dd] * math.pi / 180; d.line([(cx, cy + 40), (cx + 60 * math.cos(a), cy + 40 + 60 * math.sin(a))], fill=(220, 30, 30, 255), width=10)
            d.rectangle([cx - 30 + k * 10, cy + 110 - r * 10, cx - 20 + k * 10, cy + 130 - r * 10], fill=(40, 40, 40, 255))
        gridwh(f'W{hro * 8 + dd + 1:02d}', 1536, 1024, 2, 4, wk, same=True)
for n in (1, 2): grid(f'X{n:02d}', 2, house)
for n in range(1, 9):
    if n < 8: grid(f'Y{n:02d}', 2, house)
    else: gridwh('Y08', 1024, 1024, 1, 2, house)
for n in range(16, 22): grid(f'F{n}', 2, blob)
for n in range(12, 18): grid(f'N{n}', 2, blob)
for n in range(42, 58): grid(f'Q{n}', 4, walker, same=True)
for n in (17, 18, 19): grid(f'D{n}', 4, thing, 3)
for n in (12, 13, 14, 15): grid(f'H{n}', 4, icon)
gridwh('O01', 1024, 1024, 3, 4, icon)
for nm in ['G16', 'G17', 'G18', 'G19']:
    im = Image.new('RGB', (1024, 1024)); d = ImageDraw.Draw(im)
    for q, (x, y) in enumerate([(0, 0), (512, 0), (0, 512), (512, 512)]): d.rectangle([x, y, x + 512, y + 512], fill=(214, 190, 150)); d.ellipse([x + 150, y + 110, x + 362, y + 360], fill=(235 - q * 30, 205, 175))
    im.save(os.path.join(out, nm + '.png'))
for n in range(4, 12): Image.new('RGB', (1536, 1024), (40 + n * 15, 90, 120)).save(os.path.join(out, f'J{n:02d}.png'))
im = Image.new('RGB', (1024, 1536), (226, 206, 160)); d = ImageDraw.Draw(im); d.rectangle([0, 0, 1024, 70], fill=(90, 56, 30)); d.rectangle([0, 1466, 1024, 1536], fill=(90, 56, 30)); im.save(os.path.join(out, 'Z01.png'))
Image.new('RGB', (1024, 1536), (60, 40, 26)).save(os.path.join(out, 'S04.png'))
print(len(os.listdir(out)), 'stand-in sheets')
