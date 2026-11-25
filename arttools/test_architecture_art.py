import sys
import unittest
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0,str(Path(__file__).resolve().parent))
from architecture_art import edge, frame, material

class ArchitecturePackingTests(unittest.TestCase):
    def test_fringe_cleanup_preserves_opaque_detail_and_immutable_input(self):
        a=np.zeros((15,15,4),dtype=np.uint8);a[2:13,2:13]=[185,185,185,255];a[3:12,3:12]=[122,77,45,255]
        source=Image.fromarray(a);before=source.tobytes();out=np.asarray(edge(source))
        self.assertEqual(source.tobytes(),before);self.assertTrue((out[2,:,3]==0).all())
        self.assertTrue((out[3:12,3:12,:3]==[122,77,45]).all());self.assertTrue((out[3:12,3:12,3]==255).all())

    def test_frame_retains_ground_level_opening_and_rejects_solid_door(self):
        source=Image.new('RGBA',(100,160));g=ImageDraw.Draw(source)
        g.rectangle((5,5,94,154),fill=(111,77,43,255));g.rectangle((25,25,74,159),fill=(0,0,0,0))
        before=source.tobytes();out,box=frame(source)
        self.assertEqual(source.tobytes(),before);self.assertEqual(box,[16,0,84,160])
        self.assertEqual(out.getpixel((out.width//2,out.height-1))[3],0)
        self.assertEqual(out.getpixel((out.width//2,20))[3],255)
        with self.assertRaisesRegex(ValueError,'transparent aperture'):
            frame(Image.new('RGBA',(100,160),(111,77,43,255)))

    def test_roof_material_repeats_at_fixed_scale_with_opaque_edges(self):
        p=Image.new('RGBA',(220,190),(160,81,42,255));out=material(p)
        self.assertEqual(out.size,(96,96));self.assertEqual(out.getchannel('A').getextrema(),(255,255))

if __name__=='__main__':unittest.main()
