"""Register profile-specific paint to the original neutral model guide."""

import argparse
from collections import deque
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'work/painted-release'
INPUTS = ROOT / 'arttools/painted_release_profile_paints.json'
TILE = (512, 1024)


def verified(path, expected):
    actual = hashlib.sha256(path.read_bytes()).hexdigest()
    if actual != expected:
        raise ValueError(f'Source hash differs for {path.name}')
    return Image.open(path).convert('RGBA')


def offset(image, x, y):
    result = Image.new(image.mode, image.size)
    result.paste(image, (x, y))
    return result


def translation(source, guide):
    mask = source.getchannel('A').point(lambda n: 255 if n >= 228 else 0)
    target = guide.getchannel('A').point(lambda n: 255 if n >= 220 else 0)

    def best(a, b, ox, oy, radius):
        return min(
            (ImageChops.difference(offset(a, x, y), b).histogram()[-1], x * x + y * y, x, y)
            for x in range(ox - radius, ox + radius + 1)
            for y in range(oy - radius, oy + radius + 1)
        )[2:]

    small = (128, 256)
    dx, dy = best(mask.resize(small), target.resize(small), 0, 0, 4)
    return best(mask, target, dx * 4, dy * 4, 2)


def fill_foreground(color, guide):
    # The model owns silhouette alpha. Paint samples are seeded only from the
    # intersection of opaque artwork and the eroded original guide.
    w, h = color.size
    alpha = list(color.getchannel('A').getdata())
    silhouette = list(guide.getchannel('A').filter(ImageFilter.MinFilter(3)).getdata())
    colors = list(color.convert('RGB').getdata())
    painted = bytearray(w * h)
    queue = deque()
    for i, value in enumerate(alpha):
        if value >= 245 and silhouette[i] >= 250:
            painted[i] = 1
            queue.append(i)
    if len(queue) < 50000:
        raise ValueError('Insufficient opaque registered surface paint')
    while queue:
        at = queue.popleft()
        x = at % w
        for next_at in (at - 1 if x else -1, at + 1 if x < w - 1 else -1, at - w, at + w):
            if 0 <= next_at < w * h and not painted[next_at]:
                painted[next_at] = 1
                colors[next_at] = colors[at]
                queue.append(next_at)
    output = Image.new('RGB', (w, h))
    output.putdata(colors)
    return output


def register(item, raw, target):
    source = verified(raw / item['file'], item['sha256'])
    guide = verified(raw / item['guide'], item['guideSha256'])
    if source.size != (1536, 1024) or guide.size != source.size:
        raise ValueError('Expected 1536×1024 source and exact guide')
    output = Image.new('RGB', guide.size)
    translations = []
    for column in range(3):
        x = column * TILE[0]
        bounds = (x, 0, x + TILE[0], TILE[1])
        color, outline = source.crop(bounds), guide.crop(bounds)
        dx, dy = translation(color, outline)
        translations.append([dx, dy])
        output.paste(fill_foreground(offset(color, dx, dy), outline), (x, 0))
    name = f'body-{item["profile"]}.png'
    output.save(target / name)
    return {'file': name, 'sha256': hashlib.sha256((target / name).read_bytes()).hexdigest(),
            'sourceSha256': item['sha256'], 'panelTranslationPixels': translations}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--raw', type=Path, default=WORK / 'raw/profile-paints')
    options = parser.parse_args()
    target = WORK / 'textures'
    target.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(INPUTS.read_text(encoding='utf-8'))
    style = manifest['paletteReference']
    verified(options.raw / style['file'], style['sha256'])
    receipt = [register(item, options.raw, target) for item in manifest['entries']]
    (WORK / 'profile-paint-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    print('Registered', len(receipt), 'painted profile atlases')
