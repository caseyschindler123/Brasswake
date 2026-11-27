"""Restore the previously shipped Suno selections without service requests.

Eight prepared loops are recovered byte-for-byte. The three earlier full-song
assets are recovered from the same Git source, cropped inside their former
playback regions and prepared with the current bounded-loop/level policy.
"""
import argparse
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SOURCE_COMMIT = 'ec29131'
HISTORY = HERE/'history/soundtrack-2026-11-22.json'
BASELINE = HERE/'history/soundtrack-before-suno-2026-11-26.json'
EARLY = {
    'm_tallyport': ('Tallyport', 10.658, 159.6553),
    'm_bilge': ('Bilge Vaults', 14.721, 69.5739),
    'm_combat': ('Battle', 22.361, 75.5065),
}
EARLY_HASHES = {
    'm_tallyport': 'e8b72f694913e7c466104b13028f8281270e8ac8d26cf1de122e1b8e7fd28bfb',
    'm_bilge': 'f762b09c3b813119e03c341fb5f6cf3cdd3aaa030a3baa51c60a414ae2579e84',
    'm_combat': '85f298d9a93427b687bb0b1948418e1449482fddc464a89bc8103aefde95e353',
}
spec = importlib.util.spec_from_file_location('preparation', HERE/'prepare_stable_audio.py')
prep = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prep)
audio = prep.audio


def recover(relative):
    return subprocess.check_output(['git', 'show', f'{SOURCE_COMMIT}:{relative}'], cwd=ROOT)


def restore(ffmpeg):
    catalog_path = HERE/'soundtrack.json'
    catalog = json.loads(catalog_path.read_text())
    if not BASELINE.exists():
        if catalog['provider'] != 'Stable Audio':
            raise ValueError('Expected the all-Stable Audio catalog before first restoration')
        BASELINE.write_bytes(catalog_path.read_bytes())
    baseline = json.loads(BASELINE.read_text())
    history = json.loads(HISTORY.read_text())
    restored = {key: copy.deepcopy(entry) for key, entry in history['tracks'].items()
                if entry['origin']['kind'] == 'user-supplied-suno'}
    assert len(restored) == 8
    work = ROOT/'work/suno-restoration'
    work.mkdir(parents=True, exist_ok=True)
    # Reusing the already-approved prepared bytes also preserves the chosen
    # original take and its precise historical source/selection provenance.
    for ident, entry in restored.items():
        data = recover(entry['path'])
        if hashlib.sha256(data).hexdigest() != entry['sha256']:
            raise ValueError('Historical output hash mismatch: '+ident)
        (ROOT/entry['path']).write_bytes(data)
        print(ident, 'exact historical loop', entry['b'], flush=True)
    for ident, (title, start, end) in EARLY.items():
        relative = f'game/art/mu/{ident}.mp3'
        raw = recover(relative)
        if hashlib.sha256(raw).hexdigest() != EARLY_HASHES[ident]:
            raise ValueError('Original Suno source hash mismatch: '+ident)
        source = work/(ident+'-original.mp3')
        source.write_bytes(raw)
        decoded = audio.decode(ffmpeg, source)
        region = decoded[round(start*audio.SR):round(end*audio.SR)]
        region_path = work/(ident+'-former-region.wav')
        audio.wavfile.write(region_path, audio.SR, region)
        inferred = audio.analyse_suno(ffmpeg, region_path)
        selection = prep.select_loop(ffmpeg, region_path, inferred['estimatedBPM'])
        selection['startSeconds'] += start
        selection['endSeconds'] += start
        baked, period = prep.bake_loop(decoded, selection)
        origin = dict(kind='user-supplied-suno', provider='Suno', title=title,
                      sourceSHA256=hashlib.sha256(raw).hexdigest(),
                      sourceCommit=SOURCE_COMMIT, sourcePath=relative,
                      formerLoop=dict(a=start, b=end),
                      provenance='Original user-imported Suno track recovered from Git; no new generation or download. Original model, prompt and song URL unavailable.',
                      selection=selection, crossfadeSeconds=.2)
        restored[ident] = audio.new_entry(ffmpeg, ROOT/relative, baked, period, work, origin)
        print(ident, 'prepared original Suno', period, restored[ident]['integratedLUFS'], flush=True)
    # Start from the archived catalog on every invocation, never from partially
    # rewritten metadata. Only these eleven IDs are allowed to change.
    catalog = copy.deepcopy(baseline)
    catalog.update(date='2026-11-26', provider='Suno and Stable Audio',
                   description='11 restored Suno themes: eight towns, Bilge Vaults, Sunken Sluice and regular battles. The other 17 Stable Audio themes/cues remain unchanged.')
    catalog['toolchain']['loopPreparation'] = 'Eight exact historical Suno loops (400 ms seam); three recovered Suno songs and retained Stable Audio loops use 8/16-bar recurrence (200 ms seam). All loops have a 1.25 s copied safety tail.'
    catalog['tracks'].update(restored)
    catalog_path.write_text(json.dumps(catalog, indent=2)+'\n')
    script = ROOT/'game/src/audio.js'
    text = script.read_text(encoding='utf-8')
    meta = {ident: {key: entry[key] for key in ('a','b','v','loop')}
            for ident, entry in catalog['tracks'].items()}
    text, count = re.subn(r'  const MUSIC = \{.*?\n  \};',
                         '  const MUSIC = '+json.dumps(meta, indent=2).replace('\n','\n  ')+';',
                         text, count=1, flags=re.S)
    if count != 1:
        raise ValueError('Expected exactly one MUSIC metadata region')
    script.write_text(text, encoding='utf-8')
    packed_path = ROOT/'arttools/packed_manifest.json'
    packed = json.loads(packed_path.read_text())
    for row in packed:
        ident = Path(row['path']).stem
        if row['path'].startswith('art/mu/') and ident in restored:
            entry = restored[ident]
            row.update(size=entry['bytes'], sha256=entry['sha256'])
    packed_path.write_text(json.dumps(packed, indent=2)+'\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ffmpeg', required=True)
    restore(parser.parse_args().ffmpeg)
