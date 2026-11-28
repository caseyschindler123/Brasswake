"""Register everyday poses to the existing physical origin and pack separately painted inventory art."""
import io
import json
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image

from movement import ACTORS, CELL, GROUND, HERE, STUDIES, ATLAS_HEIGHTS, preview

VIEWS = ("S", "SE", "E", "NE", "N")
WORLD_DIRECTIONS = (0, 7, 6, 5, 4)
FAMILIES = ("tunic", "robe", "leather", "mail", "plate", "knight")
DOLL_SIZE = (300, 450)
REFERENCE = {
    "tunic": STUDIES / "painted-female-fit/standard-height-front-study.png",
    "plate": STUDIES / "plate-set-study/paper-dolls.png",
    "robe": STUDIES / "outfit-material-study/paintings/exec-a9975cd8-1392-44c5-8d14-46718e944a58.png",
    "leather": STUDIES / "outfit-material-study/paintings/exec-9c89e691-9036-491e-b6b2-4b4061992483.png",
}


def legacy_frames():
    script = """
      const fs=require('node:fs'),vm=require('node:vm');
      const input=process.argv[1], ctx=vm.createContext({ArtData:{},atob});
      vm.runInContext(fs.readFileSync(input,'utf8'),ctx);
      const p=ctx.ArtData.painted;
      const output=[p.combos[1],p.combos[16]].map(model =>
        Object.fromEntries(['idle','sit'].map(state => [state,
          [0,7,6,5,4].map(d => model.states[state].frames[p.sourceDirections.indexOf(d)][0])])));
      console.log(JSON.stringify(output));
    """
    data = STUDIES.parent / "game/src/artpainted.js"
    return json.loads(subprocess.check_output(["node", "-e", script, str(data)], encoding="utf8"))


def load_everyday(scale, origin, strict):
    source = json.loads((HERE / "sources.json").read_text(encoding="utf8"))
    reference = legacy_frames()
    banks = {}
    pins = {}
    for look in FAMILIES:
        for actor, name in enumerate(ACTORS):
            record = source.get(f"{name}-{look}-everyday")
            if not record:
                if not strict:
                    continue
                raise ValueError(f"Missing standing and sitting sheet for {name}/{look}")
            path = HERE / "paintings" / record["file"]
            buffer = io.BytesIO()
            preview.clean_sheet(path).save(buffer, "PNG")
            buffer.seek(0)
            rows, _, _ = preview.figures(buffer, columns=5)
            standing_height = np.median([piece.height - 4 for piece, _, _ in rows[0]])
            factor = ATLAS_HEIGHTS[actor] / standing_height
            for row, state in enumerate(("idle", "sit")):
                key = (look, state)
                bank = banks.setdefault(key, {})
                anchors = pins.setdefault(key, {})
                for view, (cut, _, _) in enumerate(rows[row]):
                    old = reference[actor][state][view]
                    rootx = CELL / 2 + (old["head"][1] - origin[0]) / scale
                    foot = max(foot[1] for foot in old["feet"])
                    floor = GROUND + (foot - origin[1]) / scale
                    part = cut.resize(tuple(round(n * factor) for n in cut.size), Image.Resampling.LANCZOS)
                    pieces = preview.alpha_box(part)
                    top = pieces[1]
                    crown = np.asarray(part.getchannel("A"))[top + 3:top + 10]
                    headx = (np.where(crown > 96)[1].min() + np.where(crown > 96)[1].max()) / 2
                    frame = Image.new("RGBA", (CELL, CELL))
                    shift = (round(rootx - headx), round(floor - pieces[3]))
                    assert all(0 <= value <= CELL for value in (pieces[0] + shift[0], pieces[1] + shift[1],
                                                                pieces[2] + shift[0], pieces[3] + shift[1]))
                    frame.paste(part, shift)
                    index = actor * 64 + view
                    bank[index] = frame
                    anchors[index] = [
                        [round((old["sockets"][key]["p"][0] - origin[0]) / scale + CELL / 2, 2),
                         round((old["sockets"][key]["p"][1] - origin[1]) / scale + GROUND, 2), True]
                        for key in ("rightPalm", "leftPalm")]
    return banks, pins


def source_doll(path):
    image = Image.open(path).convert("RGBA")
    pixels = np.asarray(image, dtype=np.int16)
    if pixels[0, 0, 3] > 125:
        # The approved original frontal tunic painting uses a flat paper ground.
        color = pixels[0, 0, :3]
        spread = np.max(abs(pixels[:, :, :3] - color), axis=2)
        image.putalpha(Image.fromarray(np.uint8(255 * np.clip((spread - 5) / 17, 0, 1))))
    return image


def paper_palms(figure, head, height):
    alpha = np.asarray(figure.getchannel("A")) > 120
    guesses = []
    for side in (-1, 1):
        # The approved frontal hands are lowered at the outer hips.
        lower = min(figure.height, round(head[1] + height * .62))
        upper = round(head[1] + height * .49)
        yy, xx = np.nonzero(alpha[upper:lower])
        yy = yy + upper
        visible = side * (xx - head[0]) > height * .13
        x, y = xx[visible], yy[visible]
        assert len(x)
        score = side * (x - head[0]) + y * .26
        order = np.argsort(score)[-max(8, min(90, len(score) // 6)):]
        guesses.append([round(float(np.mean(x[order])) - side * height * .009, 2),
                        round(float(np.mean(y[order])) + height * .006, 2), True])
    return guesses


def pack_dolls(output, mask, crown, strict=True):
    source = json.loads((HERE / "sources.json").read_text(encoding="utf8"))
    configs = {}
    for look in FAMILIES:
        path = REFERENCE.get(look)
        if path is None:
            record = source.get(look + "-dolls")
            if not record and not strict:
                continue
            path = HERE / "paintings" / record["file"]
        pair = source_doll(path)
        frames = []
        for actor in range(2):
            piece = pair.crop((actor * pair.width // 2, 0, (actor + 1) * pair.width // 2, pair.height))
            piece = piece.crop(preview.alpha_box(piece))
            height = (396, 378)[actor]
            factor = height / piece.height
            piece = piece.resize((round(piece.width * factor), height), Image.Resampling.LANCZOS)
            cx, cy = crown(piece)
            figure = Image.new("RGBA", DOLL_SIZE)
            offset = (round(150 - cx), 424 - height)
            figure.alpha_composite(piece, offset)
            cx, cy = cx + offset[0], cy + offset[1]
            palms = paper_palms(figure, (cx, cy), height)
            name = f"doll-{look}-{actor}.webp"
            atlas = Image.new("RGBA", (DOLL_SIZE[0], 2 * DOLL_SIZE[1]))
            atlas.paste(figure, (0, 0))
            atlas.paste(mask(figure, look, actor, palms, height=height), (0, DOLL_SIZE[1]))
            atlas.save(output / name, lossless=True, method=3)
            frames.append(dict(file="painted-two-body/" + name, r=[0, 0, *DOLL_SIZE],
                               m=[0, DOLL_SIZE[1], *DOLL_SIZE], crown=[cx, cy],
                               palms=palms, height=height))
        configs[look] = frames
    return configs
