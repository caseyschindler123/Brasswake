"""Extract measured material regions from the immutable painted wardobe atlas."""
from hashlib import sha256
import json
import math
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
RELEASE = ROOT / 'work' / 'painted-release'
sys.path.insert(0, str(RELEASE / 'pinned-python'))
from PIL import Image, ImageEnhance, ImageOps

MANIFEST = ROOT / 'arttools' / 'painted_release_wardrobe_sources.json'
SOURCES = RELEASE / 'wardrobe'
STAGE = RELEASE / 'textures'
TILES = (
    'linen', 'linen-folds', 'cloth-trousers', 'belt-leather',
    'leather-jerkin', 'mail', 'gauntlet-steel', 'sabaton-steel',
    'cloak-wool', 'cloak-travelling', 'cloak-silk', 'cloak-royal',
    'arming', 'glove-leather', 'boot-leather', 'trim-brass',
)
VARIANTS = {
    'glove-thief': ('glove-leather', .48, .54),
    'boot-riding': ('boot-leather', .73, .83),
    'gauntlet-corrigan': ('gauntlet-steel', .65, .67),
    'cloak-kraken': ('leather-jerkin', .62, .56),
    'cloak-roadwarden': ('cloak-travelling', .69, .64),
    'cloak-scrivener': ('cloak-silk', .74, .59),
    'cloak-stormcaller': ('cloak-wool', .69, .72),
}

PLATE_SOURCE = ROOT / 'work' / 'painted-characters' / 'model-pilot' / 'plate-paint.png'
PLATE_SHA256 = 'fedd885b44767b7cfcd766f17e2bcd9fe4d1cb2200c0b5324af39bca255ce09a'


def knights_finish():
    if sha256(PLATE_SOURCE.read_bytes()).hexdigest() != PLATE_SHA256:
        raise ValueError('Approved plate projection digest changed')
    image = Image.open(PLATE_SOURCE).convert('RGB')
    pixels = image.load()
    for panel, center, width in [(0, 256, 100), (1, 256, 72), (2, 256, 100)]:
        for y in range(387, 445):
            for x in range(center - width, center + width + 1):
                u = (x - center) / width
                at = panel * 512 + x, y
                red, green, blue = pixels[at]
                if max(red, green, blue) - min(red, green, blue) > 40:
                    continue
                # Two narrow lines follow the finished cuirass round its waist.
                # Existing scratches and pale edges stay visible in the accent.
                edge = 409 + 13 * u ** 2 + (7 * u if panel == 1 else 0)
                distance = min(abs(y - edge), abs(y - edge - 8))
                weight = math.exp(-(distance / 2.1) ** 2) * min(1, (1 - abs(u)) * 8)
                metal = (min(255, int(red * 1.24 + 12)), min(255, int(green * .99 + 6)), max(0, int(blue * .61)))
                pixels[at] = tuple(round(old + (new - old) * weight) for old, new in zip((red, green, blue), metal))
    return image


def prepare():
    spec = json.loads(MANIFEST.read_text(encoding='utf-8'))['sources'][0]
    path = SOURCES / spec['file']
    if sha256(path.read_bytes()).hexdigest() != spec['sha256']:
        raise ValueError(f'Paint source digest changed: {path.name}')
    sheet = Image.open(path).convert('RGB')
    if list(sheet.size) != spec['size']:
        raise ValueError(f'Paint source dimensions changed: {path.name}')
    edges = [0, 313, 627, 940, 1254]
    materials = {}
    for i, name in enumerate(TILES):
        row, column = divmod(i, 4)
        # Stay a few source pixels inside each swatch. Neither filtering nor a
        # generated edge brush should introduce a neighbour's pigment.
        box = (edges[column] + 4, edges[row] + 4, edges[column + 1] - 4, edges[row + 1] - 4)
        materials[name] = sheet.crop(box).resize((256, 256), Image.Resampling.LANCZOS)
    for name, (base, chroma, light) in VARIANTS.items():
        paint = ImageEnhance.Color(materials[base]).enhance(chroma)
        materials[name] = ImageEnhance.Brightness(paint).enhance(light)
    neutral_mail = ImageOps.grayscale(materials['mail']).convert('RGB')
    materials['mail'] = Image.blend(materials['mail'], neutral_mail, .48)
    materials['plate-knight'] = knights_finish()
    STAGE.mkdir(parents=True, exist_ok=True)
    receipt = {}
    for name, image in materials.items():
        path = STAGE / f'{name}.png'
        image.save(path, optimize=True)
        receipt[name] = sha256(path.read_bytes()).hexdigest()
    (SOURCES / 'texture-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    print(f'Staged {len(receipt)} painted wardrobe textures.')


if __name__ == '__main__':
    prepare()
