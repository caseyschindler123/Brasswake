"""Bake seamless loops. Output file = original[0:b] with an equal-power
crossfade into original[a-d:a] over the last d seconds, then original[a:a+tail]
appended. Looping from a to b is then seamless, and a constant decoder offset
(encoder priming) of under `tail` seconds keeps it seamless."""
import sys, json, subprocess
import numpy as np, librosa
from scipy.io import wavfile

SR = 44100
D = 0.30      # crossfade seconds
TAIL = 1.0    # seconds of post-loop material (copy of the loop start)

def refine(y, a, b, sr):
    """Shift b within +-60 ms so the waveform at b best matches the one at a."""
    m = y.mean(axis=0)
    w = int(0.25 * sr)
    ia = int(a * sr)
    ref = m[ia:ia + w]
    best = (-2, 0)
    for sh in range(-int(0.06 * sr), int(0.06 * sr), 8):
        ib = int(b * sr) + sh
        seg = m[ib:ib + w]
        c = float(np.dot(ref, seg) / (np.linalg.norm(ref) * np.linalg.norm(seg) + 1e-9))
        if c > best[0]:
            best = (c, sh)
    return b + best[1] / sr, best[0]

def bake(src, a, b, out):
    y, sr = librosa.load(src, sr=SR, mono=False)
    corr = 0.0
    ia, ib, d, tl = int(a * sr), int(b * sr), int(D * sr), int(TAIL * sr)
    t = np.linspace(0, np.pi / 2, d)
    fo, fi = np.cos(t), np.sin(t)
    head = y[:, :ib - d]
    x = y[:, ib - d:ib] * fo + y[:, ia - d:ia] * fi
    tail = y[:, ia:ia + tl]
    z = np.concatenate([head, x, tail], axis=1)
    wav = out + '.wav'
    wavfile.write(wav, sr, (np.clip(z.T, -1, 1) * 32767).astype(np.int16))
    return dict(a=round(a, 4), b=round(b, 4), corr=round(corr, 3), len=round(z.shape[1] / sr, 3))

meta = {}
for o in json.load(open('loops.json')):
    name = o['path'].split('/')[-1][:-4]
    r = bake(o['path'], o['loop_start'], o['loop_end'], 'out/' + name)
    # loudness to about -18 LUFS so tracks sit under effects, then mp3
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', f'out/{name}.wav', '-af',
                    'loudnorm=I=-18:TP=-1.5:LRA=11', '-ar', str(SR), '-c:a', 'libmp3lame',
                    '-q:a', '5', f'out/m_{name}.mp3'], check=True)
    meta[name] = r
    print(name, r)
json.dump(meta, open('out/meta.json', 'w'), indent=1)
