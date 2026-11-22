# Pass 11: dojo art. Reads raw PNGs (argv[1], read-only), writes game/art and src/artdojo.js.
import sys, os, json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, str(Path(__file__).resolve().parent))
from art_paths import ART, directory, javascript, sheet_paths
INPUTS = sheet_paths(sys.argv[1])
OUT = directory('BW_OUT', ART); JS = javascript('BW_DOJO_JS', 'artdojo.js')
for d in ['p', 'dj', 'i', 'bg']: os.makedirs(OUT + d, exist_ok=True)
def load(n): return Image.open(INPUTS[n])
def scaled(im, sc): return im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.LANCZOS)
def save(im, name, q=86): im.save(OUT + name, 'WEBP', quality=q, method=6)
def tidy(im, thr=40):   # keep the solid parts of a cut-out: the largest blob and anything sizable near it
    a = np.array(im); al = a[:, :, 3] > thr; lab, n = ndimage.label(ndimage.binary_dilation(al, iterations=3))
    if n == 0: return im
    sizes = ndimage.sum(al, lab, range(1, n + 1)); keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= max(sizes) * .04])
    a[:, :, 3] = np.where(keep, a[:, :, 3], 0); a[:, :, 3] = np.where(a[:, :, 3] < 18, 0, a[:, :, 3]); im = Image.fromarray(a); return im.crop(im.getbbox())
def blobs(im, minfrac=.004, dil=6):   # separate objects on one transparent sheet, row by row
    al = np.array(im)[:, :, 3] > 40; lab, n = ndimage.label(ndimage.binary_dilation(al, iterations=dil)); out = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        if (lab[sl] == i + 1).sum() < al.size * minfrac: continue
        out.append((sl[0].start, sl[0].stop, sl[1].start, sl[1].stop))
    rows = []
    for b in sorted(out, key=lambda b: (b[0] + b[1]) / 2):
        if rows and abs((b[0] + b[1]) / 2 - rows[-1][0]) < im.height * .12: rows[-1][1].append(b)
        else: rows.append([(b[0] + b[1]) / 2, [b]])
    return [tidy(im.crop((b[2], b[0], b[3], b[1]))) for r in rows for b in sorted(r[1], key=lambda b: b[2])]
def shelf(items, width=1400):
    x = y = rowh = 0; pos = {}
    for k, im in items:
        if x + im.width > width: x = 0; y += rowh + 2; rowh = 0
        pos[k] = [x, y, im.width, im.height]; x += im.width + 2; rowh = max(rowh, im.height)
    at = Image.new('RGBA', (width, y + rowh), (0, 0, 0, 0))
    for k, im in items: at.alpha_composite(im, tuple(pos[k][:2]))
    return at, pos
data = {}
# ---- portraits: DG01-DG09, quarters -> p/DGnn_q.webp at 176 px, the same as every other face ----
for n in range(1, 10):
    im = load(f'DG{n:02d}').convert('RGB'); h = im.width // 2
    for q in range(4):
        c = im.crop(((q % 2) * h, (q // 2) * h, (q % 2) * h + h, (q // 2) * h + h)); m = int(h * .04); c = c.crop((m, m, h - m, h - m)).resize((176, 176), Image.LANCZOS)
        c.save(OUT + f'p/DG{n:02d}_{q + 1}.webp', 'WEBP', quality=86, method=6)
# ---- fighters: DS01-DS37, eight frames each (stand, ready, three attack frames, recover, hit, bow), one row each ----
CW, CH, FH = 120, 100, 66
fs = Image.new('RGBA', (8 * CW, 37 * CH), (0, 0, 0, 0)); notes = []
for n in range(1, 38):
    im = load(f'DS{n:02d}').convert('RGBA'); cw, chh = im.width // 4, im.height // 2
    fr = []
    for i in range(8):
        c = im.crop(((i % 4) * cw, (i // 4) * chh, (i % 4 + 1) * cw, (i // 4 + 1) * chh)); a = np.array(c); al = a[:, :, 3] > 40
        lab, k = ndimage.label(ndimage.binary_dilation(al, iterations=3))
        if k: sz = ndimage.sum(al, lab, range(1, k + 1)); keep = np.isin(lab, [j + 1 for j, s in enumerate(sz) if s >= max(sz) * .04]); a[:, :, 3] = np.where(keep, a[:, :, 3], 0)
        a[:, :, 3] = np.where(a[:, :, 3] < 18, 0, a[:, :, 3]); al = a[:, :, 3] > 60; ys, xs = np.nonzero(al); foot = ys.max()
        body = al[int(ys.min() + (foot - ys.min()) * .25): int(ys.min() + (foot - ys.min()) * .85)]; bx = float(np.average(np.arange(al.shape[1]), weights=body.sum(0) ** 2 + 1e-6))
        fr.append((Image.fromarray(a), foot, bx, foot - ys.min()))
    sc = FH / float(np.median([fr[i][3] for i in (0, 1, 5)]))
    for i, (c, foot, bx, h) in enumerate(fr):
        s = scaled(c, sc); x0 = round(i * CW + CW / 2 - bx * sc); y0 = round((n - 1) * CH + CH - 3 - foot * sc)
        box = (max(0, i * CW - x0), max(0, (n - 1) * CH - y0), min(s.width, (i + 1) * CW - x0), min(s.height, n * CH - y0))
        part = s.crop(box); fs.alpha_composite(part, (x0 + box[0], y0 + box[1]))
        lost = np.array(s)[:, :, 3].sum() - np.array(part)[:, :, 3].sum()
        if lost > np.array(s)[:, :, 3].sum() * .03: notes.append(f'DS{n:02d} frame {i + 1}: {lost / np.array(s)[:, :, 3].sum():.0%} cut off')
save(fs, 'dj/fs.webp', 88); data['fs'] = {'cw': CW, 'ch': CH, 'n': 37}
# ---- dojos outside: DX01 towns 1-4, DX02 towns 5-8 ----
dx = []
for s in (1, 2):
    im = load(f'DX{s:02d}').convert('RGBA'); h = im.width // 2; ps = [tidy(im.crop(((q % 2) * h, (q // 2) * h, (q % 2 + 1) * h, (q // 2 + 1) * h))) for q in range(4)]
    for i, p in enumerate(ps[:4]): dx.append((f'd{(s - 1) * 4 + i + 1}', scaled(p, 360 / p.width)))
at, pos = shelf(dx, 1480); save(at, 'dj/dx.webp', 86); data['dx'] = {k[1:]: v for k, v in pos.items()}
# ---- objects, in the order the prompt lists them; height on screen at 3x ----
PN = [('dummy', 84), ('dummy1', 84), ('dummy2', 62), ('rack', 76), ('bench', 34), ('board', 110), ('gong', 86), ('cup', 60), ('brazier', 62), ('barrel', 46), ('mats', 42), ('note', 72)]
ps = blobs(load('DP01').convert('RGBA'), .003, 6)
if len(ps) != 12: notes.append(f'DP01: {len(ps)} pieces')
at, pos = shelf([(nm, scaled(p, h / p.height)) for (nm, h), p in zip(PN, ps)], 900); save(at, 'dj/dp.webp', 86); data['dp'] = pos
# ---- prizes and tokens: 4x4 grid -> i/dz1..16.webp ----
im = load('DH01').convert('RGBA'); c = im.width // 4
for i in range(16):
    p = tidy(im.crop(((i % 4) * c, (i // 4) * c, (i % 4 + 1) * c, (i // 4 + 1) * c))); sq = max(p.size); b = Image.new('RGBA', (sq, sq), (0, 0, 0, 0)); b.alpha_composite(p, ((sq - p.width) // 2, (sq - p.height) // 2))
    save(b.resize((128, 128), Image.LANCZOS), f'i/dz{i + 1}.webp', 88)
data['dz'] = 16
# ---- halls inside: one per town, at the game's 3x ground scale for a 14 x 21 tile room ----
for r in range(1, 9): load(f'DI{r:02d}').convert('RGB').resize((528, 768), Image.LANCZOS).save(OUT + f'dj/I{r}.jpg', quality=86)
data['halls'] = {'w': 11, 'h': 16}
# ---- story art ----
for n in (1, 2, 3): load(f'DJ{n:02d}').convert('RGB').resize((1080, 720), Image.LANCZOS).save(OUT + f'bg/DJ{n:02d}.jpg', quality=84)
data['scenes'] = 3
open(JS, 'w', encoding='utf-8', newline='\n').write('/* generated by dojo_pack.py */\nif (typeof ArtData !== "undefined") ArtData.dojo = ' + json.dumps(data, separators=(',', ':')) + ';\n')
print('\n'.join(notes) or 'no notes')
