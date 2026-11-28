import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from study_font import label_font
from itertools import accumulate
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

HERE = Path(__file__).resolve().parent
WORK = HERE.parent
STUDY = WORK / 'simple-female-gaits'
FONT = label_font(15)
PAPER = '#e8e1d2'
INK = '#383229'
STREET = Image.open(WORK / 'town-fit-preview/town-e-route.webp').convert('RGB')
STREET = STREET.crop((135,28,720,310)).resize((390,188), Image.Resampling.LANCZOS)

def figures(path, rows=2, columns=8):
    sheet = Image.open(path).convert('RGBA')
    alpha = sheet.getchannel('A')
    # Discover whole connected silhouettes on the original sheet, including
    # poses whose boots or a hand cross the edge of their nominal cell.
    mask = alpha.point(lambda a: 255 if a > 64 else 0)
    parts = []
    while (bbox := mask.getbbox()):
        y = bbox[1]
        x = mask.crop((0,y,sheet.width,y+1)).getbbox()[0]
        ImageDraw.floodfill(mask, (x,y), 127)
        obj = mask.point(lambda v: 255 if v == 127 else 0)
        box = obj.getbbox()
        mask.paste(0, box, obj.crop(box))
        if box[3] - box[1] > sheet.height / rows * .5:
            parts.append((box,obj))
    assert len(parts) == columns * rows, (path, len(parts))
    parts.sort(key=lambda part: part[0][1])
    nominal = max(b[3]-b[1] for b,_ in parts)
    result = []
    for r in range(rows):
        row = sorted(parts[columns*r:columns*(r+1)], key=lambda part: part[0][0])
        floor = np.median([b[3] for b,_ in row])
        poses = []
        for i,((l,t,r,b),obj) in enumerate(row):
            crop = (l-2,t-2,r+2,b+2)
            tile = sheet.crop(crop)
            component = obj.crop(crop)
            for _ in range(2):
                # Match two four-connected dilations in the approved exporter.
                component = Image.fromarray(np.maximum.reduce([
                    np.asarray(component), *[np.asarray(ImageChops.offset(component,x,y))
                    for x,y in ((1,0),(-1,0),(0,1),(0,-1))]]))
            tile.putalpha(ImageChops.multiply(tile.getchannel('A'),component))
            poses.append((tile,l-2-(i+.5)*sheet.width/columns,t-2-floor))
        result.append(poses)
    return result,nominal,sheet.width

def place(page, pose, scale, x, ground):
    tile,dx,dy = pose
    pic = tile.resize(tuple(round(v*scale) for v in tile.size), Image.Resampling.LANCZOS)
    page.paste(pic,(round(x+dx*scale),round(ground+dy*scale)),pic)

# Points on the supporting forefoot, picked from the 1086-pixel sheet views.
# Each group follows the same physical boot across three contact poses.
# Frame index 8 and 9 designate phases 0 and 1 of the following cycle.
contact_x = {
    ('woman','walk'): [(4,[500,617,734]),(8,[1047,76,191])],
    ('man','walk'): [(4,[506,619,737]),(8,[1047,77,189])],
    ('woman','run'): [(4,[514,608,711]),(8,[1063,62,171])],
    ('man','run'): [(4,[514,606,717]),(8,[1060,66,171])],
}

def travel_fit(actor,gait,delays,scale,sheet_w):
    times = [0,*accumulate(delays)]
    groups = []
    for one_based,xs in contact_x[actor,gait]:
        ts,locs = [],[]
        for j,x in enumerate(xs):
            idx = one_based-1+j
            phase = idx%8
            ts.append((times[phase]+(idx//8)*times[8])/1000)
            locs.append((x/1086-(phase+.5)/8)*sheet_w*scale)
        groups.append((np.array(ts),np.array(locs)))
    t = np.concatenate([ts-ts.mean() for ts,_ in groups])
    q = np.concatenate([xs-xs.mean() for _,xs in groups])
    speed = -np.dot(t,q)/np.dot(t,t)
    drift = max(np.ptp(xs+ts*speed) for ts,xs in groups)
    print(f'{actor} {gait}: {speed:.1f} px/s, max sampled horizontal roll/drift {drift:.2f} px')
    corrections = np.zeros(8)
    for (one_based,_),(ts,xs) in zip(contact_x[actor,gait],groups):
        world = ts*speed+xs
        for j,residual in enumerate(world-world.mean()):
            corrections[(one_based-1+j)%8] = -residual
    for i in (2,6):
        corrections[i] = (corrections[i-1]+corrections[i+1])/2
    steps = speed*np.array(delays)/1000+np.roll(corrections,-1)-corrections
    assert min(steps)>0
    for (one_based,_),(ts,xs) in zip(contact_x[actor,gait],groups):
        grounded = xs+ts*speed+corrections[(one_based-1+np.arange(3))%8]
        assert np.ptp(grounded)<1e-8
    return speed,corrections

def save_gif(shots,delays,target):
    sample = Image.new('RGB',(390*4,shots[0].height*2))
    for i,im in enumerate(shots[:8]):
        sample.paste(im,(390*(i%4),im.height*(i//4)))
    palette = sample.quantize(256)
    indexed = [im.quantize(palette=palette,dither=Image.Dither.NONE) for im in shots]
    indexed[0].save(target,save_all=True,append_images=indexed[1:],duration=delays,
                    loop=0,optimize=False,disposal=1)
    with Image.open(target) as gif:
        assert gif.n_frames == len(shots) and gif.size == shots[0].size and gif.info['loop']==0
        assert [gif.seek(i) or gif.info['duration'] for i in range(gif.n_frames)]==delays

if __name__ == '__main__':
    banks = {'man':figures(HERE/'painted-male.png'),
             'woman':figures(STUDY/'painted-gaits.png')}
    for row,gait in enumerate(('walk','run')):
        with Image.open(STUDY/f'{gait}.gif') as clip:
            delays = [clip.seek(i) or clip.info['duration'] for i in range(8)]
        specs = [('man',43,156,111,127),('woman',41,148,269,184)]
        speeds = {who:travel_fit(who,gait,delays,h/banks[who][1],banks[who][2])
                  for who,h,_,_,_ in specs}
        shots = []
        elapsed = 0
        loops = 4 if gait=='walk' else 2
        for n in range(8*loops):
            phase = n%8
            page = Image.new('RGB',(390,386),PAPER)
            ImageDraw.Draw(page).text((12,7),gait.capitalize(),font=FONT,fill=INK)
            page.paste(STREET,(0,198))
            for who,h,large,x,street_x in specs:
                poses,nominal,_ = banks[who]
                place(page,poses[row][phase],large/nominal,x,182)
                speed,adjust = speeds[who]
                place(page,poses[row][phase],h/nominal,street_x+speed*elapsed/1000+adjust[phase],360)
            shots.append(page)
            elapsed += delays[phase]
        save_gif(shots,delays*loops,HERE/f'paired-{gait}.gif')
        shots[7].save(HERE/f'{gait}-review.png')

    # This source has a pale matte with nonzero alpha throughout. Use the
    # brown paint's chroma and luma to extract its contour at native size.
    diagonal = Image.open(HERE/'three-quarter-sheet.png').convert('RGB')
    rgb = np.asarray(diagonal,dtype=float)
    weight = np.maximum((rgb.max(2)-rgb.min(2)-12)/16,(205-rgb.max(2))/30)
    diagonal.putalpha(Image.fromarray(np.uint8(255*np.clip(weight,0,1))))
    diagonal.save(HERE/'three-quarter-cutout.png')
    diagonal_rows,nominal,_ = figures(HERE/'three-quarter-cutout.png',columns=4)
    poses = diagonal_rows[0]+diagonal_rows[1]
    shots = []
    for pose in poses:
        page = Image.new('RGB',(390,230),PAPER)
        ImageDraw.Draw(page).text((12,7),'Three-quarter run',font=FONT,fill=INK)
        place(page,pose,160/nominal,172,196)
        place(page,pose,43/nominal,295,196)
        shots.append(page)
    save_gif(shots,delays,HERE/'three-quarter-run.gif')
    shots[3].save(HERE/'diagonal-review.png')
