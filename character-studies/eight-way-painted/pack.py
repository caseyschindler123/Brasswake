"""Local preview. The atlas stores only original frames, including earlier art."""
import base64
import io
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from study_font import label_font
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent
WORK = OUT.parent
PAIR = WORK/'paired-side-gaits'
sys.path.insert(0, str(PAIR))
from preview import figures, save_gif

CELL = 176
GROUND = 155
COMPASS = [('NW','N','NE'),('W',None,'E'),('SW','S','SE')]
SMALL = label_font(13)
TITLE = label_font(19)
SKIN = ('man','woman')
GAITS = ('walk','run')
bank,lookup = [],{}

def add(character, gait, direction, poses, nominal, half=False):
    entries = []
    for tile,dx,dy in poses:
        scale = (133 if character=='man' else 126)/nominal
        pic = tile.resize(tuple(round(v*scale) for v in tile.size),Image.Resampling.LANCZOS)
        pad = Image.new('RGBA',(CELL,CELL))
        x,y = round(CELL/2+dx*scale),round(GROUND+dy*scale)
        assert x>=0 and y>=0 and x+pic.width<=CELL and y+pic.height<=CELL
        pad.alpha_composite(pic,(x,y))
        entries.append([len(bank),False])
        bank.append(pad)
    if half:
        entries += [[idx,True] for idx,_ in entries]
    assert len(entries)==8
    lookup[f'{character}/{gait}/{direction}'] = entries

def add_character(character):
    sidefile = (PAIR/'painted-male.png' if character=='man'
                else WORK/'simple-female-gaits/painted-gaits.png')
    side,h,_ = figures(sidefile)
    for i,gait in enumerate(GAITS):
        add(character,gait,'E',side[i],h)
    diagfile = (PAIR/'three-quarter-cutout.png' if character=='man'
                else WORK/'painted-equipment-proof/woman.png')
    previous,h,_ = figures(diagfile,columns=4)
    add(character,'run','SE',previous[0]+previous[1],h)
    axial,h,_ = figures(OUT/f'{character}-axial.png',rows=4,columns=4)
    for i,(gait,direction) in enumerate([('walk','S'),('run','S'),('walk','N'),('run','N')]):
        add(character,gait,direction,axial[i],h,half=True)
    diag,h,_ = figures(OUT/f'{character}-diagonal.png',rows=3,columns=8)
    for i,(gait,direction) in enumerate([('walk','SE'),('walk','NE'),('run','NE')]):
        add(character,gait,direction,diag[i],h)
    # Flipping a body exchanges anatomical left/right. Advance half a stride
    # in the matching bank to keep the planted anatomical foot when turning.
    for gait in GAITS:
        for target,source in [('W','E'),('NW','NE'),('SW','SE')]:
            keys = lookup[f'{character}/{gait}/{source}']
            lookup[f'{character}/{gait}/{target}'] = [[keys[(i+4)%8][0],True] for i in range(8)]

for character in SKIN:
    add_character(character)
assert len(bank)==128 and len(lookup)==32
assert all(len(set(tuple(f) for f in frames))==8 for frames in lookup.values())
assert set(range(len(bank)))=={i for row in lookup.values() for i,_ in row}
atlas = Image.new('RGBA',(CELL*16,CELL*8))
for i,pic in enumerate(bank):
    atlas.paste(pic,(i%16*CELL,i//16*CELL))
atlas.save(OUT/'tunics.webp',lossless=True,method=3)
times = {}
for gait in GAITS:
    with Image.open(WORK/'simple-female-gaits'/f'{gait}.gif') as src:
        times[gait] = [src.seek(i) or src.info['duration'] for i in range(8)]

def draw(page,character,gait,heading,phase,x,y,factor):
    idx,mirror = lookup[f'{character}/{gait}/{heading}'][phase]
    pic = bank[idx]
    if mirror:
        pic = pic.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    size = round(CELL*factor)
    pic = pic.resize((size,size),Image.Resampling.LANCZOS)
    page.paste(pic,(round(x-size/2),round(y-GROUND*factor)),pic)

for gait in GAITS:
    frames = []
    for i in range(8):
        page = Image.new('RGB',(390,300),'#e8e1d2')
        d = ImageDraw.Draw(page)
        for row,headings in enumerate(COMPASS):
            for col,heading in enumerate(headings):
                x,y = col*130+65,row*100+75
                if heading:
                    draw(page,'man',gait,heading,i,x-25,y,.4)
                    draw(page,'woman',gait,heading,i,x+23,y,.4)
                    d.text((x,y+7),heading,font=SMALL,fill='#554a3b',anchor='mt')
                else:
                    d.text((x,y-32),gait.capitalize(),font=TITLE,fill='#383229',anchor='mm')
        frames.append(page)
    save_gif(frames,times[gait],OUT/f'{gait}.gif')
    frames[2].save(OUT/f'{gait}-check.png')

data = dict(cell=CELL,ground=GROUND,frames=lookup,delays=times)
(OUT/'mapping.json').write_text(json.dumps(data,indent=2),encoding='utf8',newline='\n')
html = (OUT/'viewer-template.html').read_text(encoding='utf-8')
encoded = base64.b64encode((OUT/'tunics.webp').read_bytes()).decode('ascii')
street = Image.open(WORK/'town-fit-preview/town-e-route.webp').convert('RGB')
street = street.crop((135,109,720,280)).resize((390,114),Image.Resampling.LANCZOS)
buffer = io.BytesIO()
street.save(buffer,format='JPEG',quality=92)
street64 = base64.b64encode(buffer.getvalue()).decode('ascii')
(OUT/'directions.html').write_text(html.replace('__DATA__',json.dumps(data)).replace('__ATLAS__',encoded).replace('__STREET__',street64),encoding='utf-8')
