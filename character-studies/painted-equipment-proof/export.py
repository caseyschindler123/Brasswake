from math import atan2, cos, sin, radians
from pathlib import Path
import sys
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
PAIRED = HERE.parent / 'paired-side-gaits'
sys.path.insert(0, str(PAIRED))
from preview import figures, place, save_gif, travel_fit, contact_x, STREET, PAPER, INK, FONT

with Image.open(PAIRED / 'three-quarter-run.gif') as timing:
    delays = [timing.seek(i) or timing.info['duration'] for i in range(8)]

def make_board(label):
    page = Image.new('RGB', (390,386), PAPER)
    ImageDraw.Draw(page).text((12,7), label, font=FONT, fill=INK)
    page.paste(STREET, (0,198))
    return page

def preview(name, label, actors, travel=None):
    shots = []
    elapsed = 0
    cycles = 2 if travel else 1
    for frame in range(8*cycles):
        i = frame%8
        shot = make_board(label)
        for index,(poses, nominal, large, small, x, street_x) in enumerate(actors):
            place(shot, poses[i], large/nominal, x,184)
            if travel:
                speed,offsets = travel[index]
                street_x += speed*elapsed/1000+offsets[i]
            place(shot, poses[i], small/nominal, street_x,359)
        shots.append(shot)
        elapsed += delays[i]
    save_gif(shots,delays*cycles,HERE/f'{name}.gif')
    montage = Image.new('RGB',(4*195,2*193))
    for i,shot in enumerate(shots[:8]):
        montage.paste(shot.resize((195,193),Image.Resampling.LANCZOS),(195*(i%4),193*(i//4)))
    montage.save(HERE/f'{name}-review.jpg')
    shots[2].save(HERE/f'{name}-phone.png')

def flatten(path):
    rows,height,_ = figures(path,columns=4)
    return rows[0]+rows[1],height

female,fh = flatten(HERE/'woman.png')
diagonal,mh = flatten(PAIRED/'three-quarter-cutout.png')
preview('paired-diagonal','Three-quarter run',[(diagonal,mh,156,43,100,160),
                                              (female,fh,148,41,266,238)])

# Socket measurements are in the 845 x 465 inspection image. Use the actual
# inventory sprite, pivot and physical length from the shipped gear atlas.
import json
repo = HERE.parent.parent
meta = (repo/'game/src/artpaintedgear.js').read_text(encoding='utf-8')
entry = json.loads(meta[meta.index('{'):].strip().rstrip(';'))['entries']['w1']
x,y,w,h = entry['rect']
sword = Image.open(repo/'game/art/paintedgear/gear.webp').convert('RGBA').crop((x,y,x+w,y+h))
pivot = (entry['pivot'][0]*w, entry['pivot'][1]*h)
measurements = [
    ((139.5,126.5),(132,126)), ((373,93),(367,100)), ((584,79.5),(578,88)),
    ((792,104),(784,108)), ((131,367),(123,364)), ((323,357),(315,352)),
    ((533,351),(525,347)), ((750,357),(742,353)),
]
src = Image.open(HERE/'plate-gloves.png').convert('RGBA')
poses,ph = flatten(HERE/'plate-gloves.png')
equipped = []
for i,((tile,dx,dy),(p,wrist)) in enumerate(zip(poses,measurements)):
    col,row = i%4,i//4
    # Use the sheet alpha only to locate the exact source rectangle. The
    # stored pose offsets retain the source sheet's root registration.
    left,top = round(col*src.width/4),round(row*src.height/2)
    box = (left,top,round((col+1)*src.width/4),round((row+1)*src.height/2))
    cell = src.crop(box)
    sx = round(dx+(col+.5)*src.width/4)
    # Match the full component's opaque leading row to exclude loose specks.
    ty,tx = np.argwhere(np.asarray(tile)[:,:,3]>160)[0]
    source_column = np.asarray(cell)[:,sx+int(tx)-left,3]
    candidates = np.where(source_column>160)[0]
    sy = top + int(candidates[0]) - int(ty)
    x0,y0 = (p[0]*src.width/845, p[1]*src.height/465)
    # Preview the hand at native painting resolution before reducing it.
    margin = 220
    size = (tile.width+margin*2,tile.height+margin*2)
    body = Image.new('RGBA',size)
    body.alpha_composite(tile,(margin,margin))
    px,py = x0-sx+margin,y0-sy+margin
    assert body.getpixel((round(px),round(py)))[3] > 180
    angle = atan2((p[1]-wrist[1])*src.height/465,(p[0]-wrist[0])*src.width/845)-radians(48)
    ux,uy = cos(angle),sin(angle)
    scale = (entry['length']/1.8)*ph/sword.height
    xx,xy = -uy/scale,ux/scale
    yx,yy = -ux/scale,-uy/scale
    matrix = (xx,xy,pivot[0]-xx*px-xy*py,yx,yy,pivot[1]-yx*px-yy*py)
    layer = sword.transform(size,Image.Transform.AFFINE,matrix,Image.Resampling.BICUBIC)
    composed = Image.alpha_composite(body,layer)
    knuckles = Image.new('L',size)
    ImageDraw.Draw(knuckles).ellipse((px-12,py-12,px+12,py+12),fill=255)
    knuckles = ImageChops.multiply(knuckles.filter(ImageFilter.GaussianBlur(.65)),body.getchannel('A'))
    composed.paste(body,(0,0),knuckles)
    equipped.append((composed,dx-margin,dy-margin))

side,sh,sw = figures(PAIRED/'painted-male.png')
# Match the body height across all eight run phases. The approved tunic bank
# was originally normalized over walk AND run, the plate bank over run alone.
body_reference = sh*np.median([a[0].height/b[0].height for a,b in zip(poses,side[1])])
# Remap the plate's 4-by-2 inspection coordinates to the earlier estimator's
# 8-by-1 strip convention. Mark the same part of the supporting boot.
marks = [(4,[791,102,280]),(8,[796,104,280])]
contact_x['plate','run'] = [(start,[((x/845 + (((start-1+j)%8)//4))/2)*1086
                                   for j,x in enumerate(xs)]) for start,xs in marks]
travel = [travel_fit('man','run',delays,43/sh,sw),
          travel_fit('plate','run',delays,43/body_reference,src.width*2)]
preview('plate-carry','Tunic and plate · side run',[(side[1],sh,153,43,90,125),
                                                   (equipped,body_reference,153,43,267,194)],travel)
