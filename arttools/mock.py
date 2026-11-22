import sys, argparse
from pathlib import Path
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parent))
from art_paths import WORK, directory, sheet_paths
parser = argparse.ArgumentParser(description='Make local art previews from sliced pieces and a ground image.')
parser.add_argument('raw', help='Raw art folder, read-only (used for the H06 comparison)')
parser.add_argument('--ground', type=Path, default=WORK / 'ground1.png')
parser.add_argument('--output', type=Path, default=WORK / 'view')
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
S = directory('BW_SLICED', WORK / 'sliced')
g = Image.open(args.ground).convert('RGBA'); T = 48; OX, OY = 13, 15
items = []   # (sort y, image, x, y)
def put(path, tx, ty, w=None, h=None, flip=False):
    im = Image.open(S + path)
    sc = (w / im.width) if w else (h / im.height); im = im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.LANCZOS)
    if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    bx = (tx - OX) * T; by = (ty - OY) * T                     # tx,ty = tile of the bottom centre
    items.append((by, im, round(bx - im.width / 2), round(by - im.height)))
# buildings: bottom centre at the middle of their footprint's lower edge
put('C/C01_01.png', 21.5, 24, w=7.6 * T); put('C/C01_02.png', 32, 24, w=6.4 * T); put('C/C01_03.png', 16.6, 30.2, w=5.6 * T)
for (x, y, n) in [(14.5, 18.6, 1), (16.3, 20, 2), (27.2, 19.4, 3), (35.3, 28.6, 1), (15, 34.6, 2), (36, 33.8, 3), (26.6, 17.6, 2)]: put(f'D/D01_{n:02d}.png', x, y, h=3.0 * T)
put('D/D01_04.png', 34.4, 31.2, h=1.1 * T); put('D/D01_06.png', 14.2, 31.9, h=1.0 * T); put('D/D01_07.png', 35.6, 35.6, h=.9 * T)
put('D/D01_08.png', 23.5, 30.2, h=1.7 * T); put('D/D01_09.png', 18.6, 25.2, h=1.8 * T); put('D/D01_09.png', 34.4, 25.2, h=1.8 * T); put('D/D01_10.png', 28.5, 26.2, h=1.5 * T); put('D/D01_11.png', 30.8, 33.4, w=3.0 * T)
CH = 1.42 * T
put('A/A01_01.png', 26.5, 32.4, h=CH); put('A/A03_06.png', 24.2, 34, h=CH); put('A/A06_09.png', 28.6, 34.3, h=CH)
put('B/B01_01.png', 21.5, 25.4, h=CH); put('B/B01_06.png', 23.6, 25.5, h=CH); put('B/B05_09.png', 32.5, 34.6, h=CH); put('B/B05_02.png', 30.3, 29.3, h=CH); put('B/B02_05.png', 20.2, 31.4, h=CH)
put('F/F01_02.png', 22.3, 35.9, w=1.5 * T); put('F/F01_01.png', 30.5, 36.3, w=1.5 * T); put('F/F04_03.png', 18.3, 35.2, w=1.9 * T)
for by, im, x, y in sorted(items, key=lambda t: t[0]): g.alpha_composite(im, (max(0, x), max(0, y))) if x >= 0 and y >= 0 else g.alpha_composite(im.crop((max(0, -x), max(0, -y), im.width, im.height)), (max(0, x), max(0, y)))
g.convert('RGB').save(args.output / 'mock_full.jpg', quality=90)
g.convert('RGB').crop((150, 130, 150 + 880, 130 + 900)).save(args.output / 'mock.jpg', quality=90)
# icons at game size on parchment, with and without the glow cut
ic = Image.new('RGBA', (16 * 72 + 8, 2 * 72 + 8), (243, 232, 203, 255))
for i in range(16):
    a = Image.open(S + f'H/H06_{i + 1:02d}.png'); a.thumbnail((64, 64), Image.LANCZOS); ic.alpha_composite(a, (8 + i * 72 + (64 - a.width) // 2, 8 + (64 - a.height) // 2))
raw = Image.open(sheet_paths(args.raw)['H06']).convert('RGBA')
for i in range(16):
    a = raw.crop(((i % 4) * 256, (i // 4) * 256, (i % 4) * 256 + 256, (i // 4) * 256 + 256)); a.thumbnail((64, 64), Image.LANCZOS); ic.alpha_composite(a, (8 + i * 72, 80))
ic.convert('RGB').save(args.output / 'icons.jpg', quality=92)
