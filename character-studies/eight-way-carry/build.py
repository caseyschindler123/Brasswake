from pathlib import Path
from io import BytesIO
import base64
import json
import math
from PIL import Image, ImageChops, ImageDraw, ImageFilter
from marks import ROOT,PREV,mapping,tile
from sockets import MAN,WOMAN

def encode(image):
    buf=BytesIO()
    image.save(buf,format='PNG')
    return base64.b64encode(buf.getvalue()).decode()

def grab_hand(direction):
    folder=ROOT.parent/'painted-longsword/bodies'
    item=json.loads((folder/'manifest.json').read_text())['looks']['tunic'][direction]['run'][0]
    cx,cy=map(round,item['palm'])
    size=(17,19) if direction=='E' else (19,18)
    x,y=cx-size[0]//2,cy-size[1]//2
    hand=Image.open(folder/item['file']).convert('RGBA').crop((x,y,x+size[0],y+size[1]))
    mask=Image.new('L',size)
    ImageDraw.Draw(mask).ellipse((0,0,size[0]-1,size[1]-1),fill=255)
    hand.putalpha(ImageChops.multiply(hand.getchannel('A'),mask.filter(ImageFilter.GaussianBlur(.65))))
    return hand

meta=(ROOT.parent.parent/'game/src/artpaintedgear.js').read_text(encoding='utf8')
weapon=json.loads(meta[meta.index('{'):].strip().rstrip(';'))['entries']['w1']
x,y,w,h=weapon['rect']
sword=Image.open(ROOT.parent.parent/'game/art/paintedgear/gear.webp').convert('RGBA').crop((x,y,x+w,y+h))
pins=[]
for start,table in [(0,MAN),(64,WOMAN)]:
    assert len(table)==64
    check=Image.open(ROOT/('man-measure.png' if start==0 else 'woman-measure.png'))
    pen=ImageDraw.Draw(check)
    for i,coords in enumerate(table):
        body=tile(start+i)
        hands=[]
        for j in [0,2]:
            ax,ay=coords[j:j+2]
            visible=ax>0
            px=abs(ax)-(i%8)*120+30
            py=ay-(i//8)*90+28
            if visible and body.getpixel((px,py))[3]<150:
                # Handwritten edge points are moved at most three pixels into the silhouette.
                options=[(dx*dx+dy*dy,px+dx,py+dy) for dx in range(-3,4) for dy in range(-3,4)
                         if dx*dx+dy*dy<=9 and body.getpixel((px+dx,py+dy))[3]>150]
                if not options:
                    raise ValueError((start+i,j,ax,ay))
                _,px,py=min(options)
            hands.append([px,py,int(visible)])
            pen.ellipse((abs(ax)-3,ay-3,abs(ax)+3,ay+3),outline='red' if j==0 else 'blue')
        pins.append(hands)
    check.save(ROOT/('male-pins.png' if start==0 else 'female-pins.png'))

template=(PREV/'directions.html').read_text(encoding='utf8')
template=template.replace('Eight-direction movement','Right-handed sword carry')
template=template.replace("heading='N'","heading='SE'")
a=template.index('function figure(');b=template.index('function paint(',a)
renderer=(ROOT/'carry.js').read_text()
template=template[:a]+renderer+template[b:]
params={'pins':pins,'length':weapon['length'],'pivot':weapon['pivot']}
template=template.replace('__SOCKETS__',json.dumps(params,separators=(',',':')))
for tag,source in [('__BLADE__',sword),('__FIST_E__',grab_hand('E')),('__FIST_S__',grab_hand('S'))]:
    template=template.replace(tag,encode(source))
template=template.replace('atlas.decode(),street.decode()','atlas.decode(),street.decode(),blade.decode(),sideFist.decode(),frontFist.decode()')
(ROOT/'carry.html').write_text(template,encoding='utf8')
