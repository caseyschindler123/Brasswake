/* Record inputs for a reviewed new painted bake without refreshing output hashes. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p)),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const record=paths=>paths.map(p=>({path:p,sha256:hash(read(p).toString().replaceAll('\r\n','\n'))}));
for(const kind of ['sprites','heads']){
 const file='arttools/painted_'+kind+'_manifest.json',m=JSON.parse(read(file));
 for(const f of m.files){const bytes=read('game/'+f.path);if(bytes.length!==f.size||hash(bytes)!==f.sha256)throw Error('Output differs: '+f.path);}
 for(const f of [m.metadata,m.gaits].filter(Boolean))if(hash(read(f.path).toString().replaceAll('\r\n','\n'))!==f.sha256)throw Error('Coordinates differ: '+f.path);
 const inputs=kind==='sprites'?['painted_character_inputs.json','painted_character_prompts.json','painted_character_corrections.json','painted_references.json','painted_sprites.cjs','painted_parts.py','painted_profiles.js','painted_rig.js','painted_motion.cjs','human_encode.py']:['painted_head_inputs.json','painted_head_prompts.json','painted_head_corrections.json','painted_references.json','painted_heads.py'];
 m.inputs=record([...inputs.map(n=>'arttools/'+n),...(kind==='sprites'?['game/src/human_mesh_data.js','game/src/human_locomotion.js']:['game/src/artheads.js'])]);
 if(kind==='sprites'){
  const source=JSON.parse(read('arttools/painted_character_inputs.json'));m.sources=source.entries.map(e=>({id:e.id,file:e.file,sha256:e.sha256})).sort((a,b)=>a.id-b.id);
  m.localMotion={sourceSha256:'dfb230fc1f942f259dd00281a1186953ad602fc5d69067ce63e24b2aa439736b',convertedSha256:hash(read('work/painted-characters/motion-data.js'))};
 }
 fs.writeFileSync(path.join(root,file),JSON.stringify(m,null,2)+'\n');
 console.log('Recorded '+kind+' provenance; all accepted output hashes unchanged');
}
