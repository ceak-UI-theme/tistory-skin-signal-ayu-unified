"""Verify the release package against the complete allowlist and current source."""
import sys
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile

root = Path(__file__).resolve().parent.parent
version = ET.parse(root / 'index.xml').findtext('./information/version')
archive = Path(sys.argv[1]) if len(sys.argv) > 1 else root / f'releases/Signal-Ayu-Unified-v{version}.zip'
files = ['README.md', 'CHANGELOG.md', 'index.xml', 'style.css', 'skin.html', 'LICENSE',
         'preview.jpg', 'preview1600.jpg', 'preview256.jpg', 'preview560.jpg', 'preview_big.jpg']
expected = set(files) | {p.relative_to(root).as_posix() for p in (root / 'images').rglob('*') if p.is_file()}
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None, 'Corrupt ZIP'
    actual = [n for n in z.namelist() if not n.endswith('/')]
    assert len(actual) == len(set(actual)), 'Duplicate ZIP entries'
    assert set(actual) == expected, f'Unexpected ZIP contents: {set(actual) ^ expected}'
    for name in expected:
        assert z.read(name) == (root / name).read_bytes(), f'Stale file: {name}'
    assert f'script.js?v={version}' in z.read('skin.html').decode('utf-8')
print(f'XML and ZIP allowlist/source/version checks PASS: {archive.name}')
