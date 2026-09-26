"""Build only files intended for the public website."""
from pathlib import Path
import shutil
ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'dist'
if OUT.exists():
    if OUT.is_symlink() or OUT.resolve().parent != ROOT.resolve() or OUT.name != 'dist':
        raise ValueError('Unexpected build directory')
    shutil.rmtree(OUT)
OUT.mkdir(exist_ok=True)
for name in ['index.html', 'styles.css', 'app.js', 'projects.js', 'credits.html', 'assets', 'shared']:
    source = ROOT / name
    if source.is_dir(): shutil.copytree(source, OUT / name, dirs_exist_ok=True)
    else: shutil.copy2(source, OUT / name)
(OUT / '.nojekyll').touch()
print('Website built in dist/')
