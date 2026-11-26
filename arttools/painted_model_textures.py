"""Pad projected source colors for UV sampling; raw paintings stay unchanged."""
from pathlib import Path
from PIL import Image
from collections import deque
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
registry=json.loads((ROOT/'arttools/painted_model_inputs.json').read_text(encoding='utf-8'))
out=ROOT/'work/painted-characters/model-pilot'
for item in registry['entries']:
    source=Path(registry['rawArchive'])/item['file']
    if hashlib.sha256(source.read_bytes()).hexdigest()!=item['sha256']:raise ValueError('Source hash differs')
    im=Image.open(source).convert('RGBA')
    if im.size!=(1536,1024):raise ValueError('Expected three registered projection panels')
    padded=Image.new('RGB',im.size)
    for panel in range(3):
        part=im.crop((panel*512,0,(panel+1)*512,1024))
        # Register the painted atlas to the fixed camera guide. A whole panel
        # translation corrects image-generation drift; model geometry is intact.
        dx,dy=item.get('panelTranslationPixels',[[0,0]]*3)[panel]
        registered=Image.new('RGBA',part.size);registered.paste(part,(dx,dy));part=registered
        pixels=list(part.getdata());colors=[p[:3] for p in pixels];seen=bytearray(512*1024);queue=deque()
        for i,p in enumerate(pixels):
            if p[3]>=248:seen[i]=1;queue.append(i)
        if not queue:raise ValueError('Empty projected source')
        # Standard nearest-color texture bleed. The model supplies output alpha;
        # this extends opaque foreground RGB through the antialiased fringe.
        # Low-alpha generated fringe includes matte colors and is not a seed.
        while queue:
            at=queue.popleft();x=at%512;y=at//512
            for nxt in ((at-1 if x else -1),(at+1 if x<511 else -1),(at-512 if y else -1),(at+512 if y<1023 else -1)):
                if nxt>=0 and not seen[nxt]:seen[nxt]=1;colors[nxt]=colors[at];queue.append(nxt)
        tile=Image.new('RGB',(512,1024));tile.putdata(colors);padded.paste(tile,(panel*512,0))
    padded.save(out/(item['id']+'-paint.png'))
    print(item['id']+' registered texture padded')
