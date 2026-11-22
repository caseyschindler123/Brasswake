import sys
from PIL import Image
names = sys.argv[2:]; out = sys.argv[1]; W = 300
ims = [Image.open(f'/home/claude/game/shots/{n}.png').convert('RGB') for n in names]
ims = [im.resize((W, int(im.height * W / im.width))) for im in ims]
H = max(i.height for i in ims); m = Image.new('RGB', (W * len(ims) + 6 * (len(ims) - 1), H), '#222')
for k, im in enumerate(ims): m.paste(im, (k * (W + 6), 0))
m.save(out, quality=82)
