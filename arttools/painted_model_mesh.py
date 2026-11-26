"""Prepare one actual adult-male pilot from pinned CC0 MakeHuman morphs.

Reuses the verified anatomical converter in memory; never changes its source or
the production mesh. Raw inputs and generated pilot data stay in ignored work/.
"""
import hashlib,json,pathlib,sys,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'work/painted-characters/model-pilot'
OUT.mkdir(parents=True,exist_ok=True)
manifest=json.loads((ROOT/'arttools/painted_model_mesh_sources.json').read_text(encoding='utf-8'))
receipt=[]
for spec in manifest['sources']:
    name=spec['file']
    file=OUT/name
    if not file.exists():file.write_bytes(urllib.request.urlopen(spec['url'],timeout=30).read())
    data=file.read_bytes()
    if b'CC0' not in data[:1000]:raise ValueError('Missing CC0 source declaration')
    if hashlib.sha256(data).hexdigest()!=spec['sha256']:raise ValueError('Pinned morph differs: '+name)
    receipt.append(spec)

converter=ROOT/'arttools/human_mesh.py'
if hashlib.sha256(converter.read_bytes()).hexdigest()!=manifest['converterSha256']:raise ValueError('Review converter changes before replaying this pilot')
code=converter.read_text(encoding='utf-8')
code=code.replace("OUTPUT=ROOT/'game/src/human_mesh_data.js'","OUTPUT=ROOT/'work/painted-characters/model-pilot/pilot-mesh.js'")
needle="body={i for g,f in faces if g=='body' for i in f};"
assert needle in code
morph="""\n# Apply official adult male morphs before rescaling, joints and clustering.
for spec in PILOT_SPECS:
 for line in (PILOT_OUT/spec['file']).read_text().splitlines():
  if not line or line.startswith('#'):continue
  index,*delta=line.split();index=int(index)
  for axis in range(3):vertices[index][axis]+=float(delta[axis])*spec['weight']
"""
code=code.replace(needle,morph+'\n'+needle)
code=code.replace("if len(out) != manifest['vertices'] or len(tri) // 3 != manifest['triangles']:","if False: # Pilot morph has a separately recorded clustered topology.")
namespace={'__file__':str(ROOT/'arttools/human_mesh.py'),'PILOT_SPECS':receipt,'PILOT_OUT':OUT,'__name__':'__main__'}
exec(compile(code,str(ROOT/'arttools/human_mesh.py'),'exec'),namespace)
if hashlib.sha256((OUT/'pilot-mesh.js').read_bytes()).hexdigest()!=manifest['outputSha256']:raise ValueError('Pilot mesh replay differs')
record={'version':1,'scope':'One average adult male pilot; neutral weight, 15% of the stronger muscle morph. Not a production replacement.','sources':receipt,'converterSha256':hashlib.sha256((ROOT/'arttools/human_mesh.py').read_bytes()).hexdigest(),'outputSha256':hashlib.sha256((OUT/'pilot-mesh.js').read_bytes()).hexdigest()}
(OUT/'mesh-receipt.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
