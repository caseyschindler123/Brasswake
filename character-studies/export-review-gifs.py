"""Encode the browser frames saved by capture.cjs and check.cjs."""
import json
import sys
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent
sys.path.insert(0, str(root / "paired-side-gaits"))
from preview import save_gif

timing = json.loads((root / "eight-way-painted/mapping.json").read_text())["delays"]
for folder, cycles, prefix in [("eight-way-carry", 1, ""), ("plate-set-study", 8, "plate-")]:
    for gait in ["walk", "run"]:
        frames = []
        for i in range(8 * cycles):
            with Image.open(root / folder / f"{gait}-{i}.png") as source:
                frames.append(source.convert("RGB"))
        save_gif(frames, timing[gait] * cycles, root / folder / f"{prefix}{gait}.gif")
