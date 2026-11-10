"""Assemble the static pages from src/. Run: python3 build.py

Three designs are built side by side so the teachers can compare them:
  skin   index.html, research.html, faculty.html, admissions.html (the original)
  atlas  atlas.html, atlas-research.html, atlas-faculty.html, atlas-admissions.html
  book   book.html, book-research.html, book-faculty.html, book-admissions.html
Research, faculty and admissions share one source file across the designs; each
design has its own home page source (src/atlas.html, src/book.html) and stylesheet.
"""
import pathlib, re
ROOT = pathlib.Path(__file__).parent
SRC = ROOT / 'src'
head = (SRC/'head.html').read_text(); header = (SRC/'header.html').read_text(); footer = (SRC/'footer.html').read_text()

V = '20261110a'  # bump on every push that changes a design's CSS or JS
DESIGNS = {
  'skin': {
    'theme': '#0f0b0c',
    'styles': '<link rel="stylesheet" href="css/fonts.css">\n<link rel="preload" href="fonts/bai-jamjuree-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin>\n<link rel="stylesheet" href="css/site.css?v=20261105d">',
    'home_scripts': '''<script type="module" src="js/emblem.js"></script>
<script type="module" src="js/map.js"></script>
<script src="js/scope.js" defer></script>
<script src="js/heroes.js" defer></script>
<script src="js/staff.js" defer></script>
<script src="js/pick.js?v=%s" defer></script>''' % V,
    'page_scripts': '<script src="js/pick.js?v=%s" defer></script>' % V,
  },
  'atlas': {
    'theme': '#f4eeed',
    'styles': '<link rel="stylesheet" href="css/fonts.css">\n<link rel="stylesheet" href="css/fonts-atlas.css">\n<link rel="preload" href="fonts/source-serif-4-latin-opsz-normal.woff2" as="font" type="font/woff2" crossorigin>\n<link rel="stylesheet" href="css/print-base.css?v=%s">\n<link rel="stylesheet" href="css/atlas.css?v=%s">' % (V, V),
    'home_scripts': '<script type="module" src="js/map.js"></script>\n<script src="js/atlas.js?v=%s" defer></script>\n<script src="js/pick.js?v=%s" defer></script>' % (V, V),
    'page_scripts': '<script src="js/atlas.js?v=%s" defer></script>\n<script src="js/pick.js?v=%s" defer></script>' % (V, V),
  },
  'book': {
    'theme': '#ffffff',
    'styles': '<link rel="stylesheet" href="css/fonts-book.css">\n<link rel="preload" href="fonts/archivo-latin-wdth-normal.woff2" as="font" type="font/woff2" crossorigin>\n<link rel="stylesheet" href="css/print-base.css?v=%s">\n<link rel="stylesheet" href="css/book.css?v=%s">' % (V, V),
    'home_scripts': '<script type="module" src="js/map.js"></script>\n<script src="js/book.js?v=%s" defer></script>\n<script src="js/pick.js?v=%s" defer></script>' % (V, V),
    'page_scripts': '<script src="js/book.js?v=%s" defer></script>\n<script src="js/pick.js?v=%s" defer></script>' % (V, V),
  },
}
PAGES = {
  'index': ('CICM Dermatology | Thammasat University', "Master's and Ph.D. programs in dermatology at Chulabhorn International College of Medicine, Thammasat University."),
  'research': ('Research | CICM Dermatology', 'Papers by the CICM Dermatology faculty and program members, indexed in PubMed.'),
  'faculty': ('Faculty | CICM Dermatology', 'Lecturers and staff of the CICM Dermatology program.'),
  'admissions': ('Admissions | CICM Dermatology', 'Entry requirements, courses, tuition and downloads for the CICM Dermatology program.'),
}

def out_name(design, page):
  if design == 'skin': return page + '.html'
  return design + ('' if page == 'index' else '-' + page) + '.html'

for design, cfg in DESIGNS.items():
  for page, (title, desc) in PAGES.items():
    src = SRC / ((design + '.html') if (page == 'index' and design != 'skin') else (page + '.html'))
    if not src.exists(): print('skip', design, page); continue
    hdr = header if design == 'skin' else re.sub(r'<!--gauge-->.*?<!--/gauge-->', '', header, flags=re.S)
    body = src.read_text().replace('{{header}}', hdr).replace('{{footer}}', footer)
    scripts = cfg['home_scripts'] if page == 'index' else cfg['page_scripts']
    h = (head.replace('{{title}}', title).replace('{{desc}}', desc).replace('{{scripts}}', scripts)
         .replace('{{styles}}', cfg['styles']).replace('{{theme}}', cfg['theme']).replace('{{design}}', design).replace('{{v}}', V))
    html = h + body
    if design != 'skin':
      # keep every link inside the same design
      html = re.sub(r'href="(index|research|faculty|admissions)\.html', lambda m: 'href="' + out_name(design, m.group(1)), html)
    name = out_name(design, page)
    (ROOT / name).write_text(html)
    print('built', name)
