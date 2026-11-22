import sys, os, json, argparse, copy, re
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
sys.path.insert(0, str(Path(__file__).resolve().parent))
from art_paths import WORK, sheet_paths
parser = argparse.ArgumentParser(description='Slice raw art, optionally replaying recorded crop boxes.')
parser.add_argument('source', help='Raw art folder (searched recursively, read-only)')
parser.add_argument('output', nargs='?', default=os.environ.get('BW_SLICED', str(WORK / 'sliced')))
parser.add_argument('mode', nargs='?', choices=['new'], help='Legacy outline detection for new sheets')
parser.add_argument('--manifest', type=Path, help='Replay these recorded boxes; detect new sheets normally')
args = parser.parse_args()
src, out, NEW = args.source, args.output, args.mode == 'new'
recorded = json.loads(args.manifest.read_text(encoding='utf-8')) if args.manifest else {}
os.makedirs(out, exist_ok=True)
EXP = {'A': 16, 'B': 16, 'C': 4, 'D': 12, 'E': 12, 'F': 4, 'H': 16, 'K': 16, 'L': 16, 'R': 16, 'Q': 16, 'M': 16, 'N': 4, 'T': 16, 'W': 8, 'X': 4, 'Y': 4, 'O': 12}
man, notes = {}, []
def clean(im, k):
    a = np.array(im).astype(np.float32); al = a[:, :, 3]
    lo, hi = (120, 232) if k == 'H' else (77, 240) if k in 'KLRT' else (28, 240)          # icon sheets carry a soft glow; cut it. Pixel-art sheets can carry a faint haze: drop what is under 30% opacity
    a[:, :, 3] = np.clip((al - lo) / (hi - lo), 0, 1) * 255
    return Image.fromarray(a.astype(np.uint8), 'RGBA')
def boxes(al, dil=3, minfrac=0.0009, thr=50):
    m = al > thr; lab, n = ndi.label(ndi.binary_dilation(m, iterations=dil)); bs = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        mm = m[sl] & (lab[sl] == i); area = int(mm.sum())
        if area < minfrac * al.size: continue
        ys, xs = np.nonzero(mm); bs.append([sl[1].start + xs.min(), sl[0].start + ys.min(), sl[1].start + xs.max() + 1, sl[0].start + ys.max() + 1, area])
    return bs
def gap(a, b): return max(0, max(a[0], b[0]) - min(a[2], b[2])) + max(0, max(a[1], b[1]) - min(a[3], b[3]))
def merge_small(bs, name):
    if len(bs) < 3: return bs
    med = float(np.median([b[4] for b in bs])); big = [b for b in bs if b[4] >= .14 * med]; small = [b for b in bs if b[4] < .14 * med]
    for s in small:
        j = min(range(len(big)), key=lambda i: gap(s, big[i])); g = gap(s, big[j])
        if g <= 46: b = big[j]; big[j] = [min(b[0], s[0]), min(b[1], s[1]), max(b[2], s[2]), max(b[3], s[3]), b[4] + s[4]]
        else: big.append(s); notes.append(f'{name}: small loose piece kept ({s[4]} px, {g} px from nearest)')
    return big
def by_cells(bs, n, size, rows=None):
    c = size / n; rc = size / (rows or n); cells = {}
    for b in bs:
        key = (min((rows or n) - 1, int(((b[1] + b[3]) / 2) // rc)), min(n - 1, int(((b[0] + b[2]) / 2) // c))); o = cells.get(key)
        cells[key] = b if o is None else [min(o[0], b[0]), min(o[1], b[1]), max(o[2], b[2]), max(o[3], b[3]), o[4] + b[4]]
    return [cells[k] for k in sorted(cells)]
def valleys(p, n, size):
    # n-1 cut positions along a projection: near each even split, the middle of the emptiest stretch
    cuts = []
    for k in range(1, n):
        c = size * k // n; lo, hi = max(1, c - size // (n * 2) + 8), min(size - 1, c + size // (n * 2) - 8); seg = p[lo:hi]; mn = seg.min(); idx = np.nonzero(seg <= mn + 1e-6)[0]
        runs = np.split(idx, np.nonzero(np.diff(idx) > 1)[0] + 1); best = max(runs, key=lambda r: (len(r), -abs((r[0] + r[-1]) / 2 + lo - c))); cuts.append(lo + int((best[0] + best[-1]) // 2))
    return [0] + cuts + [size]
def by_outline(al, rows, cols, name):
    # the sheets are not on an even grid: cut rows at the emptiest horizontal lines, then each row at its own emptiest vertical lines, and take each figure's outline inside its cell
    m = al > 50; H, W = m.shape; ys = valleys(m.sum(1).astype(float), rows, H); out = []
    for r in range(rows):
        band = m[ys[r]:ys[r + 1]]; xs = valleys(band.sum(0).astype(float), cols, W)
        for c in range(cols):
            cell = band[:, xs[c]:xs[c + 1]]; yy, xx = np.nonzero(cell)
            if not len(xx): notes.append(f'{name}: nothing in row {r + 1}, column {c + 1}'); continue
            if cell[0].any() and r > 0 or cell[:, 0].any() and c > 0: notes.append(f'{name}: row {r + 1} column {c + 1} touches its cut line')
            out.append([xs[c] + xx.min(), ys[r] + yy.min(), xs[c] + xx.max() + 1, ys[r] + yy.max() + 1, len(xx), r * cols + c])
    return out
def rowmajor(bs):
    bs = sorted(bs, key=lambda b: (b[1] + b[3]) / 2); rows = [[bs[0]]]
    for b in bs[1:]:
        last = rows[-1]; cy = np.mean([(x[1] + x[3]) / 2 for x in last]); h = np.mean([x[3] - x[1] for x in last])
        if (b[1] + b[3]) / 2 - cy > .55 * h: rows.append([b])
        else: last.append(b)
    return [b for r in rows for b in sorted(r, key=lambda b: b[0])]
for name, path in sorted(sheet_paths(src).items()):
    k = name[0]
    # UI/dojo/body/building-kit sheets belong to their raw-sheet packers.
    if not re.fullmatch(r'(?:[A-Z]|WA|RU)\d{2,}', name) or k not in set(EXP) | set('GPIJSUVZ'): continue
    im = Image.open(path); d = os.path.join(out, k); os.makedirs(d, exist_ok=True)
    if k in 'IJSVZ': im.convert('RGB').save(os.path.join(d, name + '.png')); man[name] = {'full': im.size}; continue   # V: seamless ground textures, kept whole
    if k == 'U':                                 # a whole mountain range: keep it in one piece, drop the haze, trim to its outline
        raw = np.array(im.convert('RGBA')); ra = raw[:, :, 3]; edge = np.zeros(ra.shape, bool); edge[0] = edge[-1] = True; edge[:, 0] = edge[:, -1] = True; edge &= ra > 128
        if edge.sum() > 50:                      # a flat coloured glow runs out to the frame: take off whatever is that colour, flat, and joined to the empty part
            hc = np.median(raw[edge][:, :3], axis=0); lum = raw[:, :, :3].astype(np.float32).mean(2); m1 = ndi.uniform_filter(lum, 7); sd = np.sqrt(np.maximum(0, ndi.uniform_filter(lum * lum, 7) - m1 * m1))
            cand = (ra < 250) | ((sd < 6) & (np.abs(raw[:, :, :3].astype(np.float32) - hc).max(2) < 40)); halo = ndi.binary_propagation(ra < 8, mask=cand); halo = ndi.binary_dilation(halo, iterations=2) & cand
            raw[:, :, 3] = np.where(halo, 0, ra); im = Image.fromarray(raw, 'RGBA'); notes.append(f'{name}: a glow reached the frame and was taken off ({int(halo.sum() - (ra < 8).sum())} px)')
        im = clean(im.convert('RGBA'), k); a0 = np.array(im); a0[:, :, 3] = np.where(a0[:, :, 3] < 150, 0, a0[:, :, 3]); im = Image.fromarray(a0, 'RGBA'); al = a0[:, :, 3] > 50; ys, xs = np.nonzero(al)   # ranges are large and soft-edged: anything under about 60% opaque is haze
        if not len(xs): notes.append(f'{name}: empty'); man[name] = {'n': 0}; continue
        lab, n = ndi.label(ndi.binary_dilation(al, iterations=6)); ar = ndi.sum(al, lab, range(1, n + 1)); keep = np.isin(lab, [i + 1 for i in range(n) if ar[i] >= .01 * ar.max()])   # loose specks away from the range go
        a = np.array(im); a[:, :, 3] = np.where(keep, a[:, :, 3], 0); ys, xs = np.nonzero(a[:, :, 3] > 50); box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
        Image.fromarray(a, 'RGBA').crop(box).save(os.path.join(d, name + '.png')); man[name] = {'n': 1, 'full': [box[2] - box[0], box[3] - box[1]]}
        if name in recorded and man[name] != recorded[name]: raise ValueError(f'{name}: cleaned range size differs from recorded manifest')
        if (box[2] - box[0]) < .6 * im.size[0]: notes.append(f'{name}: the range fills only {box[2] - box[0]} of {im.size[0]} px across')
        continue
    if k in 'GP':
        for i, (x, y) in enumerate([(0, 0), (512, 0), (0, 512), (512, 512)]): im.convert('RGB').crop((x, y, x + 512, y + 512)).save(os.path.join(d, f'{name}_{i + 1}.png'))
        man[name] = {'n': 4}; continue
    im = clean(im.convert('RGBA'), 'W' if name[:2] == 'RU' else k); al = np.array(im)[:, :, 3]
    replay = recorded.get(name)
    if replay is not None and 'pieces' in replay:
        bs = [p['box'] + [0, p.get('cell')] for p in replay['pieces']]
        for box in bs:
            x0, y0, x1, y1 = box[:4]
            if not (0 <= x0 < x1 <= im.width and 0 <= y0 < y1 <= im.height):
                raise ValueError(f'{name}: recorded crop outside source image: {box[:4]}')
    elif name == 'H02':                                # helm, chest, gloves, boots, shields: five uneven rows, cut by fixed lines
        m = al > 50; ys = [0, 211, 431, 605, 795, 1024]; bs = []
        for r in range(5):
            for c in range(4):
                yy, xx = np.nonzero(m[ys[r]:ys[r + 1], c * 256:(c + 1) * 256]); bs.append([c * 256 + xx.min(), ys[r] + yy.min(), c * 256 + xx.max() + 1, ys[r] + yy.max() + 1, len(xx)])
    elif k == 'W' or name[:2] == 'RU': bs = by_outline(al, 2, 4, name)                      # a hero walking (top row) and running (bottom row) one way
    elif k == 'O': bs = by_outline(al, 3, 4, name)
    elif name == 'Y08': bs = sorted(sorted(merge_small(boxes(al), name), key=lambda b: -b[4])[:2], key=lambda b: b[0])
    elif NEW and k in 'BHKLRQMT': bs = by_outline(al, 4, 4, name)
    elif NEW and k == 'D':
        bs = boxes(al); bs = by_outline(al, 3, 4, name) if len(bs) != 12 else rowmajor(merge_small(bs, name))
    elif k in 'ABHKLRQM': bs = by_cells(boxes(al), 4, im.size[0])
    elif k in 'CFNXY':
        raw = boxes(al); bs = by_cells(raw, 2, im.size[0])
        if len(bs) != 4 or len(raw) < 4:        # pieces touch (a wisp of smoke reaching the building above): cut each half along its emptiest line near the middle
            m = al > 50; lo, hi = 384, 640
            vt = lo + int(np.argmin(m[:512, lo:hi].sum(0))); vb = lo + int(np.argmin(m[512:, lo:hi].sum(0))); vm = (vt + vb) // 2
            hl = lo + int(np.argmin(m[lo:hi, :vm].sum(1))); hr = lo + int(np.argmin(m[lo:hi, vm:].sum(1))); bs = []
            for (x0, y0, x1, y1) in [(0, 0, vt, hl), (vt, 0, m.shape[1], hr), (0, hl, vb, m.shape[0]), (vb, hr, m.shape[1], m.shape[0])]:
                ys, xs = np.nonzero(m[y0:y1, x0:x1]); bs.append([x0 + xs.min(), y0 + ys.min(), x0 + xs.max() + 1, y0 + ys.max() + 1, len(xs)])
            notes.append(f'{name}: pieces were touching, cut at x={vt}/{vb}, y={hl}/{hr}')
    else: bs = rowmajor(merge_small(boxes(al), name))
    if len(bs) != (20 if name == 'H02' else 2 if name == 'Y08' else 8 if name[:2] == 'RU' else EXP[k]): notes.append(f'{name}: {len(bs)} pieces, expected {EXP[k]}')
    if not bs: man[name] = {'n': 0, 'pieces': []}; continue
    pcs = []
    for i, b in enumerate(bs):
        p = im.crop(b[:4])
        if k == 'C':                              # drop specks that belong to a neighbour
            pa0 = np.array(p); lab, n = ndi.label(ndi.binary_dilation(pa0[:, :, 3] > 50, iterations=4))
            if n > 1:
                ar = ndi.sum(pa0[:, :, 3] > 50, lab, range(1, n + 1)); keep = np.isin(lab, [i + 1 for i in range(n) if ar[i] >= .015 * ar.max()]); pa0[:, :, 3] = np.where(keep, pa0[:, :, 3], 0); p = Image.fromarray(pa0, 'RGBA')
        p.save(os.path.join(d, f'{name}_{i + 1:02d}.png')); pa = np.array(p)[:, :, 3] > 50; xs = np.nonzero(pa.any(0))[0]
        feet = np.nonzero(pa[int(pa.shape[0] * .85):].any(0))[0]
        pcs.append({'box': [int(v) for v in b[:4]], 'w': int(b[2] - b[0]), 'h': int(b[3] - b[1]), 'footx': int(feet.mean()) if len(feet) else int(xs.mean()), 'cell': int(b[5]) if len(b) > 5 and b[5] is not None else None})
    man[name] = copy.deepcopy(replay) if replay is not None and 'pieces' in replay else {'n': len(pcs), 'pieces': pcs}
    if k in 'AB':
        hs = [p['h'] for p in pcs]
        if max(hs) > 1.22 * min(hs): notes.append(f'{name}: figure heights vary {min(hs)} to {max(hs)} px')
missing = sorted(set(recorded) - man.keys())
if missing: raise ValueError('Recorded sheets not sliced: ' + ', '.join(missing))
json.dump(man, open(os.path.join(out, 'manifest.json'), 'w'))
print('pieces:', sum(v.get('n', 1) for v in man.values()))
for k in 'ABCDEFH':
    hs = [p['h'] for n, v in man.items() if n[0] == k for p in v.get('pieces', [])]; ws = [p['w'] for n, v in man.items() if n[0] == k for p in v.get('pieces', [])]
    if not hs: continue
    print(k, 'count', len(hs), 'h', min(hs), int(np.median(hs)), max(hs), 'w', min(ws), int(np.median(ws)), max(ws))
print('\n'.join(notes) if notes else 'no notes')
