"""Pack compact color and finish-mask frames for the two painted bodies."""
import argparse
from collections import defaultdict
import json
from pathlib import Path
import re

import numpy as np
from PIL import Image

from everyday import load_everyday, pack_dolls
from movement import CELL, GROUND, MAPPING, STUDIES, load_fittings

SCALE = .59
ORIGIN = (128, 128)
HEADING = ("S", "SW", "W", "NW", "N", "NE", "E", "SE")
SUBJECT_HEIGHTS = (133, 126)
# Logical material IDs used by PaintedCharacterView.tintPixels.
CLOTH, LEATHER, METAL, SKIN, PANTS, BOOTS, FIXED = range(1, 8)
# The fixed component paired with this material distinguishes hair from cloak slot 10.
HAIR = 10
REAR_FRAMES = {index for name, sequence in MAPPING["frames"].items()
               if name.rsplit("/", 1)[-1] in ("N", "NE")
               for index, flipped in sequence if not flipped}


def load_palms():
    html = (STUDIES / "eight-way-carry/carry.html").read_text(encoding="utf8")
    original = json.loads(re.search(r"const gear=(.*?);\s*function png", html, re.S)[1])["pins"]
    steel = (STUDIES / "plate-set-study/wardrobe.html").read_text(encoding="utf8")
    plate = json.loads(re.search(r"const platePins=(.*?),dollArt=", steel, re.S)[1])
    assert len(original) == len(plate) == 128
    return original, plate


def crown(frame):
    alpha = np.asarray(frame.getchannel("A")) > 96
    top = int(np.where(alpha)[0].min())
    left, right = np.where(alpha[top + 3:top + 9])[1].min(), np.where(alpha[top + 3:top + 9])[1].max()
    return (left + right) / 2, top


def shade_mask(frame, outfit, actor, pins, height=None, rear=False):
    pixels = np.asarray(frame, dtype=np.float32)
    red, green, blue, alpha = pixels.transpose(2, 0, 1)
    Y, X = np.ogrid[:frame.height, :frame.width]
    cx, cy = crown(frame)
    height = height or SUBJECT_HEIGHTS[actor]
    relative = (Y - cy) / height
    luma = red * .2126 + green * .7152 + blue * .0722
    warm = (red - blue) / np.maximum(luma, 24)
    bias = red - green - .7 * (green - blue)
    cloth = (warm < .66) & (bias < 19) & (luma > 59)
    skin = (warm > .43) & (bias > 17) & (luma > 76)
    metal = (warm > -.20) & (warm < .34) & (luma > 40)
    material = np.full(alpha.shape, PANTS, np.uint8)
    component = np.zeros(alpha.shape, np.uint8)
    hands = np.zeros(alpha.shape, bool)
    for x, y, visible in pins:
        if visible:
            hands |= (X - x) ** 2 + (Y - y) ** 2 <= (height * .0525) ** 2
    footwear = (relative > .79) & (luma < 154) & (warm > .31)
    material[footwear] = BOOTS
    component[footwear] = 9
    if outfit in ("plate", "knight"):
        material[metal & (relative > .16)] = METAL
        component[hands & (relative > .13)] = 8
        component[(relative > .79) & (material == METAL)] = 9
    elif outfit == "mail":
        material[cloth & (relative > .16) & (relative < .64)] = CLOTH
        material[metal & (relative > .16) & (relative < .59)] = METAL
    elif outfit == "leather":
        material[cloth & (relative > .17) & (relative < .55)] = CLOTH
        jerkin = (np.abs(X - cx) < height * .22) & (relative > .16) & (relative < .56)
        material[jerkin & ~skin & ~cloth & (luma > 49)] = LEATHER
    else:
        hem = .50 if outfit == "tunic" else .89
        material[cloth & (relative > .15) & (relative < hem)] = CLOTH
    bare = skin & ((relative < .22) | ((relative < .57) & (outfit not in ("plate", "knight"))))
    material[bare] = SKIN
    component[hands & (relative > .13)] = 8
    material[(relative <= .16) & ~bare] = FIXED
    hair = (relative <= .151) & ~bare
    if actor == 1 and rear:
        hair |= (relative < .29) & (np.abs(X - cx) < height * .096) & (warm > .35) & (luma < 117)
    material[hair & (luma > 17)] = HAIR
    component[material == HAIR] = FIXED
    result = np.zeros_like(np.asarray(frame))
    result[:, :, 0] = material * 24
    result[:, :, 2] = (component + (component == 0) * material) * 24
    result[:, :, 3] = np.where(alpha > 25, 255, 0)
    return Image.fromarray(result)


def shelf(items, width=832, height_limit=1024):
    pages = []
    pending = []
    x, y, row_height = 1, 1, 0
    for index, color, mask, offset in items:
        if x + color.width + 1 > width:
            x, y, row_height = 1, y + row_height + 2, 0
        if y + color.height + 1 > height_limit:
            pages.append((pending, y))
            pending = []
            x, y, row_height = 1, 1, 0
        pending.append((index, x, y, color, mask, offset))
        x += color.width + 2
        row_height = max(row_height, color.height)
    if pending:
        pages.append((pending, y + row_height + 1))
    return pages


def pack_family(outfit, bank, palms, dest, state=None):
    groups = defaultdict(list)
    for index, frame in bank.items():
        actor = index // 64
        image_size = round(CELL * SCALE)
        image = frame.resize((image_size, image_size), Image.Resampling.LANCZOS)
        rear = index in REAR_FRAMES if state is None else index % 64 in (3, 4)
        mask = shade_mask(frame, outfit, actor, palms[index], rear=rear)
        mask = mask.resize(image.size, Image.Resampling.NEAREST)
        clip = image.getchannel("A").getbbox()
        offset = (round(ORIGIN[0] - CELL / 2 * SCALE) + clip[0],
                  round(ORIGIN[1] - GROUND * SCALE) + clip[1])
        groups[actor].append((index, image.crop(clip), mask.crop(clip), offset))

    frames = {}
    for actor, items in groups.items():
        for number, (page, height) in enumerate(shelf(items)):
            pack = Image.new("RGBA", (832, 2 * height))
            prefix = f"{outfit}-{state}" if state else outfit
            name = f"{prefix}-{actor}-{number}.webp"
            for index, x, y, color, mask, offset in page:
                pack.paste(color, (x, y))
                pack.paste(mask, (x, y + height))
                w, h = color.size
                frames[index] = dict(file=f"painted-two-body/{name}", r=(x, y, w, h),
                                     m=(x, y + height, w, h), offset=offset,
                                     crown=crown(bank[index]), palms=palms[index])
            pack.save(dest / name, lossless=True, method=3)
    return frames


def pack_action_heads(standing, standing_pins, dest):
    """Keep the approved head on fitted directional action bodies."""
    heads, pins = {}, {}
    for index, frame in standing.items():
        actor, direction = divmod(index, 64)
        height = SUBJECT_HEIGHTS[actor]
        cx, cy = crown(frame)
        relative = (np.arange(CELL)[:, None] - cy) / height
        center = np.abs(np.arange(CELL)[None, :] - cx) < height * .13
        rear = direction in (3, 4)
        rgba = np.asarray(frame).copy()
        mask = np.asarray(shade_mask(frame, "tunic", actor, standing_pins[index], rear=rear))
        scalp = (mask[:, :, 0] == HAIR * 24) & (relative < (.28 if rear else .154))
        # The lower few pixels feather into the neck already painted with the action.
        face = np.clip((.186 - relative) / .050, 0, 1) * center
        if rear:
            face *= relative < .147
        rgba[:, :, 3] = (rgba[:, :, 3] * np.maximum(face, scalp)).astype(np.uint8)
        heads[index] = Image.fromarray(rgba)
        pins[index] = []
    return pack_family("tunic", heads, pins, dest, "action-head")


def pack(output, strict):
    banks = load_fittings(strict=strict)
    output.mkdir(parents=True, exist_ok=True)
    original, steel = load_palms()
    frames = {outfit: pack_family(outfit, bank, steel if outfit in ("plate", "knight") else original, output)
              for outfit, bank in banks.items() if bank}
    everyday, pins = load_everyday(SCALE, ORIGIN, strict)
    static = {}
    for (family, state), bank in everyday.items():
        static.setdefault(family, {})[state] = pack_family(family, bank, pins[family, state], output, state)
    dolls = pack_dolls(output, shade_mask, crown, strict)
    heads = pack_action_heads(everyday["tunic", "idle"], pins["tunic", "idle"], output)
    data = dict(**MAPPING, origin=ORIGIN, scale=SCALE, heading=HEADING, banks=frames, static=static,
                dolls=dolls, actionHeads=heads)
    (output / "movement.json").write_text(json.dumps(data, separators=(",", ":")) + "\n", encoding="utf8")
    sizes = [file.stat().st_size for file in output.glob("*.webp")]
    print(f"Packed {sum(len(bank) for bank in frames.values())} movement cells in {len(sizes)} pages "
          f"({sum(sizes):,} encoded bytes).")


if __name__ == "__main__":
    cli = argparse.ArgumentParser()
    cli.add_argument("output", type=Path)
    cli.add_argument("--partial", action="store_true")
    arg = cli.parse_args()
    pack(arg.output, strict=not arg.partial)
