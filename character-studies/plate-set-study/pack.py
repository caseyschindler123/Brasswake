import base64
import json
import re
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from layout import OUT, WORK, groups
sys.path.insert(0,str(WORK/'paired-side-gaits'))
from preview import figures

src=Image.open(WORK/'eight-way-painted/tunics.webp').convert('RGBA')
plate=Image.new('RGBA',src.size)
viewer=(WORK/'eight-way-carry/carry.html').read_text(encoding='utf8')
gear=json.loads(re.search(r'const gear=(.*?);\s*function png',viewer,re.S)[1])
pins=json.loads(json.dumps(gear['pins']))
completed=set()
qa={sex:Image.new('RGB',(960,720),'#ede5d8') for sex in ['man','woman']}
def coordinate(i):
    return (i%16*176,i//16*176)

def register(ids,cols,path):
    rows,_,_=figures(path,rows=len(ids)//cols,columns=cols)
    pieces=[p[0] for row in rows for p in row]
    guides=[]
    for idx in ids:
        x,y=coordinate(idx)
        ref=src.crop((x,y,x+176,y+176))
        guides.append(ref.getchannel('A').point(lambda a:255 if a>96 else 0).getbbox())
    ratio=float(np.median([(b[3]-b[1])/(p.height-4) for b,p in zip(guides,pieces)]))
    for idx,b,cut in zip(ids,guides,pieces):
        pic=cut.resize(tuple(round(v*ratio) for v in cut.size),Image.Resampling.LANCZOS)
        stamp=Image.new('RGBA',(176,176))
        # Same scale throughout the source sheet. Align the crown and head
        # center to the already registered phase, independent of armor width.
        x,y=coordinate(idx)
        ref=src.crop((x,y,x+176,y+176))
        def crown(im):
            a=np.asarray(im)[:,:,3]>96
            top=int(np.where(a)[0].min())
            return float(np.where(a[top:top+7])[1].mean()),top
        rx,ry=crown(ref);px,py=crown(pic)
        offset=(round(rx-px),ry-py)
        stamp.alpha_composite(pic,offset)
        plate.paste(stamp,(x,y))
        assert idx not in completed
        completed.add(idx)
        i=idx%64;sex='man' if idx<64 else 'woman'
        # The fitted mitt is shorter than outstretched tunic fingertips.
        # Keep hidden palms, and move exposed edge pins onto opaque metal.
        for hand,(gx,gy,visible) in enumerate(pins[idx]):
            if not visible: continue
            pixels=np.asarray(stamp)[:,:,3]
            yy,xx=np.ogrid[:176,:176]
            valid=(pixels>200)&(np.roll(pixels,2,0)>180)&(np.roll(pixels,-2,0)>180)&(np.roll(pixels,2,1)>180)&(np.roll(pixels,-2,1)>180)
            dist=np.where(valid,(xx-gx)**2+(yy-gy)**2,1e8)
            sy,sx=np.unravel_index(dist.argmin(),dist.shape)
            pins[idx][hand][:2]=[int(sx),int(sy)]
        im=stamp.copy()
        pen=ImageDraw.Draw(im)
        for k,(gx,gy,vis) in enumerate(pins[idx]):
            if vis: pen.ellipse((gx-2,gy-2,gx+2,gy+2),outline='red' if k==0 else 'blue')
        im=im.crop((30,28,150,118))
        qa[sex].paste(im,(i%8*120,i//8*90),im)
for actor in ['man','woman']:
    for name,(ids,cols) in groups(actor).items():
        register(ids,cols,OUT/f'{actor}-{name}.png')
register(list(range(8,16)),4,WORK/'painted-equipment-proof/plate-gloves.png')
assert completed==set(range(128))
for sex,board in qa.items(): board.save(OUT/f'{sex}-grips.jpg')
plate.save(OUT/'plate.webp',lossless=True,method=3)

def compressed(im,size):
    im.thumbnail(size,Image.Resampling.LANCZOS)
    import io
    io_data=io.BytesIO();im.save(io_data,'WEBP',quality=90,method=4)
    return base64.b64encode(io_data.getvalue()).decode()

dolls=[compressed(Image.open(path).convert('RGBA'),(560,680)) for path in
       [WORK/'painted-female-fit/standard-height-front-study.png',OUT/'paper-dolls.png']]
def change(old,new):
    global viewer
    assert old in viewer,old[:120]
    viewer=viewer.replace(old,new)
change('Right-handed sword carry','Brasswake · Plate fitting')
change('<canvas width=', '''<section aria-label="Outfit"><button data-outfit="plate" aria-pressed="true">Plate</button><button data-outfit="tunic" aria-pressed="false">Tunic</button><button id="weapon" aria-pressed="true">Sword</button><button id="doll" aria-pressed="false">Paper doll</button></section><img id="inventory" alt="Front-facing male and female paper dolls" style="width:100%;height:auto" hidden><canvas width=''')
change('function paintActor(',f"""let outfit='plate',armed=true,doll=false;
const plateArt=new Image();plateArt.src='data:image/webp;base64,{base64.b64encode((OUT/'plate.webp').read_bytes()).decode()}';
const platePins={json.dumps(pins,separators=(',',':'))},dollArt={json.dumps(dolls)};
function controls(){{
 document.querySelectorAll('[data-outfit]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.outfit===outfit));
 document.querySelector('#weapon').setAttribute('aria-pressed',armed);
 document.querySelector('#doll').setAttribute('aria-pressed',doll);
 document.querySelector('#inventory').hidden=!doll;
 document.querySelector('#inventory').src='data:image/webp;base64,'+dollArt[outfit==='plate'?1:0];
 for(const el of document.querySelectorAll('canvas,section[aria-label="Gait"],nav'))el.hidden=doll;
 document.querySelector('#weapon').disabled=doll;
}}
document.querySelectorAll('[data-outfit]').forEach(b=>b.onclick=()=>{{outfit=b.dataset.outfit;controls();}});
document.querySelector('#weapon').onclick=()=>{{armed=!armed;controls();}};
document.querySelector('#doll').onclick=()=>{{doll=!doll;controls();}};
controls();
function paintActor(""")
change('</style>', '[hidden]{display:none!important}section{flex-wrap:wrap}section button{padding:6px 10px}</style>')
change('gear.pins[idx][mirror?1:0]',"(outfit==='plate'?platePins:gear.pins)[idx][mirror?1:0]")
change('const pitch=pitches[gait][phase]*Math.PI/180;',
       """const returnTilt=(outfit==='plate' && gait==='run')?Math.max(0,-dx)*[8,0,0,0,12,32,36,26][phase]:0;
 const pitch=(pitches[gait][phase]+returnTilt)*Math.PI/180;""")
change('target.drawImage(atlas,',"target.drawImage(outfit==='plate'?plateArt:atlas,")
change('if(behind){sword();body();}',"if(!armed){body();}else if(behind){sword();body();}")
change('if(visible){',"if(armed&&visible&&outfit==='plate'&&!behind){target.save();target.beginPath();target.ellipse(px,py,3.7,3.4,0,0,2*Math.PI);target.clip();body();target.restore();}\n if(armed&&visible&&outfit==='tunic'){")
change('atlas.decode(),street.decode()', 'atlas.decode(),plateArt.decode(),street.decode()')
(OUT/'wardrobe.html').write_text(viewer,encoding='utf8')
