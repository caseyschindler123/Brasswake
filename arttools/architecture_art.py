"""Pack the approved world architecture from immutable regional component sheets."""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageOps
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
NAMES = ['wall_plain', 'wall_window', 'wall_door', 'post_front', 'roof_surface',
         'ridge_run', 'eave_front', 'eave_left', 'upper_plain', 'upper_window',
         'chimney', 'door', 'dungeon_face', 'dungeon_coping', 'stairs_up', 'stairs_down']
RECEIPT = ROOT / 'arttools/architecture_inputs.json'

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def components(sheet):
    a = np.asarray(sheet)[:, :, 3]
    labels, _ = ndimage.label(ndimage.binary_dilation(a > 190, iterations=2))
    cells = {}
    for label, sl in enumerate(ndimage.find_objects(labels), 1):
        area = int(((labels[sl] == label) & (a[sl] > 190)).sum())
        if area < 700:
            continue
        box = [sl[1].start, sl[0].start, sl[1].stop, sl[0].stop]
        col = min(3, int((box[0] + box[2]) * 2 / sheet.width))
        row = min(3, int((box[1] + box[3]) * 2 / sheet.height))
        index = row * 4 + col
        if index not in cells or area > cells[index][0]:
            cells[index] = (area, box)
    if set(cells) != set(range(16)):
        raise ValueError('Missing architecture cells: ' + str(set(range(16)) - set(cells)))
    return {name: cells[i][1] for i, name in enumerate(NAMES)}

def edge(piece):
    a = np.array(piece)
    support = a[:, :, 3] > 80
    interior = ndimage.binary_erosion(support, iterations=1)
    if not interior.any():
        raise ValueError('Empty component')
    yy, xx = ndimage.distance_transform_edt(~interior, return_distances=False, return_indices=True)
    fringe = ~interior & (a[:, :, 3] > 0)
    a[fringe, :3] = a[yy[fringe], xx[fringe], :3]
    a[:, :, 3] = np.minimum(a[:, :, 3], ndimage.minimum_filter(a[:, :, 3], size=3))
    return Image.fromarray(a)

def material(piece, size=96):
    # Remove silhouette and crossfade opposite edges of the opaque repeat only.
    x, y = round(piece.width * .09), round(piece.height * .09)
    im = piece.crop((x, y, piece.width-x, piece.height-y)).convert('RGB').resize((size+12, size+12), Image.Resampling.LANCZOS)
    a = np.array(im, dtype=np.float32)
    w = np.linspace(0, 1, 12)[None, :, None]
    b = a[:, :-12].copy(); b[:, :12] = a[:, -12:] * (1-w) + a[:, :12] * w
    w = np.linspace(0, 1, 12)[:, None, None]
    a = b[:-12].copy(); a[:12] = b[-12:] * (1-w) + b[:12] * w
    return Image.fromarray(np.uint8(np.clip(a, 0, 255))).convert('RGBA')

def frame(piece):
    a = np.asarray(piece)[:, :, 3]
    middle, row = piece.width//2, piece.height//2
    if a[row, middle] > 80:
        raise ValueError('Door surround has no transparent aperture')
    left = right = middle
    while left > 0 and a[row, left-1] < 80:
        left -= 1
    while right < piece.width and a[row, right] < 80:
        right += 1
    solid = np.flatnonzero(a[:, middle] > 80)
    if not len(solid):
        raise ValueError('Door surround has no lintel')
    top = next(y for y in range(int(solid[0])+1, piece.height) if a[y, middle] < 80)
    jamb, lintel = round((right-left)*3/16), round((piece.height-top)*7/33)
    box = [max(0, left-jamb), max(0, top-lintel), min(piece.width, right+jamb), piece.height]
    return piece.crop(box), box

def extract(sheet, boxes):
    out, frame_box = {}, None
    for name, box in boxes.items():
        p = sheet.crop(box)
        p.putalpha(p.getchannel('A').point(lambda a: max(0, min(255, round((a-80)*255/170)))))
        if name == 'wall_door':
            p, frame_box = frame(p)
        if name == 'roof_surface':
            p = material(p)
        else:
            p.thumbnail((320, 256), Image.Resampling.LANCZOS)
            p = edge(p)
        out[name] = p
    return out, frame_box

def crop_ratio(p, box):
    return p.crop(tuple(round(v*s) for v, s in zip(box, [p.width, p.height, p.width, p.height])))

def derive(p, valley):
    p['eave_right'] = ImageOps.mirror(p['eave_left'])
    p['post_inner'] = p['post_front'].copy()
    p['side_wall'] = crop_ratio(p['wall_plain'], [.76, 0, 1, 1])
    p['side_upper'] = crop_ratio(p['upper_plain'], [.76, 0, 1, 1])
    p['cornice'] = crop_ratio(p['upper_plain'], [0, 0, 1, .12])
    p['foundation'] = crop_ratio(p['wall_plain'], [0, .82, 1, 1])
    p['wall_worn'] = p['wall_plain'].copy()
    ridge = p['ridge_run']; size = ridge.height
    body = ridge.crop((max(0, (ridge.width-size)//2), 0, min(ridge.width, (ridge.width+size)//2), size)).resize((96, 96), Image.Resampling.LANCZOS)
    mask = Image.new('L', body.size); ImageDraw.Draw(mask).ellipse((1, 1, 94, 94), fill=255)
    body.putalpha(mask); p['ridge_joint'] = body
    p['ridge_end'] = ridge.crop((max(0, ridge.width-round(size*1.5)), 0, ridge.width, ridge.height))
    p['valley_run'] = valley.copy()
    corner = Image.new('RGBA', (72, 96))
    front = p['eave_front']; side = p['eave_right']
    corner.paste(front.crop((max(0, front.width-96), 0, front.width, front.height)).resize((72, 36), Image.Resampling.LANCZOS), (0, 0))
    side = side.resize((18, 96), Image.Resampling.LANCZOS); corner.alpha_composite(side, (54, 0))
    p['eave_corner_left'] = corner; p['eave_corner_right'] = ImageOps.mirror(corner)

def pack(raw, source_map, record):
    previous = json.loads(RECEIPT.read_text()) if RECEIPT.exists() else None
    sources = json.loads(source_map.read_text()) if source_map else {r: e['name'] for r, e in previous['regions'].items()}
    valley_path = raw / 'pilot_valley_run.png'
    valley = Image.open(valley_path).convert('RGBA')
    receipt = {'schema': 1, 'alphaRange': [80, 250], 'edgeCleanup': 'one-pixel erosion and interior colour extension',
               'repeatSize': 96, 'doorAperture': '3:16:3 jambs; 7:33 lintel',
               'derivedRecipe': 1, 'valley': {'name': valley_path.name, 'sha256': sha(valley_path)}, 'regions': {}}
    if not record and (not previous or receipt['valley'] != previous['valley']):
        raise ValueError('Recorded valley source changed')
    at, files, source_hashes = {}, [], {}
    for region, filename in sorted(sources.items(), key=lambda i: int(i[0])):
        source = raw / filename; sheet = Image.open(source).convert('RGBA'); boxes = components(sheet)
        pieces, frame_box = extract(sheet, boxes); derive(pieces, valley)
        receipt['regions'][region] = {'name': filename, 'sha256': sha(source), 'dimensions': list(sheet.size),
                                      'components': boxes, 'frameCrop': frame_box}
        if not record and receipt['regions'][region] != previous['regions'].get(region):
            raise ValueError('Recorded regional source changed: '+region)
        atlas = Image.new('RGBA', (1024, 4096)); x = y = row_h = 3
        file = 'architecture/region-'+region+'.webp'
        individual = ROOT / 'work/world-architecture/components' / region; individual.mkdir(parents=True, exist_ok=True)
        for name, piece in pieces.items():
            if x+piece.width+3 > atlas.width:
                y += row_h+6; x = 3; row_h = 0
            atlas.paste(piece, (x, y)); at['architecture_'+region+'_'+name] = {'f': file, 'r': [x, y, *piece.size]}
            x += piece.width+6; row_h = max(row_h, piece.height)
            padded = Image.new('RGBA', (piece.width+4, piece.height+4)); padded.paste(piece, (2, 2))
            padded.save(individual / (name+'.png'))
        atlas = atlas.crop((0, 0, atlas.width, y+row_h+3))
        out = ROOT / 'game/art' / file; out.parent.mkdir(parents=True, exist_ok=True); atlas.save(out, lossless=True, method=6)
        files.append(file); source_hashes[region] = sha(source)
        print('Packed region', region, len(pieces), atlas.size, out.stat().st_size)
    if record:
        RECEIPT.write_text(json.dumps(receipt, indent=2)+'\n')
    elif receipt != previous:
        raise ValueError('Recorded architecture inputs changed')
    data = {'at': at, 'files': files, 'sources': source_hashes}
    (ROOT / 'game/src/artarchitecture.js').write_text('/* Generated by architecture_art.py; never edit coordinates. */\nconst ArchitectureArt = '+json.dumps(data, separators=(',', ':'))+';\n')
    manifest_path = ROOT / 'arttools/packed_manifest.json'
    manifest = [e for e in json.loads(manifest_path.read_text()) if not e['path'].startswith('art/architecture/')]
    for file in files:
        p = ROOT / 'game/art' / file
        manifest.append({'path': 'art/'+file, 'size': p.stat().st_size, 'sha256': sha(p), 'dimensions': list(Image.open(p).size)})
    manifest.sort(key=lambda e: e['path']); manifest_path.write_text(json.dumps(manifest, indent=2)+'\n')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--raw-dir', type=Path, required=True)
    parser.add_argument('--source-map', type=Path); parser.add_argument('--record', action='store_true')
    args = parser.parse_args(); pack(args.raw_dir, args.source_map, args.record)
