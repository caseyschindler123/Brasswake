"""Package actual model bakes for the local, self-contained comparison."""
from pathlib import Path
from PIL import Image,ImageDraw
from io import BytesIO
import base64,json
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'work/painted-characters/model-pilot'
background=Path('C:/Users/caseys/.codex/worktrees/athletic-human-motion/Brasswake/work/wardrobe-preview/town-background.png')
def uri(image,quality=82):
    stream=BytesIO();image.save(stream,format='WEBP',quality=quality,method=6)
    return 'data:image/webp;base64,'+base64.b64encode(stream.getvalue()).decode('ascii')
images={}
# Crop transparent margins only, keeping every source pixel at native scale.
bounds=[128,128,0,0]
for look in ['body','plate']:
    for state in ['walk','run']:
        source=Image.open(OUT/(look+'-'+state+'-atlas.png'))
        for frame in range(24):
            for direction in range(8):
                bbox=source.crop((direction*128,frame*128,direction*128+128,frame*128+128)).getbbox()
                if bbox:bounds=[min(bounds[0],bbox[0]),min(bounds[1],bbox[1]),max(bounds[2],bbox[2]),max(bounds[3],bbox[3])]
left,top,right,bottom=bounds;left=max(0,left-2);top=max(0,top-2);right=min(128,right+2);bottom=min(128,bottom+2)
w,h=right-left,bottom-top
for look in ['body','plate']:
    images[look+'-front']=uri(Image.open(OUT/(look+'-front-painted.png')))
    for state in ['walk','run']:
        source=Image.open(OUT/(look+'-'+state+'-atlas.png'))
        atlas=Image.new('RGBA',(8*w,24*h))
        for frame in range(24):
            for direction in range(8):atlas.paste(source.crop((direction*128+left,frame*128+top,direction*128+right,frame*128+bottom)),(direction*w,frame*h))
        images[look+'-'+state]=uri(atlas,72)
town=Image.open(background).convert('RGB').crop((0,80,518,540));images['town']=uri(town)
motion=json.loads((OUT/'animation.json').read_text())['motion']
template=(ROOT/'arttools/painted_model_preview.html').read_text(encoding='utf-8')
fragment=template.replace('__PILOT_ASSETS__',json.dumps({'images':images,'motion':motion,'frames':24,'crop':[left,top,w,h]},separators=(',',':')))
if len(fragment.encode('utf-8'))>=1_000_000:raise ValueError('Preview exceeds inline budget: '+str(len(fragment.encode('utf-8'))))
(OUT/'fitted-plate-pilot-v3.html').write_text(fragment,encoding='utf-8')
# Portable moving comparison. No external scripts or visualization runtime.
for state in ['walk','run']:
    atlases={look:Image.open(OUT/(look+'-'+state+'-atlas.png')) for look in ['body','plate']}
    frames=[]
    for frame in range(24):
        image=town.copy();draw=ImageDraw.Draw(image)
        for look,x in [('body',210),('plate',330)]:
            sprite=atlases[look].crop((6*128,frame*128,7*128,(frame+1)*128)).resize((96,96),Image.Resampling.LANCZOS)
            draw.ellipse((x-9,337,x+9,343),fill='#716a55')
            image.paste(sprite,(x-48,262),sprite)
        frames.append(image)
    palette=frames[0].quantize(colors=256)
    frames=[image.quantize(palette=palette,dither=Image.Dither.NONE) for image in frames]
    cycle=motion[state]['cycleSeconds']*1000
    durations=[10*(round((i+1)*cycle/240)-round(i*cycle/240)) for i in range(24)]
    frames[0].save(OUT/('fitted-plate-'+state+'.gif'),save_all=True,append_images=frames[1:],duration=durations,loop=0,disposal=1,optimize=True)
print('Self-contained preview:',len(fragment.encode('utf-8')),'bytes; walk/run GIFs saved')
