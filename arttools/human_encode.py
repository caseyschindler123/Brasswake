"""Losslessly encode material/shade pixels; stdin PNG to stdout WebP."""
import io
import sys
import PIL
from PIL import Image

if PIL.__version__ != '12.0.0':
    raise RuntimeError('Human sprite replay requires pinned Pillow 12.0.0')
image = Image.open(io.BytesIO(sys.stdin.buffer.read()))
if image.mode != 'RGBA':
    raise ValueError('Expected RGBA material/shade pixels')
image.save(sys.stdout.buffer, format='WEBP', lossless=True, method=6, exact=True)
