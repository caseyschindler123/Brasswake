import sys, os
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
def tile(name, w, bg):
    im = Image.open(os.path.join(src, name + '.png'))
    h = int(im.height * w / im.width)
    if im.mode == 'RGBA':
        b = Image.new('RGBA', im.size, bg); b.alpha_composite(im); im = b
    return im.convert('RGB').resize((w, h), Image.LANCZOS)
def sheet(names, fn, cols, w, bg=(111, 165, 80, 255)):
    ts = [tile(n, w, bg) for n in names]; h = ts[0].height; rows = (len(ts) + cols - 1) // cols
    S = Image.new('RGB', (cols * (w + 4) + 4, rows * (h + 4) + 4), (20, 20, 20))
    for i, t in enumerate(ts): S.paste(t, (4 + (i % cols) * (w + 4), 4 + (i // cols) * (h + 4)))
    S.save(os.path.join(out, fn), quality=86)
os.makedirs(out, exist_ok=True)
sheet([f'A{i:02d}' for i in range(1, 9)], 'cA.jpg', 4, 440)
sheet([f'B{i:02d}' for i in range(1, 6)] + ['E01', 'E02'], 'cB.jpg', 4, 440)
sheet([f'C{i:02d}' for i in range(1, 16)], 'cC.jpg', 5, 360)
sheet([f'D{i:02d}' for i in range(1, 11)], 'cD.jpg', 5, 360)
sheet([f'F{i:02d}' for i in range(1, 11)], 'cF.jpg', 5, 360)
sheet([f'G{i:02d}' for i in range(1, 12)], 'cG.jpg', 4, 440)
sheet([f'H{i:02d}' for i in range(1, 8)], 'cH.jpg', 4, 440, (70, 60, 50, 255))
sheet([f'I{i:02d}' for i in range(1, 17)], 'cI.jpg', 4, 440)
sheet(['J01', 'J02', 'J03'], 'cJ.jpg', 3, 580)
