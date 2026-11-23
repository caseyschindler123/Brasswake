"""Regression coverage for cartography sheet isolation and receipt replay."""

from copy import deepcopy
from io import BytesIO
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest

from PIL import Image, ImageDraw


sys.path.insert(0, str(Path(__file__).resolve().parent))
from cartography_art import ATLAS, PROPS, REGIONAL, ROOT, pack


def sample_sheet(columns):
    side = 1024 // columns
    image = Image.new('RGBA', (1024, 1024), (60, 33, 16, 20))
    draw = ImageDraw.Draw(image)
    for row in range(columns):
        for col in range(columns):
            x, y = side * col + 38, side * row + 42
            draw.rectangle((x, y, x + 199, y + 179), fill=(38, 75 + 12 * col, 128, 253))
            draw.rectangle((x + 60, y + 60, x + 140, y + 130), fill=(0, 0, 0, 0))
    return image


class CartographyArtTests(unittest.TestCase):
    def setUp(self):
        scratch = ROOT / 'work'
        scratch.mkdir(exist_ok=True)
        folder = self.enterContext(TemporaryDirectory(dir=scratch))
        self.raw = Path(folder)

    def test_replay_approved_sources_and_atlas_coordinates(self):
        sample_sheet(4).save(self.raw / 'CA01.png')
        sample_sheet(2).save(self.raw / 'CA02.png')
        sample_sheet(4).save(self.raw / 'CA03.png')
        coordinates, atlases, receipt = pack(self.raw, None)
        first = receipt['sources']['CA01']['pieces']['chart_counter']
        self.assertEqual(first['crop'], [38, 42, 238, 222])
        self.assertEqual(first['size'], [143, 129])
        self.assertEqual(set(coordinates['at']), {key for key, _ in PROPS + ATLAS + REGIONAL})
        self.assertEqual(coordinates['files'], ['cartography/props.webp', 'cartography/atlas.webp',
                                                'cartography/regional.webp'])
        x, y, w, h = coordinates['at']['chart_counter']['r']
        with Image.open(BytesIO(atlases['props.webp'])) as image:
            self.assertEqual(image.getpixel((x - 1, y))[3], 0)
            self.assertEqual(image.getpixel((x + w // 2, y + h // 2))[3], 0)
            self.assertEqual(image.getpixel((x + w // 2, y + 8))[3], 255)
        self.assertEqual((coordinates, atlases, receipt), pack(self.raw, receipt))

        changed = deepcopy(receipt)
        changed['sources']['CA02']['sha256'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'CA02 does not match the approved source receipt'):
            pack(self.raw, changed)

    def test_missing_sheet_and_blank_cell_fail(self):
        with self.assertRaisesRegex(ValueError, 'CA01.png, CA02.png, CA03.png'):
            pack(self.raw, None)
        incomplete = sample_sheet(4)
        ImageDraw.Draw(incomplete).rectangle((768, 768, 1023, 1023), fill=(0, 0, 0, 0))
        incomplete.save(self.raw / 'CA01.png')
        sample_sheet(2).save(self.raw / 'CA02.png')
        sample_sheet(4).save(self.raw / 'CA03.png')
        with self.assertRaisesRegex(ValueError, 'CA01 cell 16 has no substantial opaque sprite'):
            pack(self.raw, None)


if __name__ == '__main__':
    unittest.main()
