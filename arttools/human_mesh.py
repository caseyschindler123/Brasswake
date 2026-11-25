"""Prepare the CC0 anatomical mesh for the locomotion renderer; no art generation.
Originals remain hash-verified in ignored work/locomotion-prototype.
"""
import argparse
import collections
import hashlib
import json
import math
import pathlib
import urllib.request

ROOT=pathlib.Path(__file__).resolve().parents[1]
CACHE=ROOT/'work/locomotion-prototype'
MANIFEST=ROOT/'arttools/human_mesh_sources.json'
OUTPUT=ROOT/'game/src/human_mesh_data.js'

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--check', action='store_true', help='verify generated mesh bytes without rewriting them')
args = parser.parse_args()
manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))


def load_source(spec):
    path = CACHE / spec['cacheFile']
    cached = path.is_file()
    if cached:
        data = path.read_bytes()
    else:
        with urllib.request.urlopen(spec['url'], timeout=30) as response:
            data = response.read()
    if hashlib.sha256(data).hexdigest() != spec['sha256']:
        parser.exit(1, f"SHA-256 mismatch for {path if cached else spec['url']}\n")
    if not cached:
        CACHE.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    return data


sources = {spec['cacheFile']: load_source(spec) for spec in manifest['files']}
raw = sources['makehuman-base.obj']
rig = json.loads(sources['default.mhskel'])
weights = json.loads(sources['default_weights.mhw'])['weights']
if rig['license'] != 'CC0':
    parser.exit(1, 'Expected the CC0 MakeHuman skeleton\n')
vertices=[];faces=[];group=''
for line in raw.decode().splitlines():
 if line.startswith('v '):vertices.append(list(map(float,line.split()[1:4])))
 elif line.startswith('g '):group=line[2:]
 elif line.startswith('f ') and group in ['body','helper-l-eye','helper-r-eye','helper-upper-teeth','helper-lower-teeth','helper-tongue']:
  ids=[int(p.split('/')[0])-1 for p in line.split()[1:]];faces.append((group,ids))
body={i for g,f in faces if g=='body' for i in f};low=min(vertices[i][1] for i in body);high=max(vertices[i][1] for i in body);scale=1.8/(high-low)
def pos(p):return [-p[0]*scale,(p[1]-low)*scale,p[2]*scale]
vertices=[pos(p) for p in vertices]
def point(name):
 ids=rig['joints'][name];return [sum(vertices[i][a] for i in ids)/len(ids) for a in range(3)]
def end(b,part):return point(rig['bones'][b][part])
def mid(a,b):return [(x+y)/2 for x,y in zip(a,b)]
bones=[{'name':'pelvis','start':mid(end('upperleg01.L','head'),end('upperleg01.R','head')),'end':end('spine04','head')},
 {'name':'abdomen','start':end('spine04','head'),'end':end('spine02','head')},
 {'name':'chest','start':end('spine02','head'),'end':end('spine01','tail')},
 {'name':'neck','start':end('spine01','tail'),'end':end('head','head')},
 {'name':'head','start':end('head','head'),'end':end('head','tail')}]
for side in ['L','R']:
 for name,a,b in [('upperArm','upperarm01','upperarm02'),('foreArm','lowerarm01','lowerarm02'),('hand','wrist','finger3-3'),('thigh','upperleg01','upperleg02'),('shin','lowerleg01','lowerleg02'),('foot','foot','toe3-3')]:
  bones.append({'name':name+side,'start':end(a+'.'+side,'head'),'end':end(b+'.'+side,'tail')})
for side in ['L','R']:
 for finger in range(1,6):
  for joint in range(1,4):
   name=f'finger{finger}-{joint}.{side}'
   bones.append({'name':name,'start':end(name,'head'),'end':end(name,'tail'),'parent':rig['bones'][name]['parent']})
names={b['name']:i for i,b in enumerate(bones)}
def mapped(name):
 side=name.rsplit('.',1)[-1]
 if name.startswith('finger') and name in names:return names[name]
 if side in ['L','R']:
  for prefix,coarse in [('upperarm','upperArm'),('shoulder','upperArm'),('lowerarm','foreArm'),('wrist','hand'),('finger','hand'),('metacarpal','hand'),('upperleg','thigh'),('lowerleg','shin'),('foot','foot'),('toe','foot')]:
   if name.startswith(prefix):return names[coarse+side]
 if name.startswith('spine0'):return names['pelvis' if name=='spine05' else 'abdomen' if name in ['spine04','spine03'] else 'chest']
 if name.startswith(('root','pelvis')):return names['pelvis']
 if name=='head':return names['head']
 if name.startswith('neck'):return names['neck']
 if name.startswith(('clavicle','breast')):return names['chest']
 parent=rig['bones'].get(name,{}).get('parent')
 return mapped(parent) if parent else names['head']
by_vertex=[collections.defaultdict(float) for _ in vertices]
for bone,items in weights.items():
 for i,w in items:by_vertex[i][mapped(bone)]+=w
# Cluster below a third of a source pixel. Preserve separate eye/mouth surfaces.
clusters={};out=[];maps={};sums=[];out_weights=[];counts=[]
for group,face in faces:
 for i in face:
  p=vertices[i];w=by_vertex[i]
  if not w:w={names['head']:1}
  dominant=bones[max(w,key=w.get)]['name']
  if 'eye' in group:material=6
  elif group!='body':material=7
  elif dominant.startswith('foot') or p[1]<.27:material=2
  elif dominant.startswith(('hand','finger')):material=3
  elif dominant in ['head','neck']:
   material=4 if p[1]>1.73 or (p[1]>1.67 and p[2]<.065) else 3
  elif p[1]<.87:material=1
  elif .89<p[1]<.935 and abs(p[0])<.19:material=5
  else:material=0
  key=(group,material,*(round(v/.006) for v in p))
  if key not in clusters:
   clusters[key]=len(out);out.append([0.,0.,0.]);sums.append(collections.defaultdict(float));counts.append(0);out_weights.append(material)
  j=clusters[key];maps[(group,i)]=j
  # A vertex occurring in several faces is averaged with consistent multiplicity.
  for a in range(3):out[j][a]+=p[a]
  for b,value in w.items():sums[j][b]+=value
  counts[j]+=1
for i,p in enumerate(out):
 for a in range(3):p[a]/=counts[i]
tri=[]
for g,f in faces:
 ids=[maps[g,i] for i in f]
 for k in range(1,len(ids)-1):
  t=[ids[0],ids[k+1],ids[k]] # mirrored anatomical X
  if len(set(t))==3:tri+=t
normals=[[0.,0.,0.] for _ in out]
for i in range(0,len(tri),3):
 a,b,c=[out[j] for j in tri[i:i+3]];u=[b[k]-a[k] for k in range(3)];v=[c[k]-a[k] for k in range(3)];n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
 for j in tri[i:i+3]:
  for k in range(3):normals[j][k]+=n[k]
for n in normals:
 length=math.sqrt(sum(v*v for v in n)) or 1
 for k in range(3):n[k]/=length
skin=[]
for weights in sums:
 w=sorted(weights.items(),key=lambda p:p[1],reverse=True)[:4];total=sum(v for _,v in w)
 w=[(i,v/total) for i,v in w];w+= [(0,0)]*(4-len(w))
 skin.extend(v for pair in w for v in pair)
def rounded(x):
 if isinstance(x,float):return round(x,6)
 if isinstance(x,list):return [rounded(v) for v in x]
 if isinstance(x,dict):return {k:rounded(v) for k,v in x.items()}
 return x
obj=rounded({'height':1.8,'license':'CC0-1.0','bones':bones,'vertices':[v for p in out for v in p],'normals':[v for p in normals for v in p],'skin':skin,'triangles':tri,'materials':out_weights})
if len(out) != manifest['vertices'] or len(tri) // 3 != manifest['triangles']:
    parser.exit(1, 'Generated mesh counts differ from the provenance manifest\n')

text='/* Generated by arttools/human_mesh.py from MakeHuman CC0 assets. */\nconst HumanMeshData = '+json.dumps(obj,separators=(',',':'))+';\n'
expected = text.encode('utf-8')
if args.check:
    # The original Windows generator wrote CRLF. Git normalizes the file to LF.
    if not OUTPUT.is_file() or OUTPUT.read_bytes() not in (expected, expected.replace(b'\n', b'\r\n')):
        parser.exit(1, f'Generated mesh differs from {OUTPUT}\n')
else:
    OUTPUT.write_bytes(expected)
print(f'mesh: {len(out)} vertices, {len(tri) // 3} triangles, {len(expected)} bytes (LF)')
