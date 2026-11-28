"""Pack independent scalp, hair and beard layers for the painted-character preview."""
import base64
import io
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
STUDY = HERE.parent
sys.path.insert(0, str(STUDY))
sys.path.insert(0, str(STUDY / "paired-side-gaits"))
from preview import save_gif
from study_font import label_font

LOOKS = ("tunic", "plate")
ACTORS = ("man", "woman")
DIRECTIONS = ("S", "SE", "E", "NE", "N", "doll")
HEAD = 192
SKULL = 142
ORIGIN = (96, 24)
PAPER = "#e8e1d2"
INK = "#383229"
WORLD_HEIGHT = ((27, 27, 25, 25, 25), (25, 25, 25, 26, 25))
# Top offset, width relative to the scalp, bottom height, horizontal shift.
HAIR_FIT = (
    (-.052, 1.13, .609, .00),
    (-.047, 1.16, .647, -.067),
    (-.032, 1.03, .699, -.068),
    (-.046, 1.11, .679, -.023),
    (-.051, 1.14, .682, .00),
    (-.045, 1.13, .600, .00),
)
# Jaw placement by camera. Full beards extend below the short trim.
BEARD_FIT = {
    0: (.427, .83, .861, .003),
    1: (.420, .83, .883, .050),
    2: (.421, .675, .825, .144),
    5: (.411, .830, .821, .00),
}
PALETTES = {
    "Chestnut": ("#3b241b", "#805638", "#c99561"),
    "Black": ("#1f1919", "#49403b", "#8c7968"),
    "Copper": ("#492619", "#995738", "#d99867"),
    "Silver": ("#342b28", "#8d8177", "#e4d7bd"),
}
MAPPING = json.loads((STUDY / "eight-way-painted/mapping.json").read_text())
SOURCE = json.loads((HERE / "sources.json").read_text(encoding="utf-8"))
CELL, GROUND = MAPPING["cell"], MAPPING["ground"]
STREET = Image.open(STUDY / "town-fit-preview/town-e-route.webp").convert("RGB")
STREET = STREET.crop((135, 109, 720, 280)).resize((390, 114), Image.Resampling.LANCZOS)


def rgba(path):
    return Image.open(path).convert("RGBA")


def box(image):
    return image.getchannel("A").point(lambda a: 255 if a > 95 else 0).getbbox()


def pieces(name, cols):
    path = HERE / "paintings" / SOURCE[name]["file"]
    img = rgba(path)
    alpha = np.asarray(img.getchannel("A"), dtype=float)
    img.putalpha(Image.fromarray(np.uint8(np.clip((alpha - 9) * 255 / 246, 0, 255))))
    cut = []
    for row in range(2):
        for col in range(cols):
            tile = img.crop((round(col * img.width / cols), round(row * img.height / 2),
                             round((col + 1) * img.width / cols), round((row + 1) * img.height / 2)))
            left, top, right, bottom = box(tile)
            cut.append(tile.crop((left - 2, top - 2, right + 2, bottom + 2)))
    return cut


def crown(image):
    opaque = np.asarray(image.getchannel("A")) > 96
    top = int(np.nonzero(opaque)[0].min())
    center = float(np.nonzero(opaque[top:top + 6])[1].mean())
    return round(center), top


def fit_layers():
    skin = pieces("base", 6)
    hair = pieces("hair", 6)
    beard = pieces("beard", 4)
    data = {}
    for actor in range(2):
        for angle in range(6):
            raw = skin[actor * 6 + angle]
            size = (round(raw.width * SKULL / raw.height), SKULL)
            base = raw.resize(size, Image.Resampling.LANCZOS)
            center, top = crown(base)
            x, y = ORIGIN[0] - center, ORIGIN[1] - top
            # Let the painted torso supply the lower neck and collar edge.
            alpha = np.asarray(base.getchannel("A"), dtype=float)
            fade = np.clip((SKULL - np.arange(SKULL)) / 18, 0, 1)[:, None]
            base.putalpha(Image.fromarray(np.uint8(alpha * fade)))
            page = Image.new("RGBA", (HEAD, HEAD))
            page.alpha_composite(base, (x, y))
            data["skin", actor, 0, angle] = page
            for style in range(2):
                source = hair[style * 6 + angle]
                top, width, bottom, center = HAIR_FIT[angle]
                top -= (.13 if angle in (0, 4, 5) else .095) if style == 1 else 0
                w = round(base.width * width)
                h = round((bottom - top) * SKULL)
                layer = Image.new("RGBA", page.size)
                target = (round(x + (base.width - w) / 2 + base.width * center), round(y + top * SKULL))
                layer.alpha_composite(source.resize((w, h), Image.Resampling.LANCZOS), target)
                data["hair", actor, style, angle] = layer
            if actor == 0 and angle in BEARD_FIT:
                col = 3 if angle == 5 else angle
                for style in range(2):
                    source = beard[style * 4 + col]
                    top, width, bottom, center = BEARD_FIT[angle]
                    bottom += .102 if style == 1 else 0
                    w = round(base.width * width)
                    h = round((bottom - top) * SKULL)
                    layer = Image.new("RGBA", page.size)
                    target = (round(x + (base.width - w) / 2 + base.width * center), round(y + top * SKULL))
                    layer.alpha_composite(source.resize((w, h), Image.Resampling.LANCZOS), target)
                    data["beard", actor, style, angle] = layer
    return data


# Old scalp boundary in painted frame coordinates from the approved crown.
# Point order follows the shoulder edge from left to right.
HEAD_CUT = (
    ((-12, 16), (-9, 19), (-6, 20), (-5, 23), (5, 23), (7, 19), (11, 17)),
    ((-13, 16), (-10, 18), (-6, 21), (1, 20), (4, 24), (11, 24), (15, 19)),
    ((-13, 15), (-10, 18), (-6, 20), (1, 19), (6, 21), (13, 22), (16, 18)),
    ((-13, 16), (-11, 17), (-6, 20), (5, 21), (9, 20), (13, 16)),
    ((-12, 16), (-9, 19), (-6, 21), (6, 21), (9, 19), (12, 16)),
)
# Relative regions of the original woman's ponytail by native heading.
TAIL = (None, (-18, -2, 12, 30), (-24, -3, 12, 36), (-15, 4, 17, 42), (-10, 10, 16, 41))


def remove_tail(frame, actor, angle, cx, cy, donor):
    region = TAIL[angle]
    if actor == 0 or region is None:
        return frame
    x0, x1, y0, y1 = region
    original = np.array(frame)
    output = original.copy()
    if angle in (1, 2):
        # The side tail crosses both open space and a shoulder. Reuse the
        # corresponding outfit and gait material where the shoulder continues.
        source, (source_x, source_y, _) = donor
        left, top, right, bottom = cx + x0, cy + y0, cx + x1, cy + y1
        tail = original[top:bottom, left:right].astype(float)
        r, g, b, a = tail.transpose(2, 0, 1)
        warm = (r - b) / np.maximum(r, 25)
        candidate = np.uint8(255 * ((r * .3 + g * .6 + b * .1 < 116) & (warm > .30) & (a > 20)))
        mask = Image.fromarray(candidate).filter(ImageFilter.MaxFilter(3))
        mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
        mask = mask.filter(ImageFilter.GaussianBlur(.57))
        sy = np.rint(source_y - 1 + (np.arange(top, bottom) - cy) / .95).astype(int)
        sx = np.rint(source_x + (np.arange(left, right) - cx) / .95).astype(int)
        # Slightly lower shoulders keep a narrow neck opening at the new collar.
        shoulder = np.array(source)[np.ix_(sy, sx)]
        output[top:bottom, left:right] = np.array(Image.composite(
            Image.fromarray(shoulder), frame.crop((left, top, right, bottom)), mask))
        return Image.fromarray(output)

    for y in range(cy + y0, cy + y1):
        row = original[y].astype(float)
        r, g, b, a = row.T
        warm = (r - b) / np.maximum(r, 25)
        bad = (r * .3 + g * .6 + b * .1 < 101) & (warm > .31) & (a > 31)
        marked = np.flatnonzero(bad[cx + x0:cx + x1]) + cx + x0
        good = np.where((a >= 120) & ~bad)[0]
        for x in marked:
            # The rear tail lies over the painted torso. Continue its color across the gap.
            left, right = good[good < x], good[good > x]
            if len(left) and len(right):
                p, q = left[-1], right[0]
                output[y, x, :3] = np.rint(row[p, :3] + (row[q, :3] - row[p, :3]) * (x - p) / (q - p))
    return Image.fromarray(output)


def clean_world(frame, actor, angle, cx, cy, donor):
    frame = remove_tail(frame, actor, angle, cx, cy, donor)
    mask = Image.new("L", frame.size)
    cut = HEAD_CUT[angle]
    cut = [(cx + x, cy + y - (1 if actor == 1 else 0)) for x, y in cut]
    ImageDraw.Draw(mask).polygon([(cut[0][0] - 4, cy - 3), *cut, (cut[-1][0] + 4, cy - 3)], fill=255)
    opacity = np.asarray(frame.getchannel("A"), dtype=float)
    fade = np.asarray(mask.filter(ImageFilter.GaussianBlur(.55)), dtype=float)
    frame.putalpha(Image.fromarray(np.uint8(opacity * (1 - fade / 255))))
    return frame


def pack_bodies():
    source = (
        rgba(STUDY / "eight-way-painted/tunics.webp"),
        rgba(STUDY / "plate-set-study/plate.webp"),
    )
    size = source[0].size
    banks = [Image.new("RGBA", size) for _ in LOOKS]
    anchors, used = {}, {}
    for actor, name in enumerate(ACTORS):
        for angle, direction in enumerate(DIRECTIONS[:-1]):
            for gait in ("walk", "run"):
                for index, _ in MAPPING["frames"][f"{name}/{gait}/{direction}"]:
                    if index in used:
                        assert used[index] == (actor, angle)
                        continue
                    used[index] = actor, angle
                    x, y = index % 16 * CELL, index // 16 * CELL
                    region = (x, y, x + CELL, y + CELL)
                    cx, cy = crown(source[0].crop(region))
                    for outfit, sheet in enumerate(source):
                        frame = sheet.crop(region)
                        donor = None
                        if actor == 1 and angle in (1, 2):
                            donor_index = index - 64
                            assert used[donor_index] == (0, angle)
                            donor = (sheet_patch(banks, outfit, donor_index), anchors[donor_index][outfit])
                        part = clean_world(frame, actor, angle, cx, cy, donor)
                        banks[outfit].paste(part, (x, y))
                        anchors.setdefault(index, []).append((cx, cy + 1, WORLD_HEIGHT[actor][angle]))
    assert len(anchors) == 128
    return banks, anchors


# Frontal crown locations and skull lengths at the original paper-doll resolutions.
PAPER_FIT = (((206, 44, 149), (522, 83, 150)),
             ((323, 66, 227), (814, 128, 229)))


def clean_doll(img, actor, spec):
    cx, cy, height = spec
    original = np.array(img)
    output = original.copy()
    if actor == 1:
        for y in range(cy + round(height * .57), cy + round(height * 1.025)):
            for x in range(cx + round(height * .19), cx + round(height * .49)):
                r, g, b, a = original[y, x].astype(float)
                if a and r * .3 + g * .6 + b * .1 < 119 and (r - b) / max(r, 25) > .29:
                    output[y, x] = original[y, 2 * cx - x]
    frame = Image.fromarray(output)
    mask = Image.new("L", img.size)
    path = [(-.45, -.1), (-.43, .58), (-.31, .68), (-.24, .77), (-.17, .85),
            (.17, .85), (.24, .77), (.31, .68), (.43, .58), (.45, -.1)]
    ImageDraw.Draw(mask).polygon([(round(cx + x * height), round(cy + y * height)) for x, y in path], fill=255)
    opacity = np.asarray(frame.getchannel("A"), dtype=float)
    fade = np.asarray(mask.filter(ImageFilter.GaussianBlur(1.1)), dtype=float)
    frame.putalpha(Image.fromarray(np.uint8(opacity * (1 - fade / 255))))
    return frame


def pack_dolls():
    source = (
        rgba(STUDY / "painted-female-fit/standard-height-front-study.png"),
        rgba(STUDY / "plate-set-study/paper-dolls.png"),
    )
    banks, fittings = [], []
    for outfit, img in enumerate(source):
        if outfit == 0:
            pixels = np.asarray(img, dtype=int)
            fill = pixels[0, 0, :3]
            difference = np.max(np.abs(pixels[:, :, :3] - fill), axis=2)
            img.putalpha(Image.fromarray(np.uint8(np.clip((difference - 5) / 16, 0, 1) * 255)))
        specs = PAPER_FIT[outfit]
        region = box(img)
        male = box(img.crop((0, 0, img.width // 2, img.height)))
        scale = 332 / (male[3] - male[1])
        page = Image.new("RGBA", (390, 375))
        outfit_fit = []
        for actor, (cx, cy, height) in enumerate(specs):
            cleaned = clean_doll(img, actor, (cx, cy, height))
            x0 = actor * (img.width // 2)
            x1 = (actor + 1) * (img.width // 2)
            tile = cleaned.crop((x0, 0, x1, img.height))
            tile = tile.resize(tuple(round(n * scale) for n in tile.size), Image.Resampling.LANCZOS)
            tx = round(110 + 170 * actor - (cx - x0) * scale)
            ty = round(350 - region[3] * scale)
            page.alpha_composite(tile, (tx, ty))
            outfit_fit.append((tx + (cx - x0) * scale, ty + (cy + height * .04) * scale, height * scale))
        banks.append(page)
        fittings.append(outfit_fit)
    return banks, fittings


def tint(image, name):
    pixels = np.asarray(image).copy()
    luma = np.sum(pixels[:, :, :3] * [.2126, .7152, .0722], axis=2)
    colors = [tuple(bytes.fromhex(color[1:])) for color in PALETTES[name]]
    pixels[:, :, :3] = np.uint8(np.rint(np.stack([
        np.interp(luma, (16, 104, 198), channel) for channel in zip(*colors)
    ], axis=2)))
    return Image.fromarray(pixels)


def data_uri(image, fmt="webp", **kwargs):
    stream = io.BytesIO()
    image.save(stream, fmt.upper(), **kwargs)
    return f"data:image/{fmt};base64," + base64.b64encode(stream.getvalue()).decode()


def sheet_patch(banks, outfit, index):
    x, y = index % 16 * CELL, index // 16 * CELL
    return banks[outfit].crop((x, y, x + CELL, y + CELL))


def chosen_layers(layers, actor, angle, hair, beard, color, beard_color):
    yield layers["skin", actor, 0, angle]
    if beard is not None and ("beard", actor, beard, angle) in layers:
        yield tint(layers["beard", actor, beard, angle], beard_color)
    if hair is not None:
        yield tint(layers["hair", actor, hair, angle], color)


def world_actor(banks, layers, anchors, state, actor, gait, phase, outfit, heading):
    index, mirrored = MAPPING["frames"][f"{ACTORS[actor]}/{gait}/{heading}"][phase]
    angle = DIRECTIONS.index({"W": "E", "SW": "SE", "NW": "NE"}.get(heading, heading))
    image = sheet_patch(banks, outfit, index)
    cx, cy, height = anchors[index][outfit]
    pixel = height / SKULL
    extent = round(pixel * HEAD)
    xy = (round(cx - ORIGIN[0] * pixel), round(cy - ORIGIN[1] * pixel))
    for layer in chosen_layers(layers, actor, angle, *state):
        image.alpha_composite(layer.resize((extent, extent), Image.Resampling.LANCZOS), xy)
    if mirrored:
        image = image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    return image


def paper_image(dolls, layers, fittings, state, outfit):
    image = dolls[outfit].copy()
    for actor, (cx, cy, height) in enumerate(fittings[outfit]):
        pixel = height / SKULL
        extent = round(HEAD * pixel)
        xy = (round(cx - ORIGIN[0] * pixel), round(cy - ORIGIN[1] * pixel))
        for layer in chosen_layers(layers, actor, 5, *state):
            image.alpha_composite(layer.resize((extent, extent), Image.Resampling.LANCZOS), xy)
    return image


def draw_actor(page, actor, x, y, scale):
    size = round(CELL * scale)
    actor = actor.resize((size, size), Image.Resampling.LANCZOS)
    page.paste(actor, (round(x - size / 2), round(y - GROUND * scale)), actor)


def write_gallery(banks, layers, anchors, dolls, fittings):
    looks = ((0, 0, "Chestnut", "Chestnut"), (1, 1, "Black", "Silver"))
    heading = "E"
    for gait in ("walk", "run"):
        images = []
        for phase in range(8):
            page = Image.new("RGB", (390, 550), PAPER)
            stamp = ImageDraw.Draw(page)
            for row, (look, attire) in enumerate(zip(looks, ("Tunic", "Plate"))):
                y = row * 275
                label = ("Swept crop and short beard", "High knot and full beard")[row]
                stamp.text((13, y + 6), f"{label} · {attire}", fill=INK, font=label_font(15))
                page.paste(STREET, (0, y + 157))
                for actor, height in enumerate((43 / 133, 41 / 126)):
                    image = world_actor(banks, layers, anchors, look, actor, gait, phase, row, heading)
                    draw_actor(page, image, 118 + actor * 155, y + 151, .94)
                    draw_actor(page, image, 132 + actor * 108, y + 260, height)
            images.append(page)
        save_gif(images, MAPPING["delays"][gait], HERE / f"{gait}.gif")
    grid = Image.new("RGB", (390, 616), PAPER)
    stamp = ImageDraw.Draw(grid)
    for outfit, look in enumerate(looks):
        y = outfit * 308
        label = ("Swept crop and short beard", "High knot and full beard")[outfit]
        stamp.text((13, y + 7), label, fill=INK, font=label_font(16))
        dolls_image = paper_image(dolls, layers, fittings, look, outfit)
        dolls_image = dolls_image.resize((297, 286), Image.Resampling.LANCZOS)
        grid.paste(dolls_image, (47, y + 19), dolls_image)
    grid.save(HERE / "paper-dolls.png")


def main():
    layers = fit_layers()
    bodies, anchors = pack_bodies()
    dolls, fittings = pack_dolls()
    ordered = list(layers)
    layer_sheet = Image.new("RGBA", (8 * HEAD, ((len(ordered) + 7) // 8) * HEAD))
    slices = {}
    for index, key in enumerate(ordered):
        x, y = index % 8 * HEAD, index // 8 * HEAD
        layer_sheet.paste(layers[key], (x, y))
        slices["/".join(map(str, key))] = (x, y)
    data = dict(mapping=MAPPING, anchors=anchors, palettes=PALETTES, directions=DIRECTIONS,
                head=HEAD, skull=SKULL, origin=ORIGIN,
                layers=data_uri(layer_sheet, lossless=True, method=3), slices=slices,
                bodies=[data_uri(img, lossless=True, method=3) for img in bodies],
                dolls=[data_uri(img, lossless=True, method=3) for img in dolls], fittings=fittings,
                street=data_uri(STREET, quality=92))
    template = (HERE / "viewer-template.html").read_text(encoding="utf-8")
    (HERE / "hair.html").write_text(template.replace("__PAYLOAD__", json.dumps(data, separators=(",", ":"))),
                                   encoding="utf-8", newline="\n")
    write_gallery(bodies, layers, anchors, dolls, fittings)


if __name__ == "__main__":
    main()
