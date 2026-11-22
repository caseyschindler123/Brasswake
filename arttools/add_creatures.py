# Appends new creature cells to the published mobs.webp / dead.webp and emits a JSON patch for ArtData.
# usage: python3 -I add_creatures.py MANIFEST OUTDIR FIXEDDIR MOBS_IN DEAD_IN RESULT_DIR
import sys, json, os
from pathlib import Path
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parent))
from art_paths import sheet_paths
MW, MH = 100, 88
CELL = {'Top left': (0, 0), 'Top right': (1, 0), 'Bottom left': (0, 1), 'Bottom right': (1, 1)}
def crop(name, cell, inputs):
    im = Image.open(inputs[name]).convert('RGBA'); w, h = im.size
    cx, cy = CELL[cell]; q = im.crop((cx * w // 2, cy * h // 2, (cx + 1) * w // 2, (cy + 1) * h // 2))
    import numpy as np
    from scipy import ndimage as ndi
    al = np.array(q.getchannel('A')) > 40
    lab, nl = ndi.label(al)
    if nl == 0: return None
    sizes = ndi.sum(al, lab, range(1, nl + 1)); big = sizes.max()
    keep = np.zeros_like(al)
    for i in range(1, nl + 1):
        ys, xs = np.where(lab == i)
        edge = ys.min() == 0 or xs.min() == 0 or ys.max() == al.shape[0] - 1 or xs.max() == al.shape[1] - 1
        if sizes[i - 1] >= big * (0.15 if edge else 0.002): keep |= lab == i
    arr = np.array(q); arr[~keep] = 0   # drop slivers bleeding in from a neighbouring cell
    q = Image.fromarray(arr, 'RGBA')
    bb = q.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
    return q.crop(bb) if bb else None
def fall(s): return s[:2] + 'D' + s[2:]
def extend(path, start, items, box):
    base = Image.open(path).convert('RGBA'); cols = 8
    rows = (start + len(items) + cols - 1) // cols
    W, H = base.width, max(base.height, rows * MH)
    at = Image.new('RGBA', (W, H), (0, 0, 0, 0)); at.paste(base, (0, 0))
    m = {}; n = start
    for k, im in items:
        sm = im.copy(); sm.thumbnail(box, Image.LANCZOS)
        at.alpha_composite(sm, ((n % cols) * MW + (MW - sm.width) // 2, (n // cols) * MH + MH - 2 - sm.height))
        m[k] = [n % cols, n // cols]; n += 1
    return at, m
def append_creatures(manifest, raw, mobs_in, dead_in, result_dir, fixed=None):
    """Replay the published 64-creature extension and return its coordinates.

    fall() maps MW01 to actual filename MWD01. The manifest's fallen_sheet
    field uses the older MW01D convention, which is not the raw filename.
    """
    man = json.loads(Path(manifest).read_text(encoding='utf-8'))
    inputs = sheet_paths(raw)
    if fixed and Path(fixed).is_dir():
        inputs.update({p.stem: p for p in Path(fixed).glob('*.png')})
    live, dead = [], []
    for c in man:
        a = crop(c['sheet'], c['cell'], inputs); b = crop(fall(c['sheet']), c['cell'], inputs)
        assert a is not None and b is not None, c['key']
        live.append((c['key'], a)); dead.append((c['key'], b))
    with Image.open(mobs_in) as bm, Image.open(dead_in) as bd:
        mstart = (bm.height // MH - 1) * 8 + 1   # the last row holds s8 alone in column 0
        dstart = (bd.height // MH - 1) * 8 + 1
    mimg, mmap = extend(mobs_in, mstart, live, (MW - 10, MH - 10))
    dimg, dmap = extend(dead_in, dstart, dead, (MW - 6, MH - 24))
    Path(result_dir).mkdir(parents=True, exist_ok=True)
    mimg.save(os.path.join(result_dir, 'mobs.webp'), 'WEBP', quality=88, method=6)
    dimg.save(os.path.join(result_dir, 'dead.webp'), 'WEBP', quality=88, method=6)
    print('creature extension', mstart, dstart, mimg.size, dimg.size, len(mmap))
    return {'at': mmap, 'dead': dmap}


if __name__ == '__main__':
    man, outd, fixd, mobs_in, dead_in, res = sys.argv[1:7]
    patch = append_creatures(man, outd, mobs_in, dead_in, res, fixed=fixd)
    Path(res, 'patch.json').write_text(json.dumps(patch), encoding='utf-8')
