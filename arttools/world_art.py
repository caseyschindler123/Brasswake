"""Pack modular buildings, harbour art, landmarks, and regional interiors.

Pass --record for a new reviewed source set. Full rebuilds replay the receipt
by default. --prototype writes a partial preview under the ignored work tree.
"""

import argparse
from collections import defaultdict
import hashlib
from io import BytesIO
import json
from pathlib import Path
from tempfile import NamedTemporaryFile

import numpy as np
from PIL import Image
from scipy.ndimage import find_objects, label


ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'work'
FURNITURE = ('bar', 'barend', 'rtable', 'ltable', 'stool', 'bench', 'hearth', 'kegs',
             'shelf', 'counter', 'bankctr', 'strongbox', 'bed', 'chest', 'rug', 'cupboard')
FURNITURE_SCALE = {'hearth': .36, 'rug': .36, 'kegs': .31, 'shelf': .30, 'cupboard': .30, 'bed': .32}
SILHOUETTES = {
    'KB01': ('ship_three', 'ships', 1152), 'KB02': ('ship_cog', 'ships', 864),
    'KB03': ('ship_ferry', 'ships', 576), 'KC01': ('land_palace', 'landmarks', 1152),
    'KC02': ('land_temple', 'landmarks', 864), 'KC03': ('land_lighthouse', 'landmarks', 384),
    'KC04': ('land_gate', 'landmarks', 768),
}
PROP_SHEETS = {
    'KD01': ('dock', 0, .50), 'KM01': ('market', 0, .58), 'KM02': ('market', 16, .58),
    'KQ01': ('coast', 0, .50), 'KR01': ('fittings', 0, .36),
}
# (key, rows retained, scale, vertical repeat). Faces repeat horizontally only.
TEXTURES = {
    'KH01': ('quay', 690, .24, True), 'KH02': ('pier', None, .24, True),
    'KH03': ('seawall', 741, .20, False), 'KH04': ('pier_edge', 167, .24, False),
    'KX02': ('plaza', None, .24, True), 'KX03': ('shingle', None, .24, True),
    'KX04': ('black_sand', None, .24, True), 'KX05': ('tidal', None, .24, True),
}
FLOORS = ('KT05', 'KI02', 'KI06', 'KI10', 'KI14', 'KI18', 'KI22', 'KI26')
FURNITURE_SHEETS = ('KF01', 'KG01', 'KG02', 'KG03', 'KG04', 'KG05', 'KG06', 'KG07')
ALPHA_FLOOR, ALPHA_SOLID = 60, 200
MIN_COMPONENT_PIXELS = 24


def select_sources(new_dir, legacy_dir, prototype=False):
    new_names = [f'{prefix}{number:02}' for prefix, count in (('WF', 8), ('WC', 8), ('WR', 4))
                 for number in range(1, 2 if prototype else count + 1)]
    if prototype:
        new_names = [name for name in new_names if name == 'WF01' or (new_dir / f'{name}.png').is_file()]
    regions = 1 if prototype else 8
    legacy_names = [*SILHOUETTES, *PROP_SHEETS, *TEXTURES, *FLOORS[:regions], *FURNITURE_SHEETS[:regions]]
    paths = {name: directory / f'{name}.png' for directory, names in ((new_dir, new_names), (legacy_dir, legacy_names))
             for name in names}
    missing = [str(path) for path in paths.values() if not path.is_file()]
    if missing:
        raise ValueError('Missing required source sheets:\n  ' + '\n  '.join(missing))
    return paths


def open_sheet(path, size, opaque):
    data = path.read_bytes()
    with Image.open(BytesIO(data)) as source:
        if source.format != 'PNG' or source.size != size:
            raise ValueError(f'{path.name} must be a PNG of size {size}, received {source.format} {source.size}')
        image = source.convert('RGBA')
    if opaque != (image.getchannel('A').getextrema() == (255, 255)):
        required = 'opaque' if opaque else 'transparent around the sprites'
        raise ValueError(f'{path.name} must be {required}')
    return image, {'sha256': hashlib.sha256(data).hexdigest(), 'size': list(size), 'pieces': {}}


def clamp_alpha(image):
    pixels = np.array(image)
    alpha = pixels[:, :, 3]
    pixels[alpha < ALPHA_FLOOR] = 0
    alpha[alpha >= ALPHA_SOLID] = 255
    return Image.fromarray(pixels)


def component_crops(image, name, grid=True):
    """Assign whole silhouettes by centre, even across grid lines, and retain pairs."""
    pixels = np.asarray(clamp_alpha(image))
    labels, _ = label(pixels[:, :, 3] > 0, structure=np.ones((3, 3)))
    areas = np.bincount(labels.ravel())
    cells = defaultdict(list)
    for index, (ys, xs) in enumerate(find_objects(labels), 1):
        if areas[index] < MIN_COMPONENT_PIXELS:
            continue
        row = (ys.start + ys.stop) * 2 // image.height
        col = (xs.start + xs.stop) * 2 // image.width
        cells[row * 4 + col if grid else 0].append((index, ys, xs))
    result = []
    for cell in range(16 if grid else 1):
        members = cells.get(cell)
        if not members:
            raise ValueError(f'{name} cell {cell}: missing connected foreground')
        if not grid:
            members = [max(members, key=lambda member: areas[member[0]])]
        left = min(xs.start for _, _, xs in members)
        right = max(xs.stop for _, _, xs in members)
        top = min(ys.start for _, ys, _ in members)
        bottom = max(ys.stop for _, ys, _ in members)
        crop = pixels[top:bottom, left:right].copy()
        crop[~np.isin(labels[top:bottom, left:right], [index for index, _, _ in members])] = 0
        if np.count_nonzero(crop[:, :, 3] == 255) < MIN_COMPONENT_PIXELS:
            raise ValueError(f'{name} cell {cell}: missing solid foreground')
        result.append(((left, top, right, bottom), Image.fromarray(crop)))
    return result


def xfade(pixels, width, axis):
    pixels = pixels.swapaxes(1, axis)
    weight = np.linspace(0, 1, width)[None, :, None]
    result = pixels[:, :-width].copy()
    result[:, :width] = pixels[:, -width:] * (1 - weight) + pixels[:, :width] * weight
    return result.swapaxes(1, axis)


def repeat_crop(image, rows, wrap_y, find_repeat):
    pixels = np.asarray(image.convert('RGB'), dtype=float)

    def best_end(axis):
        columns = pixels.swapaxes(1, axis)
        start = columns[:, :1, :]
        candidates = columns[:, int(columns.shape[1] * .8):, :]
        error = np.abs(start - candidates).mean(axis=(0, 2))
        return columns.shape[1] - len(error) + int(error.argmin())

    source_box = (0, 0, best_end(1) if find_repeat else image.width,
                  rows or (best_end(0) if find_repeat else image.height))
    cropped = pixels[:source_box[3], :source_box[2]]
    fade = 48
    cropped = xfade(cropped, fade, 1)
    if wrap_y:
        cropped = xfade(cropped, fade, 0)
    return source_box, Image.fromarray(cropped.clip(0, 255).astype('uint8')), fade


def resize(image, scale):
    size = tuple(max(1, round(side * scale)) for side in image.size)
    return image.resize(size, Image.Resampling.LANCZOS)


def atlas_group(number):
    first_region = number * 2 - 1
    return f'kit{first_region}{first_region + 1}'


def assemble(paths):
    items = defaultdict(dict)
    sources = {}

    for name, path in paths.items():
        is_single = name in SILHOUETTES
        is_texture = name in TEXTURES or name in FLOORS
        image, receipt = open_sheet(path, (1536, 1024) if is_single else (1024, 1024), is_texture)
        sources[name] = receipt

        def add(key, group, crop, scale, mode, **details):
            box, sprite = crop
            tile = resize(sprite, scale)
            items[group][key] = tile
            receipt['pieces'][key] = {'crop': list(box), 'normalized_size': list(tile.size),
                                      'scale': scale, 'mode': mode, **details}

        if name.startswith(('WF', 'WC', 'WR')):
            prefix, number = name[:2], int(name[2:])
            group = atlas_group(number if prefix == 'WR' else (number + 1) // 2)
            crops = component_crops(image, name)
            # A shared reduction preserves a short railing or narrow post within its family.
            max_dimension = max(tile.height if prefix == 'WF' else max(tile.size) for _, tile in crops)
            scale = min(1, (144 if prefix == 'WF' else 128) / max_dimension)
            for index, crop in enumerate(crops):
                add(f'{prefix.lower()}{number}_{index}', group, crop, scale, 'components_by_cell')
        elif is_single:
            key, group, cap = SILHOUETTES[name]
            crop = component_crops(image, name, grid=False)[0]
            add(key, group, crop, cap / crop[1].width, 'largest_component', anchor='bottom')
        elif is_texture:
            is_floor = name in FLOORS
            key, rows, scale, wrap_y = (f'floor{FLOORS.index(name) + 1}', None, .16, True) if is_floor else TEXTURES[name]
            group = 'interiors' if is_floor else 'harbor'
            box, tile, fade = repeat_crop(image, rows, wrap_y, find_repeat=rows is None)
            add(key, group, (box, tile), scale, 'crossfade', crossfade_pixels=fade,
                repeat_axes='xy' if wrap_y else 'x')
        elif name in PROP_SHEETS:
            prefix, start, scale = PROP_SHEETS[name]
            group = 'interiors' if prefix == 'fittings' else 'harbor'
            for index, crop in enumerate(component_crops(image, name)):
                add(f'{prefix}_{start + index}', group, crop, scale, 'components_by_cell')
        else:
            region = FURNITURE_SHEETS.index(name) + 1
            for key, crop in zip(FURNITURE, component_crops(image, name)):
                add(f'f{region}_{key}', 'interiors', crop, FURNITURE_SCALE.get(key, .33), 'components_by_cell')

    return items, {'schema': 1, 'alpha': {'discard_below': ALPHA_FLOOR, 'opaque_from': ALPHA_SOLID}, 'sources': sources}


def make_atlas(items):
    gutter = 2
    width = 1536 if max(image.width for image in items.values()) > 1020 else 1024
    x = y = gutter
    shelf_height = 0
    rects = {}
    for key, image in sorted(items.items(), key=lambda entry: (-entry[1].height, entry[0])):
        if x + image.width + gutter > width:
            x, y = gutter, y + shelf_height + 2 * gutter
            shelf_height = 0
        rects[key] = [x, y, image.width, image.height]
        x += image.width + 2 * gutter
        shelf_height = max(shelf_height, image.height)
    atlas_width = max(x + w + gutter for x, _, w, _ in rects.values())
    atlas_height = y + shelf_height + gutter
    if max(atlas_width, atlas_height) > 2048:
        raise ValueError(f'Atlas is {atlas_width}×{atlas_height}, exceeding the 2048-pixel dimension limit')
    atlas = Image.new('RGBA', (atlas_width, atlas_height))
    for key, image in items.items():
        atlas.paste(image, tuple(rects[key][:2]))
    return atlas, rects


def build_atlases(items):
    coordinates = {'at': {}, 'files': []}
    encoded = {}
    for name, images in sorted(items.items()):
        atlas, rects = make_atlas(images)
        filename = f'{name}.webp'
        path = 'world/' + filename
        stream = BytesIO()
        atlas.save(stream, format='WEBP', quality=90, method=4)
        encoded[filename] = stream.getvalue()
        coordinates['files'].append(path)
        coordinates['at'].update({key: {'f': path, 'r': rect} for key, rect in sorted(rects.items())})
    return coordinates, encoded


def write_outputs(outputs):
    staged = []
    try:
        for path, contents in outputs.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            with NamedTemporaryFile(dir=path.parent, prefix='.world-art-', delete=False) as file:
                staged.append((Path(file.name), path))
                file.write(contents)
        for temp, path in staged:
            temp.replace(path)
    finally:
        for temp, _ in staged:
            temp.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--new-dir', required=True, type=Path)
    parser.add_argument('--legacy-dir', required=True, type=Path)
    parser.add_argument('--out-dir', type=Path, help='directory that holds the generated WebPs')
    parser.add_argument('--js', type=Path)
    parser.add_argument('--inputs', type=Path, help='source receipt path')
    parser.add_argument('--record', action='store_true', help='write a new reviewed full source receipt')
    parser.add_argument('--prototype', action='store_true', help='pack WF01, available WC01/WR01 and legacy previews')
    args = parser.parse_args()

    prototype_dir = WORK / 'world-art-prototype'
    out_dir = args.out_dir or (prototype_dir / 'art/world' if args.prototype else ROOT / 'game/art/world')
    js = args.js or (prototype_dir / 'artworld.js' if args.prototype else ROOT / 'game/src/artworld.js')
    inputs = args.inputs or (prototype_dir / 'inputs.json' if args.prototype else ROOT / 'arttools/world_art_inputs.json')
    destinations = (out_dir, js, inputs)
    if args.prototype and (args.record or any(not path.resolve().is_relative_to(WORK.resolve()) for path in destinations)):
        parser.error('--prototype writes its own results under work/ only')
    if any(path.resolve().is_relative_to(raw.resolve()) for path in destinations for raw in (args.new_dir, args.legacy_dir)):
        parser.error('output destinations must be outside the raw source directories')

    try:
        paths = select_sources(args.new_dir, args.legacy_dir, args.prototype)
        items, receipt = assemble(paths)
        if not (args.record or args.prototype):
            if not inputs.is_file():
                raise ValueError(f'{inputs} is missing. Use --record to receipt a reviewed source set.')
            expected = json.loads(inputs.read_text(encoding='utf-8'))
            if expected != receipt:
                changed = sorted(name for name in expected['sources'].keys() | receipt['sources'].keys()
                                 if expected['sources'].get(name) != receipt['sources'].get(name))
                raise ValueError('Source receipt mismatch: ' + (', '.join(changed) or 'packing schema or alpha policy'))
        coordinates, atlases = build_atlases(items)
        outputs = {out_dir / filename: image for filename, image in atlases.items()}
        if args.record or args.prototype:
            outputs[inputs] = (json.dumps(receipt, indent=2) + '\n').encode('utf-8')
        script = '/* Generated by arttools/world_art.py. Atlas rectangles are in hi-res pixels. */\n'
        script += 'const WorldArt = ' + json.dumps(coordinates, separators=(',', ':')) + ';\n'
        outputs[js] = script.encode('utf-8')
        write_outputs(outputs)
    except (OSError, ValueError) as error:
        parser.exit(1, f'{error}\n')
    print(f'Packed {len(coordinates["at"])} pieces from {len(paths)} sheets into {len(atlases)} world atlases.')
    if args.prototype:
        omitted = [name for name in ('WC01', 'WR01') if name not in paths]
        if omitted:
            print('Prototype worksheets pending: ' + ', '.join(omitted))


if __name__ == '__main__':
    main()
