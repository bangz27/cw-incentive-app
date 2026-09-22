from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
# Reuse the previously approved crop coordinates from the original payment image.
source_qr = Path('/home/ubuntu/upload/5539.jpg')
qr = Image.open(source_qr).convert('RGB').crop((230, 438, 580, 790))
(root / 'support_qr.png').write_bytes(b'')
(root / 'support_qr.png').unlink(missing_ok=True)
qr.save(root / 'support_qr.png', format='PNG', optimize=True)

# Convert only the provided 5604.webp container to PNG; no visual edits or compositing.
source_icon = Path('/home/ubuntu/upload/5604.webp')
icon = Image.open(source_icon).convert('RGBA')
res = root / 'android/app/src/main/res'
(res / 'drawable-nodpi').mkdir(parents=True, exist_ok=True)
icon.save(res / 'drawable-nodpi/tbs_icon.png', format='PNG', optimize=True)
# Android legacy launcher densities. Preserve the square source and use high-quality downsampling.
for density, size in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
    out = res / f'mipmap-{density}'
    out.mkdir(parents=True, exist_ok=True)
    scaled = icon.resize((size,size), Image.Resampling.LANCZOS)
    scaled.save(out/'ic_launcher.png', format='PNG', optimize=True)
    scaled.save(out/'ic_launcher_round.png', format='PNG', optimize=True)
    # Keep foreground resource present for generated adaptive references.
    scaled.save(out/'ic_launcher_foreground.png', format='PNG', optimize=True)
print('QR:', root/'support_qr.png', qr.size)
print('Icon:', res/'drawable-nodpi/tbs_icon.png', icon.size)
