import numpy as np, potrace, sys
from PIL import Image, ImageFilter
import cv2

S = 8  # upscale factor
src = Image.open('src.png').convert('RGB')
W, H = src.size
big = np.array(src.resize((W*S, H*S), Image.LANCZOS)).astype(np.float32)

cols = {
    'orange': (246, 123, 30),
    'yellow': (251, 249, 9),
    'red':    (251, 9, 15),
    'grey':   (177, 175, 177),
    'green':  (24, 120, 54),
    'white':  (255, 255, 255),
}
names = list(cols)
C = np.array([cols[n] for n in names], np.float32)
d = ((big[:, :, None, :] - C[None, None]) ** 2).sum(-1)
lab = d.argmin(-1)

def curve_path(curve):
    p = curve.start_point
    out = [f'M{p.x/S:.2f},{p.y/S:.2f}']
    for seg in curve.segments:
        if seg.is_corner:
            out.append(f'L{seg.c.x/S:.2f},{seg.c.y/S:.2f}L{seg.end_point.x/S:.2f},{seg.end_point.y/S:.2f}')
        else:
            out.append(f'C{seg.c1.x/S:.2f},{seg.c1.y/S:.2f} {seg.c2.x/S:.2f},{seg.c2.y/S:.2f} {seg.end_point.x/S:.2f},{seg.end_point.y/S:.2f}')
    out.append('Z')
    return ''.join(out)

paths = {}
for n in sys.argv[1:]:
    m = (lab == names.index(n)).astype(np.uint8) * 255
    m = cv2.GaussianBlur(m, (0, 0), S * 0.6)
    m = (m > 127)
    # drop specks
    k, cc, stats, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8))
    keep = np.zeros_like(m)
    for i in range(1, k):
        if stats[i, cv2.CC_STAT_AREA] > (S * S * 30):
            keep |= cc == i
    bm = potrace.Bitmap(~keep)
    plist = bm.trace(turdsize=S*S*4, alphamax=1.0, opticurve=True, opttolerance=0.4)
    paths[n] = ''.join(curve_path(c) for c in plist)
    print(n, len(plist), file=sys.stderr)

import json
json.dump(paths, open('paths_' + '_'.join(sys.argv[1:]) + '.json', 'w'))
