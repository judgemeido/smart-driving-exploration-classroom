"""Generate smaller versions of the same archive photographs; originals stay intact."""
from pathlib import Path
from PIL import Image

for source in Path('public/assets/history').iterdir():
    if source.suffix.lower() not in ('.jpg', '.jpeg', '.png'):
        continue
    with Image.open(source) as image:
        image = image.convert('RGB')
        for width in (480, 960):
            resized = image.copy()
            resized.thumbnail((width, round(image.height * width / image.width)))
            resized.save(source.with_name(f'{source.stem}-{width}.webp'), 'WEBP', quality=80, method=6)
