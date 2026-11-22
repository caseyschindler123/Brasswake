"""Rebuild packed art without writing to the raw art folder.

Usage: python arttools/build_art.py "C:\\Users\\caseys\\source\\SQL Game"

Required raw PNG IDs:
  slice/pack: every ID in art/sliced/manifest.json (499 recorded sheets).
  ui_pack: UI01-04, UJ01-02, UK01-02.
  dojo_pack: DG01-09, DS01-37, DX01-02, DP01, DH01, DI01-08, DJ01-03.
  body_pack: HW01-50, HR01-50, HA01-30, HK01-10, HP01-10,
             HH01-12, HF01-06, HM01-06, HX01-02, HI01-02.
  kit_pack: KT02, KT04-06, KF01, KW01. KT01/03 are not consumed.
  pack's later extension: MW01-08, ML01-04, MR01-02, MP01-02,
             plus MWD01-08, MLD01-04, MRD01-02, MPD01-02 (64 creatures).

Current kit/out wins over archive/test copies. Reference/replaced images are
excluded. Other supported new slice IDs use detection; raw-only packs are
selected by their own packers. See work/build-art/inputs.json for the selection.
No image generation, prompt editing, font processing, or music processing runs.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parent))
from art_paths import ART, MANIFEST, REPO, SOURCE, WORK, env_path, sheet_paths


def series(prefix, end):
    return [f'{prefix}{n:02d}' for n in range(1, end + 1)]


def required_inputs():
    return {
        'slice/pack': list(json.loads(MANIFEST.read_text(encoding='utf-8'))),
        'ui_pack': series('UI', 4) + series('UJ', 2) + series('UK', 2),
        'dojo_pack': series('DG', 9) + series('DS', 37) + series('DX', 2)
                     + ['DP01', 'DH01'] + series('DI', 8) + series('DJ', 3),
        'body_pack': sum((series(p, n) for p, n in [('HW', 50), ('HR', 50), ('HA', 30),
                         ('HK', 10), ('HP', 10), ('HH', 12), ('HF', 6), ('HM', 6),
                         ('HX', 2), ('HI', 2)]), []),
        'kit_pack': ['KT02', 'KT04', 'KT05', 'KT06', 'KF01', 'KW01'],
        'creature_extension': sum((series(p, n) for p, n in [('MW', 8), ('ML', 4), ('MR', 2), ('MP', 2),
                                  ('MWD', 8), ('MLD', 4), ('MRD', 2), ('MPD', 2)]), []),
    }


def sha256(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('raw', type=Path, help='Raw art folder, read-only; may contain subfolders')
    args = parser.parse_args()
    raw = args.raw.expanduser().resolve()
    inputs = sheet_paths(raw)
    needs = required_inputs()
    missing = {name: sorted(set(ids) - inputs.keys()) for name, ids in needs.items()}
    if any(missing.values()):
        parser.error('Missing required PNGs: ' + json.dumps({k: v for k, v in missing.items() if v}))

    out = env_path('BW_OUT', ART)
    sliced = env_path('BW_SLICED', WORK / 'sliced')
    js = {key: env_path(key, SOURCE / name) for key, name in
          [('BW_JS', 'artdata.js'), ('BW_DOJO_JS', 'artdojo.js'),
           ('BW_BODY_JS', 'artbody.js'), ('BW_KIT_JS', 'artkit.js')]}
    for path in [out, sliced, *js.values(), WORK]:
        if not path.is_relative_to(REPO) or path.is_relative_to(raw):
            parser.error(f'All output must stay inside the repo and outside raw art: {path}')
    if not sliced.is_relative_to(WORK):
        parser.error('BW_SLICED must be under ignored work/; art/sliced is a read-only record')
    if out.is_relative_to(ART / 'fonts') or out.is_relative_to(ART / 'mu'):
        parser.error('BW_OUT cannot be inside fonts/ or mu/')

    logs = WORK / 'build-art'
    logs.mkdir(parents=True, exist_ok=True)
    out.mkdir(parents=True, exist_ok=True)
    sliced.mkdir(parents=True, exist_ok=True)
    index_path = logs / 'inputs.json'
    index_path.write_text(json.dumps({k: str(v) for k, v in sorted(inputs.items())}, indent=2), encoding='utf-8')
    frozen = {str(p): sha256(p) for p in inputs.values()}
    protected = {str(p): sha256(p) for folder in ['fonts', 'mu']
                 for p in (ART / folder).rglob('*') if p.is_file()}
    record = {'raw': str(raw), 'out': str(out), 'sliced': str(sliced),
              'required': needs, 'missing': missing, 'stages': [],
              'source_sha256': frozen, 'protected_sha256': protected}
    env = os.environ.copy()
    env.update({'BW_INPUT_INDEX': str(index_path), 'BW_RAW': str(raw), 'BW_OUT': str(out), 'BW_SLICED': str(sliced),
                **{key: str(value) for key, value in js.items()}})
    steps = [('slice', [str(raw), str(sliced), 'new', '--manifest', str(MANIFEST)])]
    steps += [(name, [str(raw), str(out)] if name == 'ui_pack' else [] if name == 'pack' else [str(raw)])
              for name in ['ui_pack', 'pack', 'dojo_pack', 'body_pack', 'kit_pack']]
    try:
        for name, parameters in steps:
            started = time.monotonic()
            log = logs / f'{name}.log'
            command = [sys.executable, '-I', '-u', str(REPO / 'arttools' / f'{name}.py'), *parameters]
            print(f'{name}: running (log: {log.relative_to(REPO)})', flush=True)
            with log.open('w', encoding='utf-8', newline='\n') as stream:
                result = subprocess.run(command, cwd=REPO, env=env, stdout=stream,
                                        stderr=subprocess.STDOUT, text=True)
            record['stages'].append({'name': name, 'exit_code': result.returncode,
                                     'seconds': round(time.monotonic() - started, 2), 'log': str(log)})
            if result.returncode:
                print(log.read_text(encoding='utf-8'), file=sys.stderr)
                raise RuntimeError(f'{name} failed; see {log}')
            print(f'{name}: done in {record["stages"][-1]["seconds"]}s', flush=True)
        record['inputs_unchanged'] = all(sha256(p) == value for p, value in frozen.items())
        record['fonts_and_music_unchanged'] = all(sha256(p) == value for p, value in protected.items())
        if not record['inputs_unchanged'] or not record['fonts_and_music_unchanged']:
            raise RuntimeError('Input or protected asset verification failed')
        print('Art rebuilt. Raw inputs, fonts and music verified unchanged.', flush=True)
    finally:
        (logs / 'run.json').write_text(json.dumps(record, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
