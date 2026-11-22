"""Regression checks for crop replay, source precedence, and decoded comparison."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from art_paths import REPO, WORK, sheet_paths
from verify_art import comparison


class ArtToolsTests(unittest.TestCase):
    def setUp(self):
        WORK.mkdir(exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=WORK)
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def test_replay_preserves_boxes_metadata_cleanup_and_detects_new_sheet(self):
        raw, out = self.root / 'raw', self.root / 'sliced'
        raw.mkdir()
        pixels = np.zeros((64, 64, 4), dtype=np.uint8)
        pixels[10:25, 10:25] = [100, 120, 140, 180]
        Image.fromarray(pixels).save(raw / 'A01.png')
        Image.fromarray(pixels).save(raw / 'A99.png')
        mountain = pixels.copy(); mountain[10:25, 10:25, 3] = 255
        Image.fromarray(mountain).save(raw / 'U01.png')
        before = (raw / 'A01.png').read_bytes()
        # This foot point intentionally differs from detection's measurement.
        recorded = {'A01': {'n': 1, 'pieces': [{'box': [8, 9, 28, 29], 'w': 20,
                                             'h': 20, 'footx': 3, 'cell': 7}]},
                    'U01': {'n': 1, 'full': [15, 15]}}
        manifest = self.root / 'manifest.json'
        manifest.write_text(json.dumps(recorded))
        env = {k: v for k, v in os.environ.items() if k != 'BW_INPUT_INDEX'}
        result = subprocess.run([sys.executable, '-I', str(REPO / 'arttools/slice.py'),
                                 str(raw), str(out), '--manifest', str(manifest)],
                                env=env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        actual = json.loads((out / 'manifest.json').read_text())
        self.assertEqual(actual['A01'], recorded['A01'])
        self.assertEqual(actual['U01'], recorded['U01'])
        self.assertIn('A99', actual)
        with Image.open(out / 'A/A01_01.png') as crop:
            self.assertEqual(crop.size, (20, 20))
            self.assertEqual(crop.getpixel((4, 4)), (100, 120, 140, 182))
            self.assertEqual(crop.getpixel((0, 0))[3], 0)
        self.assertEqual((raw / 'A01.png').read_bytes(), before)

    def test_source_precedence_ignores_reference_and_replaced(self):
        for relative in ['kit/out/HW01.png', 'pass12_test/out/HW01.png',
                         'kit/replaced/HW01.png', 'kit/refs/A01.png']:
            path = self.root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b'filename-only discovery')
        self.assertEqual(sheet_paths(self.root), {'HW01': self.root / 'kit/out/HW01.png'})

    def test_comparison_reports_maximum_decoded_difference(self):
        art, live = self.root / 'art', self.root / 'live'
        art.mkdir(); live.mkdir()
        Image.new('RGBA', (2, 2), (10, 20, 30, 255)).save(live / 'tile.png')
        Image.new('RGBA', (2, 2), (10, 27, 30, 255)).save(art / 'tile.png')
        raw = (live / 'tile.png').read_bytes()
        manifest = [{'path': 'art/tile.png', 'size': len(raw),
                     'sha256': hashlib.sha256(raw).hexdigest()}]
        result = comparison(art, manifest, live)
        self.assertEqual(result['different'][0]['max_pixel_difference'], 7)
        self.assertEqual(result['different'][0]['different_pixels'], 4)
        self.assertFalse(result['missing'] or result['extra'])


if __name__ == '__main__':
    unittest.main()
