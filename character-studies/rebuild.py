"""Repack both character atlases and the three offline viewers from saved paintings."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
for source in (
    "eight-way-painted/pack.py",
    "eight-way-carry/marks.py",
    "eight-way-carry/build.py",
    "plate-set-study/pack.py",
):
    subprocess.run([sys.executable, str(ROOT / source)], check=True)
