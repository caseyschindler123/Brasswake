/* Focused offline pilot checks. Requires the hash-verified generated pilot mesh. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),ctx={};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'work/painted-characters/model-pilot/pilot-mesh.js'),'utf8')+';globalThis.mesh=HumanMeshData',ctx);
const G=require('./painted_model_geometry'),source=ctx.mesh,model=G.make(source);
const identity=[1,0,0,0,0,1,0,0,0,0,1,0],matrices=source.bones.map(()=>identity);
test('fitting preserves the anatomical body and shares its bones',()=>{
 assert.deepEqual(model.body.vertices.slice(0,source.vertices.length),Array.from(source.vertices));
 assert.equal(model.body.bones,model.armor.bones);
 for(const mesh of[model.body,model.armor])for(let i=0;i<mesh.materials.length;i++){
  let sum=0;for(let k=0;k<4;k++)sum+=mesh.skin[i*8+k*2+1];assert.ok(Math.abs(sum-1)<1e-5,'normalized weights');
 }
 assert.ok(model.armor.triangles.every(i=>Number.isInteger(i)&&i>=0&&i<model.armor.materials.length));
 assert.ok(model.armor.vertices.every(Number.isFinite));
});
test('cut plate vertices follow the actual deformed body surface',()=>{
 const positions=Float32Array.from(model.body.vertices,(v,i)=>v+(i%3===1?.03*Math.sin(model.body.vertices[i-1]*19):0));
 const posed=G.skin(model.armor,matrices,{positions});let cut=0;
 for(let i=0;i<model.armor.bindings.length;i++){
  const b=model.armor.bindings[i];if(b.source.length>1)cut++;
  assert.ok(Math.abs(b.source.reduce((s,p)=>s+p[1],0)-1)<1e-6);
  for(let a=0;a<3;a++){
   const expected=b.source.reduce((s,[v,w])=>s+positions[v*3+a]*w,b.delta[a]);
   assert.ok(Math.abs(posed.positions[i*3+a]-expected)<2e-6,'surface-bound armor attachment');
  }
 }
 assert.ok(cut>100,'exercise newly clipped boundary points');
 assert.throws(()=>G.skin(model.armor,matrices),/requires its body pose/);
});
test('arming cloth covers neck-weighted shoulders while preserving the neck',()=>{
 let shoulders=0,neck=0,openFront=0;
 for(let i=0;i<model.parts.length;i++){
  const y=model.body.vertices[i*3+1];
  if(y>1.40&&y<1.50&&Math.abs(model.body.vertices[i*3])>.12&&Math.abs(model.body.vertices[i*3])<.23){assert.equal(model.under[i],1);shoulders++;}
  if(y>1.57&&model.semantic[i]===4){assert.equal(model.under[i],4);neck++;}
  if(y>1.53&&y<1.55&&Math.abs(model.body.vertices[i*3])<.045&&model.body.vertices[i*3+2]>.06){assert.equal(model.under[i],4);openFront++;}
 }
 assert.ok(shoulders>0&&neck>0&&openFront>0,'shaped opening exposes the front neck below the old flat cutoff');
});
test('walk and run maintain finite fitted surfaces through the full cycle',()=>{
 vm.runInContext(fs.readFileSync(path.join(root,'work/painted-characters/motion-data.js'),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'work/painted-characters/model-pilot/source-upper-motion.js'),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'game/src/human_locomotion.js'),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'arttools/painted_model_motion.js'),'utf8')+';globalThis.locomotion=PaintedModelMotion',ctx);
 const rig=ctx.locomotion.create(model.body);
 for(const running of[false,true])for(let frame=0;frame<24;frame++){
  const pose=rig.pose(running,frame/24),body=G.skin(model.body,pose.matrices),armor=G.skin(model.armor,pose.matrices,body);
  assert.ok(body.positions.every(Number.isFinite)&&armor.positions.every(Number.isFinite));
  assert.ok(pose.cadence>100&&pose.cadence<190);
  for(let i=0;i<model.armor.bindings.length;i++){
   const b=model.armor.bindings[i],base=[0,0,0];for(const[v,w]of b.source)for(let a=0;a<3;a++)base[a]+=body.positions[v*3+a]*w;
   const gap=Math.hypot(...base.map((v,a)=>v-armor.positions[i*3+a]));
   assert.ok(gap<=Math.hypot(...b.delta)+1e-6,'plate does not drift from its own body triangle');
  }
 }
});
