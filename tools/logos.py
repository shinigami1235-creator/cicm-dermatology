import json, cairosvg
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
P={}
for c in ['grey','red','yellow','orange','green']: P.update(json.load(open(f'trace/paths_{c}.json')))
C={'grey':'#B1AFB1','red':'#EC1C24','yellow':'#FBE40B','orange':'#F67B1E','green':'#1B7A3A'}
def shapes(keys, ids=False):
    return ''.join(f'<path{f" id=\"{k}\"" if ids else ""} fill="{C[k]}" fill-rule="{"nonzero" if k=="green" else "evenodd"}" d="{P[k]}"/>' for k in keys)
full=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="30 0 272 272"><title>Chulabhorn International College of Medicine</title>{shapes(["grey","red","yellow","orange","green"],True)}</svg>'
open('site/assets/cicm-emblem.svg','w').write(full)
mark=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="58 30 220 210"><title>CICM</title>{shapes(["grey","red","yellow","orange"],True)}</svg>'
open('site/assets/cicm-mark.svg','w').write(mark)
# wordmark text to paths
def text_path(fontfile, s, size, x, y, track=0):
    f=TTFont(fontfile); gs=f.getGlyphSet(); cm=f.getBestCmap(); sc=size/f['head'].unitsPerEm; out=[]
    for ch in s:
        g=gs[cm[ord(ch)]]
        if ch!=' ':
            pen=SVGPathPen(gs); g.draw(TransformPen(pen,(sc,0,0,-sc,x,y))); out.append(pen.getCommands())
        x+=g.width*sc+track
    return ' '.join(out), x
SB='/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf'
cicm,xe=text_path(SB,'CICM',100,0,100)
derma,x1=text_path(SB,'DERMA',43,xe+10,52,track=14.5)
tology,x2=text_path(SB,'TOLOGY',43,xe+10,100,track=4)
W=max(x1,x2)
def wordmark(dark):
    ink='#F4F1EA' if dark else '#14110F'
    return f'<path fill="#F67B1E" d="{cicm}"/><path fill="{ink}" d="{derma} {tology}"/>'
for dark in (False,True):
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-138 -12 {W+148} 122"><title>CICM Dermatology</title><g transform="translate(-132,-2) scale(0.53)"><g transform="translate(-58,-30)">{shapes(["grey","red","yellow","orange"])}</g></g>{wordmark(dark)}</svg>'
    open(f'site/assets/cicm-dermatology{"-light" if dark else ""}.svg','w').write(svg)
for n in ['cicm-emblem','cicm-dermatology','cicm-mark']:
    cairosvg.svg2png(url=f'site/assets/{n}.svg',write_to=f'trace/{n}.png',output_width=700,background_color='white')
