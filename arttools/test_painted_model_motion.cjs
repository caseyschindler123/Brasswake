const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ctx={};vm.createContext(ctx);
for(const file of['work/painted-characters/model-pilot/pilot-mesh.js','work/painted-characters/motion-data.js','work/painted-characters/model-pilot/source-upper-motion.js','game/src/human_locomotion.js','arttools/painted_model_geometry.js','arttools/painted_model_motion.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
vm.runInContext('globalThis.M=PaintedModelGeometry.make(HumanMeshData).body;globalThis.rig=PaintedModelMotion.create(M);globalThis.D=HumanMotionData;globalThis.R=PaintedModelReference',ctx);
const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),mul=(a,k)=>a.map(v=>v*k),unit=a=>mul(a,1/Math.hypot(...a));
for(const running of[false,true]){
 const name=running?'run':'walk',poses=Array.from({length:480},(_,i)=>ctx.rig.pose(running,i/480));
 test(name+': neck and skull follow source rotation without a rearward stabilizer bias',()=>{
  assert.equal(ctx.R.sourceSha256,ctx.D.sourceSha256);const frames=ctx.D[name].frames,n=frames.length,onset=frames.findIndex((f,i)=>f.contacts.left&&!frames[(i+n-1)%n].contacts.left),reference=ctx.R[name].frames;
  for(let i=0;i<poses.length;i++)for(const boneName of['neck','head']){const at=i/poses.length*n+onset,a=Math.floor(at)%n,b=(a+1)%n,t=at-Math.floor(at),key=boneName+'Rotation',matrix=reference[a][key].map((v,k)=>v+(reference[b][key][k]-v)*t),bind=ctx.M.bones.find(b=>b.name===boneName),axis=sub(bind.end,bind.start),expected=unit([0,1,2].map(row=>dot(matrix.slice(row*3,row*3+3),axis))),actual=unit(sub(poses[i].targets[boneName].end,poses[i].targets[boneName].start));assert.ok(dot(expected,actual)>1-1e-8,'source rotation applied to the anatomical bind axis');}
 });
 test(name+': mean foot placement retains the source balance around the hips',()=>{
  const boneLength=name=>{const b=ctx.M.bones.find(b=>b.name===name);return Math.hypot(...sub(b.end,b.start));},j=ctx.D.walk.frames[0].joints,captureLeg=s=>Math.hypot(...sub(j[s+'femur'],j[s+'hipjoint']))+Math.hypot(...sub(j[s+'tibia'],j[s+'femur'])),scale=(boneLength('thighL')+boneLength('shinL')+boneLength('thighR')+boneLength('shinR'))/(captureLeg('l')+captureLeg('r'));
  const source=ctx.D[name].frames.reduce((sum,f)=>sum+((f.joints.ltibia[2]+f.joints.rtibia[2])-(f.joints.lhipjoint[2]+f.joints.rhipjoint[2]))*.5*scale,0)/ctx.D[name].frames.length,actual=poses.reduce((sum,p)=>sum+((p.targets.l.ankle[2]+p.targets.r.ankle[2])-(p.targets.l.hip[2]+p.targets.r.hip[2]))*.5,0)/poses.length;assert.ok(Math.abs(source-actual)<.005,'mean foot offset within 5 mm of the source');
 });
 test(name+': source torso lean survives the head correction',()=>{
  const frames=ctx.D[name].frames,n=frames.length,onset=frames.findIndex((f,i)=>f.contacts.left&&!frames[(i+n-1)%n].contacts.left),angle=(hip,shoulder)=>Math.atan2(shoulder[2]-hip[2],shoulder[1]-hip[1])*180/Math.PI,mid=(a,b)=>a.map((v,i)=>(v+b[i])/2);let difference=0;
  for(let i=0;i<n;i++){const j=frames[(i+onset)%n].joints,p=poses[i*4],source=angle(mid(j.lhipjoint,j.rhipjoint),mid(j.lclavicle,j.rclavicle)),actual=angle(mid(p.targets.l.hip,p.targets.r.hip),mid(p.targets.l.shoulder,p.targets.r.shoulder));assert.ok(Math.abs(source-actual)<2);difference+=actual-source;}assert.ok(Math.abs(difference/n)<1,'no artificial whole-body pitch added');
 });
 test(name+': forward knees, valid bone lengths and finite matrices throughout stride',()=>{
  for(const p of poses){assert.ok(p.matrices.every(m=>m.every(Number.isFinite)));const right=unit(sub(p.targets.r.hip,p.targets.l.hip)),forward=unit([ -right[2],0,right[0] ]);
   for(const side of['l','r']){const t=p.targets[side],axis=unit(sub(t.ankle,t.hip)),bend=sub(sub(t.knee,t.hip),mul(axis,dot(sub(t.knee,t.hip),axis)));assert.ok(dot(bend,forward)>=-1e-8,'knee folds forward');
    for(const[bone,a,b]of[['thigh',t.hip,t.knee],['shin',t.knee,t.ankle]]){const original=ctx.M.bones.find(b=>b.name===bone+side.toUpperCase()),expected=Math.hypot(...sub(original.end,original.start));assert.ok(Math.abs(Math.hypot(...sub(b,a))-expected)<.0001,'retargeting preserves leg segment length');}
   }
  }
 });
 test(name+': no foot or body jump at contact boundaries or cycle wrap',()=>{
  for(let i=0;i<poses.length;i++){const a=poses[i],b=poses[(i+1)%poses.length];assert.ok(Math.hypot(...sub(a.targets.pelvis,b.targets.pelvis))<(running?.002:.001),'quiet continuous body height');for(const side of['l','r'])assert.ok(Math.hypot(...sub(a.targets[side].ankle,b.targets[side].ankle))<.012,'no frame-sized foot teleport');}
  for(const side of['l','r'])for(let i=0;i<poses.length;i++)if(poses[i].targets.feet[side].active!==poses[(i+1)%poses.length].targets.feet[side].active){let lo=i/poses.length,hi=(i+1)/poses.length,active=poses[i].targets.feet[side].active;for(let k=0;k<24;k++){const mid=(lo+hi)/2;if(ctx.rig.pose(running,mid).targets.feet[side].active===active)lo=mid;else hi=mid;}const a=ctx.rig.pose(running,lo-1e-7),b=ctx.rig.pose(running,hi+1e-7);assert.ok(Math.hypot(...sub(a.targets[side].ankle,b.targets[side].ankle))<1e-4,'continuous heel strike and toe release');}
 });
 test(name+': planted sole landmarks remain fixed in world space',()=>{
  for(const p of poses)for(const side of['l','r']){const f=p.targets.feet[side];if(!f.active)continue;const index=ctx.M.bones.findIndex(b=>b.name==='foot'+side.toUpperCase()),m=p.matrices[index],v=f.support.local.map((value,a)=>value+ctx.M.bones[index].start[a]),position=[0,1,2].map(a=>dot(m.slice(a*4,a*4+3),v)+m[a*4+3]);assert.ok(Math.hypot(...sub(position,f.support.world))<1e-6);assert.ok(Math.abs(position[1])<1e-6,'support on ground');}
 });
}
