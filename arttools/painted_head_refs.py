"""Crop existing complete heads into reference-only contact strips."""
import json
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1];work=root/'work/painted-characters'
data=json.loads((work/'head-records.json').read_text())
for sex,asset in enumerate(data):
    source=Image.open(root/'game/art'/asset['atlas']).convert('RGBA')
    for group in range(3):
        board=Image.new('RGBA',(1152,280),(238,231,214,255));draw=ImageDraw.Draw(board)
        for i,style in enumerate(asset['styles'][group*4:group*4+4]):
            x,y,w,h=style['rect'];im=source.crop((x,y,x+w,y+h));board.alpha_composite(im,(i*288+(288-w)//2,4))
            draw.text((i*288+12,250),style['name'],fill='#34291f')
        board.save(work/f'head-reference-{sex}-{group}.png')
