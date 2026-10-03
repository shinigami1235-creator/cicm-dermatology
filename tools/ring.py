import math, json
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

FONT = '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf'
TEXT = 'CHULABHORN INTERNATIONAL COLLEGE OF MEDICINE'
cx, cy = 165.25, 134.0
R_BASE = 130.2           # baseline sits on the outer radius, letters point inward
CAP = 12.6               # cap height in px
A0, A1 = 309.5, 49.5     # clockwise-from-top degrees, text runs counterclockwise from A0 to A1

f = TTFont(FONT)
gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f['head'].unitsPerEm
cap_units = f['OS/2'].sCapHeight or 729
scale = CAP / cap_units
span = (A0 - A1) % 360            # degrees covered, counterclockwise
arc = math.radians(span) * R_BASE
adv = [gs[cmap[ord(c)]].width * scale for c in TEXT]
extra = (arc - sum(adv)) / (len(TEXT) - 1)

out = []
s = 0.0
for ch, w in zip(TEXT, adv):
    mid = s + w / 2
    theta = A0 - math.degrees(mid / R_BASE)   # moving counterclockwise
    th = math.radians(theta)
    # point on baseline circle
    px, py = cx + R_BASE * math.sin(th), cy - R_BASE * math.cos(th)
    # glyph "up" points to centre; glyph x axis points along travel direction (counterclockwise)
    ux, uy = (cx - px) / R_BASE, (cy - py) / R_BASE          # up
    tx, ty = -uy, ux                                         # right-hand of up rotated -90 => travel
    # check travel direction: counterclockwise in screen means decreasing theta
    dth = math.radians(theta - 0.1)
    qx, qy = cx + R_BASE * math.sin(dth), cy - R_BASE * math.cos(dth)
    if (qx - px) * tx + (qy - py) * ty < 0: tx, ty = -tx, -ty
    if ch != ' ':
        pen = SVGPathPen(gs)
        # font units: x right, y up. map: X = px + (x - w/2/scale)*scale*t + y*scale*u
        x0 = -w / 2 / scale
        m = (tx * scale, ty * scale, ux * scale, uy * scale,
             px + tx * x0 * scale, py + ty * x0 * scale)
        gs[cmap[ord(ch)]].draw(TransformPen(pen, m))
        out.append(pen.getCommands())
    s += w + extra

json.dump({'green': ' '.join(out)}, open('paths_green.json', 'w'))
print('arc', round(arc), 'natural', round(sum(adv)), 'extra/char', round(extra, 2))
