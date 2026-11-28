from pathlib import Path
from PIL import Image
OUT=Path(__file__).resolve().parent
WORK=OUT.parent
from itertools import chain
def groups(actor):
    offset=0 if actor=='man' else 64
    first=list(range(8))+([] if actor=='man' else list(range(8,16)))+list(range(16,24))
    return {name:([i+offset for i in ids],cols) for name,ids,cols in
            [('forward',first,8),('axial',range(24,40),4),('diagonal',range(40,64),8)]}
if __name__=='__main__':
    im=Image.open(WORK/'eight-way-painted/tunics.webp').convert('RGBA')
    for actor in ['man','woman']:
        ids,cols=groups(actor)['forward']
        b=Image.new('RGB',(cols*150,len(ids)//cols*156),'#e8e1d2')
        for j,i in enumerate(ids):
            x,y=i%16*176,i//16*176
            cut=im.crop((x+13,y+9,x+163,y+165))
            b.paste(cut,(j%cols*150,j//cols*156),cut)
        b.save(OUT/f'{actor}-forward-guide.png')
