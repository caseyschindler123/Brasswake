import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from study_font import label_font
from PIL import Image, ImageDraw, ImageFont
import numpy as np

out = Path(__file__).resolve().parent
guide = Image.open(out/'right-support-guide.png').convert('RGB')
pixels = np.asarray(guide, dtype=float)
distance = np.max(np.abs(pixels - pixels[0,0]), axis=2)
guide.putalpha(Image.fromarray(np.uint8(255*np.clip((distance-2)/12,0,1))))
guide = guide.crop(guide.getbbox())
study = Image.open(out/'female-side-stance.png').convert('RGBA')
study = study.crop(study.getchannel('A').point(lambda v:255 if v>=64 else 0).getbbox())
resample = Image.Resampling.LANCZOS
board = Image.new('RGB',(390,400),'#e8e1d2')
ink='#3e3428'
font=label_font(15)
small=label_font(13)
draw=ImageDraw.Draw(board)
for x,label in [(98,'Mixamo guide'),(292,'Female side study')]:
    draw.text((x,11),label,font=font,fill=ink,anchor='mt')

def place(page, im, x, ground, height):
    tile=im.resize((round(im.width*height/im.height),height),resample)
    page.paste(tile,(x-tile.width//2,ground-height),tile)

for x,im in [(98,guide),(292,study)]:
    place(board,im,x,256,217)
draw.line((14,257,376,257),fill='#c7bdab')
draw.text((12,269),'Town scale · 390 px phone view',font=small,fill=ink)
town=Image.open(out.parent/'town-fit-preview/town-e-route.webp').convert('RGB')
# Source capture is 1.5 device pixels per game CSS pixel.
street=town.crop((150,111,735,282)).resize((390,114),resample)
board.paste(street,(0,286))
for x,im in [(98,guide),(292,study)]:
    place(board,im,x,355,41)
board.save(out/'female-side-review.png')
