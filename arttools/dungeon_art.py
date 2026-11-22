"""Pack dungeon sheets from an isolated raw folder with Pillow 12.0.0.

    python -I arttools/dungeon_art.py work/dungeon-art/out

Replay the recorded raw hashes and source boxes. A newly reviewed run can use
--record to write a new input receipt. --sample writes only to the work folder.
"""

import argparse
import hashlib
from io import BytesIO
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import find_objects, label


ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'work/dungeon-art'
MATERIALS = ('floor', 'alternate', 'wall', 'hazard')
PROP_SIZES = {'control': 66, 'landmark': 80, 'lore': 56, 'decoration': 42}
ATLAS_WIDTH = 1024


def sheet_names(sample):
    counts = {'DT': 8, 'DP': 3, 'DM': 4}
    return [f'{prefix}{number:02}' for prefix, count in counts.items()
            for number in range(1, 2 if sample else count + 1)]


def grid_boxes(columns, inset=0):
    cell = 1024 // columns
    return [[col * cell + inset, row * cell + inset,
             (col + 1) * cell - inset, (row + 1) * cell - inset]
            for row in range(columns) for col in range(columns)]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_sheets(directory, names, recorded):
    images, hashes = {}, {}
    for name in names:
        path = directory / f'{name}.png'
        data = path.read_bytes()
        hashes[name] = hashlib.sha256(data).hexdigest()
        if recorded and hashes[name] != recorded[name]['sha256']:
            raise ValueError(f'{path} does not match the recorded dungeon raw hash')
        with Image.open(BytesIO(data)) as source:
            if source.size != (1024, 1024):
                raise ValueError(f'{path} has size {source.size}, expected 1024×1024')
            mode = 'RGB' if name.startswith('DT') else 'RGBA'
            images[name] = source.convert(mode)
            if mode == 'RGBA' and images[name].getchannel('A').getextrema() == (255, 255):
                raise ValueError(f'{path} needs real transparency')
    return images, hashes


def xfade(pixels, width):
    """Overlap the final strip with the first strip along axis 1."""
    weight = np.linspace(0, 1, width)[None, :, None]
    result = pixels[:, :-width].copy()
    result[:, :width] = pixels[:, -width:] * (1 - weight) + pixels[:, :width] * weight
    return result


def material(image, box, is_wall):
    pixels = np.asarray(image.crop(box), dtype=float)
    pixels = xfade(pixels, 28)
    if not is_wall:
        pixels = xfade(pixels.transpose(1, 0, 2), 28).transpose(1, 0, 2)
    tile = Image.fromarray(np.rint(pixels).astype(np.uint8))
    return tile.resize((192, 96 if is_wall else 192), Image.Resampling.LANCZOS)


def isolate_sprites(image, columns, name):
    """Keep each solid shape whole when neighboring silhouettes overlap in x or y."""
    pixels = np.array(image)
    alpha = pixels[..., 3]
    groups, _ = label(alpha >= 60, structure=np.ones((3, 3)))
    areas = np.bincount(groups.ravel())
    cell_codes = np.zeros(len(areas), dtype=np.uint8)
    cell_size = 1024 // columns
    for index, (ys, xs) in enumerate(find_objects(groups), 1):
        if areas[index] < 8:
            continue
        row = (ys.start + ys.stop) // 2 // cell_size
        col = (xs.start + xs.stop) // 2 // cell_size
        cell_codes[index] = row * columns + col + 1
    alpha[alpha >= 200] = 255
    source_codes = cell_codes[groups]
    result = []
    for index in range(1, columns ** 2 + 1):
        ys, xs = np.where(source_codes == index)
        if np.count_nonzero(alpha[ys, xs] == 255) < 180:
            raise ValueError(f'{name} cell {index} has no substantial opaque sprite')
        x0, x1 = int(xs.min()), int(xs.max()) + 1
        y0, y1 = int(ys.min()), int(ys.max()) + 1
        if x0 == 0 or y0 == 0 or x1 == 1024 or y1 == 1024:
            raise ValueError(f'{name} cell {index} touches its sheet edge')
        crop = pixels[y0:y1, x0:x1].copy()
        crop[source_codes[y0:y1, x0:x1] != index] = 0
        result.append(([x0, y0, x1, y1], Image.fromarray(crop)))
    return result


def pack(items, file):
    """Shelf packing with a gutter around each independent canvas crop."""
    x = y = 2
    shelf_height = 0
    rects = {}
    for key, item in sorted(items.items(), key=lambda item: -item[1].height):
        if x + item.width + 2 > ATLAS_WIDTH:
            x, y, shelf_height = 2, y + shelf_height + 4, 0
        rects[key] = [x, y, item.width, item.height]
        x += item.width + 4
        shelf_height = max(shelf_height, item.height)
    atlas = Image.new('RGBA', (ATLAS_WIDTH, y + shelf_height + 2))
    for key, item in items.items():
        atlas.paste(item, tuple(rects[key][:2]))
    file.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(file, format='WEBP', quality=90, method=6)
    return rects


def read_atlas(path, rects):
    with Image.open(path) as atlas:
        rgba = atlas.convert('RGBA')
    return {key: rgba.crop((x, y, x + w, y + h))
            for key, (x, y, w, h) in rects.items()}


def contact_sheet(file, items, columns):
    """Preview packed pixels and repeat the material edges at half scale."""
    cell_width = 216
    sprite_height = max((pixels.height for key, pixels in items.items()
                         if key.rsplit(' ', 1)[-1] not in MATERIALS), default=0)
    cell_height = max(130, sprite_height + 30)
    rows = (len(items) + columns - 1) // columns
    sheet = Image.new('RGB', (cell_width * columns, rows * cell_height), '#273041')
    draw = ImageDraw.Draw(sheet)
    for index, (key, pixels) in enumerate(items.items()):
        left, top = index % columns * cell_width, index // columns * cell_height
        draw.text((left + 8, top + cell_height - 22), key, fill='#f6e8c7')
        if key.rsplit(' ', 1)[-1] in MATERIALS:
            pixels = pixels.resize((96, pixels.height // 2), Image.Resampling.LANCZOS)
            if pixels.height == 96:
                repeated = Image.new('RGBA', (96, 192))
                repeated.paste(pixels, (0, 0))
                repeated.paste(pixels, (0, 96))
                pixels = repeated.crop((0, 48, 96, 144))
            sheet.paste(pixels, (left + 8, top + 6))
            sheet.paste(pixels, (left + 104, top + 6))
        else:
            sheet.paste(pixels, (left + (cell_width - pixels.width) // 2,
                                 top + cell_height - 29 - pixels.height), pixels)
    file.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(file)


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8', newline='\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('raw', type=Path)
    parser.add_argument('--inputs', type=Path, default=ROOT / 'arttools/dungeon_art_inputs.json')
    parser.add_argument('--record', action='store_true')
    parser.add_argument('--crop-layout', type=Path, help='Reviewed texture crop boxes for a new record or sample')
    parser.add_argument('--art', type=Path)
    parser.add_argument('--js', type=Path)
    parser.add_argument('--report', type=Path, default=WORK / 'packed.json')
    parser.add_argument('--contact-dir', type=Path)
    parser.add_argument('--sample', action='store_true')
    args = parser.parse_args()
    if args.crop_layout and not (args.sample or args.record):
        parser.error('--crop-layout applies only to a sample or a new input record')
    if args.sample and args.record:
        parser.error('--sample always previews without recording inputs')

    target = WORK / 'sample' if args.sample else ROOT / 'game'
    art = args.art or target / 'art'
    js = args.js or target / 'src/artdungeon.js'
    report = WORK / 'sample/packed.json' if args.sample else args.report
    recorded = {} if args.record or args.sample else json.loads(args.inputs.read_text(encoding='utf-8'))
    layout = json.loads(args.crop_layout.read_text(encoding='utf-8')) if args.crop_layout else {}
    names = sheet_names(args.sample)
    images, hashes = read_sheets(args.raw, names, recorded)

    kit, mobs, gates, receipts = {}, {}, {}, {}
    themes, props = {}, {}
    for name, image in images.items():
        number = int(name[2:])
        is_material = name.startswith('DT')
        is_prop = name.startswith('DP')
        columns = 4 if is_prop else 2
        sprites = [] if is_material else isolate_sprites(image, columns, name)
        detected = grid_boxes(columns, 4) if is_material else [box for box, _ in sprites]
        if recorded:
            boxes = recorded[name]['source_boxes']
        elif name in layout:
            boxes = layout[name]
        else:
            boxes = detected
        if len(boxes) != columns ** 2:
            raise ValueError(f'{name} expected {columns ** 2} crops, received {len(boxes)}')
        if not is_material and boxes != detected:
            raise ValueError(f'{name} isolated sprite bounds differ from the crop layout')
        receipts[name] = {'sha256': hashes[name], 'source_boxes': boxes}
        for index, box in enumerate(boxes):
            x0, y0, x1, y1 = box
            if not (0 <= x0 < x1 <= 1024 and 0 <= y0 < y1 <= 1024):
                raise ValueError(f'{name} invalid source crop {box}')
            if is_material:
                kind = MATERIALS[index]
                key = f'{number} {kind}'
                kit[key] = material(image, box, kind == 'wall')
                themes.setdefault(number, {})[kind] = key
                continue
            sprite = sprites[index][1]
            if name == 'DP03':
                side = index >= 8
                key = f'{index % 8 + 1}-gate' + ('-side' if side else '')
                sprite.thumbnail((72, 144) if side else (144, 72), Image.Resampling.LANCZOS)
                gates[key] = sprite
                continue
            if is_prop:
                role = tuple(PROP_SIZES)[index % 4]
                key = f'{(number - 1) * 4 + index // 4 + 1}-{role}'
                cap = PROP_SIZES[role]
            else:
                key = f'd{(number - 1) * 2 + index // 2 + 1}{index % 2 + 1}'
                cap = 84
            sprite.thumbnail((cap, cap), Image.Resampling.LANCZOS)
            if is_prop:
                kit[key] = sprite
                props[key] = None
            else:
                mobs[key] = sprite

    kit_file, mobs_file = art / 'dun/kit.webp', art / 'dun/mobs.webp'
    files = [kit_file, mobs_file]
    kit_rects = pack(kit, kit_file)
    mob_rects = pack(mobs, mobs_file)
    coordinates = {
        'image': 'dun/kit.webp', 'creatures': 'dun/mobs.webp',
        'themes': {region: {kind: kit_rects[key] for kind, key in theme.items()}
                   for region, theme in themes.items()},
        'props': {key: kit_rects[key] for key in props},
        'mobs': mob_rects,
    }
    if gates:
        gate_file = art / 'dun/gates.webp'
        gate_rects = pack(gates, gate_file)
        coordinates['gateImage'] = 'dun/gates.webp'
        coordinates['props'].update(gate_rects)
        files.append(gate_file)
    js.parent.mkdir(parents=True, exist_ok=True)
    js.write_text('/* Generated by dungeon_art.py. Coordinates are atlas pixels. */\n'
                  'const DungeonArt = ' + json.dumps(coordinates, separators=(',', ':')) + ';\n',
                  encoding='utf-8', newline='\n')
    if args.record and not args.sample:
        write_json(args.inputs, receipts)
    records = []
    for file in files:
        with Image.open(file) as loaded:
            records.append({'path': f'art/dun/{file.name}', 'size': file.stat().st_size,
                            'sha256': digest(file), 'dimensions': loaded.size})
    write_json(report, records)
    if args.contact_dir:
        packed = read_atlas(kit_file, kit_rects)
        contact_sheet(args.contact_dir / 'materials.png', {k: packed[k] for k in kit if k not in props}, 4)
        contact_sheet(args.contact_dir / 'props.png', {k: packed[k] for k in props}, 4)
        if gates:
            packed_gates = read_atlas(gate_file, gate_rects)
            contact_sheet(args.contact_dir / 'gates.png', {k: packed_gates[k] for k in gates}, 4)
        packed_mobs = read_atlas(mobs_file, mob_rects)
        contact_sheet(args.contact_dir / 'creatures.png', {k: packed_mobs[k] for k in mobs}, 4)
    print(f'Packed {len(kit) - len(props)} materials, {len(props)} props, '
          f'{len(gates)} gates, and {len(mobs)} creatures')


if __name__ == '__main__':
    main()
