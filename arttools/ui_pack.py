# pass 10 menu art -> art/ui/*.webp.  usage: python3 -I ui_pack.py <folder with UI01..UK02 png> <art out folder>
import sys, os
from pathlib import Path
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parent))
from art_paths import ART, directory, sheet_paths
INPUTS = sheet_paths(sys.argv[1])
out = os.path.join(sys.argv[2] if len(sys.argv) > 2 else directory('BW_OUT', ART), 'ui'); os.makedirs(out, exist_ok=True)
def load(n):
    p = INPUTS.get(n); return Image.open(p).convert('RGBA') if p else None
def tight(im, pad=2):
    b = im.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox(); return im.crop(b) if b else im
def cells(im, rows, cols):
    w, h = im.size; return [tight(im.crop((c * w // cols, r * h // rows, (c + 1) * w // cols, (r + 1) * h // rows))) for r in range(rows) for c in range(cols)]
def save(im, name, size=None, h=None):
    if size: im = im.resize((size, size), Image.LANCZOS)
    if h: im = im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)
    im.save(os.path.join(out, name), 'WEBP', quality=88); print(name, im.size)
made = 0
for n, nm in (('UI01', 'frame1.webp'), ('UI02', 'frame2.webp')):
    im = load(n)
    if im: save(tight(im), nm, 400); made += 1
im = load('UI03')
if im:
    for i, c in enumerate(cells(im, 4, 4), 1): c.thumbnail((96, 96), Image.LANCZOS); save(c, f'o{i}.webp')
im = load('UI04')
if im:
    for i, c in enumerate(cells(im, 4, 4), 1): c.thumbnail((96, 96), Image.LANCZOS); save(c, f'n{i}.webp')
im = load('UJ01')
if im:
    for c, nm in zip(cells(im, 3, 2), ['b_leather', 'b_oak', 'b_leather1', 'b_oak1', 'b_leather2', 'b_oak2']): save(c, nm + '.webp', h=96)
    made += 1
im = load('UJ02')
if im:
    w, h = im.size; save(tight(im.crop((0, 0, w, h // 2))), 'scroll.webp', h=160)
    for k, nm in enumerate(['medallion', 'slot', 'slot_on', 'seal']): c = tight(im.crop((k * w // 4, h // 2, (k + 1) * w // 4, h))); c.thumbnail((160, 160), Image.LANCZOS); save(c, nm + '.webp')
for n, nm in (('UK01', 'parch.webp'), ('UK02', 'oak.webp')):
    im = load(n)
    if im: save(im.convert('RGB'), nm, 512)
print('ui pieces in', out)
