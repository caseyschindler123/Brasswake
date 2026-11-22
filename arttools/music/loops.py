import sys, json
import numpy as np, librosa

def analyse(path):
    y, sr = librosa.load(path, sr=22050, mono=True)
    dur = len(y) / sr
    hop = 512
    rms = librosa.feature.rms(y=y, hop_length=hop)[0]
    t = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)
    tempo, beats = librosa.beat.beat_track(y=y, sr=sr, hop_length=hop)
    bt = librosa.frames_to_time(beats, sr=sr, hop_length=hop)
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop)
    mfcc = librosa.feature.mfcc(y=y, sr=sr, hop_length=hop, n_mfcc=13)
    feat = np.vstack([chroma, mfcc[1:] / 50.0])
    bs = librosa.util.sync(feat, beats, aggregate=np.mean)  # per-beat features
    bs = bs / (np.linalg.norm(bs, axis=0, keepdims=True) + 1e-9)
    # loudness per second, to find intro and outro
    sec = [float(np.sqrt(np.mean(y[int(i*sr):int((i+1)*sr)]**2))) for i in range(int(dur))]
    peak = np.percentile(sec, 90)
    # outro: last second whose loudness is still >= 55% of the typical level
    body_end = max(i for i, v in enumerate(sec) if v >= 0.55 * peak)
    body_start = min(i for i, v in enumerate(sec) if v >= 0.55 * peak)
    W = 16  # beats compared on each side of the seam
    best = None
    nb = bs.shape[1]
    for i in range(W, nb - W):
        a = bt[i] if i < len(bt) else None
        if a is None or a < body_start or a > dur * 0.5:
            continue
        for j in range(i + 32, nb - W):
            b = bt[j] if j < len(bt) else None
            if b is None or b > body_end - 1 or b - a < 30:
                continue
            # what comes after b must sound like what comes after a,
            # and what came before b like what came before a
            s = np.mean(np.sum(bs[:, i - W:i + W] * bs[:, j - W:j + W], axis=0))
            L = b - a
            score = s + 0.002 * L  # prefer longer loops slightly
            if best is None or score > best[0]:
                best = (score, float(a), float(b), float(s))
    return dict(path=path, dur=round(dur, 2), tempo=float(np.atleast_1d(tempo)[0]),
                body=[body_start, body_end], loudness=[round(v / peak, 2) for v in sec],
                loop_start=round(best[1], 3), loop_end=round(best[2], 3), sim=round(best[3], 3))

out = [analyse(p) for p in sys.argv[1:]]
for o in out:
    print(o['path'], 'dur', o['dur'], 'tempo', round(o['tempo'], 1), 'body', o['body'],
          'loop', o['loop_start'], '->', o['loop_end'], 'len', round(o['loop_end'] - o['loop_start'], 1), 'sim', o['sim'])
    print('  loud/s:', o['loudness'])
json.dump(out, open('loops.json', 'w'), indent=1)
