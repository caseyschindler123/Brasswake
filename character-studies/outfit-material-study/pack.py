"""Build the side-gait and material review from saved art."""
import base64
import io
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
STUDIES = HERE.parent
sys.path.insert(0, str(STUDIES))
sys.path.insert(0, str(STUDIES / "paired-side-gaits"))
from preview import figures, travel_fit
from study_font import label_font

LOOKS = ("leather", "robe", "indigo", "tempered", "tunic", "plate")
LABELS = ("Leather", "Ivory robe", "Indigo robe", "Tempered Steel", "Tunic", "Steel plate")
ACTORS = ("man", "woman")
GAITS = ("walk", "run")
HEIGHTS = (133, 126)
TOWN_HEIGHTS = (43, 41)
PAPER = "#e8e1d2"
INK = "#383229"
ROBE_DYES = {
    "robe": ("#40382c", "#a79674", "#f3e8cb"),
    "indigo": ("#171b2c", "#384369", "#929fc5"),
}
MAP = json.loads((STUDIES / "eight-way-painted/mapping.json").read_text())
CELL, GROUND = MAP["cell"], MAP["ground"]
SOURCES = json.loads((HERE / "sources.json").read_text(encoding="utf-8"))
TUNIC_ART = STUDIES / "eight-way-painted/tunics.webp"
PLATE_ART = STUDIES / "plate-set-study/plate.webp"
TUNIC_DOLL = STUDIES / "painted-female-fit/standard-height-front-study.png"
PLATE_DOLL = STUDIES / "plate-set-study/paper-dolls.png"
TUNIC_SHEETS = (STUDIES / "paired-side-gaits/painted-male.png",
                STUDIES / "simple-female-gaits/painted-gaits.png")
STREET = Image.open(STUDIES / "town-fit-preview/town-e-route.webp").convert("RGB")
STREET = STREET.crop((135, 109, 720, 280)).resize((390, 114), Image.Resampling.LANCZOS)


def source(name):
    return HERE / "paintings" / SOURCES[name]["file"]


def alpha_box(image):
    return image.getchannel("A").point(lambda value: 255 if value > 96 else 0).getbbox()


def clean_sheet(path):
    """Keep source alpha. Remove the pale low-alpha matte on the affected leather sheet."""
    image = Image.open(path).convert("RGBA")
    pixels = np.array(image, dtype=np.float32)
    alpha = pixels[:, :, 3]
    border = np.concatenate((alpha[0], alpha[-1], alpha[:, 0], alpha[:, -1]))
    if np.median(border) > 35:
        # In this source every figure is painted over a pale translucent wash.
        # Both opacity and color distinguish the paint from the wash.
        lightest_floor = pixels[:, :, :3].min(axis=2)
        image.putalpha(Image.fromarray(np.uint8(
            255 * np.clip((alpha - 198) / 42, 0, 1) * np.clip((242 - lightest_floor) / 25, 0, 1)
        )))
    return image


def registered_sources(path, reference):
    # figures() accepts an image stream. Its component cut leaves matching soft edges.
    buffer = io.BytesIO()
    clean_sheet(path).save(buffer, "PNG")
    buffer.seek(0)
    rows, _, _ = figures(buffer, rows=4, columns=4)
    cuts = [pose[0] for row in rows for pose in row]
    boxes = [alpha_box(frame) for frame in reference]
    cut_boxes = [alpha_box(cut) for cut in cuts]
    scale = float(np.median([(b[3] - b[1]) / (c[3] - c[1]) for b, c in zip(boxes, cut_boxes)]))

    def crown(image):
        opaque = np.asarray(image.getchannel("A")) > 96
        top = np.nonzero(opaque)[0].min()
        return np.nonzero(opaque[top:top + 7])[1].mean(), int(top)

    results = []
    for cut, guide in zip(cuts, reference):
        picture = cut.resize(tuple(round(n * scale) for n in cut.size), Image.Resampling.LANCZOS)
        gx, gy = crown(guide)
        px, py = crown(picture)
        offset = (round(gx - px), gy - py)
        x0, y0, x1, y1 = alpha_box(picture)
        assert x0 + offset[0] >= 0 and x1 + offset[0] <= CELL, (path, offset)
        assert y0 + offset[1] >= 0 and y1 + offset[1] <= CELL, (path, offset)
        cell = Image.new("RGBA", (CELL, CELL))
        cell.alpha_composite(picture, offset)
        results.append(cell)
    return results


def read_side_atlas(path):
    art = Image.open(path).convert("RGBA")
    result = {}
    for who in ACTORS:
        result[who] = []
        for gait in GAITS:
            for index, flip in MAP["frames"][f"{who}/{gait}/E"]:
                assert not flip
                x, y = index % 16 * CELL, index // 16 * CELL
                result[who].append(art.crop((x, y, x + CELL, y + CELL)))
    return result


def smoothstep(values, low, high):
    t = np.clip((values - low) / (high - low), 0, 1)
    return t * t * (3 - 2 * t)


def tint(image, family, palette):
    original = np.asarray(image)
    rgba = original.astype(np.float32)
    red, green, blue, alpha = rgba.transpose(2, 0, 1)
    luma = .2126 * red + .7152 * green + .0722 * blue
    warmth = (red - blue) / np.maximum(luma, 24)
    _, top, _, bottom = alpha_box(image)
    height = bottom - top
    y = (np.arange(image.height)[:, None] - top) / height
    if family == "metal":
        # Neutral armor admits the new palette. Warm leather, rivets and skin stay fixed.
        color = (1 - smoothstep(warmth, .20, .41)) * smoothstep(warmth, -.27, -.12)
        collar = (.153, .205)
        weight = .75
    else:
        # Flax shadows stay warm without taking on the red bias of skin and leather.
        red_bias = (red - green) - .7 * (green - blue)
        color = (1 - smoothstep(red_bias, 14, 22)) * (1 - smoothstep(warmth, .53, .70))
        collar = (.112, .156)
        weight = .94
    region = smoothstep(y, *collar)
    coverage = np.uint8(255 * color * region * np.minimum(1, alpha / 96))
    soften = .65 if image.height <= CELL else 1.1
    mask = np.asarray(Image.fromarray(coverage).filter(ImageFilter.GaussianBlur(soften))) / 255
    blend = (mask * weight * region * (alpha > 0))[:, :, None]
    palette = [tuple(bytes.fromhex(color.lstrip("#"))) for color in palette]
    shade = np.stack([np.interp(luma, (22, 125, 233), channel) for channel in zip(*palette)], axis=2)
    rgba[:, :, :3] += (shade - rgba[:, :, :3]) * blend
    result = np.uint8(np.rint(rgba))
    assert np.array_equal(result[:, :, 3], alpha)
    above_collar = top + int(height * collar[0])
    assert np.array_equal(result[:above_collar], original[:above_collar])
    return Image.fromarray(result)


def paper_pair(path, family=None, palette=None):
    image = clean_sheet(path)
    parts = [image.crop((left, 0, right, image.height))
             for left, right in ((0, image.width // 2), (image.width // 2, image.width))]
    scale = 472 / (alpha_box(parts[0])[3] - alpha_box(parts[0])[1])
    page = Image.new("RGBA", (600, 518))
    for x, part in zip((150, 450), parts):
        if family:
            part = tint(part, family, palette)
        part = part.crop(alpha_box(part))
        part = part.resize(tuple(round(n * scale) for n in part.size), Image.Resampling.LANCZOS)
        page.alpha_composite(part, (x - part.width // 2, 491 - part.height))
    return page


def data_uri(image, format, **options):
    buffer = io.BytesIO()
    image.save(buffer, format, **options)
    return f"data:image/{format.lower()};base64," + base64.b64encode(buffer.getvalue()).decode()


def draw_actor(page, frame, x, y, scale):
    size = round(CELL * scale)
    actor = frame.resize((size, size), Image.Resampling.LANCZOS)
    page.paste(actor, (round(x - size / 2), round(y - GROUND * scale)), actor)


def replay_palette(banks, looks, start):
    colors = [bytes.fromhex(PAPER[1:]), bytes.fromhex(INK[1:]),
              STREET.quantize(97).getpalette()[:97 * 3]]
    for look, size in zip(looks, (37, 34, 41, 45)):
        blocks = [np.asarray(frame) for who in ACTORS for frame in banks[look][who][start:start + 8]]
        visible = np.concatenate([block[block[:, :, 3] > 192, :3] for block in blocks])
        sample = Image.fromarray(visible.reshape(-1, 1, 3))
        colors.append(sample.quantize(size).getpalette()[:size * 3])
    palette = Image.new("P", (1, 1))
    palette.putpalette([channel for group in colors for channel in group])
    return palette


def save_replay(shots, delays, path, palette):
    indexed = [shot.quantize(palette=palette, dither=Image.Dither.NONE) for shot in shots]
    indexed[0].save(path, save_all=True, append_images=indexed[1:], duration=delays,
                    loop=0, optimize=False, disposal=1)
    with Image.open(path) as replay:
        assert replay.size == shots[0].size and replay.n_frames == len(shots) and replay.info["loop"] == 0
        assert [replay.seek(i) or replay.info["duration"] for i in range(replay.n_frames)] == delays


def write_replays(banks):
    speeds = {}
    for who, path, height in zip(ACTORS, TUNIC_SHEETS, TOWN_HEIGHTS):
        _, nominal, width = figures(path)
        for gait in GAITS:
            speeds[who, gait] = travel_fit(who, gait, MAP["delays"][gait], height / nominal, width)
    rows = LOOKS[:4]
    panel_height = 275
    for gait_index, gait in enumerate(GAITS):
        delays = MAP["delays"][gait]
        elapsed = 0
        shots = []
        for i in range(16):
            phase = i % 8
            picture = Image.new("RGB", (390, len(rows) * panel_height), PAPER)
            pen = ImageDraw.Draw(picture)
            for row, look in enumerate(rows):
                y = row * panel_height
                pen.text((14, y + 7), LABELS[LOOKS.index(look)], fill=INK, font=label_font(16))
                picture.paste(STREET, (0, y + 157))
                for who, mag_x, town_x, h, size in zip(ACTORS, (115, 270), (113, 182), HEIGHTS, TOWN_HEIGHTS):
                    frame = banks[look][who][gait_index * 8 + phase]
                    draw_actor(picture, frame, mag_x, y + 153, .96)
                    speed, corrections = speeds[who, gait]
                    x = town_x + speed * elapsed / 1000 + corrections[phase]
                    draw_actor(picture, frame, x, y + 256, size / h)
            shots.append(picture)
            elapsed += delays[phase]
        save_replay(shots, delays * 2, HERE / f"side-{gait}.gif", replay_palette(banks, rows, gait_index * 8))


def build():
    equipment = (STUDIES.parent / "game/src/equipment_rules.js").read_text(encoding="utf-8")
    palette = re.search(r"material\('metal', 'tempered', 'Tempered Steel', \d+, \d+, (.*)\),", equipment)[1]
    tempered = re.findall(r"#[0-9a-f]{6}", palette)
    assert len(tempered) == 3
    banks = {"tunic": read_side_atlas(TUNIC_ART), "plate": read_side_atlas(PLATE_ART)}
    for outfit in ("leather", "robe"):
        banks[outfit] = {who: registered_sources(source(f"{who}-{outfit}"), banks["tunic"][who])
                         for who in ACTORS}
    banks["tempered"] = {who: [tint(frame, "metal", tempered) for frame in banks["plate"][who]]
                         for who in ACTORS}
    linen = banks["robe"]
    for look, dye in ROBE_DYES.items():
        banks[look] = {who: [tint(frame, "cloth", dye) for frame in linen[who]] for who in ACTORS}

    # The original frontal tunic image has a painted backdrop. Use it intact.
    original = Image.open(TUNIC_DOLL).convert("RGB")
    original.thumbnail((600, 518), Image.Resampling.LANCZOS)
    front = Image.new("RGB", (600, 518), PAPER)
    front.paste(original, ((600 - original.width) // 2, 0))
    dolls = {
        "leather": paper_pair(source("leather-dolls")),
        **{look: paper_pair(source("robe-dolls"), "cloth", dye) for look, dye in ROBE_DYES.items()},
        "tempered": paper_pair(PLATE_DOLL, "metal", tempered),
        "tunic": front,
        "plate": paper_pair(PLATE_DOLL),
    }
    atlas = Image.new("RGBA", (16 * CELL, 2 * len(LOOKS) * CELL))
    for index, look in enumerate(LOOKS):
        for row, who in enumerate(ACTORS):
            for i, frame in enumerate(banks[look][who]):
                atlas.paste(frame, (i * CELL, (index * 2 + row) * CELL))
    config = dict(looks=LOOKS, labels=LABELS, delays=MAP["delays"], cell=CELL,
                  ground=GROUND, heights=HEIGHTS, townHeights=TOWN_HEIGHTS,
                  atlas=data_uri(atlas, "webp", lossless=True, method=3),
                  street=data_uri(STREET, "webp", quality=92),
                  dolls=[data_uri(dolls[look], "webp", quality=91) for look in LOOKS])
    template = (HERE / "viewer-template.html").read_text(encoding="utf-8")
    (HERE / "wardrobe.html").write_text(template.replace("__PAYLOAD__", json.dumps(config, separators=(",", ":"))),
                                       encoding="utf-8", newline="\n")

    gallery = Image.new("RGB", (390, 299 * 4), PAPER)
    pen = ImageDraw.Draw(gallery)
    for row, (look, label) in enumerate(zip(LOOKS[:4], LABELS)):
        y = row * 299
        pen.text((14, y + 7), label, fill=INK, font=label_font(16))
        pair = dolls[look].resize((324, 280), Image.Resampling.LANCZOS)
        gallery.paste(pair, (33, y + 18), pair)
    gallery.save(HERE / "paper-dolls.png")
    write_replays(banks)


if __name__ == "__main__":
    build()
