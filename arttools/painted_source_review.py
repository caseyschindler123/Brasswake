"""Source alpha/layout checks and isolated-thigh review contact, no redraw."""
import json,runpy
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1];extract=runpy.run_path(str(root/'arttools/painted_parts.py'))['extract']
registry=json.loads((root/'arttools/painted_character_inputs.json').read_text(encoding='utf-8-sig'));report=[]
board=Image.new('RGB',(1000,1440),'#eee7d6');draw=ImageDraw.Draw(board)
for entry in sorted(registry['entries'],key=lambda e:e['id']):
    at=entry['id']-1;x=(at%5)*200;y=(at//5)*240;draw.text((x+8,y+5),str(entry['id']),fill='#34291f')
    file=Path(registry['rawArchive'])/entry['file']
    try:
        rows=extract(file);im=rows[3][0].copy();im.thumbnail((150,200));board.paste(im,(x+(200-im.width)//2,y+26),im);report.append({'id':entry['id'],'rows':len(rows),'layout':'passed'})
    except ValueError as error:draw.text((x+8,y+40),'FAILED alpha/layout',fill='red');report.append({'id':entry['id'],'error':str(error)})
out=root/'work/painted-characters';board.save(out/'thigh-source-review.png');(out/'source-review.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps([e for e in report if 'error' in e]))
