from pathlib import Path
from PIL import Image,ImageDraw
import json
ROOT=Path(__file__).resolve().parent
PREV=ROOT.parent/'eight-way-painted'
atlas=Image.open(PREV/'tunics.webp').convert('RGBA')
mapping=json.loads((PREV/'mapping.json').read_text())
def tile(i):
    x,y=i%16*176,i//16*176
    return atlas.crop((x,y,x+176,y+176))

if __name__=='__main__':
    for character,start in [('man',0),('woman',64)]:
        board=Image.new('RGB',(960,720),'#efe8d8')
        d=ImageDraw.Draw(board)
        for j in range(64):
            x,y=j%8*120,j//8*90
            im=tile(start+j).crop((30,28,150,118))
            board.paste(im,(x,y),im)
            d.text((x+2,y+1),str(j),fill='#675a49')
            d.line((x,y,x,y+89),fill='#bdb5a4')
            d.line((x,y,x+119,y),fill='#bdb5a4')
        board.save(ROOT/f'{character}-measure.png')
