"""Check rendered mask/color separation, rather than only shader declarations."""
from pathlib import Path
import unittest
from PIL import Image,ImageFilter
OUT=Path(__file__).resolve().parents[1]/'work/painted-characters/model-pilot'
class RenderedColorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base=Image.open(OUT/'plate-front-painted.png').convert('RGBA')
        cls.tint=Image.open(OUT/'plate-material-dye.png').convert('RGBA')
        cls.mask=Image.open(OUT/'plate-front-mask.png').convert('RGBA')
    def pixels(self,material):
        selected=Image.new('L',self.mask.size)
        selected.putdata([255 if p==(material*24,255 if material==1 else 0,0,255) else 0 for p in self.mask.getdata()])
        selected=selected.filter(ImageFilter.MinFilter(3))
        pairs=[(a,b) for a,b,keep in zip(self.base.getdata(),self.tint.getdata(),selected.getdata()) if keep]
        self.assertGreater(len(pairs),10,'exercise solid interior pixels')
        return pairs
    def test_face_and_hair_are_unchanged(self):
        for material in [4,7]:self.assertTrue(all(a==b for a,b in self.pixels(material)))
    def test_boot_leather_is_unchanged(self):
        self.assertTrue(all(a==b for a,b in self.pixels(6)))
    def test_both_steel_and_arming_cloth_change(self):
        for material in [1,3]:self.assertGreater(sum(a!=b for a,b in self.pixels(material)),10)
if __name__=='__main__':unittest.main()
