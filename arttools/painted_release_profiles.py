"""Prepare six continuous MakeHuman profiles with the fitted pilot's pinned converter."""

import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import sys
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'work/painted-release'
PILOT = ROOT / 'work/painted-characters/model-pilot'
PILOT_MANIFEST = json.loads((ROOT / 'arttools/painted_model_mesh_sources.json').read_text())
PIN = PILOT_MANIFEST['sources'][0]['commit']
PREFIX = f'https://raw.githubusercontent.com/makehumancommunity/makehuman/{PIN}/makehuman/data/targets/macrodetails'

# These object IDs are from the pinned MakeHuman tree. The two identical average
# targets are deliberately listed separately so receipts name the correct source.
MORPHS = {
    'caucasian-female-young.target': '9d1f0cbeedc9a6a51abe33f1ebb5fa7c5a7edbf1',
    'universal-female-young-averagemuscle-averageweight.target': '3f92e2939e50403aa89607e4889639ab337bcead',
    'universal-female-young-averagemuscle-maxweight.target': 'e0b442f75e36ad0980cd7ccda41b6b8d67b9f200',
    'universal-female-young-maxmuscle-averageweight.target': '91ca14d335389e4e4a964132fc6580ada688cb64',
    'universal-male-young-averagemuscle-maxweight.target': '15d495149eec197fed9ab8dda745cdfd4878ab2b',
}
PILOT_MORPHS = {source['file']: source for source in PILOT_MANIFEST['sources']}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def load(name):
    url = f'{PREFIX}/{name}'
    cache = OUT / 'morphs' / name
    paths = (cache, PILOT / name)
    cached = next((path for path in paths if path.is_file()), None)
    if cached:
        data = cached.read_bytes()
    else:
        with urlopen(url, timeout=30) as response:
            data = response.read()

    if b'CC0' not in data[:1000]:
        raise ValueError(f'Missing CC0 source declaration for {name}')
    digest = sha(data)
    spec = PILOT_MORPHS.get(name)
    if spec:
        if digest != spec['sha256']:
            raise ValueError(f'Pinned source differs: {name}')
    elif hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest() != MORPHS[name]:
        raise ValueError(f'Pinned blob differs: {name}')
    if cached is None:
        cache.write_bytes(data)
    return data.decode(), {'file': name, 'url': url, 'sha256': digest, 'commit': PIN}


def sources(sex, build):
    average, muscle, weight = ((.85, .15, 0), (.24, .76, 0), (.40, .03, .57))[build]
    prefix = f'universal-{sex}-young-'
    names = [
        (f'caucasian-{sex}-young.target', 1),
        (prefix + 'averagemuscle-averageweight.target', average),
        (prefix + 'maxmuscle-averageweight.target', muscle),
        (prefix + 'averagemuscle-maxweight.target', weight),
    ]
    return [(name, value) for name, value in names if value]


def prepare(selected):
    converter = ROOT / 'arttools/human_mesh.py'
    raw = converter.read_bytes()
    if sha(raw) != PILOT_MANIFEST['converterSha256']:
        raise ValueError('Review MakeHuman converter changes before replaying the release')
    code = raw.decode().replace(
        "OUTPUT=ROOT/'game/src/human_mesh_data.js'", 'OUTPUT=RELEASE_OUTPUT',
    ).replace(
        'if len(out) != manifest[\'vertices\'] or len(tri) // 3 != manifest[\'triangles\']:',
        'if False: # The six morphed meshes have their own topology and output receipts.',
    )
    before = "body={i for g,f in faces if g=='body' for i in f};"
    if code.count(before) != 1 or 'OUTPUT=RELEASE_OUTPUT' not in code:
        raise ValueError('The pinned converter no longer exposes the expected inputs')
    code = code.replace(before, '''
for source, strength in RELEASE_MORPHS:
 for line in source.splitlines():
  if not line or line.startswith('#'):continue
  index, *delta = line.split()
  for axis in range(3):
   vertices[int(index)][axis] += float(delta[axis]) * strength
''' + before)
    compiled = compile(code, str(converter), 'exec')
    (OUT / 'morphs').mkdir(parents=True, exist_ok=True)
    (OUT / 'profiles').mkdir(parents=True, exist_ok=True)
    profiles = [
        (sex, build, 3 * number + build)
        for number, sex in enumerate(('male', 'female'))
        for build in range(3) if selected is None or 3 * number + build == selected
    ]
    names = sorted({name for sex, build, _ in profiles for name, _ in sources(sex, build)})
    with ThreadPoolExecutor(max_workers=4) as pool:
        inputs = dict(zip(names, pool.map(load, names)))
    for sex, build, number in profiles:
        path = OUT / 'profiles' / f'{number}.js'
        weights = sources(sex, build)
        namespace = {
            '__file__': str(converter),
            '__name__': '__main__',
            'RELEASE_OUTPUT': path,
            'RELEASE_MORPHS': [(inputs[name][0], weight) for name, weight in weights],
        }
        exec(compiled, namespace)
        digest = sha(path.read_bytes())
        if number == 0 and digest != PILOT_MANIFEST['outputSha256']:
            raise ValueError('Average male does not match the approved pilot mesh')
        receipt = {
            'profile': number, 'sex': sex, 'build': build, 'sha256': digest,
            'license': 'CC0-1.0', 'converterSha256': sha(raw),
            'morphs': [dict(inputs[name][1], weight=weight) for name, weight in weights],
        }
        path.with_suffix('.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile', type=int, choices=range(6))
    args = parser.parse_args()
    sys.argv = sys.argv[:1]
    prepare(args.profile)
