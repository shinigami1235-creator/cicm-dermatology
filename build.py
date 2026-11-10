"""Assemble the static pages from src/ into site/. Run: python3 build.py"""
import pathlib
SRC = pathlib.Path(__file__).parent / 'src'; OUT = pathlib.Path(__file__).parent
head = (SRC/'head.html').read_text(); header = (SRC/'header.html').read_text(); footer = (SRC/'footer.html').read_text()
IMPORTMAP = '''<script type="module" src="js/emblem.js"></script>
<script type="module" src="js/map.js"></script>
<script src="js/scope.js" defer></script>
<script src="js/heroes.js" defer></script>
<script src="js/staff.js" defer></script>
<script src="js/pick.js" defer></script>'''
PAGES = {
  'index.html': ('CICM Dermatology | Thammasat University', "Master's and Ph.D. programs in dermatology at Chulabhorn International College of Medicine, Thammasat University.", IMPORTMAP),
  'research.html': ('Research | CICM Dermatology', 'Papers by the CICM Dermatology faculty and program members, indexed in PubMed.', ''),
  'faculty.html': ('Faculty | CICM Dermatology', 'Lecturers and staff of the CICM Dermatology program.', ''),
  'admissions.html': ('Admissions | CICM Dermatology', 'Entry requirements, courses, tuition and downloads for the CICM Dermatology program.', ''),
}
for name, (title, desc, scripts) in PAGES.items():
    body = (SRC/name).read_text().replace('{{header}}', header).replace('{{footer}}', footer)
    h = head.replace('{{title}}', title).replace('{{desc}}', desc).replace('{{scripts}}', scripts)
    (OUT/name).write_text(h + body)
    print('built', name)
