from PIL import ImageFont


def label_font(size):
    """Match the review captions on Windows and use Pillow's bundled face elsewhere."""
    try:
        return ImageFont.truetype("segoeui.ttf", size)
    except OSError:
        return ImageFont.load_default(size=size)
