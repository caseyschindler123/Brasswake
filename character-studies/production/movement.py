"""Fit saved directional outfit paintings to the approved gait mapping."""
import argparse
import importlib.util
import json
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
STUDIES = HERE.parent
MAPPING = json.loads((STUDIES / "eight-way-painted/mapping.json").read_text(encoding="utf8"))
CELL = MAPPING["cell"]
GROUND = MAPPING["ground"]
ACTORS = ("man", "woman")
GAITS = ("walk", "run")
SOURCE_VIEWS = ("E", "SE", "NE", "axial")
TOWN_HEIGHTS = (43, 41)
ATLAS_HEIGHTS = (133, 126)

spec = importlib.util.spec_from_file_location("outfit_material_preview", STUDIES / "outfit-material-study/pack.py")
preview = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preview)
from preview import save_gif

SIDE = {
    ("leather", "man"): "exec-8d2a19a7-5c89-4872-b9ac-68e3498233d1.png",
    ("leather", "woman"): "exec-4f6ed637-0222-4c7b-93c6-6d31c1bb131a.png",
    ("robe", "man"): "exec-4f37a5d2-6b3b-4bfa-9ab3-91173a410e25.png",
    ("robe", "woman"): "exec-3fb24c74-ee6c-40ef-8b1f-78b35fb3b510.png",
}


def original_frames(source):
    atlas = Image.open(source).convert("RGBA")
    assert atlas.width == CELL * 16 and atlas.height == CELL * 8
    return [atlas.crop((index % 16 * CELL, index // 16 * CELL,
                       (index % 16 + 1) * CELL, (index // 16 + 1) * CELL))
            for index in range(128)]


def frame_ids(actor, view):
    sequence = [(gait, view) for gait in GAITS]
    if view == "axial":
        sequence = [(gait, axis) for axis in ("S", "N") for gait in GAITS]
    return [index for gait, heading in sequence
            for index, flip in MAPPING["frames"][f"{actor}/{gait}/{heading}"]
            if not flip]


def load_fittings(strict=True):
    source = json.loads((HERE / "sources.json").read_text(encoding="utf8"))
    tunics = original_frames(STUDIES / "eight-way-painted/tunics.webp")
    plate = original_frames(STUDIES / "plate-set-study/plate.webp")
    registered = {"tunic": dict(enumerate(tunics)), "plate": dict(enumerate(plate))}
    for outfit in ("leather", "robe", "mail", "knight"):
        fitted = {}
        for actor in ACTORS:
            for view in SOURCE_VIEWS:
                entry = source.get(f"{actor}-{outfit}-{view}")
                if view == "E" and (outfit, actor) in SIDE:
                    painting = STUDIES / "outfit-material-study/paintings" / SIDE[outfit, actor]
                elif entry:
                    painting = HERE / "paintings" / entry["file"]
                elif not strict:
                    continue
                else:
                    raise ValueError(f"Missing movement painting for {actor}/{outfit}/{view}")
                ids = frame_ids(actor, view)
                assert len(ids) == 16
                reference = [tunics[index] for index in ids]
                pieces = preview.registered_sources(painting, reference)
                for index, image in zip(ids, pieces, strict=True):
                    assert index not in fitted
                    fitted[index] = image
        if strict:
            assert set(fitted) == set(range(128)), outfit
        registered[outfit] = fitted
    return registered


def pose(banks, outfit, actor, gait, direction, phase):
    index, flip = MAPPING["frames"][f"{actor}/{gait}/{direction}"][phase]
    image = banks[outfit].get(index)
    return image.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if image and flip else image


def render_pair(page, banks, outfit, gait, direction, phase, y):
    page.paste(preview.STREET, (0, y + 153))
    for actor, enlarged, town, size, source in zip(ACTORS, (111, 267), (149, 244),
                                                    TOWN_HEIGHTS, ATLAS_HEIGHTS):
        frame = pose(banks, outfit, actor, gait, direction, phase)
        preview.draw_actor(page, frame, enlarged, y + 149, .94)
        preview.draw_actor(page, frame, town, y + 254, size / source)


def capture(out, direction="NE"):
    banks = load_fittings(strict=False)
    out.mkdir(parents=True, exist_ok=True)
    families = [outfit for outfit in banks
                if all(pose(banks, outfit, actor, gait, direction, i) is not None
                       for actor in ACTORS for gait in GAITS for i in range(8))]
    for gait in GAITS:
        frames = []
        for phase in range(8):
            page = Image.new("RGB", (390, len(families) * 272), preview.PAPER)
            pen = ImageDraw.Draw(page)
            for row, outfit in enumerate(families):
                y = row * 272
                pen.text((13, y + 5), outfit.capitalize(), font=preview.label_font(15), fill=preview.INK)
                render_pair(page, banks, outfit, gait, direction, phase, y)
            frames.append(page)
        save_gif(frames, MAPPING["delays"][gait], out / f"{direction}-{gait}.gif")
        board = Image.new("RGB", (390 * 4, frames[0].height), preview.PAPER)
        for i, phase in enumerate((0, 2, 4, 6)):
            board.paste(frames[phase], (390 * i, 0))
        board.save(out / f"{direction}-{gait}.png")
    print(f"{direction} reviewed bank candidates: {', '.join(families)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    parser.add_argument("direction", default="NE", nargs="?")
    args = parser.parse_args()
    capture(args.output, args.direction)
