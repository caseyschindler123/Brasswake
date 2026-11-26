"""Author the Brasswake ledger mark; no external art or generation required."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]

def render(size):
    scale = 4
    im = Image.new('RGB', (512 * scale, 512 * scale), '#142e33')
    d = ImageDraw.Draw(im)
    def box(bounds, fill, radius=0, outline=None, width=1):
        bounds = tuple(round(v * scale) for v in bounds)
        if radius:
            d.rounded_rectangle(bounds, radius * scale, fill, outline, width * scale)
        else:
            d.rectangle(bounds, fill, outline, width * scale)
    def line(points, fill, width):
        d.line([(x*scale,y*scale) for x,y in points], fill, width*scale, joint='curve')
    # Opaque full-bleed square leaves generous room for operating-system masks.
    for inset in range(0,100,2):
        c = (20+inset//9,46+inset//9,51+inset//9)
        box((inset,inset,512-inset,512-inset),c,64)
    box((128,98,397,421),'#091b20',22)
    box((118,86,388,408),'#b98742',22)
    box((127,94,381,397),'#eee0b4',17)
    for y in range(363,394,7): line([(143,y),(375,y)],'#af9969',2)
    box((112,81,378,378),'#784322',20)
    box((119,88,371,371),'#925732',17)
    box((143,94,363,365),'#633b29',11, '#be9556',3)
    box((112,91,149,370),'#492b23',10)
    for y in (139,308):box((111,y,150,y+16),'#cfaa63',3)
    for x,y in ((151,105),(334,105),(151,330),(334,330)):
        box((x,y,x+21,y+21),'#d6b46e',3)
    # Embossed open-book emblem and three wave strokes tie the ledger to the sea.
    d.polygon([(x*scale,y*scale) for x,y in [(185,174),(244,188),(302,174),(302,245),(244,260),(185,245)]],fill='#d8b66d')
    line([(244,190),(244,251)],'#75462b',4)
    for y in (198,216,234):
        line([(197,y-3),(231,y+5)],'#85522f',3)
        line([(256,y+5),(290,y-3)],'#85522f',3)
    for y in (283,298):
        line([(183,y),(203,y-5),(224,y),(244,y+4),(264,y),(284,y-5),(306,y)],'#bb955b',4)
    box((348,219,397,247),'#c7a162',6)
    box((365,223,390,243),'#543722',4)
    return im.resize((size,size),Image.Resampling.LANCZOS)

if __name__ == '__main__':
    target=ROOT/'game/art/app'
    target.mkdir(parents=True,exist_ok=True)
    for size in (180,192,512):
        render(size).save(target/f'icon-{size}.png',optimize=True)
