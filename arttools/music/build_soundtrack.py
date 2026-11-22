"""Author/render the November 2026 soundtrack without sample libraries or MIDI players.

Dependencies: Python 3.12, numpy, scipy, ffmpeg with libmp3lame.
Example (from repo root):
  python -I arttools/music/build_soundtrack.py --ffmpeg /path/to/ffmpeg.exe \
    --sources /path/to/suno/manifest.json

Outputs are ONLY the new MP3s, editable type-1 MIDI scores and soundtrack.json.
WAVs/analysis stay under ignored work/soundtrack. --only-originals/--only-suno
rebuild one family. --render-midi SCORE OUT.wav renders an edited score directly.
No random composition, SoundFonts, samples, network calls or commercial service.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import struct
import subprocess

import numpy as np
from scipy import signal
from scipy.io import wavfile

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
SR = 44100
PPQ = 480
TAIL = 1.25
VERSION = 1

# GM program numbers, zero based. They also label the editable MIDI tracks.
INSTRUMENTS = {
    'flute': (73, .18, .11), 'oboe': (68, .17, .12),
    'clarinet': (71, .18, .12), 'recorder': (74, .19, .10),
    'horn': (60, .19, .20), 'strings': (48, .095, .36),
    'cello': (42, .14, .22), 'harp': (46, .20, .48),
    'lute': (24, .21, .20), 'dulcimer': (15, .19, .40),
    'celesta': (8, .21, .65), 'bassoon': (70, .15, .15),
    'bass': (43, .20, .18), 'drum': (0, .20, .18),
}

# Every motif is authored as scale degrees and beat lengths. Four-bar sentences
# answer each other; B phrases use their own contour rather than random transposition.
# Roots/chord qualities are explicit harmonic choices, repeated as A A' B A''.
SCORES = [
    dict(id='m_barrows', title='Lanterns under the Barrows', key='D minor', tonic=62,
         mode='minor', bpm=68, meter=4, lead='oboe', backing='harp', pad='cello',
         style='tomb', chords=[(0,'m'),(5,'M'),(3,'M'),(4,'M'),(0,'m'),(6,'M'),(3,'M'),(4,'M')],
         A=[[(0,1.5),(2,.5),(1,1),(0,1)],[(4,2),(3,1),(2,1)],[(1,1),(3,1),(2,1.5),(0,.5)],[(1,2),(-1,2)]],
         B=[[(4,1),(6,1),(5,1),(4,1)],[(3,1.5),(2,.5),(1,2)],[(0,1),(2,1),(4,1),(3,1)],[(1,2),(0,2)]]),
    dict(id='m_tanglewarren', title='A Thread among Roots', key='E dorian', tonic=64,
         mode='dorian', bpm=84, meter=4, lead='clarinet', backing='lute', pad='strings',
         style='roots', chords=[(0,'m'),(3,'M'),(0,'m'),(4,'m'),(5,'m'),(3,'M'),(1,'m'),(4,'m')],
         A=[[(0,.5),(2,.5),(4,1),(3,.5),(2,.5),(1,1)],[(2,1),(0,1),(1,1),(-1,1)],[(0,1),(4,.5),(3,.5),(2,1),(5,1)],[(4,1.5),(2,.5),(1,2)]],
         B=[[(5,1),(4,.5),(2,.5),(3,1),(1,1)],[(0,.5),(1,.5),(2,1),(4,2)],[(6,1),(5,1),(3,.5),(2,.5),(1,1)],[(2,2),(0,2)]]),
    dict(id='m_slagdeep', title='The Forge below Stone', key='C phrygian', tonic=60,
         mode='phrygian', bpm=88, meter=4, lead='horn', backing='dulcimer', pad='cello',
         style='forge', chords=[(0,'m'),(1,'M'),(0,'m'),(6,'m'),(3,'m'),(1,'M'),(6,'m'),(0,'m')],
         A=[[(0,1),(0,.5),(1,.5),(4,2)],[(3,1),(1,1),(0,2)],[(0,.5),(1,.5),(3,1),(4,1),(3,1)],[(1,1.5),(0,.5),(-1,2)]],
         B=[[(4,1),(5,1),(4,.5),(3,.5),(1,1)],[(3,2),(1,1),(0,1)],[(6,.5),(5,.5),(4,1),(3,1),(1,1)],[(1,2),(0,2)]]),
    dict(id='m_crystal', title='Prisms in the Dark', key='F lydian', tonic=65,
         mode='lydian', bpm=72, meter=4, lead='celesta', backing='harp', pad='strings',
         style='crystal', chords=[(0,'M'),(1,'M'),(5,'m'),(4,'M'),(2,'m'),(1,'M'),(0,'M'),(4,'M')],
         A=[[(0,1),(4,.5),(6,.5),(7,2)],[(6,1.5),(4,.5),(3,2)],[(2,1),(4,1),(5,1),(4,1)],[(3,2),(1,2)]],
         B=[[(7,1),(6,1),(4,1),(3,1)],[(5,1),(4,1),(2,2)],[(3,.5),(4,.5),(6,1),(5,1),(2,1)],[(1,2),(0,2)]]),
    dict(id='m_ice', title='Blue Halls', key='B minor', tonic=71,
         mode='minor', bpm=62, meter=4, lead='flute', backing='celesta', pad='strings',
         style='ice', chords=[(0,'m'),(5,'M'),(2,'M'),(6,'M'),(3,'m'),(0,'m'),(5,'M'),(4,'M')],
         A=[[(4,2),(2,1),(1,1)],[(0,2),(-1,1),(0,1)],[(2,1.5),(4,.5),(5,2)],[(4,2),(1,2)]],
         B=[[(6,2),(5,1),(4,1)],[(2,1),(1,1),(0,2)],[(3,1.5),(2,.5),(1,1),(-1,1)],[(1,2),(0,2)]]),
    dict(id='m_stacks', title='Margins of the Lost Ledger', key='A harmonic minor', tonic=69,
         mode='harmonic', bpm=76, meter=4, lead='bassoon', backing='harp', pad='cello',
         style='stacks', chords=[(0,'m'),(3,'m'),(6,'dim'),(4,'M'),(5,'M'),(3,'m'),(0,'m'),(4,'M')],
         A=[[(0,1),(2,.5),(1,.5),(4,1),(2,1)],[(3,1),(2,1),(1,2)],[(6,1),(4,1),(2,.5),(1,.5),(0,1)],[(1,1),(6-7,1),(0,2)]],
         B=[[(4,.5),(5,.5),(6,1),(7,1),(4,1)],[(5,1.5),(3,.5),(2,2)],[(1,1),(3,1),(2,1),(6-7,1)],[(1,2),(0,2)]]),
    dict(id='m_wild_coast', title='Salt Roads', key='G mixolydian', tonic=67,
         mode='mixolydian', bpm=80, meter=4, lead='flute', backing='lute', pad='strings',
         style='coast', chords=[(0,'M'),(6,'M'),(3,'M'),(0,'M'),(4,'m'),(6,'M'),(3,'M'),(0,'M')],
         A=[[(0,.5),(1,.5),(2,1),(4,1),(2,1)],[(1,1),(0,1),(-1,2)],[(0,1),(2,1),(5,.5),(4,.5),(2,1)],[(1,2),(0,2)]],
         B=[[(4,1),(5,1),(6,1),(4,1)],[(2,1.5),(1,.5),(0,2)],[(3,1),(2,.5),(1,.5),(2,1),(4,1)],[(1,2),(0,2)]]),
    dict(id='m_wild_fields', title='The Green Mileposts', key='C major', tonic=72,
         mode='major', bpm=84, meter=3, lead='recorder', backing='harp', pad='cello',
         style='fields', chords=[(0,'M'),(4,'M'),(5,'m'),(3,'M'),(1,'m'),(4,'M'),(3,'M'),(0,'M')],
         A=[[(0,1),(2,.5),(4,.5),(2,1)],[(1,1),(4,1),(1,1)],[(2,1),(5,1),(4,1)],[(3,1),(2,1),(1,1)]],
         B=[[(4,1),(6,.5),(7,.5),(6,1)],[(5,1),(4,.5),(2,.5),(0,1)],[(1,1),(3,1),(2,1)],[(1,1),(0,2)]]),
    dict(id='m_wild_stone', title='Ash on the Cairns', key='F sharp minor', tonic=66,
         mode='minor', bpm=78, meter=4, lead='horn', backing='lute', pad='cello',
         style='stone', chords=[(0,'m'),(6,'M'),(5,'M'),(4,'M'),(3,'m'),(0,'m'),(5,'M'),(4,'M')],
         A=[[(0,1.5),(4,.5),(3,1),(2,1)],[(1,2),(-1,2)],[(0,1),(2,1),(3,1),(4,1)],[(2,1),(1,1),(0,2)]],
         B=[[(4,1),(6,1),(5,1),(3,1)],[(2,2),(1,1),(0,1)],[(3,1),(4,.5),(3,.5),(2,1),(1,1)],[(1,2),(0,2)]]),
    dict(id='m_wild_north', title='Pines beyond the Pass', key='E minor', tonic=64,
         mode='minor', bpm=70, meter=4, lead='oboe', backing='harp', pad='strings',
         style='north', chords=[(0,'m'),(2,'M'),(6,'M'),(3,'m'),(5,'M'),(0,'m'),(3,'m'),(4,'M')],
         A=[[(4,1),(2,1),(0,1),(-1,1)],[(0,2),(2,2)],[(3,1),(4,1),(5,1),(4,1)],[(2,1.5),(1,.5),(0,2)]],
         B=[[(7,2),(6,1),(4,1)],[(5,1),(4,1),(2,2)],[(3,1),(2,.5),(1,.5),(0,1),(-1,1)],[(1,2),(0,2)]]),
    dict(id='m_examiner', title='The Last Audit', key='D harmonic minor', tonic=62,
         mode='harmonic', bpm=108, meter=4, lead='horn', backing='dulcimer', pad='strings',
         style='battle', chords=[(0,'m'),(5,'M'),(3,'m'),(4,'M'),(0,'m'),(6,'dim'),(3,'m'),(4,'M')],
         A=[[(0,.5),(0,.5),(2,.5),(4,.5),(3,1),(1,1)],[(2,.5),(3,.5),(4,1),(6,1),(4,1)],[(5,.5),(4,.5),(3,1),(2,.5),(1,.5),(0,1)],[(1,1),(6-7,1),(0,2)]],
         B=[[(7,1),(6,.5),(4,.5),(5,1),(3,1)],[(4,.5),(3,.5),(2,.5),(1,.5),(2,2)],[(5,1),(4,1),(3,.5),(2,.5),(1,1)],[(6-7,1),(1,1),(0,2)]]),
    dict(id='m_tavern', title='The Bent Copper', key='D major', tonic=74,
         mode='major', bpm=100, meter=3, lead='recorder', backing='lute', pad='bass',
         style='tavern', chords=[(0,'M'),(4,'M'),(0,'M'),(3,'M'),(5,'m'),(1,'m'),(4,'M'),(0,'M')],
         A=[[(0,.5),(1,.5),(2,1),(4,1)],[(3,.5),(2,.5),(1,1),(-1,1)],[(0,.5),(2,.5),(4,.5),(5,.5),(4,1)],[(3,1),(2,1),(1,1)]],
         B=[[(4,.5),(5,.5),(6,1),(7,1)],[(5,1),(4,.5),(2,.5),(0,1)],[(1,.5),(2,.5),(3,1),(1,1)],[(2,1),(0,2)]]),
    dict(id='m_dojo', title='Practice before Dawn', key='A dorian', tonic=69,
         mode='dorian', bpm=88, meter=4, lead='flute', backing='lute', pad='cello',
         style='dojo', chords=[(0,'m'),(3,'M'),(0,'m'),(4,'m'),(5,'m'),(3,'M'),(0,'m'),(4,'m')],
         A=[[(0,1),(2,1),(4,1),(2,1)],[(1,1.5),(0,.5),(-1,2)],[(0,.5),(2,.5),(4,1),(5,1),(4,1)],[(2,1),(1,1),(0,2)]],
         B=[[(4,1),(6,1),(7,1),(6,1)],[(5,1),(4,1),(2,2)],[(3,1),(2,1),(1,.5),(0,.5),(-1,1)],[(1,2),(0,2)]]),
    dict(id='m_cards', title='The Crooked Wheel', key='G harmonic minor', tonic=67,
         mode='harmonic', bpm=92, meter=4, lead='clarinet', backing='lute', pad='bass',
         style='cards', chords=[(0,'m'),(3,'m'),(4,'M'),(0,'m'),(5,'M'),(1,'dim'),(4,'M'),(0,'m')],
         A=[[(0,.75),(2,.25),(4,1),(3,.75),(2,.25),(1,1)],[(3,1),(2,.5),(1,.5),(0,2)],[(6-7,.75),(1,.25),(2,1),(4,.75),(3,.25),(1,1)],[(2,1),(1,1),(0,2)]],
         B=[[(4,.75),(5,.25),(6,1),(7,1),(4,1)],[(5,1),(3,.75),(2,.25),(1,2)],[(3,.5),(2,.5),(1,1),(6-7,1),(1,1)],[(2,1),(0,3)]]),
    dict(id='m_title', title='Brasswake: A Ledger and a Lantern', key='B flat major', tonic=70,
         mode='major', bpm=76, meter=4, lead='horn', backing='harp', pad='strings',
         style='title', chords=[(0,'M'),(4,'M'),(5,'m'),(3,'M'),(1,'m'),(5,'m'),(3,'M'),(4,'M')],
         A=[[(0,1),(2,.5),(4,.5),(7,2)],[(6,1),(4,1),(2,2)],[(5,1),(4,.5),(2,.5),(3,1),(2,1)],[(1,2),(-1,2)]],
         B=[[(4,1),(5,1),(7,1),(6,1)],[(5,1.5),(4,.5),(2,2)],[(3,1),(5,1),(4,1),(1,1)],[(2,1),(1,1),(0,2)]]),
]

MODES = {'major':[0,2,4,5,7,9,11], 'minor':[0,2,3,5,7,8,10],
         'harmonic':[0,2,3,5,7,8,11], 'dorian':[0,2,3,5,7,9,10],
         'phrygian':[0,1,3,5,7,8,10], 'lydian':[0,2,4,6,7,9,11],
         'mixolydian':[0,2,4,5,7,9,10]}


def degree(s, n):
    octave, step = divmod(n, 7)
    return s['tonic'] + MODES[s['mode']][step] + octave * 12


def chord(s, root, quality):
    r = degree(s, root) - 24
    return [r + x for x in {'M':[0,4,7], 'm':[0,3,7], 'dim':[0,3,6]}[quality]]


def compose(s):
    """Return note events (beat,duration,pitch,velocity,instrument,pan).

    The bar-level score has four written phrases: A, A with a cadence,
    B with a countermelody, then A with a dominant turnaround.
    """
    notes = []
    def add(t,d,n,v,inst,pan=0):
        notes.append((float(t),float(d),int(n),int(v),inst,float(pan)))
    meter = s['meter']
    # 24 bars makes the faster 3/4 tavern and fields themes long enough.
    bars = 24 if meter == 3 else (20 if s['style']=='battle' else 16)
    for bar in range(bars):
        start = bar * meter
        root, quality = s['chords'][bar % len(s['chords'])]
        cs = chord(s, root, quality)
        # Warm bass anchors every bar. Fifth pickups connect the harmony.
        add(start, meter*.76, cs[0]-12, 62, 'bass', -.10)
        if s['style'] not in ('ice','tomb','north'):
            add(start+meter-.75,.65,cs[2]-12,47,'bass',-.10)
        # Sparse strings/bowed low voices are voiced independently from plucks.
        if s['pad'] == 'bass':
            for off in range(1,meter):
                for p in cs[1:]: add(start+off,.38,p+12,38,s['backing'],.22)
        else:
            for p in [cs[0],cs[1]+12,cs[2]]:
                add(start+.025,meter*.94,p,38 if bar<8 else 43,s['pad'],.32)
        # Deliberate rhythmic accompaniment for each family.
        step = .5 if s['style'] in ('battle','crystal','roots','stacks','dojo') else 1
        pattern = [0,2,1,2,0,1,2,1] if meter==4 else [0,1,2,1,2,1]
        for j in range(round(meter/step)):
            pitch = cs[pattern[j%len(pattern)]]+12
            if s['style']=='crystal' and j%4==3: pitch += 12
            off = j*step + (.08 if s['style']=='cards' and j%2 else 0)
            add(start+off,step*.83,pitch,46+(j%3==0)*8,s['backing'],-.35)
        # A/B melody, with 1/16 beat breathing spaces at each note ending.
        phrase = s['B'] if bar//4 in (2,4) else s['A']
        offset = 0
        for idx,(n,d) in enumerate(phrase[bar%4]):
            pitch = degree(s,n)
            if s['lead']=='bassoon': pitch -= 12
            # The second A closes gently and the final A leads back home.
            if bar%8==7 and idx==len(phrase[bar%4])-1: pitch=degree(s,6 if s['style']=='battle' else 1)
            add(start+offset,d-.07,pitch,70+(idx==0)*5+(bar//4==2)*3,s['lead'],-.12)
            offset += d
        assert abs(offset-meter)<1e-6, s['id']
        # B's answer is a quiet descending thirds line, separated in register.
        if 8 <= bar < 12 and s['style'] in ('title','north','fields','coast','crystal'):
            for j,n in enumerate([4,2,1,0][:meter]):
                add(start+j+.5,.75,degree(s,n)-12,38,'oboe',.35)
        # Frame drum, low tom and light rim: no modern drum kit samples.
        if s['style'] in ('forge','battle','dojo','tavern','cards','stone','coast'):
            for off in ([0,1.5,2,3.5] if s['style']=='battle' else [0,meter-1]):
                add(start+off,.16,36 if off==0 else 41,48 if s['style']=='battle' else 30,'drum',.12)
    return notes, bars*meter, bars


def cues():
    result=[]
    for name,tonic,bpm,harmony,melody in [
        ('victory',62,116,[(0,'M'),(3,'M'),(4,'M'),(0,'M')],
         [(0,.5),(2,.5),(4,.5),(7,1.5),(6,.5),(7,.5),(9,1),(7,3)]),
        ('death',64,64,[(0,'m'),(5,'M'),(3,'m'),(0,'m')],
         [(4,1.5),(3,.5),(2,2),(1,2),(0,4)])]:
        s=dict(id='m_'+name,title='A Page Won' if name=='victory' else 'The Ledger Remembers',
               tonic=tonic,mode='major' if name=='victory' else 'minor',
               key='D major' if name=='victory' else 'E minor',bpm=bpm,meter=4,
               lead='horn' if name=='victory' else 'oboe',backing='harp',pad='strings',style=name)
        notes=[]
        pos=0
        for n,d in melody:
            notes.append((pos,d-.05,degree(s,n),78,s['lead'],-.1)); pos+=d
        length=pos
        for j,(root,q) in enumerate(harmony):
            cs=chord(s,root,q); start=j*length/4; dur=length/4
            for p in cs: notes.append((start,dur*.95,p+12,50,'strings',.3))
            notes.append((start,dur*.9,cs[0]-12,65,'bass',0))
            for k,p in enumerate(cs+[cs[0]+12]): notes.append((start+k*.22,.8,p+12,52,'harp',-.35))
        result.append((s,notes,length,length/4))
    return result


def vlq(n):
    values=[n & 127]; n >>= 7
    while n: values.insert(0,128|(n&127)); n >>= 7
    return bytes(values)


def chunk(kind,data): return kind+struct.pack('>I',len(data))+data


def write_midi(path, notes, bpm, beats, title, meter=4):
    instruments=list(dict.fromkeys(n[4] for n in notes))
    tempo=round(60_000_000/bpm)
    name=title.encode('utf-8')
    meta=b'\0\xff\x03'+vlq(len(name))+name+b'\0\xff\x51\x03'+tempo.to_bytes(3,'big')
    meta+=b'\0\xff\x58\x04'+bytes([meter,2,24,8])
    meta+=vlq(round(beats*PPQ))+b'\xff\x2f\0'
    tracks=[chunk(b'MTrk',meta)]
    channels=[x for x in range(16) if x!=9]
    for i,inst in enumerate(instruments):
        ch=9 if inst=='drum' else channels[i]
        label=inst.encode(); events=[]
        initial=b'\0\xff\x03'+vlq(len(label))+label
        if ch!=9: initial+=b'\0'+bytes([0xc0|ch,INSTRUMENTS[inst][0]])
        pan=next(n[5] for n in notes if n[4]==inst)
        initial+=b'\0'+bytes([0xb0|ch,10,round(64+pan*50)])
        for t,d,p,v,n,_ in notes:
            if n!=inst: continue
            events.extend([(round(t*PPQ),1,bytes([0x90|ch,p,v])),(round((t+d)*PPQ),0,bytes([0x80|ch,p,0]))])
        last=0; data=initial
        for tick,_,msg in sorted(events): data+=vlq(tick-last)+msg; last=tick
        data+=vlq(max(0,round(beats*PPQ)-last))+b'\xff\x2f\0'
        tracks.append(chunk(b'MTrk',data))
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_bytes(chunk(b'MThd',struct.pack('>HHH',1,len(tracks),PPQ))+b''.join(tracks))


def read_midi(path):
    """Read type-0/1 note/program/pan/tempo events, including running status.

    Renderer supports a single constant tempo (scores expose it in track zero).
    Reject changing tempo rather than silently rendering an edited file wrongly.
    """
    data=path.read_bytes()
    if data[:4]!=b'MThd': raise ValueError('Expected Standard MIDI header')
    _,tracks,division=struct.unpack('>HHH',data[8:14]); pos=14
    if division&0x8000: raise ValueError('SMPTE MIDI timing unsupported')
    all_events=[]; tempos=set(); end=0
    def get_vlq(buf,p):
        n=0
        while True:
            b=buf[p]; p+=1; n=(n<<7)|(b&127)
            if b<128: return n,p
    for _ in range(tracks):
        assert data[pos:pos+4]==b'MTrk'
        size=int.from_bytes(data[pos+4:pos+8],'big'); buf=data[pos+8:pos+8+size]; pos+=8+size
        p=tick=status=0
        while p<len(buf):
            dt,p=get_vlq(buf,p); tick+=dt; end=max(end,tick)
            if buf[p]>=128: status=buf[p]; p+=1
            if status==255:
                kind=buf[p]; p+=1; length,p=get_vlq(buf,p); payload=buf[p:p+length]; p+=length
                if kind==81: tempos.add(int.from_bytes(payload,'big'))
            elif status in (240,247):
                length,p=get_vlq(buf,p); p+=length
            else:
                size=1 if status>>4 in (12,13) else 2
                payload=list(buf[p:p+size]); p+=size
                all_events.append((tick,status,payload))
    if len(tempos)>1: raise ValueError('Changing tempo unsupported; render constant-tempo scores')
    tempo=next(iter(tempos),500000); programs={}; pans={}; active={}; notes=[]
    inverse={v[0]:k for k,v in INSTRUMENTS.items() if k!='drum'}
    for tick,status,payload in sorted(all_events,key=lambda e:(e[0],0 if e[1]>>4==8 else 1)):
        ch=status&15; kind=status>>4
        if kind==12: programs[ch]=inverse.get(payload[0],'flute')
        if kind==11 and payload[0]==10: pans[ch]=(payload[1]-64)/50
        if kind==9 and payload[1]: active[(ch,payload[0])]=(tick,payload[1],programs.get(ch,'flute'),pans.get(ch,0))
        if kind==8 or (kind==9 and payload[1]==0):
            value=active.pop((ch,payload[0]),None)
            if value:
                at,velocity,inst,pan=value
                notes.append((at/division,(tick-at)/division,payload[0],velocity,'drum' if ch==9 else inst,pan))
    if active: raise ValueError('Unclosed MIDI notes')
    return notes,60_000_000/tempo,end/division


def voice(pitch, duration, inst, velocity, sr=SR):
    """Original band-limited additive/FM instruments, with independent releases."""
    _,level,release=INSTRUMENTS[inst]
    length=round((duration+release)*sr)
    t=np.arange(length,dtype=np.float64)/sr
    freq=440*2**((pitch-69)/12)
    pluck=inst in ('harp','lute','dulcimer','celesta')
    attack=.004 if pluck else (.075 if inst=='strings' else .025)
    gate=np.minimum(t/attack,1)
    gate*=np.exp(-np.maximum(t-duration,0)/max(.012,release/6))
    if pluck:
        gate*=np.exp(-t/(.55 if inst=='lute' else 1.1))
    else:
        gate*=.84+.16*np.exp(-t/.18)
    vibrato=np.maximum(t-.12,0)/(np.maximum(t-.12,0)+.1)*.0018*np.sin(2*np.pi*5.1*t)
    phase=2*np.pi*freq*t+2*np.pi*freq*vibrato/(2*np.pi*5.1)
    value=np.zeros(length,dtype=np.float64)
    if inst=='drum':
        rng=np.random.default_rng(pitch*7919)
        noise=rng.standard_normal(length)
        noise=signal.lfilter([.12,.24,.28,.24,.12],[1],noise)
        value=np.sin(2*np.pi*(68*t+25*(1-np.exp(-t*30))/30))*np.exp(-t*21)
        value+=noise*.28*np.exp(-t*46)
        gate=np.minimum(t/.003,1)*np.exp(-t*15)
    elif inst=='celesta':
        for ratio,amp,decay in [(1,1,1),(2,.36,2.2),(3.99,.12,3.2),(6.8,.04,4)]:
            if freq*ratio<sr*.46: value+=amp*np.sin(phase*ratio)*np.exp(-t*decay)
    else:
        for h in range(1,15):
            if freq*h>=sr*.46: break
            if inst in ('flute','recorder'): amp={1:1,2:.13,3:.06,4:.015}.get(h,0)
            elif inst=='clarinet': amp=(1/h**1.7) if h%2 else .025/h
            elif inst in ('oboe','bassoon'): amp=1/h**1.2*np.exp(-h*.16)
            elif inst=='horn': amp=1/h**1.6*np.exp(-h*.12)
            elif inst in ('strings','cello','bass'): amp=1/h**1.2*np.exp(-h*.14)
            else: amp=1/h**1.45*np.exp(-t*h*(.75 if inst=='lute' else .38))
            value+=amp*np.sin(phase*h)
        if inst=='strings': value=.80*value+.10*np.sin(phase*1.002)+.10*np.sin(phase*.998)
        if inst=='dulcimer': value+=.13*np.sin(phase*2.006)*np.exp(-t*3)
    return (value*gate*level*(velocity/100)**1.25).astype(np.float32)


def render(notes,bpm,beats,loop,sr=SR):
    seconds=60/bpm; period=round(beats*seconds*sr)
    size=period if loop else period+round(2.0*sr)
    out=np.zeros((size,2),dtype=np.float32)
    for at,duration,pitch,velocity,inst,pan in notes:
        v=voice(pitch,duration*seconds,inst,velocity,sr)
        start=round(at*seconds*sr)
        stereo=np.array([math.sqrt((1-pan)/2),math.sqrt((1+pan)/2)],dtype=np.float32)
        if loop:
            idx=(np.arange(len(v))+start)%size
            # np.add.at also works if an exceptionally long edited note spans periods.
            for ch in range(2): np.add.at(out[:,ch],idx,v*stereo[ch])
        else:
            end=min(size,start+len(v)); out[start:end]+=v[:end-start,None]*stereo
    dry=out.copy()
    # Small stone-room early reflections, each explicitly wrapped for loops.
    for delay,gain in [(.073,.13),(.119,.11),(.181,.09),(.263,.065),(.379,.045),(.521,.03)]:
        shift=round(delay*sr)
        if loop: out+=np.roll(dry[:,::-1],shift,axis=0)*gain
        else: out[shift:]+=dry[:-shift,::-1]*gain
    # A cue has a natural release plus a short final safety fade.
    if not loop: out[-round(.18*sr):]*=np.linspace(1,0,round(.18*sr))[:,None]
    assert np.isfinite(out).all()
    if loop: out=np.concatenate([out,out[:round(TAIL*sr)]])
    return out,period/sr


def run(ffmpeg,*args):
    result=subprocess.run([ffmpeg,'-hide_banner','-nostdin',*map(str,args)],capture_output=True,check=True)
    return result


def decode(ffmpeg,path,sr=SR):
    r=run(ffmpeg,'-v','error','-i',path,'-f','f32le','-ac','2','-ar',sr,'pipe:1')
    return np.frombuffer(r.stdout,dtype='<f4').reshape(-1,2).copy()


def loudness(ffmpeg,path):
    result=run(ffmpeg,'-i',path,'-af','loudnorm=I=-18:TP=-2:LRA=11:print_format=json','-f','null','-')
    match=re.findall(r'\{\s*"input_i".*?\}',result.stderr.decode(errors='replace'),re.S)
    if not match: raise ValueError('ffmpeg loudness measurement absent')
    return json.loads(match[-1])


def encode(ffmpeg,audio,out,work,bitrate=128):
    wav=work/(out.stem+'.wav')
    wavfile.write(wav,SR,audio.astype(np.float32))
    measured=loudness(ffmpeg,wav)
    # R128 measurement followed by CONSTANT gain preserves the baked seam and
    # copied tail. loudnorm's dynamic mode can change their relative amplitude.
    # Leave 0.7 dB additional true-peak margin for lossy MP3 reconstruction.
    gain=min(-18-float(measured['input_i']),-2.7-float(measured['input_tp']))
    af=f'volume={gain:.6f}dB'
    out.parent.mkdir(parents=True,exist_ok=True)
    run(ffmpeg,'-v','error','-y','-i',wav,'-af',af,'-ar',SR,'-ac','2',
        '-map_metadata','-1','-c:a','libmp3lame','-b:a',f'{bitrate}k','-write_xing','1',out)
    stats=loudness(ffmpeg,out)
    decoded=decode(ffmpeg,out)
    peak=float(np.max(np.abs(decoded)))
    return dict(duration=round(len(decoded)/SR,6),sampleRate=SR,channels=2,
                bytes=out.stat().st_size,sha256=hashlib.sha256(out.read_bytes()).hexdigest(),
                integratedLUFS=float(stats['input_i']),truePeakDBTP=float(stats['input_tp']),
                samplePeakDBFS=round(20*math.log10(max(peak,1e-12)),3))


def seam_stats(y,b):
    n=round(b*SR)
    jump=float(np.max(np.abs(y[n-1]-y[0])))
    near=np.concatenate([y[:round(.2*SR)],y[n-round(.2*SR):n]])
    slope=float(np.quantile(np.abs(np.diff(near,axis=0)),.999))
    # Compare post-loop tail to the decoded loop start (lossy MP3 adds tiny error).
    tail=min(round(.5*SR),len(y)-n)
    err=float(np.sqrt(np.mean((y[n:n+tail]-y[:tail])**2))) if tail>0 else 1
    return dict(seamJump=round(jump,7),localDerivativeP999=round(slope,7),
                wrapTailRMSDifference=round(err,7),tailSeconds=round((len(y)-n)/SR,6))


def analyse_suno(ffmpeg,path):
    """Select a repeated musical phrase by beat/chroma/envelope recurrence.

    Compare 16/24/32/48/64-beat periods (35-75 sec) in the stable interior.
    Scoring compares 2-second spectral phrases and energy on either side.
    It is a reproducible acoustic heuristic, not an assertion of human listening.
    """
    sr=11025
    audio=decode(ffmpeg,path,sr); mono=audio.mean(axis=1)
    _,times,z=signal.stft(mono,fs=sr,nperseg=2048,noverlap=1536)
    mag=np.abs(z); freq=np.arange(mag.shape[0])*sr/2048
    onset=np.maximum(np.diff(mag,axis=1),0).sum(axis=0)
    onset=np.maximum(onset-np.median(onset),0)
    ac=signal.correlate(onset,onset,mode='full',method='fft')[len(onset)-1:]
    hop=512/sr
    lags=np.arange(round(.38/hop),round(1.05/hop))
    peaks=signal.find_peaks(ac[lags])[0]
    ranked=lags[peaks[np.argsort(ac[lags][peaks])[-5:]]]
    if not len(ranked): ranked=np.array([round(.7/hop)])
    chroma=np.zeros((12,len(times)))
    for i,f in enumerate(freq):
        if 70<f<2600: chroma[round(69+12*np.log2(f/440))%12]+=mag[i]
    bands=np.array([np.mean(mag[(freq>=lo)&(freq<hi)],axis=0) for lo,hi in [(70,250),(250,800),(800,2400),(2400,5000)]])
    features=np.concatenate([chroma/(np.linalg.norm(chroma,axis=0)+1e-9),
                             bands/(np.linalg.norm(bands,axis=0)+1e-9)])
    energy=np.sqrt(np.mean(mag**2,axis=0))
    best=None; win=round(2/hop)
    for lag in ranked:
        for beats in [16,24,32,48,64,96,128]:
            period=lag*hop*beats
            if not 35<=period<=75: continue
            for a in np.arange(4, min(31,len(mono)/sr-period-4),.35):
                ia=round(a/hop)
                for adjust in [-.14,0,.14]:
                    b=a+period+adjust; ib=round(b/hop)
                    x=features[:,ia:ia+win]; q=features[:,ib:ib+win]
                    if x.shape!=q.shape: continue
                    similarity=float(np.sum(x*q)/(np.linalg.norm(x)*np.linalg.norm(q)+1e-9))
                    mismatch=abs(math.log((energy[ia:ia+win].mean()+1e-8)/(energy[ib:ib+win].mean()+1e-8)))
                    # Avoid quiet openings/endings and large arrangement changes.
                    quiet=max(0,.55-energy[ia:ia+win].mean()/(np.median(energy)+1e-8))
                    score=similarity-.12*mismatch-.20*quiet
                    if best is None or score>best['score']:
                        best=dict(a=float(a),b=float(b),score=score,
                                  phraseSimilarity=similarity,energyLogMismatch=mismatch,
                                  estimatedBPM=round(60/(lag*hop),3),periodBeats=beats)
    if best is None: raise ValueError('No usable Suno loop: '+str(path))
    return best


def bake_suno(ffmpeg,path,selection):
    y=decode(ffmpeg,path)
    a=round(selection['a']*SR); b=round(selection['b']*SR); n=round(.40*SR)
    z=y[a:b].copy()
    # Linear amplitude crossfade preserves level for correlated tonal material.
    t=np.linspace(0,1,n,dtype=np.float32)[:,None]
    z[-n:]=z[-n:]*(1-t)+y[a-n:a]*t
    return np.concatenate([z,z[:round(TAIL*SR)]]),len(z)/SR


def new_entry(ffmpeg,path,audio,period,work,origin,loop=True,midi=None,score=None):
    bitrate=192 if origin['kind']=='user-supplied-suno' else 128
    stats=encode(ffmpeg,audio,path,work,bitrate)
    entry=dict(a=0,b=round(period,6),v=1,loop=loop,
               path=path.relative_to(ROOT).as_posix(),origin=origin,**stats)
    if midi: entry['midi']=midi.relative_to(ROOT).as_posix()
    if score:
        entry['score']=dict(title=score['title'],key=score['key'],bpm=score['bpm'],
                            meter=f"{score['meter']}/4",lead=score['lead'],
                            backing=score['backing'],pad=score['pad'])
    if loop: entry['quality']=seam_stats(decode(ffmpeg,path),period)
    if abs(entry['integratedLUFS']+18)>.8: raise ValueError('Loudness outside target: '+str(path))
    if entry['truePeakDBTP']>=-1.5: raise ValueError('True peak outside target: '+str(path))
    return entry


def build(args):
    work=ROOT/'work'/'soundtrack'; work.mkdir(parents=True,exist_ok=True)
    catalog_path=HERE/'soundtrack.json'
    catalog=json.loads(catalog_path.read_text()) if catalog_path.exists() else dict(
        schemaVersion=1,date='2026-11-22',
        description='25 new assets; existing m_tallyport, m_bilge and m_combat remain unchanged.',
        toolchain=dict(python='3.12',numpy=np.__version__,scipy=__import__('scipy').__version__,
                       ffmpeg=run(args.ffmpeg,'-version').stdout.decode().splitlines()[0],
                       encoder='libmp3lame stereo, originals 128 kb/s and Suno preparations 192 kb/s; gapless Xing header',
                       renderer='Original deterministic band-limited additive/FM synthesis; no samples or SoundFonts',
                       normalization='EBU R128 measurement, constant gain to -18 LUFS with -2.7 dBTP ceiling, post-encode verification'),
        retained=['m_tallyport','m_bilge','m_combat'],tracks={})
    if not args.only_suno:
        compositions=[(s,*compose(s)) for s in SCORES]+cues()
        for s,notes,beats,bars in compositions:
            ident=s['id']; loop=ident not in ('m_victory','m_death')
            midi=HERE/'midi'/(ident+'.mid')
            write_midi(midi,notes,s['bpm'],beats,s['title'],s['meter'])
            # Render the on-disk MIDI, so the retained editable score is the source.
            decoded,bpm,length=read_midi(midi)
            audio,period=render(decoded,bpm,length,loop)
            origin=dict(kind='original-midi',author='Brasswake soundtrack, authored 2026-11-22',
                        provenance='Explicit written motifs/harmony in build_soundtrack.py; original local synthesis, no third-party audio inputs.',
                        midiSHA256=hashlib.sha256(midi.read_bytes()).hexdigest(),bars=bars)
            entry=new_entry(args.ffmpeg,ROOT/'game'/'art'/'mu'/(ident+'.mp3'),audio,period,work,origin,loop,midi,s)
            # A cue plays the entire natural release, rather than its MIDI gate end.
            if not loop: entry['b']=entry['duration']
            catalog['tracks'][ident]=entry
            catalog_path.write_text(json.dumps(catalog,indent=2)+'\n')
            print(ident,entry['duration'],entry['integratedLUFS'],entry['truePeakDBTP'],flush=True)
    if not args.only_originals:
        if not args.sources: raise ValueError('--sources is required for Suno preparation')
        manifest=json.loads(Path(args.sources).read_text())
        names=['brackwater','haverly','four_fords','cinderwick','kell','highwatch','aldermoot','sunken_sluice']
        for index,name in enumerate(names):
            candidates=[]
            for song in manifest['songs'][index*2:index*2+2]:
                source=Path(song['download']); selection=analyse_suno(args.ffmpeg,source)
                candidates.append((selection['score'],source,song,selection))
            _,source,song,selection=max(candidates,key=lambda x:x[0])
            audio,period=bake_suno(args.ffmpeg,source,selection)
            ident='m_'+name
            origin=dict(kind='user-supplied-suno',title=song['title'],take=song['version'],
                        songURL=song['url'],sourceFile=source.name,
                        sourceSHA256=hashlib.sha256(source.read_bytes()).hexdigest(),
                        model=manifest['model'],sourceDate=manifest['date'],
                        provenance='Previously downloaded by Casey; source is read-only. No new generation/download activity.',
                        selection=selection,candidates=[dict(take=x[2]['version'],songURL=x[2]['url'],**x[3]) for x in candidates],
                        crossfadeSeconds=.4)
            catalog['tracks'][ident]=new_entry(args.ffmpeg,ROOT/'game'/'art'/'mu'/(ident+'.mp3'),audio,period,work,origin)
            catalog_path.write_text(json.dumps(catalog,indent=2)+'\n')
            entry=catalog['tracks'][ident]
            print(ident,'take',song['version'],entry['duration'],entry['integratedLUFS'],entry['truePeakDBTP'],flush=True)
    return catalog


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ffmpeg',required=True)
    parser.add_argument('--sources')
    group=parser.add_mutually_exclusive_group()
    group.add_argument('--only-originals',action='store_true')
    group.add_argument('--only-suno',action='store_true')
    parser.add_argument('--render-midi',nargs=2,metavar=('SCORE','OUT_WAV'))
    args=parser.parse_args()
    if args.render_midi:
        notes,bpm,beats=read_midi(Path(args.render_midi[0]))
        audio,_=render(notes,bpm,beats,True)
        wavfile.write(args.render_midi[1],SR,audio)
    else: build(args)
