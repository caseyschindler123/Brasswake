"""Prepare read-only Stable Audio downloads for the browser; no service requests.

python -I arttools/music/prepare_stable_audio.py --ffmpeg PATH --music-sources DIR --effect-sources DIR
"""
import argparse
import hashlib
import importlib.util
import json
import math
import re
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.io import wavfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SR = 44100
FX_SR = 22050
spec = importlib.util.spec_from_file_location('legacy_music_tools', HERE/'build_soundtrack.py')
audio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audio)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def select_loop(ffmpeg, path, requested_bpm):
    """Compare complete 8/16-bar passages on an inferred beat grid.

    Spectral recurrence/energy/onset agreement is a technical heuristic, not
    subjective musical approval. A short blend handles the waveform seam only.
    """
    sr, hop = 11025, 512
    y = audio.decode(ffmpeg, path, sr).mean(axis=1)
    _, times, z = signal.stft(y, fs=sr, nperseg=2048, noverlap=2048-hop)
    mag = np.abs(z)
    freq = np.arange(mag.shape[0])*sr/2048
    flux = np.maximum(np.diff(mag, axis=1, prepend=mag[:, :1]), 0).sum(axis=0)
    flux = np.maximum(flux-np.median(flux), 0)
    ac = signal.correlate(flux, flux, mode='full', method='fft')[len(flux)-1:]
    dt = hop/sr
    beat = 60/requested_bpm
    lags = np.arange(max(2, round(beat*.89/dt)), round(beat*1.11/dt)+1)
    ranked = lags[np.argsort(ac[lags])[-4:]]*dt
    periods = sorted(set([beat, *ranked]))
    chroma = np.zeros((12,len(times)))
    for i, f in enumerate(freq):
        if 70 < f < 2600:
            chroma[round(69+12*np.log2(f/440))%12] += mag[i]
    bands = np.array([mag[(freq>=lo)&(freq<hi)].mean(axis=0) for lo,hi in [(70,250),(250,800),(800,2400),(2400,5000)]])
    features = np.concatenate([chroma/(np.linalg.norm(chroma,axis=0)+1e-9), bands/(np.linalg.norm(bands,axis=0)+1e-9)])
    energy = np.sqrt(np.mean(mag**2,axis=0))
    onset_peaks = signal.find_peaks(flux, distance=max(1,round(beat*.7/dt)))[0]
    starts = [float(times[i]) for i in onset_peaks if 1.2 < times[i] < 20]
    best = None
    win = round(1.5/dt)
    for beat_seconds in periods:
        for bars in (8,16):
            period = beat_seconds*4*bars
            if not 24 <= period <= 55:
                continue
            for start in starts:
                end = start+period
                if end+1.5 > len(y)/sr:
                    continue
                ia, ib = round(start/dt), round(end/dt)
                x, q = features[:,ia:ia+win], features[:,ib:ib+win]
                similarity = float(np.sum(x*q)/(np.linalg.norm(x)*np.linalg.norm(q)+1e-9))
                mismatch = abs(math.log((energy[ia:ia+win].mean()+1e-9)/(energy[ib:ib+win].mean()+1e-9)))
                quiet = max(0,.55-energy[ia:ia+win].mean()/(np.median(energy)+1e-9))
                onset_error = abs(flux[ia:ia+win].sum()-flux[ib:ib+win].sum())/(flux[ia:ia+win].sum()+flux[ib:ib+win].sum()+1e-9)
                score = similarity-.15*mismatch-.2*quiet-.04*onset_error+.012*(bars==16)
                if best is None or score > best['score']:
                    best = dict(startSeconds=start,endSeconds=end,periodBars=bars,meter='4/4',
                                estimatedBPM=60/beat_seconds,requestedBPM=requested_bpm,
                                phraseSimilarity=similarity,energyLogMismatch=mismatch,score=float(score))
    if best is None or best['phraseSimilarity'] < .80 or best['energyLogMismatch'] > .5:
        raise ValueError(f'No sufficiently recurring passage: {path.name}: {best}')
    return best


def bake_loop(y, selection):
    a, b = round(selection['startSeconds']*SR), round(selection['endSeconds']*SR)
    # Blend into the material immediately before the opening; the opening
    # downbeat is not duplicated, and the selected whole-bar period is retained.
    n = round(.20*SR)
    z = y[a:b].copy()
    blend = np.linspace(0,1,n,dtype=np.float32)[:,None]
    z[-n:] = z[-n:]*(1-blend)+y[a-n:a]*blend
    return np.concatenate([z,z[:round(audio.TAIL*SR)]]),len(z)/SR


def trim_event(y, sr, ambience=False):
    # Frame RMS rejects isolated codec ticks; include 8 ms of attack pre-roll
    # and 35 ms of trailing room. Never gate the body of an event.
    mono = y.mean(axis=1) if y.ndim==2 else y
    width = max(1,round(.005*sr))
    env = np.sqrt(signal.convolve(mono*mono,np.ones(width)/width,mode='same',method='fft').clip(0))
    active = np.flatnonzero(env > max(float(env.max())*.008,10**(-65/20)))
    if not len(active):
        raise ValueError('Silent source')
    a = max(0,int(active[0])-round(.008*sr))
    b = min(len(y),int(active[-1])+round(.035*sr))
    out = y[a:b].copy()
    fade_in = min(round((.012 if ambience else .002)*sr),len(out)//4)
    fade_out = min(round((.10 if ambience else .025)*sr),len(out)//4)
    shape = (slice(None),None) if out.ndim==2 else slice(None)
    out[:fade_in] *= np.linspace(0,1,fade_in)[shape]
    out[-fade_out:] *= np.linspace(1,0,fade_out)[shape]
    # A short zero tail makes exact natural end and browser completion reliable.
    tail_shape = (round(.025*sr),out.shape[1]) if out.ndim==2 else (round(.025*sr),)
    return np.concatenate([out,np.zeros(tail_shape,dtype=out.dtype)]),dict(trimStartSeconds=a/sr,trimEndSeconds=b/sr,fadeOutSeconds=fade_out/sr)


def effect_level(ident):
    if ident.startswith('s_step_'): return -15
    if ident.startswith('s_ambient_'): return -24
    if ident == 's_click': return -26
    if ident.startswith('s_grade_') or ident in ('s_coins','s_reward'): return -14
    if ident in ('s_door_open','s_door_close'): return -12
    return -8


def prepare(args):
    work = ROOT/'work/audio/stable-preparation-2026-11-24'
    work.mkdir(parents=True,exist_ok=True)
    music_root, fx_root = Path(args.music_sources),Path(args.effect_sources)
    music_session = json.loads((music_root/'generation-session.json').read_text())
    fx_session = json.loads((fx_root/'sfx-session.json').read_text())
    catalog = dict(schemaVersion=2,date='2026-11-24',provider='Stable Audio',
                   description='Complete replacement: 26 loops and two musical cues; no historical tracks retained in playback.',
                   retained=[],toolchain=dict(python='3.12',numpy=np.__version__,scipy=__import__('scipy').__version__,
                   ffmpeg=audio.run(args.ffmpeg,'-version').stdout.decode().splitlines()[0],
                   normalization='Constant gain near -18 LUFS; -2.7 dBTP encode ceiling; decoded verification',
                   loopPreparation='8/16-bar recurrence heuristic, 200 ms linear seam blend, 1.25 s copied safety tail',
                   subjectiveListening='Unavailable; technical inspection and browser verification only'),tracks={})
    for source in music_session['tracks']:
        ident, loop = source['id'],source['loop']
        path = music_root/source['sourceFiles'][0]
        assert digest(path)==source['sourceSHA256'],ident
        prompt = source.get('submittedPrompt',source['prompt'])
        origin = dict(kind='stable-audio',provider='Stable Audio',model=source['model'],sourceDate='2026-11-24',
                      sourceSHA256=digest(path),prompt=prompt,requestedSeconds=source['requestedSeconds'],
                      shape=source['shape'],take=1,subjectiveListening='not performed')
        y = audio.decode(args.ffmpeg,path)
        if loop:
            bpm = float(re.search(r'(\d+) BPM',prompt,re.I)[1])
            selection = select_loop(args.ffmpeg,path,bpm)
            y,period = bake_loop(y,selection)
            origin.update(selection=selection,crossfadeSeconds=.2)
        else:
            y,trimming = trim_event(y,SR)
            period = len(y)/SR
            origin['preparation'] = trimming
        out = ROOT/'game/art/mu'/(ident+('.mp3' if loop else '.wav'))
        stats = audio.encode(args.ffmpeg,y,out,work,192)
        entry = dict(a=0,b=round(period,6) if loop else stats['duration'],v=1,loop=loop,
                     path=out.relative_to(ROOT).as_posix(),origin=origin,**stats)
        if loop:
            entry['quality']=audio.seam_stats(audio.decode(args.ffmpeg,out),period)
        if abs(entry['integratedLUFS']+18)>.8 or entry['truePeakDBTP']>=-1.5:
            raise ValueError(f'Music mix outside target: {ident}: {entry}')
        catalog['tracks'][ident]=entry
        print(ident,entry['duration'],entry['integratedLUFS'],entry.get('quality',{}),flush=True)
    (HERE/'soundtrack.json').write_text(json.dumps(catalog,indent=2)+'\n')

    effects = dict(schemaVersion=1,date='2026-11-24',provider='Stable Audio',sampleRate=FX_SR,channels=1,
                   description='64 prepared mono PCM16 effects, short onset/tail fades and per-role peak/energy bounds.',
                   subjectiveListening='Unavailable; technical inspection and browser verification only',effects={})
    sources = []
    for entry in fx_session['effects']:
        sources.append((entry['id'],fx_root/entry['file'],entry['hook'],dict(kind='stable-audio',model=entry['model'],
            sourceSHA256=entry['sha256'],prompt=entry['prompt'],requestedSeconds=entry['seconds'],take=1)))
    for pack in fx_session['packs']:
        material = pack['id'].removeprefix('footsteps_')
        for i, relative in enumerate(pack['files'],1):
            path=fx_root/relative
            sources.append((f's_step_{material}_{i}',path,'step:'+material,dict(kind='stable-audio-sampler',
                sourceSHA256=digest(path),packArchiveSHA256=pack['archiveSHA256'],variation=i,
                promptRetention='Exact pack prompt not retained; isolated fantasy-game footfall on '+material)))
    for ident,path,hook,origin in sources:
        assert digest(path)==origin['sourceSHA256'],ident
        y = audio.decode(args.ffmpeg,path,FX_SR).mean(axis=1)
        y,trimming = trim_event(y,FX_SR,ident.startswith('s_ambient_'))
        peak,rms = float(np.max(np.abs(y))),float(np.sqrt(np.mean(y*y)))
        target = effect_level(ident)
        # Peak limits preserve transient contrast. The RMS ceiling prevents a
        # dense one-second export from overpowering a brief attack transient.
        gain = min(10**(target/20)/peak,10**((target-7)/20)/rms)
        y *= gain
        out = ROOT/'game/art/fx'/(ident+'.wav')
        out.parent.mkdir(parents=True,exist_ok=True)
        wavfile.write(out,FX_SR,np.round(np.clip(y,-.99,.99)*32767).astype(np.int16))
        decoded=audio.decode(args.ffmpeg,out,FX_SR)
        effects['effects'][ident]=dict(path=out.relative_to(ROOT).as_posix(),hook=hook,origin=origin,
            preparation={**trimming,'gainDB':20*math.log10(gain),'peakCeilingDBFS':target},
            sampleRate=FX_SR,channels=1,duration=round(len(y)/FX_SR,6),bytes=out.stat().st_size,sha256=digest(out),
            samplePeakDBFS=round(20*math.log10(float(np.max(np.abs(decoded)))),3),
            rmsDBFS=round(20*math.log10(float(np.sqrt(np.mean(decoded*decoded)))),3))
        print(ident,len(y)/FX_SR,effects['effects'][ident]['samplePeakDBFS'],flush=True)
    assert len(catalog['tracks'])==28 and len(effects['effects'])==64
    (HERE/'effects.json').write_text(json.dumps(effects,indent=2)+'\n')
    # Only explicit audio regions are synchronized; art coordinates are untouched.
    script = ROOT/'game/src/audio.js'
    text = script.read_text(encoding='utf-8')
    meta = {ident:{k:v[k] for k in ('a','b','v','loop')} for ident,v in catalog['tracks'].items()}
    text = re.sub(r'  const MUSIC = \{.*?\n  \};', '  const MUSIC = '+json.dumps(meta,indent=2).replace('\n','\n  ')+';',text,count=1,flags=re.S)
    sample_meta = {ident:entry['duration'] for ident,entry in effects['effects'].items()}
    text = re.sub(r'  const SAMPLES = \{.*?\};', '  const SAMPLES = '+json.dumps(sample_meta,indent=2).replace('\n','\n  ')+';',text,count=1,flags=re.S)
    script.write_text(text,encoding='utf-8')
    packed = ROOT/'arttools/packed_manifest.json'
    manifest = json.loads(packed.read_text())
    manifest = [x for x in manifest if not x['path'].startswith(('art/mu/','art/fx/'))]
    for path in sorted([*(ROOT/'game/art/mu').glob('*'),*(ROOT/'game/art/fx').glob('*')]):
        if path.is_file():
            manifest.append(dict(path='art/'+path.relative_to(ROOT/'game/art').as_posix(),size=path.stat().st_size,sha256=digest(path)))
    packed.write_text(json.dumps(sorted(manifest,key=lambda x:x['path']),indent=2)+'\n')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ffmpeg',required=True)
    parser.add_argument('--music-sources',required=True)
    parser.add_argument('--effect-sources',required=True)
    prepare(parser.parse_args())
