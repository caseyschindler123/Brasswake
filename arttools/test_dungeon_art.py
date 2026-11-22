"""Regression checks for isolated dungeon art and repeatable atlas output."""

from pathlib import Path
import sys
import tempfile
import unittest

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dungeon_art import WORK, digest, isolate_sprites, material, pack, read_atlas


class DungeonArtTests(unittest.TestCase):
    def test_shape_across_cell_line_is_preserved_without_foreign_pixels(self):
        image = Image.new('RGBA', (1024, 1024), (90, 50, 20, 12))
        brush = ImageDraw.Draw(image)
        brush.rectangle((85, 75, 540, 240), fill=(230, 25, 20, 254))
        brush.rectangle((85, 240, 270, 315), fill=(230, 25, 20, 254))
        brush.rectangle((520, 280, 900, 480), fill=(10, 220, 40, 254))
        brush.rectangle((75, 650, 470, 900), fill=(40, 50, 210, 254))
        brush.rectangle((630, 670, 900, 910), fill=(210, 220, 40, 254))
        brush.point((110, 450), fill=(255, 255, 255, 180))

        sprites = isolate_sprites(image, 2, 'DM01')
        self.assertEqual(sprites[0][0], [85, 75, 541, 316])
        self.assertEqual(sprites[0][1].getpixel((455, 40)), (230, 25, 20, 255))
        self.assertEqual(sprites[0][1].getpixel((445, 225)), (0, 0, 0, 0))
        self.assertEqual(sprites[1][0], [520, 280, 901, 481])
        self.assertEqual(sprites[1][1].getpixel((0, 0)), (10, 220, 40, 255))

    def test_material_repeat_and_deterministic_packing(self):
        plane = np.zeros((128, 128, 3), dtype=np.uint8)
        plane[:] = np.linspace(25, 205, 128, dtype=np.uint8)[None, :, None]
        square = Image.fromarray(plane)
        floor = material(square, [0, 0, 128, 128], False)
        wall = material(square, [0, 0, 128, 128], True)
        self.assertEqual(floor.size, (192, 192))
        self.assertEqual(wall.size, (192, 96))
        self.assertLess(abs(floor.getpixel((0, 40))[0] - floor.getpixel((191, 40))[0]), 5)

        WORK.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=WORK) as directory:
            first, second = Path(directory) / 'first.webp', Path(directory) / 'second.webp'
            sprite = Image.new('RGBA', (13, 21), (232, 24, 32, 255))
            sprite.putpixel((0, 0), (0, 0, 0, 0))
            items = {'floor': floor, 'mob': sprite, 'wall': wall}
            rects = pack(items, first)
            self.assertEqual(rects, pack(items, second))
            self.assertEqual(digest(first), digest(second))
            result = read_atlas(first, rects)
            self.assertEqual(result['mob'].size, (13, 21))
            self.assertEqual(result['mob'].getchannel('A').getpixel((0, 0)), 0)
            self.assertEqual(result['floor'].getchannel('A').getextrema(), (255, 255))


if __name__ == '__main__':
    unittest.main()
