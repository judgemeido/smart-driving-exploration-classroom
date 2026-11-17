import json, urllib.request, concurrent.futures
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).parent
groups = json.loads((root / 'commons-search.json').read_text(encoding='utf-8'))
selected = {
    'File:Aito M5 IMG003.jpg': 'hima-aito-m5.jpg',
    'File:Luxeed S7 009.jpg': 'hima-luxeed-s7.jpg',
    'File:Stelato S9 006.jpg': 'hima-stelato-s9.jpg',
    'File:Maextro S800 002.jpg': 'hima-maextro-s800.jpg',
    'File:SAIC H5 002.jpg': 'hima-saic-h5.jpg',
    'File:Robotaxi.png': 'baidu-robotaxi-2021.jpg',
    'File:Changan Raeton 003.jpg': 'changan-raeton.jpg',
    'File:Hesai Maxwell.jpg': 'hesai-manufacturing.jpg',
}
items = []
for group in groups:
    for page in group['pages']:
        if page['title'] in selected:
            items.append({'title': page['title'], 'file': selected[page['title']], **page['imageinfo'][0]})

def download(item):
    dest = root / item['file']
    if not dest.exists():
        url = item.get('thumburl', item['url']).split('?')[0]
        request = urllib.request.Request(url, headers={'User-Agent': 'SmartDrivingMuseumEducational/1.0'})
        dest.write_bytes(urllib.request.urlopen(request, timeout=60).read())
    im = Image.open(dest).convert('RGB')
    im.save(dest, quality=92)
    return item['file'], im.size

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for result in pool.map(download, items):
        print(result)
(root / 'selected-images.json').write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding='utf-8')
sheet = Image.new('RGB', (1000, 4 * 340), '#e9e9e9')
draw = ImageDraw.Draw(sheet)
for i, item in enumerate(items):
    im = Image.open(root / item['file'])
    im.thumbnail((490, 300))
    x, y = (i % 2) * 500, (i // 2) * 340
    sheet.paste(im, (x + (490 - im.width) // 2, y))
    draw.text((x + 8, y + 308), item['file'], fill='black')
sheet.save(root / 'contact-sheet.jpg')
