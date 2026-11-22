"""Compare game/art with the accepted or live manifest and optional reference bytes.

python arttools/verify_art.py [--reference-art PATH] [--report PATH]
Reference files must match the live manifest hash before their decoded pixels
can be compared. A hash-only manifest cannot establish image dimensions or
pixel differences; those are explicitly reported as unavailable without bytes.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys

import numpy as np
from PIL import Image, features

sys.path.insert(0, str(Path(__file__).resolve().parent))
from art_paths import ART, REPO


def sha256(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def comparison(art, manifest, reference=None):
    expected = {item['path'][4:]: item for item in manifest if item['path'].startswith('art/')}
    actual = {p.relative_to(art).as_posix(): p for p in art.rglob('*') if p.is_file()}
    result = {'expected_files': len(expected), 'actual_files': len(actual), 'matched': [],
              'missing': sorted(expected.keys() - actual.keys()),
              'extra': sorted(actual.keys() - expected.keys()), 'different': []}
    for relative in sorted(expected.keys() & actual.keys()):
        path, live = actual[relative], expected[relative]
        digest = sha256(path)
        if digest == live['sha256'] and path.stat().st_size == live['size']:
            result['matched'].append(relative)
            continue
        change = {'path': relative, 'expected_sha256': live['sha256'], 'actual_sha256': digest,
                  'expected_bytes': live['size'], 'actual_bytes': path.stat().st_size,
                  'byte_difference': path.stat().st_size - live['size']}
        if path.suffix.lower() not in {'.png', '.webp', '.jpg', '.jpeg', '.gif', '.bmp', '.tif', '.tiff'}:
            change['pixel_comparison'] = 'not an image'
            result['different'].append(change)
            continue
        with Image.open(path) as image:
            change['actual_dimensions'] = list(image.size)
            if 'dimensions' in live:
                change['expected_dimensions'] = live['dimensions']
            ref = None
            if reference:
                ref = next((p for p in [reference / relative, reference / 'art' / relative]
                            if p.is_file()), None)
            if ref is None:
                if 'dimensions' in live and list(image.size) != live['dimensions']:
                    change['pixel_comparison'] = 'different dimensions'
                else:
                    change['pixel_comparison'] = 'unavailable: reference image bytes not supplied'
            elif sha256(ref) != live['sha256']:
                change['pixel_comparison'] = 'unavailable: reference SHA256 does not match the live manifest'
            else:
                with Image.open(ref) as other:
                    change['expected_dimensions'] = list(other.size)
                    if image.size != other.size:
                        change['pixel_comparison'] = 'different dimensions'
                    else:
                        diff = np.abs(np.asarray(image.convert('RGBA'), dtype=np.int16)
                                      - np.asarray(other.convert('RGBA'), dtype=np.int16))
                        change['pixel_comparison'] = 'decoded RGBA, channels 0-255'
                        change['max_pixel_difference'] = int(diff.max())
                        change['max_channel_difference'] = diff.max(axis=(0, 1)).tolist()
                        change['different_pixels'] = int(np.any(diff != 0, axis=2).sum())
        result['different'].append(change)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--art', type=Path, default=ART)
    accepted = REPO / 'arttools/packed_manifest.json'
    parser.add_argument('--manifest', type=Path, default=accepted if accepted.is_file() else REPO / 'arttools/live_manifest_1795364400-6a70.json')
    parser.add_argument('--reference-art', type=Path)
    parser.add_argument('--report', type=Path, default=REPO / 'arttools/rebuild_comparison.json')
    args = parser.parse_args()
    result = comparison(args.art, json.loads(args.manifest.read_text(encoding='utf-8')), args.reference_art)
    result['manifest'] = args.manifest.name
    result['webp_encoder'] = features.version('webp')
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(f"Exact: {len(result['matched'])}; missing: {len(result['missing'])}; "
          f"extra: {len(result['extra'])}; different: {len(result['different'])}")
    print(f'Full report: {args.report}')
    # A difference is a finding, not a successful exact reproduction.
    return int(bool(result['missing'] or result['extra'] or result['different']))


if __name__ == '__main__':
    raise SystemExit(main())
