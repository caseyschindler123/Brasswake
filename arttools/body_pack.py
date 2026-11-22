# Pass 12: two bodies x five outfits, hair/beards/head gear, weapons, paperdoll figures.
# Reads raw PNGs from argv[1] (read-only). Writes game/art/hb/* and src/artbody.js.
import sys, os, json, math
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, str(Path(__file__).resolve().parent))
from art_paths import ART, directory, javascript, sheet_paths
INPUTS = sheet_paths(sys.argv[1])
OUT = directory('BW_OUT', ART); JS = javascript('BW_BODY_JS', 'artbody.js')
os.makedirs(OUT + 'hb', exist_ok=True); os.makedirs(OUT + 'i', exist_ok=True)
load = lambda n: Image.open(INPUTS[n]).convert('RGBA')
def clean(a, thr=40, keep=.04):
    al = a[:, :, 3] > thr; lab, n = ndimage.label(ndimage.binary_dilation(al, iterations=3))
    if n:
        sz = ndimage.sum(al, lab, range(1, n + 1)); k = np.isin(lab, [i + 1 for i, s in enumerate(sz) if s >= max(sz) * keep]); a[:, :, 3] = np.where(k, a[:, :, 3], 0)
    a[:, :, 3] = np.where(a[:, :, 3] < 18, 0, a[:, :, 3]); return a
def grid(im, rows, cols): w, h = im.width // cols, im.height // rows; return [np.array(im.crop((c * w, r * h, (c + 1) * w, (r + 1) * h))) for r in range(rows) for c in range(cols)]
def measure(a):   # feet, body centre, head top / centre / width, height
    al = a[:, :, 3] > 60; ys, xs = np.nonzero(al); top, foot = ys.min(), ys.max(); H = foot - top
    band = al[int(top + H * .25): int(top + H * .75)]; bx = float(np.average(np.arange(al.shape[1]), weights=band.sum(0) ** 2 + 1e-6))
    x0, x1 = max(0, int(bx - H * .1)), int(bx + H * .1); win = al[:, x0:x1]; wy = np.nonzero(win.any(1))[0]; htop = wy.min() if len(wy) else top
    hb = win[htop: htop + max(2, int(H * .085))]; hw = max(np.ptp(np.nonzero(r)[0]) + 1 if r.any() else 0 for r in hb); hx = x0 + float(np.average(np.arange(win.shape[1]), weights=hb.sum(0) + 1e-6))
    return dict(top=top, htop=htop, foot=foot, H=H, bx=bx, hx=hx, hw=hw)
CW, CH, FH, FOOT = 80, 80, 64, 77
NROW = 22   # 0-4 walk S SE E NE N, 5-9 run, 10-12 swing S E N, 13-15 thrust, 16-18 cast, 19-21 hit and fall
def place(atlas, a, row, col, sc, m, anchors, legs=0):
    im = Image.fromarray(a); s = im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.LANCZOS); b = np.array(s)
    if legs:   # front and back views: push one leg down and the other up, so the stride reads from straight on
        top, foot = m['top'] * sc, m['foot'] * sc; hip = int(top + (foot - top) * .6); cx = int(round(m['bx'] * sc)); L = b[hip:, :cx].copy(); R = b[hip:, cx:].copy(); b[hip:] = 0
        # stretch one leg and squash the other from the hip down, so nothing tears at the hip
        ph = L.shape[0]; pad = abs(legs) + 2; b = np.concatenate([b, np.zeros((pad, b.shape[1], 4), b.dtype)]); b[hip:] = 0
        for part, x0, dy in ((L, 0, round(legs / sc * sc)), (R, cx, -legs)):
            if part.shape[1] == 0: continue
            nh = max(1, ph + dy); q = np.array(Image.fromarray(part).resize((part.shape[1], nh), Image.LANCZOS)); b[hip:hip + nh, x0:x0 + part.shape[1]] = np.maximum(b[hip:hip + nh, x0:x0 + part.shape[1]], q)
        s = Image.fromarray(b)
    x0 = round(col * CW + CW / 2 - m['bx'] * sc); y0 = round(row * CH + FOOT - m['foot'] * sc - (legs if legs > 0 else 0) * 0)
    box = (max(0, col * CW - x0), max(0, row * CH - y0), min(s.width, (col + 1) * CW - x0), min(s.height, (row + 1) * CH - y0)); atlas.alpha_composite(s.crop(box), (x0 + box[0], y0 + box[1]))
    anchors.append([round(m['htop'] * sc + y0 - row * CH, 1), round(m['hx'] * sc + x0 - col * CW, 1), round(m.get('hwm', m['hw']) * sc, 1)])
def hand(a, m, sc, face):   # where the hands are in an attack frame: the body point farthest from the shoulders, between neck and hips
    al = a[:, :, 3] > 60; top, H = m['top'], m['H']; y1, y2 = int(top + H * .14), int(top + H * .5); sy, sx = top + H * .2, m['bx']
    ys, xs = np.nonzero(al[y1:y2]); ys = ys + y1
    if not len(xs): return None
    d = (xs - sx) ** 2 + (ys - sy) ** 2 * .6; i = int(np.argmax(d)); return [float(xs[i]), float(ys[i]), float(sx), float(sy)]
data = {'cw': CW, 'ch': CH, 'combos': {}, 'pd': {}}
for c in range(1, 11):
    atlas = Image.new('RGBA', (8 * CW, NROW * CH), (0, 0, 0, 0)); anch = []; hands = {}
    def sheet(name, rows, cols, row0, per_frame=False, legs=0, attack=False):
        cells = [clean(x) for x in grid(load(name), rows, cols)]; ms = [measure(x) for x in cells]; hwm = float(np.median([m['hw'] for m in ms])); [m.__setitem__('hwm', hwm) for m in ms]
        base = FH / float(np.median([m['H'] for m in ms]))
        for r in range(rows):
            for k in range(cols):
                i = r * cols + k; m = ms[i]; sc = FH / m['H'] if per_frame else base
                lg = round(legs * math.sin(2 * math.pi * k / cols)) if legs else 0
                place(atlas, cells[i], row0 + r, k, sc, m, anch, lg)
                if attack:
                    h = hand(cells[i], m, sc, r)
                    if h: x0 = k * CW + CW / 2 - m['bx'] * sc; y0 = (row0 + r) * CH + FOOT - m['foot'] * sc; hands[f'{row0 + r}.{k}'] = [round(h[0] * sc + x0 - k * CW, 1), round(h[1] * sc + y0 - (row0 + r) * CH, 1), round(h[2] * sc + x0 - k * CW, 1), round(h[3] * sc + y0 - (row0 + r) * CH, 1)]
            for k in range(cols, 8): anch.append([0, 0, 0])
    # walk and run: one sheet per direction, eight frames in two rows -> one atlas row
    for kind, row0 in (('HW', 0), ('HR', 5)):
        for d in range(5):
            n = (c - 1) * 5 + d + 1; cells = [clean(x) for x in grid(load(f'{kind}{n:02d}'), 2, 4)]; ms = [measure(x) for x in cells]; fr = d in (0, 4); hwm = float(np.median([m['hw'] for m in ms])); [m.__setitem__('hwm', hwm) for m in ms]
            base = FH / float(np.median([m['H'] for m in ms]))
            for k in range(8):
                m = ms[k]; sc = (FH / m['H']) if fr and kind == 'HW' else base; sc = min(sc, base * 1.06) if fr else sc
                lg = round((2 if kind == 'HW' else 3) * math.sin(2 * math.pi * k / 8)) if fr else 0
                place(atlas, cells[k], row0 + d, k, sc, m, anch, lg)
    for a in range(3): sheet(f'HA{(c - 1) * 3 + a + 1:02d}', 3, 4, 10 + a * 3, attack=True)
    sheet(f'HK{c:02d}', 3, 4, 19)
    atlas.save(OUT + f'hb/C{c}.webp', 'WEBP', quality=88, method=6)
    data['combos'][c] = {'a': anch, 'h': hands}
    # paperdoll figure: 300 x 450, with head and hands
    p = clean(np.array(load(f'HP{c:02d}'))); im = Image.fromarray(p).crop(Image.fromarray(p).getbbox()); sc = 430 / im.height; im = im.resize((round(im.width * sc), 430), Image.LANCZOS)
    pd = Image.new('RGBA', (300, 450), (0, 0, 0, 0)); x0 = (300 - im.width) // 2; pd.alpha_composite(im, (x0, 12)); pd.save(OUT + f'hb/P{c}.webp', 'WEBP', quality=88, method=6)
    a = np.array(pd); m = measure(a); al = a[:, :, 3] > 60; band = al[int(m['top'] + m['H'] * .44): int(m['top'] + m['H'] * .58)]; cols = np.nonzero(band.any(0))[0]
    yl = int(m['top'] + m['H'] * .44) + int(np.median(np.nonzero(band[:, cols.min()])[0])); yr = int(m['top'] + m['H'] * .44) + int(np.median(np.nonzero(band[:, cols.max()])[0]))
    data['pd'][c] = {'top': int(m['top']), 'hx': round(m['hx'], 1), 'hw': int(m['hw']), 'l': [int(cols.min()), yl], 'r': [int(cols.max()), yr]}
    print('combo', c, 'done')
# ---- hair, beards, head gear: 24 styles x 6 views (S, SE, E, NE, N, big S). Each view trimmed; we keep its crown centre and top.
items = [('HH', i) for i in range(1, 13)] + [('HF', i) for i in range(1, 7)] + [('HM', i) for i in range(1, 7)]
views = []; meta = []
for pre, i in items:
    cells = [clean(x, keep=.02) for x in grid(load(f'{pre}{i:02d}'), 2, 3)]; mv = []
    for v, a in enumerate(cells):
        if pre == 'HM' and i == 4 and v in (0, 1, 5):   # the hood's dark inside would cover the face: open it up
            al0 = a[:, :, 3] > 60; ys, xs = np.nonzero(al0); t, b_, l, r = ys.min(), ys.max(), xs.min(), xs.max(); lum = a[:, :, :3].mean(2) / 255
            yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]; inner = (xx > l + (r - l) * .2) & (xx < r - (r - l) * .2) & (yy > t + (b_ - t) * .12) & (yy < t + (b_ - t) * .82)
            hole = ndimage.binary_opening(inner & (lum < .45) & al0, iterations=2); a[:, :, 3] = np.where(ndimage.binary_dilation(hole, iterations=1), 0, a[:, :, 3])
        al = a[:, :, 3] > 60
        if not al.any(): mv.append(None); continue
        ys, xs = np.nonzero(al); t, b_, l, r = ys.min(), ys.max(), xs.min(), xs.max(); crown = al[t: t + max(2, int((b_ - t) * .22))]; cx = float(np.average(np.arange(al.shape[1]), weights=crown.sum(0) + 1e-6))
        full = al.any(0); fw = int(full.sum())
        sc = .25 if v < 5 else .5; im = Image.fromarray(a).crop((l, t, r + 1, b_ + 1)); im = im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.LANCZOS)
        views.append(im); mv.append([len(views) - 1, round((cx - l) * sc, 1), round((r - l + 1) * sc, 1), sc])
    meta.append(mv)
# shelf-pack all views
x = y = rowh = 0; W = 1800; pos = []
for im in views:
    if x + im.width > W: x = 0; y += rowh + 2; rowh = 0
    pos.append([x, y, im.width, im.height]); x += im.width + 2; rowh = max(rowh, im.height)
at = Image.new('RGBA', (W, y + rowh), (0, 0, 0, 0))
for p, im in zip(pos, views): at.alpha_composite(im, (p[0], p[1]))
at.save(OUT + 'hb/hair.webp', 'WEBP', quality=88, method=6)
# source head width at 1/4 scale: the front views of the hair sheets are about 1.18 head widths across
hw_src = float(np.median([meta[i][0][2] / 1.18 for i in range(12) if meta[i][0]]))
data['hair'] = {'r': pos, 'v': meta, 'hw': round(hw_src, 2)}
# ---- weapons: 32, side view, grip on the left. Keep them at 1/2 scale with the grip point.
wv = []; wpos = []
for s in (1, 2):
    for a in grid(load(f'HX{s:02d}'), 4, 4):
        a = clean(a, keep=.15); al = a[:, :, 3] > 60
        if not al.any(): wv.append(None); continue
        im = Image.fromarray(a); bb = im.getbbox(); im = im.crop(bb); sc = 160 / max(im.width, im.height) if max(im.width, im.height) > 160 else 1; im = im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.LANCZOS)
        g = np.array(im)[:, :, 3] > 60; ys = np.nonzero(g[:, :max(1, im.width // 8)].any(1))[0]; gy = float(ys.mean()) if len(ys) else im.height / 2
        wv.append((im, [0, round(gy, 1)]))
x = y = rowh = 0; W = 1200
for t in wv:
    im = t[0]
    if x + im.width > W: x = 0; y += rowh + 2; rowh = 0
    wpos.append([x, y, im.width, im.height] + t[1]); x += im.width + 2; rowh = max(rowh, im.height)
at = Image.new('RGBA', (W, y + rowh), (0, 0, 0, 0))
for p, t in zip(wpos, wv): at.alpha_composite(t[0], (p[0], p[1]))
at.save(OUT + 'hb/wx.webp', 'WEBP', quality=88, method=6); data['wx'] = wpos
# ---- equipment icons: i/hq1..32
n = 0
for s in (1, 2):
    im = load(f'HI{s:02d}'); c = im.width // 4
    for a in grid(im, 4, 4):
        n += 1; a = clean(a, keep=.15); p = Image.fromarray(a); bb = p.getbbox()
        if not bb: continue
        p = p.crop(bb); sq = max(p.size); b = Image.new('RGBA', (sq, sq)); b.alpha_composite(p, ((sq - p.width) // 2, (sq - p.height) // 2)); b.resize((128, 128), Image.LANCZOS).save(OUT + f'i/hq{n}.webp', 'WEBP', quality=88, method=6)
open(JS, 'w', encoding='utf-8', newline='\n').write('/* generated by body_pack.py */\nif (typeof ArtData !== "undefined") ArtData.body = ' + json.dumps(data, separators=(',', ':')) + ';\n')
print('ok', len(views), 'views; hair hw', hw_src)
