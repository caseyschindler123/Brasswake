from pathlib import Path
from PIL import Image

out = Path(__file__).parent
archive = out.parent/'motion-reference'

def make_board(name, cols, rows):
    board = Image.new('RGB',(192*cols,250*len(rows)),'#efe8d8')
    for y,(folder,gait,row) in enumerate(rows):
        src = Image.open(folder/f'{gait}-pose-guide.png')
        floor = round((row+1)*1024/3)-27
        for i in range(cols):
            board.paste(src.crop((i*192+2,floor-232,(i+1)*192-2,floor+4)),(i*192+2,y*250+7))
    board.save(out/f'{name}-guide.png')

make_board('axial',4,[(out,'walk',2),(out,'run',2),(out,'walk',0),(out,'run',0)])
make_board('diagonal',8,[(archive,'walk',1),(out,'walk',1),(out,'run',1)])
