"""Register authored wardrobe pigment to six immutable anatomy guides.

The sources supply color only. Guide surfaces own the outline, skin, cloth,
collar, trim and material boundaries of every fitted sprite.
"""
from argparse import ArgumentParser
from collections import deque
from hashlib import sha256
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'work' / 'painted-release'
SOURCE = WORK / 'wardrobe'
sys.path.insert(0, str(WORK / 'pinned-python'))
from PIL import Image

MANIFEST = ROOT / 'arttools' / 'painted_release_wardrobe_projection_sources.json'
WIDTH, HEIGHT = 512, 1024
SURFACES = (1, 2, 3, 5, 7)

# Artist-reviewed correspondence for collar, sleeve, waist, hem and boots.
# Values map the immutable average male guide's vertical texels into paint.
ROWS = {
    'tunic': ([0, 192, 210, 338, 448, 473, 595, 859, 961, 1023],
              [0, 188, 214, 339, 442, 470, 597, 871, 963, 1023]),
    'robe': ([0, 185, 202, 441, 476, 862, 959, 1023],
             [0, 182, 199, 440, 478, 891, 991, 1023]),
    'leather': ([0, 188, 209, 442, 445, 473, 569, 859, 962, 1023],
                [0, 182, 211, 441, 442, 473, 565, 865, 963, 1023]),
    'mail': ([0, 188, 211, 437, 445, 475, 595, 858, 962, 1023],
             [0, 182, 212, 436, 445, 475, 598, 867, 963, 1023]),
}


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def rowmap(dest, source):
    output = [0] * HEIGHT
    for left, right, first, last in zip(dest, dest[1:], source, source[1:]):
        if right <= left:
            raise ValueError('Registration landmarks must increase')
        for y in range(left, right + 1):
            output[y] = round(first + (last - first) * (y - left) / (right - left))
    return output


def spans(line, eligible, bridge=0, minimum=1):
    output = []
    left = None
    for x, value in enumerate(line):
        if not eligible(value):
            continue
        if left is None:
            left = x
        elif x > right + bridge + 1:
            if right - left >= minimum - 1:
                output.append((left, right))
            left = x
        right = x
    if left is not None and right - left >= minimum - 1:
        output.append((left, right))
    return output


def corresponding(x, dest, source):
    if len(dest) == len(source):
        for (left, right), (first, last) in zip(dest, source):
            if left <= x <= right:
                return round(first + (last - first) * (x - left) / max(1, right - left))
    left, right = dest[0][0], dest[-1][1]
    first, last = source[0][0], source[-1][1]
    return min(last, max(first, round(first + (last - first) * (x - left) / max(1, right - left))))


def panels(image):
    return [image.crop((i * WIDTH, 0, (i + 1) * WIDTH, HEIGHT)) for i in range(3)]


def surface_rows(mask):
    ids = mask.getchannel('R').tobytes()
    return [ids[y * WIDTH:(y + 1) * WIDTH] for y in range(HEIGHT)]


def alpha_rows(image):
    ids = image.getchannel('A').tobytes()
    return [ids[y * WIDTH:(y + 1) * WIDTH] for y in range(HEIGHT)]


def register_average(paint, guide, mask, name):
    color = list(paint.convert('RGB').getdata())
    source_alpha, guide_alpha = alpha_rows(paint), alpha_rows(guide)
    rows = surface_rows(mask)
    reverse = rowmap(*ROWS[name])
    output = [(0, 0, 0)] * (WIDTH * HEIGHT)
    for y, dest_ids in enumerate(rows):
        source_y = reverse[y]
        dest = spans(guide_alpha[y], lambda a: a >= 240, bridge=4, minimum=5)
        source = spans(source_alpha[source_y], lambda a: a >= 244, bridge=7, minimum=5)
        if not source:
            source = spans(source_alpha[source_y], lambda a: a >= 215, bridge=7, minimum=5)
        if not dest or not source:
            continue
        for x, value in enumerate(dest_ids):
            if value // 24 not in SURFACES:
                continue
            sx = corresponding(x, dest, source)
            if source_alpha[source_y][sx] < 208:
                sx = min((max(first, min(last, sx)) for first, last in source), key=lambda n: abs(sx - n))
            output[y * WIDTH + x] = color[source_y * WIDTH + sx]
    return output


def landmarks(rows, fabric):
    garment = [y for y, r in enumerate(rows) if fabric in r]
    bands = [y for y, r in enumerate(rows) if 355 < y < 560 and r.count(168) > 15]
    trousers = [y for y, r in enumerate(rows) if 120 in r]
    return [0, garment[0], bands[0], bands[-1], garment[-1], trousers[-1], HEIGHT - 1]


def retarget(color, source_rows, dest_rows, fabric):
    mapping = rowmap(landmarks(dest_rows, fabric), landmarks(source_rows, fabric))
    output = [(0, 0, 0)] * (WIDTH * HEIGHT)
    cache = {}
    for y, dest in enumerate(dest_rows):
        mapped = mapping[y]
        for material in SURFACES:
            value = material * 24
            dst = spans(dest, lambda sample: sample == value, bridge=2, minimum=2)
            if not dst:
                continue
            entry = cache.get((mapped, value))
            if entry is None:
                source_y = mapped
                src = spans(source_rows[source_y], lambda sample: sample == value, bridge=2, minimum=2)
                if not src:
                    nearby = sorted(range(max(0, source_y - 10), min(HEIGHT, source_y + 11)), key=lambda n: abs(n - source_y))
                    for j in nearby:
                        src = spans(source_rows[j], lambda sample: sample == value, bridge=2, minimum=2)
                        if src:
                            source_y = j
                            break
                entry = cache[(mapped, value)] = (source_y, src)
            source_y, src = entry
            if not src:
                continue
            for left, right in dst:
                for x in range(left, right + 1):
                    if dest[x] == value:
                        sx = corresponding(x, dst, src)
                        output[y * WIDTH + x] = color[source_y * WIDTH + sx]
    return output


def bleed(pixels):
    size = WIDTH * HEIGHT
    touched = bytearray(size)
    pending = deque()
    for i, color in enumerate(pixels):
        if color != (0, 0, 0):
            touched[i] = 1
            pending.append(i)
    if not pending:
        raise ValueError('Projection has no registered garment color')
    while pending:
        at = pending.popleft()
        x, y = at % WIDTH, at // WIDTH
        for index in (at - 1 if x else -1, at + 1 if x + 1 < WIDTH else -1,
                      at - WIDTH if y else -1, at + WIDTH if y + 1 < HEIGHT else -1):
            if index >= 0 and not touched[index]:
                touched[index] = 1
                pixels[index] = pixels[at]
                pending.append(index)
    tile = Image.new('RGB', (WIDTH, HEIGHT))
    tile.putdata(pixels)
    return tile


def load_mask(guides, outfit_key):
    path = guides / f'fit-{outfit_key}-mask.png'
    return panels(Image.open(path).convert('RGBA')), digest(path)


def prepare(source, guides, stage, profiles):
    registry = json.loads(MANIFEST.read_text(encoding='utf-8'))
    stage.mkdir(parents=True, exist_ok=True)
    receipt_path = source / 'projection-receipt.json'
    receipt = json.loads(receipt_path.read_text(encoding='utf-8')) if receipt_path.exists() else {}
    for outfit, spec in enumerate(registry['sources'], 1):
        name = spec['id']
        raw = source / spec['file']
        original = source / 'immutable-guides' / spec['references'][0]['file']
        if digest(raw) != spec['sha256'] or digest(original) != spec['references'][0]['sha256']:
            raise ValueError(f'Projection input changed: {raw.name}')
        paint = Image.open(raw).convert('RGBA')
        if list(paint.size) != spec['size']:
            raise ValueError(f'Projection dimensions changed: {raw.name}')
        original_masks, original_mask_hash = load_mask(source / 'immutable-guides', outfit)
        if original_mask_hash != spec['references'][0]['maskSha256']:
            raise ValueError(f'Projection guide mask changed: {original.name}')
        guide = Image.open(original).convert('RGBA')
        reference = [register_average(p, g, m, name) for p, g, m in zip(panels(paint), panels(guide), original_masks)]
        guide_rows = [surface_rows(m) for m in original_masks]
        for profile in profiles:
            key = f'wardrobe-{name}-{profile}'
            fitted_masks, guide_hash = load_mask(guides, profile * 5 + outfit)
            registered = Image.new('RGB', (WIDTH * 3, HEIGHT))
            fabric = (24, 24, 48, 72)[outfit - 1]
            for index, (color, baseline, target) in enumerate(zip(reference, guide_rows, fitted_masks)):
                pixels = list(color) if guide_hash == original_mask_hash else retarget(color, baseline, surface_rows(target), fabric)
                registered.paste(bleed(pixels), (index * WIDTH, 0))
            target = stage / (key + '.png')
            registered.save(target, optimize=True)
            receipt[key] = {'sha256': digest(target), 'referenceGuideMask': original_mask_hash, 'fittedGuideMask': guide_hash}
        print(f'Registered {name} for {len(profiles)} profiles.', flush=True)
    receipt_path.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    parser = ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=SOURCE)
    parser.add_argument('--guides', type=Path, default=WORK / 'guides')
    parser.add_argument('--stage', type=Path, default=WORK / 'textures')
    parser.add_argument('--profile', type=int, choices=range(6), action='append')
    args = parser.parse_args()
    prepare(args.source, args.guides, args.stage, args.profile or list(range(6)))
