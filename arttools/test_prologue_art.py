"""Verify the Marigold crop, preserved alpha, and source approval guard."""

from io import BytesIO
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest

from PIL import Image, ImageDraw


sys.path.insert(0, str(Path(__file__).resolve().parent))
from prologue_art import ROOT, SOURCE, pack


class PrologueArtTests(unittest.TestCase):
    def setUp(self):
        scratch = ROOT / "work"
        scratch.mkdir(exist_ok=True)
        self.raw = Path(self.enterContext(TemporaryDirectory(dir=scratch)))
        self.source = self.raw / SOURCE
        self.hull = Image.new("RGBA", (40, 54))
        ImageDraw.Draw(self.hull).rectangle((12, 10, 27, 43), fill=(190, 153, 102, 253))
        self.hull.putpixel((11, 9), (190, 153, 102, 128))
        self.hull.putpixel((4, 4), (190, 153, 102, 127))
        self.hull.save(self.source)

    def test_crop_uses_alpha_support_and_preserves_antialiasing(self):
        image, script, receipt = pack(self.raw, None)
        source = receipt["source"]
        self.assertEqual(source["alpha_bounds"], [11, 9, 28, 44])
        self.assertEqual(source["crop"], [5, 3, 34, 50])
        expected = self.hull.crop((5, 3, 34, 50)).resize((480, 778), Image.Resampling.LANCZOS)
        with Image.open(BytesIO(image)) as packed:
            self.assertEqual(packed.size, (480, 778))
            self.assertEqual(packed.getchannel("A").tobytes(), expected.getchannel("A").tobytes())
        self.assertEqual(pack(self.raw, receipt), (image, script, receipt))

    def test_replay_rejects_changed_source_bytes(self):
        _, _, receipt = pack(self.raw, None)
        with self.source.open("ab") as file:
            file.write(b"new source bytes")
        with self.assertRaisesRegex(ValueError, "Source hash does not match"):
            pack(self.raw, receipt)


if __name__ == "__main__":
    unittest.main()
