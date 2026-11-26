"""Pack hash-verified Brasswake gear source sheets with fixed atlas IDs."""

import argparse
import hashlib
import io
import json
from pathlib import Path

from PIL import Image
import numpy as np
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
CATALOG_PATH = ROOT / "arttools/painted_release_gear_catalog.json"
INPUT_PATH = ROOT / "arttools/painted_release_gear_inputs.json"
ATLAS_PATH = ROOT / "game/art/paintedgear/gear.webp"
METADATA_PATH = ROOT / "game/src/artpaintedgear.js"
MANIFEST_PATH = ROOT / "arttools/painted_release_gear_manifest.json"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def remove_white_matte(image):
    pixels = np.asarray(image, dtype=np.float32)
    rgb = pixels[..., :3]
    strength = 250 - rgb.min(axis=2)
    core = ndimage.binary_fill_holes(strength > 38)
    labels, count = ndimage.label(core)
    sizes = np.bincount(labels.ravel(), minlength=count + 1)
    keep = sizes >= 100
    keep[0] = False
    core = keep[labels]
    edge = ndimage.binary_dilation(core, iterations=2) & ~core
    alpha = np.where(core, 1, np.where(edge, np.clip((strength - 8) / 55, 0, 1), 0))
    rgb = np.where(edge[..., None], np.maximum(0, 250 - (250-rgb)/np.maximum(alpha[..., None], .05)), rgb)
    cleaned = np.dstack([rgb, alpha*255]).astype(np.uint8)
    return Image.fromarray(cleaned, "RGBA")


def rgba_sheet(source_path, matte=None):
    image = Image.open(source_path)
    if "A" not in image.getbands():
        raise ValueError(f"No real alpha in {source_path.name}")
    image = image.convert("RGBA")
    if matte == "white":
        return remove_white_matte(image)
    if min(image.getchannel("A").getextrema()) != 0:
        raise ValueError(f"No transparent margin in {source_path.name}")
    return image


def item_crop(atlas, bounds, item_id):
    x, y, r, b = bounds
    crop = atlas.crop((x, y, r, b))
    alpha = crop.getchannel("A")
    ink = alpha.point(lambda v: 255 if v > 100 else 0).getbbox()
    if ink is None:
        raise ValueError(f"Empty item {item_id}")
    l, t, ir, ib = ink
    if min(l, t, crop.width - ir, crop.height - ib) < 2:
        raise ValueError(f"Clipped margin for {item_id}: {ink} in {bounds}")
    # Generated transparent sheets have a very faint matte on some outer pixels.
    # Keep strong foreground coverage and remove that haze before downsampling.
    crop.putalpha(alpha.point(lambda v: max(0, min(255, round((v - 64) * 255 / 184)))))
    crop = crop.crop((l-1, t-1, ir+1, ib+1))
    cap = 150 if item_id.endswith(("-side", "-back")) else 205
    crop.thumbnail((cap, cap), Image.Resampling.LANCZOS)
    return crop


GRIP_LEVELS = {
    "w0": .80, "w1": .84, "w2": .85, "w3": .72, "w4": .85, "w5": .75,
    "w6": .79, "w7": .74, "w8": .62, "w9": .63, "w10": .62, "w11": .62,
    "w12": .64, "w13": .83, "w14": .81, "w15": .84, "w16": .79,
    "w25": .50, "w26": .50, "w27": .80,
}


def grip_pivot(item_id, image):
    level = GRIP_LEVELS.get(item_id)
    if level is None:
        return None
    y = min(image.height - 1, round(image.height * level))
    alpha = image.getchannel("A")
    row = [x for x in range(image.width) if alpha.getpixel((x, y)) > 150]
    if not row:
        raise ValueError(f"No opaque grip at the recorded level for {item_id}")
    # The vertical bow string is at the far right of each dedicated cut.
    if item_id in {"w25", "w26"}:
        left = [x for x in row if x < image.width * .64]
        if left:
            row = left
    return [round(sum(row) / len(row) / image.width, 3), level]


def pack(catalog, sources, source_dir):
    artwork = []
    for key, sheet in catalog.items():
        record = sources[key]
        input_path = source_dir / record["file"]
        if digest(input_path.read_bytes()) != record["sha256"]:
            raise ValueError(f"Source hash changed: {record['file']}")
        image = rgba_sheet(input_path, record.get("matte"))
        cols, rows = sheet["grid"]
        if len(sheet["items"]) != cols * rows:
            raise ValueError(f"{key} grid dimensions do not match the item catalog")
        for index, item in enumerate(sheet["items"]):
            item_id, name, *style = item.split("|")
            column, row = index % cols, index // cols
            bounds = [round(column*image.width/cols), round(row*image.height/rows),
                      round((column+1)*image.width/cols), round((row+1)*image.height/rows)]
            replacement = record.get("overrides", {}).get(item_id)
            if replacement:
                if isinstance(replacement, dict):
                    alt = source_dir / replacement["file"]
                    if digest(alt.read_bytes()) != replacement["sha256"]:
                        raise ValueError(f"Replacement source hash changed: {alt.name}")
                    crop = item_crop(rgba_sheet(alt), replacement["bounds"], item_id)
                else:
                    crop = item_crop(image, replacement, item_id)
            else:
                crop = item_crop(image, bounds, item_id)
            entry = {"name": name, "kind": style[0] if style else "icon"}
            if len(style) > 1:
                entry["length"] = float(style[1])
            pivot = grip_pivot(item_id, crop)
            if pivot:
                entry["pivot"] = pivot
            artwork.append((item_id, entry, crop))
    width, x, y, row_height = 1280, 2, 2, 0
    entries = {}
    for item_id, entry, sprite in artwork:
        if item_id in entries:
            raise ValueError(f"Duplicate atlas ID {item_id}")
        if x + sprite.width + 2 > width:
            x, y, row_height = 2, y + row_height + 4, 0
        entry["rect"] = [x, y, sprite.width, sprite.height]
        entries[item_id] = entry
        x += sprite.width + 4
        row_height = max(row_height, sprite.height)
    canvas = Image.new("RGBA", (width, y + row_height + 2))
    for item_id, _, sprite in artwork:
        canvas.paste(sprite, tuple(entries[item_id]["rect"][:2]))
    buffer = io.BytesIO()
    canvas.save(buffer, "WEBP", lossless=True, method=4)
    return canvas, buffer.getvalue(), entries


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    registry = json.loads(INPUT_PATH.read_text(encoding="utf-8"))
    if registry.get("version") != 1:
        raise ValueError("Unsupported gear source registry version")
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    source_dir = args.source_dir or Path(registry["archive"])
    reference = registry["reference"]
    if digest((source_dir / reference["file"]).read_bytes()) != reference["sha256"]:
        raise ValueError(f"Style reference hash changed: {reference['file']}")
    image, data, entries = pack(catalog, registry["sheets"], source_dir)
    metadata = ("/* Generated by arttools/painted_release_gear_pack.py. */\n"
                "ArtData.paintedGear = " + json.dumps({"file": "paintedgear/gear.webp",
                   "entries": entries}, separators=(",", ":"), ensure_ascii=True) + ";\n").encode()
    manifest = (json.dumps({"version": 1, "files": [{"path": "art/paintedgear/gear.webp",
        "size": len(data), "sha256": digest(data), "dimensions": list(image.size)}],
        "metadata": {"path": "game/src/artpaintedgear.js", "sha256": digest(metadata)}}, indent=2) + "\n").encode()
    for target, expected in ((ATLAS_PATH, data), (METADATA_PATH, metadata), (MANIFEST_PATH, manifest)):
        if args.check:
            if target.read_bytes() != expected:
                raise ValueError(f"Replay differs: {target.relative_to(ROOT)}")
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(expected)
    print(f"{len(entries)} gear crops; {image.width}x{image.height}; {len(data):,} bytes")


if __name__ == "__main__":
    main()
