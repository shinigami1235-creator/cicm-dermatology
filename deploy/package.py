"""Build the zip for CICM IT: install notes, the nginx snippet and a dermatology/ folder
holding only the files the website serves. Run from the repo root: python3 deploy/package.py [out.zip]"""
import pathlib, subprocess, sys, zipfile
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'cicm-dermatology-for-it.zip'
SERVED = ['css', 'js', 'data', 'assets', 'fonts', 'media', 'photos', 'people']
subprocess.run([sys.executable, str(ROOT / 'build.py')], check=True, stdout=subprocess.DEVNULL)
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in ['INSTALL-EN.md', 'INSTALL-TH.md', 'nginx-dermatology.conf']:
        z.write(ROOT / 'deploy' / f, 'cicm-dermatology/' + f)
    files = sorted(ROOT.glob('*.html'))
    for d in SERVED:
        files += sorted(p for p in (ROOT / d).rglob('*') if p.is_file())
    for p in files:
        z.write(p, 'cicm-dermatology/dermatology/' + p.relative_to(ROOT).as_posix())
print(OUT, len(files), 'site files')
