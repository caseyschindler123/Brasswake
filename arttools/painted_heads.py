"""Pack new painted directional and frontal heads with shared skull anchors."""
import argparse,hashlib,json,subprocess
from pathlib import Path
from PIL import Image,ImageFilter,ImageChops
import PIL
if PIL.__version__!='12.0.0':raise RuntimeError('Painted heads require Pillow 12.0.0')
ROOT=Path(__file__).resolve().parents[1]

def heads(raw):
    """Extract whole connected heads, retaining braid tails across grid gaps.
    Anchors keep the original grid root; no head is rescaled to its bounds.
    """
    w,h=raw.size;binary=raw.getchannel('A').point(lambda n:255 if n>100 else 0);remaining=bytearray(binary.tobytes());groups={}
    for start,value in enumerate(remaining):
        if not value:continue
        stack=[start];remaining[start]=0;points=[];l=w;t=h;r=b=0
        while stack:
            at=stack.pop();points.append(at);x=at%w;y=at//w;l=min(l,x);r=max(r,x);t=min(t,y);b=max(b,y)
            for nxt in ((at-1 if x else -1),(at+1 if x+1<w else -1),(at-w if y else -1),(at+w if y+1<h else -1)):
                if nxt>=0 and remaining[nxt]:remaining[nxt]=0;stack.append(nxt)
        if len(points)<1000:continue
        if l<2 or t<2 or r>w-3 or b>h-3:raise ValueError('Head touches the source boundary')
        col=int(((l+r)/2)/256);row=int(((t+b)/2)/256);key=(row,col)
        if key in groups or row>3 or col>5:raise ValueError('Ambiguous/touching head components')
        pixels=bytearray(w*h)
        for at in points:pixels[at]=255
        main=Image.frombytes('L',(w,h),bytes(pixels));keep=main.filter(ImageFilter.MaxFilter(9));other=ImageChops.subtract(binary,main);keep=ImageChops.subtract(keep,other)
        box=(max(0,l-4),max(0,t-4),min(w,r+5),min(h,b+5));im=raw.crop(box);im.putalpha(ImageChops.multiply(raw.getchannel('A'),keep).crop(box));groups[key]=(im,box)
    if len(groups)!=24:raise ValueError(f'Expected 24 isolated complete heads, found {len(groups)}')
    return groups

def main():
    p=argparse.ArgumentParser();p.add_argument('--pilot',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args()
    registry=json.loads((ROOT/'arttools/painted_head_inputs.json').read_text(encoding='utf-8-sig'))
    old=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify(require('./game/src/artheads')))"],cwd=ROOT,text=True))
    output=[];files=[];sources=[]
    for sex in (0,1):
        frames=[];styles=[]
        for item in sorted((e for e in registry['entries'] if e['sex']==sex),key=lambda e:e['group']):
            file=Path(registry['rawArchive'])/item['file'];
            if hashlib.sha256(file.read_bytes()).hexdigest()!=item['sha256']:raise ValueError('Head source hash differs: '+item['file'])
            raw=Image.open(file).convert('RGBA')
            if raw.size!=(1536,1024):raise ValueError('Unexpected head grid size')
            sources.append({'file':item['file'],'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
            components=heads(raw)
            for row in range(4):
                style={k:v for k,v in old[sex]['styles'][item['group']*4+row].items() if k in ('id','name','hair','beard')};style['directions']=[]
                for col in range(6):
                    crop,(l,t,r,b)=components[(row,col)];l-=col*256;t-=row*256;crop.putalpha(crop.getchannel('A').point(lambda n:0 if n<12 else min(255,round(n*255/245))))
                    scale=90/(256*.48);im=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
                    entry={'rect':None,'anchor':[(128-l)*scale,(256*.14-t)*scale,256*.48*scale,256*.48*1.087*scale],'direction':col}
                    frames.append((im,entry));style['directions'].append(entry)
                styles.append(style)
        if not frames:output.append({'atlas':'','styles':[]});continue
        atlas=Image.new('RGBA',(1024,2048));x=y=rh=2
        for im,entry in frames:
            if x+im.width+2>1024:x=2;y+=rh+2;rh=0
            if y+im.height+2>2048:raise ValueError('Head atlas overflow')
            atlas.alpha_composite(im,(x,y));entry['rect']=[x,y,im.width,im.height];entry['anchor'][0]+=x;entry['anchor'][1]+=y;x+=im.width+2;rh=max(rh,im.height)
        for style in styles:
            front=style['directions'][5];style['rect']=front['rect'];style['anchor']=front['anchor']
        atlas=atlas.crop((0,0,1024,y+rh+2));name='heads-'+('woman' if sex else 'man')+'.webp'
        target=ROOT/('work/painted-characters/replay-heads' if a.check else 'work/painted-characters' if a.pilot else 'game/art/painted')/name;target.parent.mkdir(parents=True,exist_ok=True);atlas.save(target,format='WEBP',lossless=True,method=6,exact=True)
        files.append({'path':'art/painted/'+name,'size':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'dimensions':atlas.size});output.append({'atlas':'painted/'+name,'size':atlas.size,'styles':styles})
    if not a.pilot and [len(e['styles']) for e in output]!=[12,12]:raise ValueError('All twenty-four styles and six views are required')
    text='/* Generated by arttools/painted_heads.py. Never edit coordinates. */\nconst ArtPaintedHeads = '+json.dumps(output,separators=(',',':'))+';\nif(typeof module!=="undefined")module.exports=ArtPaintedHeads;\n'
    if a.check:
        prior=json.loads((ROOT/'arttools/painted_heads_manifest.json').read_text())
        if json.loads(json.dumps(files))!=prior['files'] or text!=(ROOT/'game/src/artpaintedheads.js').read_text():raise ValueError('Head replay differs')
        print('Head replay matches two atlases and all 144 fitted views');return
    dest=ROOT/('work/painted-characters/head-pilot.js' if a.pilot else 'game/src/artpaintedheads.js');dest.write_text(text,encoding='utf8')
    if not a.pilot:(ROOT/'arttools/painted_heads_manifest.json').write_text(json.dumps({'version':1,'sources':sources,'files':files,'metadata':{'path':'game/src/artpaintedheads.js','sha256':hashlib.sha256(text.encode()).hexdigest()}},indent=2)+'\n')
if __name__=='__main__':main()
