"""Regression fixtures for lost broad parts, clipped sources and braid tails."""
import unittest,runpy,tempfile
from pathlib import Path
from PIL import Image,ImageDraw

HERE=Path(__file__).resolve().parent
extract=runpy.run_path(str(HERE/'painted_parts.py'))['extract']
heads=runpy.run_path(str(HERE/'painted_heads.py'))['heads']

class PaintedSources(unittest.TestCase):
    def body(self,wide=False,touch=False):
        im=Image.new('RGBA',(1536,1024));d=ImageDraw.Draw(im)
        for row in range(5):
            for col in range(5):
                x=col*307+90;y=row*200+30
                d.rectangle((x,y,x+(245 if wide and col==0 else 110),y+100),fill=(150,120,90,255))
        if touch:d.rectangle((180,30,410,130),fill=(150,120,90,255))
        return im

    def packed(self,im):
        with tempfile.TemporaryDirectory() as temp:
            p=Path(temp)/'source.png';im.save(p);return extract(p)

    def test_gap_extraction_keeps_a_broad_piece_whole(self):
        rows=self.packed(self.body(wide=True))
        self.assertEqual([len(r) for r in rows],[5]*5)
        self.assertEqual(rows[0][0].width,246)

    def test_touching_parts_remain_an_error(self):
        with self.assertRaisesRegex(ValueError,'touching parts'):
            self.packed(self.body(touch=True))

    def test_source_boundary_clipping_remains_an_error(self):
        im=self.body();ImageDraw.Draw(im).rectangle((0,30,110,130),fill=(150,120,90,255))
        with self.assertRaisesRegex(ValueError,'clipped part'):
            self.packed(im)

    def test_connected_heads_keep_tails_across_nominal_row_gaps(self):
        im=Image.new('RGBA',(1536,1024));d=ImageDraw.Draw(im)
        for row in range(4):
            for col in range(6):
                x=col*256+95;y=row*256+40
                d.rectangle((x,y,x+65,y+120),fill=(150,100,65,255))
        d.rectangle((145,130,158,285),fill=(110,70,45,255))
        result=heads(im)
        self.assertEqual(len(result),24)
        self.assertGreater(result[(0,0)][1][3],256)
        self.assertGreater(result[(0,0)][0].getpixel((150-result[(0,0)][1][0],275-result[(0,0)][1][1]))[3],0)

if __name__=='__main__':unittest.main()
