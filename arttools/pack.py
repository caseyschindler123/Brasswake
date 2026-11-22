import sys, os, json
from pathlib import Path
import numpy as np
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parent))
from art_paths import ART, REPO, WORK, directory, env_path, javascript
S, OUT, JS = directory('BW_SLICED', WORK / 'sliced'), directory('BW_OUT', ART), javascript('BW_JS', 'artdata.js')
for d in ['', 'p', 'f', 'bg', 't', 'i']: os.makedirs(OUT + d, exist_ok=True)
man = json.load(open(S + 'manifest.json'))
has = lambda *names: all(n in man and man[n].get('n', 1) for n in names)
def cellof(sheet, i, n=4, size=1024):
    if man[sheet]['pieces'][i].get('cell') is not None: return man[sheet]['pieces'][i]['cell']
    b = man[sheet]['pieces'][i]['box']; return min(n - 1, int((b[1] + b[3]) / 2 // (size / n))) * n + min(n - 1, int((b[0] + b[2]) / 2 // (size / n)))
def piece(sheet, i): return Image.open(f'{S}{sheet[0]}/{sheet}_{i:02d}.png').convert('RGBA')
def scaled(im, sc): return im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.LANCZOS)
def save(im, name, q=84): im.save(OUT + name, 'WEBP', quality=q, method=int(os.environ.get('BW_METHOD', 6))); return os.path.getsize(OUT + name)
sizes = {}; data = {}
# ---- people: 8 heroes x 16 walk frames, then the named townsfolk ----
CW, CH = 56, 78
FOLK = {1: ['1.4', '1.14', '1.6'], 2: ['1.10', '2.7', '1.9'], 3: ['2.14', '2.3', '2.6'], 4: ['2.9', '2.10', '2.12'], 5: ['3.13', '3.2', '3.4'], 6: ['2.7', '3.7', '3.9'], 7: ['4.16', '4.3', '4.13'], 8: ['4.5', '4.8', '4.6']}
RIVAL = {1: '5.1', 2: '5.2', 3: '5.8', 4: '5.4', 5: '5.7', 6: '5.5', 7: '5.6', 8: '5.3'}
EXTRA = {'tavern': '5.11', 'stall': '5.16', 'registrar': '2.2', 'healer': '5.14'}
CROUP = {r: f'6.{r}' for r in range(1, 9)} if has('B06') and man['B06']['n'] >= 8 else {}
CROLE = ['farmer', 'forager', 'shepherd', 'fisher', 'fisher2', 'hunter', 'hermit', 'miller', 'beekeeper', 'woodcutter', 'pilgrim', 'minstrel', 'tinker', 'miner', 'trapper', 'herbalist']   # B07, in the order its prompt lists them
COUNTRY = {nm: f'7.{i + 1}' for i, nm in enumerate(CROLE)} if has('B07') and man['B07']['n'] >= 16 else {}
keys = sorted(set(sum(FOLK.values(), []) + list(RIVAL.values()) + list(EXTRA.values()) + list(CROUP.values()) + list(COUNTRY.values())))
rows = 8 + (len(keys) + 15) // 16; at = Image.new('RGBA', (16 * CW, rows * CH), (0, 0, 0, 0))
for s in range(8):
    sheet = f'A{s + 1:02d}'; sc = 68 / float(np.median([p['h'] for p in man[sheet]['pieces']]))
    for i in range(16):
        im = scaled(piece(sheet, i + 1), sc); a = np.array(im)[:, :, 3] > 60; cx = float(np.nonzero(a.any(0))[0].mean()) if i >= 4 and i < 12 else float(np.average(np.arange(a.shape[1]), weights=a.sum(0)))
        x = round(i * CW + CW / 2 - cx); y = s * CH + CH - 2 - im.height; at.alpha_composite(im.crop((max(0, i * CW - x), 0, min(im.width, (i + 1) * CW - x), im.height)), (max(x, i * CW), max(y, s * CH)))
npc = {}
for n, k in enumerate(keys):
    sh, i = k.split('.'); sheet = f'B{int(sh):02d}'; sc = 68 / float(np.median([p['h'] for p in man[sheet]['pieces']])); im = scaled(piece(sheet, int(i)), sc)
    fx = man[sheet]['pieces'][int(i) - 1]['footx'] * sc; col, row = n % 16, 8 + n // 16; x = round(col * CW + CW / 2 - fx); y = row * CH + CH - 2 - im.height
    x = min(max(x, col * CW), (col + 1) * CW - im.width) if im.width <= CW else col * CW; at.alpha_composite(im.crop((0, 0, min(im.width, CW), im.height)), (x, max(y, row * CH))); npc[k] = [col, row]
sizes['chars.webp'] = save(at, 'chars.webp', 88); data['chars'] = {'cw': CW, 'ch': CH, 'npc': npc, 'folk': FOLK, 'rival': RIVAL, 'extra': EXTRA}
if CROUP: data['chars']['croup'] = CROUP
if COUNTRY: data['chars']['country'] = COUNTRY
# ---- heroes walking and running in eight directions: W01-W64, eight per hero (S, SW, W, NW, N, NE, E, SE). One file per hero: a row per direction, 4 walk then 4 run ----
W8W = 72; w8 = {}
def w8frames(sh, lo, hi):   # pieces lo..hi-1 of one sheet, in cell order
    ps = man[sh]['pieces']; order = sorted(range(len(ps)), key=lambda i: ps[i]['cell'] if ps[i].get('cell') is not None else i); return [(sh, i, ps[i]) for i in order[lo:hi]]
for h in range(8):
    wa = [f'WA{h * 8 + d + 1:02d}' for d in range(8)]; ru = [f'RU{h * 8 + d + 1:02d}' for d in range(8)]; ww = [f'W{h * 8 + d + 1:02d}' for d in range(8)]
    if has(*wa, *ru) and all(man[x]['n'] == 8 for x in wa + ru): rows, n = [w8frames(wa[d], 0, 8) + w8frames(ru[d], 0, 8) for d in range(8)], 8   # eight frames a cycle
    elif has(*ww) and all(man[x]['n'] == 8 for x in ww): rows, n = [w8frames(ww[d], 0, 8) for d in range(8)], 4                                  # four frames a cycle
    else: continue
    at = Image.new('RGBA', (2 * n * W8W, 8 * CH), (0, 0, 0, 0))
    for d, fr in enumerate(rows):
        sc = 68 / float(np.median([p['h'] for (_, _, p) in fr[:n]]))
        for c, (sh, i, p) in enumerate(fr):
            im = scaled(piece(sh, i + 1), sc); fx = p['footx'] * sc; x = round(c * W8W + W8W / 2 - fx); y = d * CH + CH - 2 - im.height - (6 if n == 8 and c in (11, 15) else 0)   # run frames 4 and 8 are in the air
            at.alpha_composite(im.crop((max(0, c * W8W - x), max(0, d * CH - y), min(im.width, (c + 1) * W8W - x), im.height)), (max(x, c * W8W), max(y, d * CH)))
    os.makedirs(OUT + 'w8', exist_ok=True); sizes[f'w8/L{h}.webp'] = save(at, f'w8/L{h}.webp', 88); w8[h] = {'cw': W8W, 'ch': CH, 'n': n}
if w8: data['chars']['w8'] = w8
# ---- walk sheets for townsfolk and rivals, attack sheets for the heroes: one row of 16 frames each, same cells as the heroes ----
def strip(at, sheet, row, th=68, cw=CW, idle=False):
    ps = man[sheet]['pieces']; sc = th / float(np.median([p['h'] for i, p in enumerate(ps) if not idle or cellof(sheet, i) % 4 in (0, 3)]))   # attack sheets are sized by their standing frames, so the hero does not change size when swinging
    for i in range(len(ps)):
        c = cellof(sheet, i); im = scaled(piece(sheet, i + 1), sc); fx = ps[i]['footx'] * sc; x = round(c * cw + cw / 2 - fx); y = row * CH + CH - 2 - im.height
        at.alpha_composite(im.crop((max(0, c * cw - x), max(0, row * CH - y), min(im.width, (c + 1) * cw - x), im.height)), (max(x, c * cw), max(y, row * CH)))
WK = [f'K{i:02d}' for i in range(1, 13) if has(f'K{i:02d}')] + [f'R{i:02d}' for i in range(1, 9) if has(f'R{i:02d}')]
if WK:
    at = Image.new('RGBA', (16 * CW, len(WK) * CH), (0, 0, 0, 0)); walk = {}
    for n, sh in enumerate(WK): strip(at, sh, n); walk[sh if sh[0] == 'K' else 'R' + str(int(sh[1:]))] = n
    sizes['folk.webp'] = save(at, 'folk.webp', 88); data['chars']['walk'] = walk
if has(*[f'T{i:02d}' for i in range(1, 9)]):   # the heroes walking on the four diagonals: down-left, down-right, up-left, up-right
    # As drawn, rows 1 and 4 came out almost straight on, and rows 2 and 3 turn a different way from one hero to the next. So only rows 2 (toward the viewer) and 3 (away)
    # are used, each with the way it actually faces noted here by eye, and the other diagonal is its mirror image.
    DFACE = {1: 'LR', 2: 'LR', 3: 'RL', 4: 'RL', 5: 'RR', 6: 'LR', 7: 'LL', 8: 'RL'}   # hero: which way row 2 faces, which way row 3 faces
    at = Image.new('RGBA', (16 * CW, 8 * CH), (0, 0, 0, 0))
    for s in range(8):
        sheet = f'T{s + 1:02d}'; ps = man[sheet]['pieces']; cells = {cellof(sheet, i): i for i in range(len(ps))}; use = [i for c, i in cells.items() if 4 <= c < 12]; sc = 68 / float(np.median([ps[i]['h'] for i in use]))
        for grp, (srow, want) in enumerate(((1, 'L'), (1, 'R'), (2, 'L'), (2, 'R'))):
            for f in range(4):
                i = cells.get(srow * 4 + f)
                if i is None: continue
                im = scaled(piece(sheet, i + 1), sc); fx = ps[i]['footx'] * sc
                if DFACE[s + 1][srow - 1] != want: im = im.transpose(Image.FLIP_LEFT_RIGHT); fx = im.width - fx
                c = grp * 4 + f; x = round(c * CW + CW / 2 - fx); y = s * CH + CH - 2 - im.height
                at.alpha_composite(im.crop((max(0, c * CW - x), max(0, s * CH - y), min(im.width, (c + 1) * CW - x), im.height)), (max(x, c * CW), max(y, s * CH)))
    sizes['diag.webp'] = save(at, 'diag.webp', 88); data['chars']['diag'] = 1
if has(*[f'L{i:02d}' for i in range(1, 9)]):
    AW = 112; at = Image.new('RGBA', (16 * AW, 8 * CH), (0, 0, 0, 0))   # a swing reaches well past the walking cell
    for s in range(8): strip(at, f'L{s + 1:02d}', s, 68, AW, True)
    sizes['atk.webp'] = save(at, 'atk.webp', 88); data['chars']['atk'] = 1; data['chars']['aw'] = AW
# ---- creatures: small world sprites in a grid, large ones as single files for the battle screen ----
MOB = {'b102': 'F01_1', 'b103': 'F01_2', 'b104': 'F01_3', 'b201': 'F01_4', 'b202': 'F02_1', 'b203': 'F02_2', 'b204': 'F02_3', 'b205': 'F02_4', 'b301': 'F03_1', 'b302': 'F03_2', 'b303': 'F03_3', 'b304': 'F03_4', 'b401': 'F04_1', 'b402': 'F04_2', 'b403': 'F04_3', 'b404': 'F04_4',
       'b501': 'F05_1', 'b502': 'F05_2', 'b503': 'F05_3', 'b504': 'F05_4', 'b601': 'F06_1', 'b602': 'F06_2', 'b603': 'F06_3', 'b604': 'F06_4', 'b701': 'F07_1', 'b702': 'F07_2', 'b703': 'F07_3', 'b704': 'F07_4', 'b801': 'F08_1', 'b802': 'F08_2', 'b803': 'F08_3', 'b804': 'F08_4'}
if has('F11'): MOB['b101'] = 'F11_1'
for n in range(8):
    if has(f'F{12 + n // 4}'): MOB[f'a{n + 1}'] = f'F{12 + n // 4}_{n % 4 + 1}'
for r in range(1, 9): MOB['boss' + str(r)] = f'F{9 + (r - 1) // 4:02d}_{(r - 1) % 4 + 1}'
for n in range(16):
    if has(f'F{16 + n // 4}'): MOB[f'l{n + 1:02d}'] = f'F{16 + n // 4}_{n % 4 + 1}'   # lair creatures, in the order of LAIRMON
for n in range(8):
    if has(f'F{20 + n // 4}'): MOB[f'k{n + 1}'] = f'F{20 + n // 4}_{n % 4 + 1}'   # the vault keepers, one per dungeon
STOCK = {'s1': ('F14_1', 92, 74), 's3': ('F14_2', 70, 52), 's2': ('F14_3', 38, 38), 's4': ('F14_4', 94, 80), 's5': ('F15_1', 62, 50), 's6': ('F15_2', 38, 36), 's7': ('F15_3', 34, 34), 's8': ('F15_4', 84, 70)}   # cow, pig, hen, horse; sheepdog, duck, crow, donkey
for k, (v, _, _) in STOCK.items():
    if has('F' + v[1:3]) and man['F' + v[1:3]]['n'] >= int(v[-1]): MOB[k] = v
MW, MH, BW, BH = 100, 88, 196, 176; ks = [k for k in MOB if k[1] != 'o']; at = Image.new('RGBA', (8 * MW, ((len(ks) + 7) // 8) * MH), (0, 0, 0, 0)); smh = {}; bt = Image.new('RGBA', (4 * BW, 2 * BH), (0, 0, 0, 0)); mob = {}
for k, v in MOB.items():
    sheet, i = v.split('_'); im = piece(sheet, int(i)); big = im.copy(); big.thumbnail((440, 440), Image.LANCZOS)
    if k[0] != 's': sizes['f/' + v + '.webp'] = save(big, 'f/' + v + '.webp', 82)      # farm animals are never fought, so they need no large picture
    boss = k[1] == 'o'; bw, bh = (BW - 10, BH - 8) if boss else STOCK[k][1:] if k in STOCK else (MW - 10, MH - 10); sm = im.copy(); sm.thumbnail((bw, bh), Image.LANCZOS)
    if boss: n = int(k[4]) - 1; bt.alpha_composite(sm, ((n % 4) * BW + (BW - sm.width) // 2, (n // 4) * BH + BH - 2 - sm.height)); mob[k] = [n % 4, n // 4]
    else: smh[k] = sm.height; n = ks.index(k); at.alpha_composite(sm, ((n % 8) * MW + (MW - sm.width) // 2, (n // 8) * MH + MH - 2 - sm.height)); mob[k] = [n % 8, n // 8]
sizes['mobs.webp'] = save(at, 'mobs.webp', 86); sizes['boss.webp'] = save(bt, 'boss.webp', 86); data['mobs'] = {'cw': MW, 'ch': MH, 'bw': BW, 'bh': BH, 'at': mob, 'big': {k: v for k, v in MOB.items() if k[0] != 's'}}
QK = ['b101'] + [k for k in MOB if k[0] == 'b' and k != 'b101' and k[1] != 'o'] + [f'a{i}' for i in range(1, 9)]      # Q01 is the rat, Q02-Q33 the creatures in sheet order, Q34-Q41 the animals
QS = [(k, f'Q{i + 1:02d}') for i, k in enumerate(QK) if has(f'Q{i + 1:02d}') and k in smh]
QS += [(f'l{i + 1:02d}', f'Q{42 + i}') for i in range(16) if has(f'Q{42 + i}') and f'l{i + 1:02d}' in smh]
if QS:
    at = Image.new('RGBA', (16 * MW, len(QS) * MH), (0, 0, 0, 0)); walk = {}
    for n, (k, sh) in enumerate(QS):
        ps = man[sh]['pieces']; side = [p['h'] for i, p in enumerate(ps) if 4 <= cellof(sh, i) < 12] or [p['h'] for p in ps]; sc = min(smh[k] / float(np.median(side)), (MW - 4) / max(p['w'] for p in ps), (MH - 4) / max(p['h'] for p in ps))   # sized by its side views to match the standing picture
        for i in range(len(ps)): c = cellof(sh, i); im = scaled(piece(sh, i + 1), sc); at.alpha_composite(im, (c * MW + (MW - im.width) // 2, n * MH + MH - 2 - im.height))
        walk[k] = n
    sizes['mobwalk.webp'] = save(at, 'mobwalk.webp', 84); data['mobs'].update(walk=walk, ww=MW, wh=MH)
DK = {}
for n in range(1, 9):
    for i in range(1, 5): DK[[k for k, v in MOB.items() if v == f'F{n:02d}_{i}'][0]] = (f'N{n:02d}', i)
DK['b101'] = ('N09', 1)
for i in range(8): DK[f'a{i + 1}'] = (f'N{10 + i // 4}', i % 4 + 1)
for i in range(16): DK[f'l{i + 1:02d}'] = (f'N{12 + i // 4}', i % 4 + 1)
for i in range(8): DK[f'k{i + 1}'] = (f'N{16 + i // 4}', i % 4 + 1)
DS = [(k, v) for k, v in DK.items() if has(v[0]) and man[v[0]]['n'] >= v[1]]
if DS:
    at = Image.new('RGBA', (8 * MW, ((len(DS) + 7) // 8) * MH), (0, 0, 0, 0)); dead = {}
    for n, (k, (sh, i)) in enumerate(DS): im = piece(sh, i); im.thumbnail((MW - 6, MH - 24), Image.LANCZOS); at.alpha_composite(im, ((n % 8) * MW + (MW - im.width) // 2, (n // 8) * MH + MH - 2 - im.height)); dead[k] = [n % 8, n // 8]
    sizes['dead.webp'] = save(at, 'dead.webp', 84); data['mobs']['dead'] = dead
# ---- shelf packer for irregular pieces ----
def shelf(items, width=1024):
    x = y = rowh = 0; pos = {}
    for k, im in items:
        if x + im.width > width: x = 0; y += rowh + 2; rowh = 0
        pos[k] = [x, y, im.width, im.height]; x += im.width + 2; rowh = max(rowh, im.height)
    at = Image.new('RGBA', (width, y + rowh), (0, 0, 0, 0))
    for k, im in items: at.alpha_composite(im, tuple(pos[k][:2]))
    return at, pos
def tow(im, w): return scaled(im, w / im.width)
def toh(im, h, maxw=None): im = scaled(im, h / im.height); return scaled(im, maxw / im.width) if maxw and im.width > maxw else im
# ---- buildings per region ----
BWID = {'guild': 372, 'tavern': 318, 'work': 318, 'shop': 270, 'cottage': 250, 'house': 270, 'hall': 372, 'healer': 270, 'casino': 372}
data['bld'] = {}
for r in range(1, 9):
    if r == 1: src = {'guild': ('C01', 1), 'tavern': ('C01', 2), 'shop': ('C01', 3), 'healer': ('C01', 4)}
    else: a, b = f'C{2 * r - 2:02d}', f'C{2 * r - 1:02d}'; src = {'guild': (a, 1), 'tavern': (a, 2), 'work': (a, 3), 'shop': (a, 4), 'cottage': (b, 1), 'house': (b, 2), 'hall': (b, 3), 'healer': (b, 4)}
    if r == 1 and has('C16') and man['C16']['n'] >= 4: src.update(work=('C16', 1), cottage=('C16', 2), house=('C16', 3), hall=('C16', 4))
    cs = 'C17' if r <= 4 else 'C18'
    if has(cs) and man[cs]['n'] >= 4: src['casino'] = (cs, (r - 1) % 4 + 1)
    at, pos = shelf([(k, tow(piece(*v), BWID[k])) for k, v in src.items()]); sizes[f'b{r}.webp'] = save(at, f'b{r}.webp', 84); data['bld'][r] = pos
# ---- outdoor objects per region. Index of each kind inside its sheet, read off the sheets ----
STD = dict(tree0=1, tree1=2, tree2=3, rock0=4, rock1=5, bush=6, flowers=7, well=8, lamp=9, board=10, stall=11, stairs=12)
ALT = dict(tree0=1, tree1=2, tree2=3, bush=4, flowers=5, rock0=6, rock1=7, well=8, lamp=9, board=10, stall=11, stairs=12)
OMAP = {1: STD, 2: STD, 3: ALT, 4: dict(tree0=1, tree1=2, tree2=3, bush=5, flowers=6, rock0=7, rock1=8, well=9, lamp=10, board=11, stall=12, stairs=13),
        5: dict(tree0=13, tree1=13, tree2=13, rock0=4, rock1=5, bush=14, flowers=15, well=8, lamp=9, board=10, stall=11, stairs=12), 6: dict(tree0=1, tree1=2, tree2=3, rock0=4, rock1=5, bush=6, flowers=7, well=8, lamp=9, board=10, stall=11, stairs=12), 7: STD, 8: ALT}
def osize(k, im): return toh(im, 150, 156) if k[:4] == 'tree' else toh(im, 42) if k[:4] == 'rock' else toh(im, 46) if k == 'bush' else toh(im, 32) if k == 'flowers' else toh(im, 86) if k == 'well' else toh(im, 98) if k == 'lamp' else toh(im, 72) if k == 'board' else (toh(im, 132) if im.height / im.width > .9 else tow(im, 150)) if k == 'stall' else tow(im, 72)
data['obj'] = {}
for r in range(1, 9):
    sheet = f'D{r:02d}'; ps = man[sheet]['pieces']; m = OMAP[r]
    for k, i in m.items():
        p = ps[i - 1]; ar = p['w'] / p['h']
        bad = (k == 'lamp' and ar > .62) or (k == 'stall' and ar < .8) or (k[:4] == 'tree' and p['h'] < 190) or (k == 'well' and not .55 < ar < 1.15) or (k == 'stairs' and ar < .6)
        if bad: print('CHECK', sheet, k, i, p['w'], p['h'])
    at, pos = shelf([(k, osize(k, piece(sheet, i))) for k, i in m.items()]); sizes[f'o{r}.webp'] = save(at, f'o{r}.webp', 84); data['obj'][r] = pos
com = [('chest', toh(piece('D09', 1), 44)), ('chestopen', toh(piece('D09', 2), 50)), ('torch', toh(piece('D09', 3), 48)), ('exit', tow(piece('D09', 12), 70)), ('crate', toh(piece('D09', 9), 48)), ('bench', tow(piece('E01', 11), 104)), ('pillar', toh(piece('D09', 4), 92)), ('bones', tow(piece('D09', 8), 54))]
com += [(f'node{i}', toh(piece('D10', i), 46)) for i in range(1, 9)] + [('fire', toh(piece('D10', 9), 50)), ('sign', toh(piece('D10', 10), 60))]
at, pos = shelf(com, 512); sizes['oc.webp'] = save(at, 'oc.webp', 86); data['com'] = pos
# ---- mountain and desert pieces, in the order the prompts list them. Check the order against the real sheets when they arrive. ----
SCEN = {'D11': [('peak0', 300), ('peak1', 300), ('peak2', 300), ('snowpeak0', 300), ('snowpeak1', 300), ('ridge0', 170), ('ridge1', 170), ('cliff', 200), ('arch', 150), ('boulders', 84), ('cave', 130), ('pine', 150)],
        'D12': [('cactus0', 92), ('cactus1', 92), ('cactus2', 92), ('sandstone0', 130), ('sandstone1', 130), ('dune', 70), ('thorn', 46), ('palm0', 160), ('palm1', 160), ('dbones', 40), ('pot', 34), ('oasis', 80)]}
sc_items = [(nm, toh(piece(sh, i + 1), h, 330)) for sh, lst in SCEN.items() if has(sh) for i, (nm, h) in enumerate(lst) if i < man[sh]['n']]
if sc_items: at, pos = shelf(sc_items); sizes['sc.webp'] = save(at, 'sc.webp', 84); data['scen'] = pos
# ---- countryside buildings: one sheet shared by every region. Slot names in the order the prompts list the buildings. ----
CB = {'C19': [('farm', 290), ('barn', 300), ('mill', 250), ('cottage2', 240)], 'C20': [('shack', 240), ('cabin', 260), ('hut', 230), ('way', 300)],
      'C21': [('tower', 176), ('ruin', 230), ('shrine', 160), ('stable', 310)], 'C22': [('adobe', 260), ('lodge', 280), ('stilt', 230), ('mine', 290)]}
cb_items = [(nm, tow(piece(sh, i + 1), w)) for sh, lst in CB.items() if has(sh) for i, (nm, w) in enumerate(lst) if i < man[sh]['n']]
if cb_items: at, pos = shelf(cb_items, 1280); sizes['bc.webp'] = save(at, 'bc.webp', 84); data['cbld'] = pos
# ---- banks, one per town (X01: towns 1-4, X02: towns 5-8) and the thirty paintable homes (Y01-Y08, material * 10 + shape) ----
bk_items = [(f'b{(n - 1) * 4 + i + 1}', tow(piece(f'X{n:02d}', i + 1), 330)) for n in (1, 2) if has(f'X{n:02d}') for i in range(min(4, man[f'X{n:02d}']['n']))]
if bk_items: at, pos = shelf(bk_items, 1400); sizes['bk.webp'] = save(at, 'bk.webp', 84); data['banks'] = {k[1:]: v for k, v in pos.items()}
HW = [240, 250, 260, 290, 320, 180, 300, 300, 330, 380]   # drawn width of each shape
hm = []; n = 0
for sh in [f'Y{i:02d}' for i in range(1, 9)]:
    for i in range(4 if sh != 'Y08' else 2):
        if has(sh) and i < man[sh]['n']: hm.append((f'h{n}', tow(piece(sh, i + 1), HW[n % 10])))
        n += 1
if hm: at, pos = shelf(hm, 1400); sizes['hm.webp'] = save(at, 'hm.webp', 86); data['homes'] = {k[1:]: v for k, v in pos.items()}
# ---- things about a farm, places to find, the waterside, a camp: name and height on screen, in prompt order ----
PL = {'D13': [('fence', 44), ('gate', 46), ('hay', 46), ('haystack', 78), ('scarecrow', 86), ('cabbage', 34), ('wheat', 50), ('coop', 66), ('trough', 34), ('cart', 54), ('beehives', 48), ('woodpile', 50)],
      'D14': [('stones', 104), ('statue', 104), ('ruinwall', 96), ('graves', 54), ('camp', 70), ('wagon', 70), ('dig', 46), ('cairn', 58), ('hollow', 100), ('bridge', 54), ('sign', 66), ('well', 80)],
      'D15': [('pier', 60), ('rowboat', 50), ('nets', 70), ('traps', 48), ('reeds', 56), ('lilies', 30), ('driftwood', 28), ('wetrock', 32), ('buoy', 34), ('fishbarrel', 50), ('fishrack', 66), ('sailboat', 110)],
      'D16': [('tent', 84), ('peddler', 80), ('pot', 56), ('bedroll', 30), ('hides', 70), ('lantern', 80), ('crates', 60), ('rug', 34), ('caravan', 100), ('hitch', 44), ('banner', 104), ('stool', 40)]}
PL.update({'D17': [('ltent', 90), ('lbanner', 110), ('palisade', 64), ('lookout', 150), ('fire', 50), ('rack', 60), ('cage', 62), ('lchest', 40), ('bones', 30), ('crates2', 60), ('rowboat2', 50), ('hull', 90)],
           'D18': [('eggs', 46), ('hoard', 50), ('webs', 70), ('cocoon', 56), ('cauldron', 60), ('stones2', 90), ('gianthut', 140), ('ice', 70), ('altar', 60), ('wallbroken', 96), ('tpad', 34), ('tpadoff', 34)],
           'D19': [('pedestal', 70), ('pedestal0', 64), ('scrollshelf', 110), ('lectern', 66), ('scrollcase', 40), ('scrollcase0', 40), ('seachest', 40), ('archway', 130), ('desk', 66), ('cairn2', 70), ('wreath', 30), ('shiplantern', 44)]})
pl_items = [(nm, toh(piece(sh, i + 1), h, 200)) for sh, lst in PL.items() if has(sh) for i, (nm, h) in enumerate(lst) if i < man[sh]['n']]
if pl_items: at, pos = shelf(pl_items); sizes['pp.webp'] = save(at, 'pp.webp', 86); data['places'] = pos
# ---- mountain ranges: one file each, loaded when a region needs it. 1024 px across; the game draws them larger. ----
os.makedirs(OUT + 'mt', exist_ok=True); rng_ = {}
for n in range(1, 11):
    nm = f'U{n:02d}'
    if not has(nm): continue
    im = Image.open(f'{S}U/{nm}.png').convert('RGBA'); im = scaled(im, 1024 / im.width); sizes[f'mt/{nm}.webp'] = save(im, f'mt/{nm}.webp', 80); rng_[n] = [im.width, im.height]
if rng_: data['ranges'] = rng_
# ---- ground textures: 512 px tiles that repeat. Each is cross-faded over its own wrapped edge, so it tiles whether or not the painter got the seams right. ----
GT = ['meadow', 'lush', 'dry', 'marsh', 'forest', 'trail', 'cobble', 'beach', 'desert', 'snow', 'frozen', 'rock', 'volcanic', 'shallow', 'deep', 'marble', 'cave', 'field', 'planks']
def tileable(im, S2=512, band=60):
    a = np.asarray(im.convert('RGB').resize((S2 + band, S2 + band), Image.LANCZOS)).astype(np.float32); t = (np.arange(band) / band)[None, :, None]
    a[:, :band] = a[:, :band] * t + a[:, S2:S2 + band] * (1 - t); a = a[:, :S2]; t = (np.arange(band) / band)[:, None, None]; a[:band] = a[:band] * t + a[S2:S2 + band] * (1 - t)
    return Image.fromarray(np.clip(a[:S2], 0, 255).astype(np.uint8), 'RGB')
os.makedirs(OUT + 'g', exist_ok=True); gt = {}
for n, nm in enumerate(GT, 1):
    f = f'{S}V/V{n:02d}.png'
    if not os.path.exists(f): continue
    im = tileable(Image.open(f)); sizes[f'g/{nm}.webp'] = save(im, f'g/{nm}.webp', 82); gt[nm] = [int(v) for v in np.asarray(im.resize((1, 1), Image.BOX))[0, 0]]   # its average colour, for the map
if gt: data['ground'] = gt
# ---- small moving things: ripples, a jumping fish, a butterfly, a bird. A 4x4 grid like the effects. ----
if has('M02'):
    FX = 96; at = Image.new('RGBA', (4 * FX, 4 * FX), (0, 0, 0, 0))
    for i in range(man['M02']['n']): c = cellof('M02', i); im = piece('M02', i + 1); im.thumbnail((FX - 4, FX - 4), Image.LANCZOS); at.alpha_composite(im, ((c % 4) * FX + (FX - im.width) // 2, (c // 4) * FX + (FX - im.height) // 2))
    sizes['fx2.webp'] = save(at, 'fx2.webp', 86); data['fx2'] = {'cell': FX}
# ---- hit, slash and spell effects: a 4x4 grid ----
if has('M01'):
    FX = 96; at = Image.new('RGBA', (4 * FX, 4 * FX), (0, 0, 0, 0))
    for i in range(man['M01']['n']): c = cellof('M01', i); im = piece('M01', i + 1); im.thumbnail((FX - 4, FX - 4), Image.LANCZOS); at.alpha_composite(im, ((c % 4) * FX + (FX - im.width) // 2, (c // 4) * FX + (FX - im.height) // 2))
    sizes['fx.webp'] = save(at, 'fx.webp', 86); data['fx'] = {'cell': FX}
# ---- portraits, backdrops, title art: single files, loaded when needed ----
for pre, top in (('G', 19), ('P', 10)):
    for n in range(1, top + 1):
        for i in range(1, 5):
            if not os.path.exists(f'{S}{pre}/{pre}{n:02d}_{i}.png'): continue
            im = Image.open(f'{S}{pre}/{pre}{n:02d}_{i}.png').convert('RGB').resize((176, 176), Image.LANCZOS); sizes[f'p/{pre}{n:02d}_{i}.webp'] = save(im, f'p/{pre}{n:02d}_{i}.webp', 80)
if has('G12', 'G13'): data['casino'] = 1
if has('G16', 'G17'): data['bankers'] = {r: f'G{16 + (r - 1) // 4}_{(r - 1) % 4 + 1}' for r in range(1, 9)}
if has('G18'): data['story'] = {'ilva': 'G18_1', 'corin': 'G18_2', 'captain': 'G18_3', 'clerk': 'G18_4'}
if has('G19'): data['keepers'] = ['G19_1', 'G19_2', 'G19_3', 'G19_4']
if has('G14', 'G15'): data['faces'] = {'farmer': 'G14_1', 'fisher': 'G14_2', 'hunter': 'G14_3', 'trapper': 'G14_3', 'hermit': 'G14_4', 'herbalist': 'G15_1', 'forager': 'G15_1', 'pilgrim': 'G15_2', 'tinker': 'G15_3', 'miller': 'G15_4'}
if has(*[f'P{n:02d}' for n in range(1, 11)]): data['regs'] = 1
if has('S01', 'S02', 'S03'):
    for n in range(1, 4): im = Image.open(f'{S}S/S{n:02d}.png').convert('RGB').resize((720, 1080), Image.LANCZOS); im.save(OUT + f'bg/S{n:02d}.jpg', quality=76, optimize=True, progressive=True); sizes[f'bg/S{n:02d}.jpg'] = os.path.getsize(OUT + f'bg/S{n:02d}.jpg')
    data['tables'] = 1
for n in range(1, 17): im = Image.open(f'{S}I/I{n:02d}.png').convert('RGB').resize((1080, 720), Image.LANCZOS); im.save(OUT + f'bg/I{n:02d}.jpg', quality=76, optimize=True, progressive=True); sizes[f'bg/I{n:02d}.jpg'] = os.path.getsize(OUT + f'bg/I{n:02d}.jpg')
for n in range(1, 12):
    if not os.path.exists(f'{S}J/J{n:02d}.png'): continue
    im = Image.open(f'{S}J/J{n:02d}.png').convert('RGB').resize((1200, 800), Image.LANCZOS); im.save(OUT + f't/J{n:02d}.jpg', quality=78, optimize=True, progressive=True); sizes[f't/J{n:02d}.jpg'] = os.path.getsize(OUT + f't/J{n:02d}.jpg')
data['story_bg'] = sorted(n for n in range(1, 12) if os.path.exists(f'{S}J/J{n:02d}.png'))
for nm in ('Z01', 'S04'):
    if os.path.exists(f'{S}{nm[0]}/{nm}.png'): im = Image.open(f'{S}{nm[0]}/{nm}.png').convert('RGB').resize((720, 1080), Image.LANCZOS); im.save(OUT + f'bg/{nm}.jpg', quality=78, optimize=True, progressive=True); sizes[f'bg/{nm}.jpg'] = os.path.getsize(OUT + f'bg/{nm}.jpg'); data[nm.lower()] = 1
# ---- item icons: one grid, 64 px cells ----
IC = 64; names = []
for wi, w in enumerate(['swords', 'fencing', 'archery', 'magery']): names += [(f'w_{w}_{g + 1}', 'H01', wi * 4 + g + 1) for g in range(4)]
for ri, nm in enumerate(['helm', 'armor', 'gloves', 'boots', 'shield']): names += [(f'{nm}_{g + 1}', 'H02', ri * 4 + g + 1) for g in range(4)]
for ri, nm in enumerate(['ring', 'charm', 'cloak', 'belt']): names += [(f'{nm}_{g + 1}', 'H03', ri * 4 + g + 1) for g in range(4)]
names += [('draught', 'H04', 1), ('potion2', 'H04', 2), ('potion3', 'H04', 3), ('bandage', 'H04', 7), ('scroll', 'H04', 8), ('bread', 'H04', 9), ('picks', 'H04', 11), ('key', 'H04', 12), ('coin', 'H04', 16)]
names += [(f'mat{i}', 'H05', i) for i in range(1, 9)] + [('sigil', 'H05', 9), ('ingot', 'H05', 10), ('plank', 'H05', 11), ('cloth', 'H05', 12), ('hide', 'H05', 13), ('herbs', 'H05', 14), ('gem', 'H05', 15), ('coal', 'H05', 16)]
names += [(f'u{i}', 'H06', i) for i in range(1, 17)] + [(f'u{16 + i}', 'H07', i) for i in range(1, 9)] + [('hammer', 'H07', 9), ('tongs', 'H07', 10), ('saw', 'H07', 11), ('mortar', 'H07', 12), ('deed', 'H07', 13)]
H8 = ['book_arms', 'book_spell', 'book_shadow', 'book_craft', 'scroll_arms', 'scroll_spell', 'scroll_shadow', 'scroll_craft', 'meat', 'ration', 'pelt', 'stew', 'tankard', 'bedroll', 'salve', 'hintkey']
H9 = ['chips_red', 'chips_blue', 'chips_gold', 'chip', 'deck', 'cards', 'fan', 'dealer', 'rake', 'wheel', 'dice', 'bell', 'visor', 'strongbox', 'shoe', 'hourglass']
H10 = ['fish', 'perch', 'bigfish', 'pike', 'carp', 'eel', 'glowfish', 'crab', 'boot', 'weed', 'bottle', 'sunkchest', 'pearl', 'rustkey', 'oldcoin', 'rod']
H11 = ['cheese', 'pie', 'honey', 'cider', 'loaf', 'eggs', 'chicken', 'apple', 'herbbundle', 'luckyfoot', 'strawhat', 'woolcloak', 'stoutboots', 'letter', 'parcel', 'seed']
H12 = ['bankchest', 'goldstack', 'vaultkey', 'deed2', 'forsale', 'rod2', 'strongbox2', 'pouch', 'crate', 'doorlock', 'hearth', 'bed', 'bookshelf', 'trophy', 'weaponrack', 'plant']
H13 = ['trune', 'dscale', 'dfang', 'degg', 'silk', 'venom', 'frost', 'fur', 'phylactery', 'bonedust', 'witchcharm', 'leechoil', 'warhorn', 'banditmap', 'compass2', 'doubloon']
H14 = ['jpage', 'iletter', 'atable', 'studykey', 'corinsword', 'lens', 'quillink', 'compass', 'hglass', 'candle', 'scrolls', 'sealstamp', 'map2', 'spyglass', 'locket', 'holestone']
H15 = ['t_locked', 't_card', 't_open', 't_seal', 't_join', 't_star', 't_book', 't_bookopen', 't_key', 't_tablet', 't_candle', 't_quill', 't_eye', 't_glass', 't_laurel', 't_q']
O1 = [f'gt{i}' for i in range(1, 13)]
for sh, lst in (('H08', H8), ('H09', H9), ('H10', H10), ('H11', H11), ('H12', H12), ('H13', H13), ('H14', H14), ('H15', H15), ('O01', O1)):
    if has(sh): names += [(nm, sh, i + 1) for i, nm in enumerate(lst) if i < man[sh]['n']]
cols = 16; at = Image.new('RGBA', (cols * IC, ((len(names) + cols - 1) // cols) * IC), (0, 0, 0, 0)); icat = {}
for n, (nm, sh, i) in enumerate(names):
    im = piece(sh, i)
    if sh == 'H10' and i <= 7: a_ = np.array(im); a_[:, :, 3] = np.where(a_[:, :, 3] < 205, 0, a_[:, :, 3]); im = Image.fromarray(a_, 'RGBA'); im = im.crop(im.getbbox())   # the fish came with a pale glow round them
    im.thumbnail((IC - 4, IC - 4), Image.LANCZOS); at.alpha_composite(im, ((n % cols) * IC + (IC - im.width) // 2, (n // cols) * IC + (IC - im.height) // 2)); icat[nm] = [n % cols, n // cols]
sizes['icons.webp'] = save(at, 'icons.webp', 88); data['icons'] = {'cols': cols, 'rows': (len(names) + cols - 1) // cols, 'at': icat}
if all(os.path.exists(OUT + 'ui/' + f) for f in ('frame1.webp', 'b_oak.webp', 'parch.webp')): data['ui'] = 1   # made by ui_pack.py, run first
if has('O01'):
    for i in range(min(12, man['O01']['n'])): im = piece('O01', i + 1); im.thumbnail((128, 128), Image.LANCZOS); sizes[f'i/gt{i + 1}.webp'] = save(im, f'i/gt{i + 1}.webp', 88)
    data['emblems'] = 1
# ---- menu icons ----
for nm, (sh, i) in {'sword': ('H01', 4), 'map': ('H04', 14), 'bag': ('H04', 15), 'tome': ('H06', 13)}.items():
    im = piece(sh, i); im.thumbnail((96, 96), Image.LANCZOS); sizes[f'i/{nm}.webp'] = save(im, f'i/{nm}.webp', 88)
# The live game includes this later extension. Re-encode the base atlases in
# the original order, then merge the extension's coordinates into ArtData.
from add_creatures import append_creatures
patch = append_creatures(REPO / 'arttools/creature_manifest.json', env_path('BW_RAW', WORK / 'raw'),
                         OUT + 'mobs.webp', OUT + 'dead.webp', OUT)
data['mobs']['at'].update(patch['at']); data['mobs']['dead'].update(patch['dead'])
for name in ('mobs.webp', 'dead.webp'): sizes[name] = os.path.getsize(OUT + name)
open(JS, 'w', encoding='utf-8', newline='\n').write('/* generated by pack.py: where each piece of art sits in its atlas */\nconst ArtData = ' + json.dumps(data, separators=(',', ':')) + ';\n')
tot = sum(sizes.values()); grp = {}
for k, v in sizes.items(): g = k.split('/')[0] if '/' in k else 'atlases'; grp[g] = grp.get(g, 0) + v
print('files', len(sizes), 'total MB', round(tot / 1e6, 2), {k: round(v / 1e6, 2) for k, v in grp.items()}); print({k: round(v / 1e3) for k, v in sizes.items() if '/' not in k})
