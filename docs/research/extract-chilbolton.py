from pathlib import Path
from PIL import Image
import hashlib
p = Path(__file__).parent
raw = (p / "chilbolton-ids-2010-source.png").read_bytes()
assert hashlib.sha1(raw).hexdigest() == "ca96156c07915044f9184e9c347d7e4787dd8381"
im = Image.open(p / "chilbolton-ids-2010-source.png").convert("RGB")
assert im.size == (151, 451)
rows = []
for y in range(73):
    row = ""
    for x in range(23):
        pixels = {im.getpixel((6*(x+1)+dx, 6*(y+1)+dy)) for dx in range(1,6) for dy in range(1,6)}
        assert len(pixels) == 1
        value = pixels.pop()
        assert value in [(0,0,0), (255,255,255)]
        row += "1" if value == (255,255,255) else "0"
    rows.append(row)
for y in range(75):
    for x in range(25):
        if x in (0,24) or y in (0,74):
            assert im.getpixel((x*6+3,y*6+3)) == (0,0,0)
bits = "".join(rows)
assert len(bits) == 1679
assert hashlib.sha256(bits.encode()).hexdigest() == "6eb11753b32702e0a0eecde6ca8e837e4989e43ff515bbef5ff72548393708bc"
print("\n".join(rows))
