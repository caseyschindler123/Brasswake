"""Prepare short CC0 footfalls; preserve every other music/effect asset.

Use the recorded Kenney Impact Sounds 1.0 and Fantozzi Footsteps archives.
python -I arttools/music/prepare_footsteps.py --archive PATH --sand-archive PATH --ffmpeg PATH
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import zipfile

import numpy as np
from scipy import signal
from scipy.io import wavfile

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
SR=22050
ARCHIVE_SHA256='029d734af1582474edf3a694d1b0cebc97c1c152f2f39fa34d4c2bafc5de77f8'
SOURCE_URL='https://kenney.nl/assets/impact-sounds'
SELECTION={'stone':('concrete',[0,1,2,3]),'wood':('wood',[0,1,2,3]),'soil':('grass',[0,2,3,4]),'snow':('snow',[0,1,2,3])}
SAND_SHA256='415d360e0911c1c1c5355ee94023b772e6f4044f59b9b580610e7dbffd1840fd'
SAND_URL='https://opengameart.org/content/fantozzis-footsteps-grasssand-stone'
spec=importlib.util.spec_from_file_location('audio',HERE/'build_soundtrack.py')
audio=importlib.util.module_from_spec(spec);spec.loader.exec_module(audio)


def short_contact(y,soft_sand=False):
    """Keep the isolated contact and its short decay, without quiet room tails."""
    if y.ndim!=1 or not np.isfinite(y).all() or not np.any(y):
        raise ValueError('Footfall must contain finite mono audio')
    width=round(.003*SR)
    env=np.sqrt(signal.convolve(y*y,np.ones(width)/width,mode='same').clip(0))
    active=np.flatnonzero(env>float(env.max())*.015)
    a=max(0,int(active[0])-round(.005*SR))
    b=min(len(y),int(active[-1])+round(.025*SR))
    if soft_sand:
        # The original isolated sand contacts include a quiet grit release.
        # Retain 99% of their energy, remove the room tail, and finish before
        # the next 180-steps/min running contact.
        energy=np.cumsum(y*y)
        b=min(b,int(np.searchsorted(energy,energy[-1]*.99))+round(.01*SR))
    out=y[a:b].copy()
    if not .02<len(out)/SR<(.31 if soft_sand else .22):
        raise ValueError('Source is not a compact single footfall')
    attack=min(round(.001*SR),len(out)//4)
    decay=min(round(.015*SR),len(out)//4)
    out[:attack]*=np.linspace(0,1,attack)
    out[-decay:]*=np.linspace(1,0,decay)
    return np.concatenate([out,np.zeros(round(.02*SR))]),a/SR,b/SR


def prepare(archive,sand_archive,ffmpeg):
    if hashlib.sha256(archive.read_bytes()).hexdigest()!=ARCHIVE_SHA256:
        raise ValueError('Expected the recorded original Kenney archive')
    if hashlib.sha256(sand_archive.read_bytes()).hexdigest()!=SAND_SHA256:
        raise ValueError('Expected the recorded original Fantozzi archive')
    work=ROOT/'work/footsteps-2026-11-26'
    work.mkdir(parents=True,exist_ok=True)
    catalog_path=HERE/'effects.json'
    catalog=json.loads(catalog_path.read_text())
    old={k:v for k,v in catalog['effects'].items() if k.startswith('s_step_')}
    if not all(v['origin']['kind']=='cc0-foley' for v in old.values()):
        history=HERE/'history/footsteps-2026-11-25-classical.json'
        payload=json.dumps(dict(effects=old),indent=2)+'\n'
        if history.exists() and history.read_text()!=payload:
            raise ValueError('Refusing to overwrite historical footsteps')
        history.write_text(payload)
    sources=[]
    with zipfile.ZipFile(archive) as z:
        license_text=z.read('License.txt').decode().replace('\r','').strip()+'\n'
        assert 'Creative Commons Zero, CC0' in license_text
        license_path=HERE/'licenses/Kenney-Impact-Sounds.txt'
        license_path.parent.mkdir(exist_ok=True)
        license_path.write_text(license_text)
        for surface,(material,takes) in SELECTION.items():
            for variant,take in enumerate(takes,1):
                ident=f's_step_{surface}_{variant}'
                filename=f'footstep_{material}_{take:03d}.ogg'
                members=[name for name in z.namelist() if Path(name).name==filename]
                if len(members)!=1: raise ValueError('Ambiguous source: '+filename)
                raw=z.read(members[0])
                sources.append((ident,filename,raw,'Kenney','Impact Sounds 1.0',SOURCE_URL,ARCHIVE_SHA256))
    for variant,take in enumerate(['L1','R1','L2','R2'],1):
        filename=f'Fantozzi-Sand{take}.flac'
        member='Fantozzi-footsteps/flac/'+filename
        raw=subprocess.run(['tar','-xOf',str(sand_archive),member],capture_output=True,check=True).stdout
        sources.append((f's_step_sand_{variant}',filename,raw,'Fantozzi','Footsteps (sliced by qubodup)',SAND_URL,SAND_SHA256))
    (HERE/'licenses/Fantozzi-Footsteps.txt').write_text('Fantozzi footsteps; submitted and sliced by qubodup. CC0-1.0.\nSource: '+SAND_URL+'\nLicense: https://creativecommons.org/publicdomain/zero/1.0/\n')
    for ident,filename,raw,provider,pack,url,archive_sha in sources:
        original=work/filename
        original.write_bytes(raw)
        y=audio.decode(ffmpeg,original,SR).mean(axis=1)
        y,a,b=short_contact(y,ident.startswith('s_step_sand_'))
        gain=min(10**(-18/20)/float(np.abs(y).max()),10**(-25/20)/float(np.sqrt(np.mean(y*y))))
        pcm=np.round(y*gain*32767).astype(np.int16)
        out=ROOT/'game/art/fx'/(ident+'.wav')
        wavfile.write(out,SR,pcm)
        actual=pcm.astype(np.float64)/32768
        surface=ident.removeprefix('s_step_').rsplit('_',1)[0]
        catalog['effects'][ident]=dict(path=out.relative_to(ROOT).as_posix(),hook='step:'+surface,
            origin=dict(kind='cc0-foley',provider=provider,pack=pack,sourceDate='2026-11-26',
                sourceURL=url,license='CC0-1.0',licenseURL='https://creativecommons.org/publicdomain/zero/1.0/',
                packArchiveSHA256=archive_sha,sourceFile=filename,sourceSHA256=hashlib.sha256(raw).hexdigest()),
            preparation=dict(trimStartSeconds=a,trimEndSeconds=b,fadeOutSeconds=.015,gainDB=float(20*np.log10(gain)),peakCeilingDBFS=-18),
            sampleRate=SR,channels=1,duration=round(len(pcm)/SR,6),bytes=out.stat().st_size,
            sha256=hashlib.sha256(out.read_bytes()).hexdigest(),
            samplePeakDBFS=round(float(20*np.log10(np.abs(actual).max())),3),rmsDBFS=round(float(20*np.log10(np.sqrt(np.mean(actual*actual)))),3))
        print(ident,len(pcm)/SR,catalog['effects'][ident]['samplePeakDBFS'])
    catalog.update(date='2026-11-26',provider='Stable Audio, Kenney and Fantozzi CC0',description='72 prepared mono PCM16 effects, including 20 short CC0 footfalls with subtle surface-dependent playback.')
    catalog_path.write_text(json.dumps(catalog,indent=2)+'\n')
    script=ROOT/'game/src/audio.js'
    text=script.read_text(encoding='utf-8')
    meta={k:v['duration'] for k,v in catalog['effects'].items()}
    text,count=re.subn(r'  const SAMPLES = \{.*?\};','  const SAMPLES = '+json.dumps(meta,indent=2).replace('\n','\n  ')+';',text,count=1,flags=re.S)
    assert count==1
    script.write_text(text,encoding='utf-8')
    packed=ROOT/'arttools/packed_manifest.json'
    manifest=json.loads(packed.read_text())
    for item in manifest:
        ident=Path(item['path']).stem
        if item['path'].startswith('art/fx/s_step_'):
            entry=catalog['effects'][ident]
            item.update(size=entry['bytes'],sha256=entry['sha256'])
    paths={item['path'] for item in manifest}
    for ident,entry in catalog['effects'].items():
        path=entry['path'].removeprefix('game/')
        if path not in paths:
            manifest.append(dict(path=path,size=entry['bytes'],sha256=entry['sha256']))
    packed.write_text(json.dumps(manifest,indent=2)+'\n')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive',type=Path,required=True)
    parser.add_argument('--sand-archive',type=Path,required=True)
    parser.add_argument('--ffmpeg',required=True)
    args=parser.parse_args()
    prepare(args.archive,args.sand_archive,args.ffmpeg)
