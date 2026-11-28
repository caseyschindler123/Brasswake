import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from study_font import label_font
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw, ImageFont

out=Path(__file__).resolve().parent
archive=out.parent/'motion-reference'
sheet=np.asarray(Image.open(out/'painted-gaits.png').convert('RGBA'))
labels,_=ndimage.label(sheet[:,:,3]>64)
figures=[(n,b) for n,b in enumerate(ndimage.find_objects(labels),1) if b and b[0].stop-b[0].start>180]
assert len(figures)==16
figures.sort(key=lambda obj:obj[1][0].start)
street=Image.open(out.parent/'town-fit-preview/town-e-route.webp').convert('RGB')
street=street.crop((135,109,720,250)).resize((390,94),Image.Resampling.LANCZOS)
font=label_font(15)
small=label_font(12)
# Both views use the same scale throughout both cycles. The bounding box
# trims empty pixels only. Placement always refers back to the sheet cell.
nominal=max(b[0].stop-b[0].start for _,b in figures)
cell=sheet.shape[1]/8
for row,gait in enumerate(('walk','run')):
    poses=sorted(figures[row*8:row*8+8],key=lambda obj:obj[1][1].start)
    floor=np.median([b[0].stop for _,b in poses])
    clip=Image.open(archive/f'female-average-{gait}.gif')
    delays=[clip.seek(i) or clip.info['duration'] for i in range(clip.n_frames)]
    shots=[]
    for i,(n,(ys,xs)) in enumerate(poses):
        y0=ys.start-2;x0=xs.start-2
        sel=np.s_[y0:ys.stop+2,x0:xs.stop+2]
        tile=sheet[sel].copy()
        tile[:,:,3]*=ndimage.binary_dilation(labels[sel]==n,iterations=2)
        sprite=Image.fromarray(tile)
        dx=x0-(i+.5)*cell
        dy=y0-floor
        page=Image.new('RGB',(390,284),'#e8e1d2')
        d=ImageDraw.Draw(page)
        d.text((12,9),gait.capitalize(),font=font,fill='#383229')
        page.paste(street,(0,190))
        for x,y,height in [(195,172,148),(121,258,41)]:
            scale=height/nominal
            pic=sprite.resize(tuple(round(s*scale) for s in sprite.size),Image.Resampling.LANCZOS)
            page.paste(pic,(round(x+dx*scale),round(y+dy*scale)),pic)
        d.text((12,171),'Town scale',font=small,fill='#514639')
        shots.append(page)
    # Use one palette for the cycle to keep highlights from flickering.
    contact=Image.new('RGB',(390*4,284*2))
    for i,im in enumerate(shots):contact.paste(im,(390*(i%4),284*(i//4)))
    pal=contact.quantize(colors=256)
    indexed=[im.quantize(palette=pal,dither=Image.Dither.NONE) for im in shots]
    target=out/(gait+'.gif')
    indexed[0].save(target,save_all=True,append_images=indexed[1:],duration=delays,loop=0,optimize=False,disposal=1)
    with Image.open(target) as g:
        assert g.n_frames==8 and g.info['loop']==0 and g.size==(390,284)
        assert [g.seek(i) or g.info['duration'] for i in range(8)]==delays
    contact.thumbnail((800,294));contact.save(out/(gait+'-check.png'))
    print(gait,delays,sum(delays),target.stat().st_size)
