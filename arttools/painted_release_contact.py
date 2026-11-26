"""Make offline verification contacts from baked body and mask atlases."""

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / 'work/painted-release'


def contact(record, destination, states, mask):
    files = {Path(item['path']).name for item in record['files']}
    combos = sorted(record['combos'].items(), key=lambda item: int(item[0]))
    combos.extend((key, item) for slot in record.get('slots', {}).values() for key, item in slot.items())
    boxes = [(state, frame) for state in states for frame in (0, 3, 6)]
    width, row_height = 320 + 104 * len(boxes), 476
    image = Image.new('RGBA', (width, len(combos) * row_height), '#e8dcc1')
    labels = ImageDraw.Draw(image)
    for row, (key, combo) in enumerate(combos):
        y = row * row_height
        doll_asset = Path(combo['doll']['file']).name
        if doll_asset not in files:
            raise ValueError('Missing doll asset: ' + doll_asset)
        doll = Image.open(destination / 'art' / doll_asset).convert('RGBA')
        image.alpha_composite(doll.crop((0, 450 if mask else 0, 300, 900 if mask else 450)), (4, y + 22))
        labels.text((10, y + 8), f'Combo {key} · sex {combo["sex"]} · build {combo["build"]} · outfit {combo["outfit"]}', fill='#3b3027')
        for i, (state, frame) in enumerate(boxes):
            bank = combo['states'].get(state)
            if not bank:
                continue
            asset = Path(bank['file']).name
            if asset not in files:
                raise ValueError('Missing world asset: ' + asset)
            atlas = Image.open(destination / 'art' / asset).convert('RGBA')
            for frame_row, direction in enumerate((0, 2, 4, 6)):
                frames = bank['frames'][direction]
                crop = frames[min(frame, len(frames)-1)]
                cx, cy, w, h = crop['m' if mask else 'r']
                x = 320 + i * 104
                top = y + 40 + frame_row * 104
                labels.text((x, top - 12), f'{state} {frame} · dir {direction}', fill='#3b3027')
                image.alpha_composite(atlas.crop((cx, cy, cx+w, cy+h)), (x, top))
    return image


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('record', help='record filename without .json')
    parser.add_argument('--profile', choices=('smoke', 'release'), default='smoke')
    parser.add_argument('--states', nargs='+', default=['idle', 'walk', 'run'])
    parser.add_argument('--mask', action='store_true')
    args = parser.parse_args()
    destination = ROOT / 'smoke' if args.profile == 'smoke' else ROOT
    source = destination / 'records' / (args.record + '.json')
    output = contact(json.loads(source.read_text(encoding='utf-8')), destination, args.states, args.mask)
    output.save(destination / (args.record + ('-masks.png' if args.mask else '-contact.png')))
