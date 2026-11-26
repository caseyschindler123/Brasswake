"""Pack reviewed isolated painted parts; never invent or redraw source pixels."""
import argparse, json, hashlib
from pathlib import Path
from PIL import Image

def extract(path):
    im=Image.open(path).convert('RGBA'); w,h=im.size
    alpha=im.getchannel('A'); binary=alpha.point(lambda n:255 if n>100 else 0)
    ys=[binary.crop((0,y,w,y+1)).getbbox() is not None for y in range(h)]
    bands=[]; start=None
    for y,on in enumerate(ys+[False]):
        if on and start is None:start=y
        if not on and start is not None:
            if y-start>12:bands.append((start,y))
            start=None
    if len(bands) not in (5,6):raise ValueError(f'{path}: expected 5/6 isolated rows, found {bands}')
    rows=[]
    for top,bottom in bands:
        occupied=[binary.crop((x,top,x+1,bottom)).getbbox() is not None for x in range(w)]
        gaps=[];first=None
        for x,on in enumerate(occupied+[True]):
            if not on and first is None:first=x
            if on and first is not None:
                if x-first>=4:gaps.append((first+x-1)//2)
                first=None
        cuts=[0]
        for col in range(1,5):
            candidates=[x for x in gaps if abs(x-col*w/5)<w/15]
            if not candidates:raise ValueError(f'{path}: touching parts at row {len(rows)} column {col}')
            cuts.append(min(candidates,key=lambda x:abs(x-col*w/5)))
        cuts.append(w)
        row=[]
        for col in range(5):
            l=cuts[col];r=cuts[col+1]
            b=binary.crop((l,top,r,bottom)).getbbox()
            if not b:raise ValueError('Missing part')
            x0,y0,x1,y1=b
            if x0<2 or x1>r-l-2:raise ValueError(f'{path}: clipped part row {len(rows)} column {col}')
            part=im.crop((l+x0,top+y0,l+x1,top+y1))
            # Alpha-only matte cleanup, with RGB and authored silhouettes preserved.
            part.putalpha(part.getchannel('A').point(lambda a:0 if a<12 else min(255,round(a*255/245))))
            row.append(part)
        rows.append(row)
    return rows

def material(row,outfit,x,y,r,g,b,w,h):
    """Semantic regions in the newly authored neutral costumes.

    1 dyeable cloth, 2 leather armour, 3 metal armour, 4 skin,
    5 trousers, 6 footwear, 7 fixed fasteners/trim, 8 hands, 9 boots.
    These last two allow independently equipped glove/boot shapes and finishes.
    """
    warm=r-g>18 and g-b>9
    gold=r>115 and r-g>12 and g-b>24 and (g-b)>(r-g)*.9
    if row==4 and y>h*.58:return 7 if gold else 9
    if row==2 and y>h*.58:return 8
    if row==4:return 3 if outfit==4 and not gold else 7 if outfit==4 else 6
    if row==3:
        if outfit==4:return 7 if gold else 3
        return 2 if outfit==2 and y>h*.66 and warm else 5
    if row==2:
        if outfit==0:return 4
        if outfit in (1,2) and y>h*.59 and warm and r>120:return 4
    if row==1 and outfit==0 and y>h*.48 and warm:return 4
    if outfit==3:
        if gold or r-g>12 and g-b>9:return 7
        if r-g>4 and g-b>4:return 1
        return 3
    if outfit==4:return 7 if gold or r-g>14 and g-b>10 else 3
    if outfit==2:return 7 if gold else 2
    if outfit in (0,1):
        if gold or row==0 and warm and r<135:return 7
        return 1
    return 7

def main():
    p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('output');p.add_argument('--outfit',type=int,default=2);a=p.parse_args()
    rows=extract(a.source);atlas=Image.new('RGBA',(1536,1024));mask=Image.new('RGBA',atlas.size);records=[];x=y=rh=2
    for row_number,row in enumerate(rows):
        rec=[]
        for im in row:
            if x+im.width+2>atlas.width:x=2;y+=rh+2;rh=0
            if y+im.height>atlas.height:raise ValueError('Atlas overflow')
            atlas.alpha_composite(im,(x,y));m=Image.new('RGBA',im.size)
            pixels=[]
            for i,(r,g,b,alpha) in enumerate(im.getdata()):
                xx,yy=i%im.width,i//im.width;component=8 if row_number==2 and yy>im.height*.58 else 9 if row_number==4 and yy>im.height*.58 else 0
                finish=material(row_number,a.outfit,xx,yy,r,g,b,im.width,im.height)
                if component and a.outfit>=3 and r>115 and g-b>(r-g)*1.2 and r-g>12:finish=7
                pixels.append((finish*24,0,component*24,alpha))
            m.putdata(pixels);mask.alpha_composite(m,(x,y));rec.append([x,y,im.width,im.height]);x+=im.width+2;rh=max(rh,im.height)
        records.append(rec)
    atlas=atlas.crop((0,0,1536,y+rh+2));dest=Path(a.output);dest.parent.mkdir(parents=True,exist_ok=True)
    atlas.save(dest,format='WEBP',lossless=True,method=6,exact=True)
    mask.crop((0,0,1536,y+rh+2)).save(dest.with_name(dest.stem+'-mask.webp'),format='WEBP',lossless=True,method=6,exact=True)
    dest.with_suffix('.json').write_text(json.dumps({'sourceSha256':hashlib.sha256(Path(a.source).read_bytes()).hexdigest(),'rows':records,'size':atlas.size},indent=2)+'\n')
if __name__=='__main__':main()
