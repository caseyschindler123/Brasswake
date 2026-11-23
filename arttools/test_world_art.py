"""Regression checks for world art isolation, sampling, and deterministic packing."""

from io import BytesIO
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from world_art import (WORK, build_atlases, component_crops,
                       repeat_crop, select_sources)


def sample_grid():
    image = Image.new('RGBA', (128, 128), (40, 60, 55, 25))
    brush = ImageDraw.Draw(image)
    for row in range(4):
        for col in range(4):
            brush.rectangle((col * 32 + 3, row * 32 + 3, col * 32 + 19, row * 32 + 23),
                            fill=(220, 110, 20, 250))
    return image


class WorldArtTests(unittest.TestCase):
    def test_grid_trims_haze_and_preserves_aperture(self):
        image = sample_grid()
        brush = ImageDraw.Draw(image)
        brush.rectangle((7, 10, 13, 23), fill=(55, 32, 19, 55))
        image.putpixel((4, 4), (5, 200, 30, 110))
        result = component_crops(image, 'WF01')
        self.assertEqual(len(result), 16)
        box, arch = result[0]
        self.assertEqual(box, (3, 3, 20, 24))
        self.assertEqual(arch.getpixel((5, 20)), (0, 0, 0, 0))
        self.assertEqual(arch.getpixel((0, 20)), (220, 110, 20, 255))
        self.assertEqual(arch.getpixel((1, 1)), (5, 200, 30, 110))
        self.assertEqual(image.getpixel((7, 10))[3], 55)

        brush.rectangle((96, 96, 127, 127), fill=(30, 20, 10, 59))
        with self.assertRaisesRegex(ValueError, 'WF01 cell 15: missing connected foreground'):
            component_crops(image, 'WF01')

    def test_roof_upward_shift_preserves_silhouettes_in_both_rows(self):
        image = sample_grid()
        # Row 4's tip crosses a nominal cut line while remaining detached from row 3.
        ImageDraw.Draw(image).rectangle((9, 94, 14, 100), fill=(220, 110, 20, 254))
        roofs = component_crops(image, 'WR04')
        self.assertEqual(roofs[8][0], (3, 67, 20, 88))
        bottom_box, bottom_roof = roofs[12]
        self.assertEqual(bottom_box, (3, 94, 20, 120))
        self.assertEqual(bottom_roof.getpixel((6, 0)), (220, 110, 20, 255))

    def test_legacy_grid_groups_pairs_and_masks_cross_cell_shapes(self):
        image = sample_grid()
        brush = ImageDraw.Draw(image)
        # The first figure reaches past the grid line. Its centre remains in cell 0.
        brush.rectangle((16, 3, 37, 7), fill=(210, 120, 30, 245))
        # The second component in this cell is detached from the first silhouette.
        brush.rectangle((22, 17, 28, 23), fill=(10, 230, 45, 254))
        # Move cell 1's sprite below the overlapping horizontal arm.
        brush.rectangle((35, 8, 51, 23), fill=(10, 21, 30, 0))
        brush.rectangle((42, 11, 58, 27), fill=(225, 25, 30, 242))
        brush.rectangle((38, 11, 43, 14), fill=(225, 25, 30, 242))
        brush.rectangle((34, 15, 43, 17), fill=(225, 25, 30, 242))
        brush.rectangle((38, 14, 43, 16), fill=(225, 25, 30, 242))
        brush.rectangle((38, 3, 51, 7), fill=(10, 21, 30, 0))
        components = component_crops(image, 'KM02')
        box, first = components[0]
        self.assertEqual(box, (3, 3, 38, 24))
        self.assertEqual(first.getpixel((34, 2)), (210, 120, 30, 255))
        self.assertEqual(first.getpixel((21, 16)), (10, 230, 45, 255))
        self.assertEqual(first.getpixel((32, 13)), (0, 0, 0, 0))
        self.assertEqual(components[1][1].getpixel((1, 5)), (225, 25, 30, 255))

    def test_texture_overlap_and_deterministic_atlas(self):
        pixels = np.broadcast_to(np.arange(128, dtype=np.uint8)[None, :, None], (128, 128, 3)).copy()
        ground = Image.fromarray(pixels)
        box, surface, fade = repeat_crop(ground, None, True, find_repeat=False)
        self.assertEqual((box, surface.size, fade), ((0, 0, 128, 128), (80, 80), 48))
        self.assertEqual(surface.getpixel((0, 40)), (80, 80, 80))
        self.assertEqual(surface.getpixel((79, 40)), (79, 79, 79))
        _, face, _ = repeat_crop(ground, 110, False, find_repeat=False)
        self.assertEqual(face.size, (80, 110))

        cut = component_crops(sample_grid(), 'WC01')[0][1]
        items = {'test': {'object': cut, 'surface': surface}}
        first, files = build_atlases(items)
        second, repeated = build_atlases({'test': {'surface': surface, 'object': cut}})
        self.assertEqual((first, files), (second, repeated))
        self.assertEqual(first['files'], ['world/test.webp'])
        self.assertEqual(first['at']['object']['f'], 'world/test.webp')
        x, y, w, h = first['at']['object']['r']
        with Image.open(BytesIO(files['test.webp'])) as atlas:
            self.assertEqual(atlas.crop((x, y, x + w, y + h)).size, cut.size)
            self.assertEqual(atlas.getpixel((x - 1, y))[3], 0)

    def test_full_pack_reports_all_missing_selected_inputs(self):
        with TemporaryDirectory(dir=WORK) as temp:
            new, legacy = Path(temp) / 'new', Path(temp) / 'legacy'
            with self.assertRaises(ValueError) as full:
                select_sources(new, legacy)
            for name in ('WF01', 'WF08', 'WC08', 'WR04', 'KB01', 'KG07', 'KI26'):
                self.assertIn(f'{name}.png', str(full.exception))
            with self.assertRaises(ValueError) as preview:
                select_sources(new, legacy, prototype=True)
            self.assertIn('WF01.png', str(preview.exception))
            self.assertNotIn('WC01.png', str(preview.exception))
            self.assertNotIn('KG07.png', str(preview.exception))


if __name__ == '__main__':
    unittest.main()
