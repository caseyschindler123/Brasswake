"""Repository paths and read-only raw-sheet discovery shared by the art tools."""
import json
import os
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
WORK = REPO / 'work'
ART = REPO / 'game' / 'art'
SOURCE = REPO / 'game' / 'src'
MANIFEST = REPO / 'art' / 'sliced' / 'manifest.json'


def env_path(name, default):
    return Path(os.environ.get(name, str(default))).expanduser().resolve()


def directory(name, default):
    return str(env_path(name, default)) + os.sep


def javascript(name, filename):
    path = env_path(name, SOURCE / filename)
    path.parent.mkdir(parents=True, exist_ok=True)
    return str(path)


def sheet_paths(source):
    """Prefer current kit/out, then out, then other folders; legacy/test last.

    A build's BW_INPUT_INDEX freezes that selection for every subprocess.
    Only filenames are inspected: no user scripts or prompt files are executed.
    """
    if os.environ.get('BW_INPUT_INDEX'):
        index = json.loads(Path(os.environ['BW_INPUT_INDEX']).read_text(encoding='utf-8'))
        return {name: Path(path) for name, path in index.items()}
    source = Path(source).expanduser().resolve()
    if not source.is_dir():
        raise FileNotFoundError(f'Raw art directory does not exist: {source}')

    def rank(path):
        parts = tuple(p.lower() for p in path.relative_to(source).parts[:-1])
        legacy = any(p in ('refs', 'replaced') for p in parts)
        test = any('test' in p for p in parts)
        preferred = 0 if parts == ('kit', 'out') else 1 if parts == ('out',) else 2
        return legacy, test, preferred, len(parts), str(path).casefold()

    result = {}
    candidates = (p for p in source.rglob('*') if p.is_file()
                  and p.suffix.lower() == '.png' and re.fullmatch(r'[A-Z]+\d{2,}', p.stem))
    for path in sorted(candidates, key=rank):
        parts = {p.lower() for p in path.relative_to(source).parts[:-1]}
        if not parts.intersection({'refs', 'replaced'}):
            result.setdefault(path.stem, path)
    return result
