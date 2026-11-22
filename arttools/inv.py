import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
src = sys.argv[1]
EXP = {'A': 16, 'B': 16, 'C': 4, 'D': 12, 'E': 12, 'F': 4, 'H': 16}
def comps(a, dil, minfrac=0.0012):
    m = a > 60
    if dil: m2 = ndi.binary_dilation(m, iterations=dil)
    else: m2 = m
    lab, n = ndi.label(m2)
    out = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        area = int((m[sl] & (lab[sl] == i)).sum())
        if area >= minfrac * a.size: out.append((sl[1].start, sl[0].start, sl[1].stop, sl[0].stop, area))
    return out
rep = {}
for f in sorted(os.listdir(src)):
    im = Image.open(os.path.join(src, f)); k = f[0]
    info = {'size': im.size, 'mode': im.mode}
    if im.mode == 'RGBA':
        a = np.array(im)[:, :, 3]; info['transp'] = round(float((a < 20).mean()), 3); info['semi'] = round(float(((a >= 20) & (a < 235)).mean()), 3)
        if k in EXP:
            c = comps(a, 3); info['n'] = len(c); info['exp'] = EXP[k]
            info['edge'] = sum(1 for b in c if b[0] <= 1 or b[1] <= 1 or b[2] >= im.size[0] - 1 or b[3] >= im.size[1] - 1)
            info['boxes'] = [b[:4] for b in c]
    rep[f[:-4]] = info
json.dump(rep, open(sys.argv[2], 'w'))
for k, v in rep.items():
    flag = '' if 'n' not in v else ('' if v['n'] == v['exp'] and not v['edge'] else '   <<<')
    print(k, v['size'], v['mode'], 'transp', v.get('transp'), 'semi', v.get('semi'), 'n', v.get('n'), '/', v.get('exp'), 'edge', v.get('edge'), flag)
