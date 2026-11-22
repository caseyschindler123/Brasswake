# contact sheet of sliced 4x4 sheets: each shown as its 16 cut pieces laid out by cell, to check the cuts and the row order by eye
import sys, json
from PIL import Image, ImageDraw
S = sys.argv[1]; out = sys.argv[2]; per = int(sys.argv[3]); cell = int(sys.argv[4]); names = sys.argv[5:]; man = json.load(open(S + 'manifest.json')); n = 4
rows = (len(names) + per - 1) // per; W = cell * n + 10; H = cell * n + 22; im = Image.new('RGB', (per * W, rows * H), (70, 74, 70)); d = ImageDraw.Draw(im)
for k, nm in enumerate(names):
    ox, oy = (k % per) * W, (k // per) * H; d.text((ox + 3, oy + 2), nm, fill=(255, 255, 120)); ps = man[nm]['pieces']
    for i, p in enumerate(ps):
        c = p.get('cell'); c = i if c is None else c; pc = Image.open(f'{S}{nm[0]}/{nm}_{i + 1:02d}.png').convert('RGBA'); pc.thumbnail((cell - 4, cell - 4), Image.LANCZOS)
        im.paste(pc, (ox + (c % n) * cell + (cell - pc.width) // 2, oy + 18 + (c // n) * cell + (cell - pc.height) // 2), pc)
    d.rectangle([ox, oy, ox + W - 2, oy + H - 2], outline=(30, 30, 30))
im.save(out, quality=88); print(im.size)
