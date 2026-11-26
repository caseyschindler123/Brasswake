/* Full-body CC0 combat and seating retarget. Offline sprite production only. */
const PaintedReleaseCombat=(()=>{
 const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,k)=>a.map(v=>v*k),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),len=a=>Math.hypot(...a),unit=a=>mul(a,1/(len(a)||1)),mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 function create(M,baseRig){
  const D=PaintedReleaseCombatData,B=M.bones,ids=Object.fromEntries(B.map((b,i)=>[b.name,i])),bone=n=>B[ids[n]],L=n=>len(sub(bone(n).end,bone(n).start)),xSign=Math.sign(bone('thighL').start[0])/Math.sign(D.bind['upperleg.l'][0]),zSign=Math.sign(D.bind['toes.l'][2]-D.bind['foot.l'][2])||1,C=[xSign,1,zSign],point=p=>p.map((v,i)=>v*C[i]),rotate=(m,p)=>[0,1,2].map(a=>dot(m.slice(a*3,a*3+3),p.map((v,i)=>v*C[i]))*C[a]);
  function basis(a,b,right=[1,0,0]){const y=unit(sub(b,a));let x=sub(right,mul(y,dot(right,y)));if(len(x)<1e-5)x=cross(y,[0,0,1]);x=unit(x);return[x,y,unit(cross(x,y))];}
  const bind=B.map(b=>basis(b.start,b.end));
  function transform(name,a,b,right){const index=ids[name],from=bind[index],to=basis(a,b,right),m=Array(12).fill(0);for(let row=0;row<3;row++){for(let col=0;col<3;col++)m[row*4+col]=to[0][row]*from[0][col]+to[1][row]*from[1][col]+to[2][row]*from[2][col];m[row*4+3]=a[row]-dot(m.slice(row*4,row*4+3),B[index].start);}return m;}
  const apply=(m,p)=>[0,1,2].map(a=>dot(m.slice(a*4,a*4+3),p)+m[a*4+3]);
  function reach(shoulder,target,a,b,bend){const vector=sub(target,shoulder),distance=Math.min(a+b-.002,Math.max(Math.abs(a-b)+.002,len(vector))),axis=unit(vector),along=(a*a-b*b+distance*distance)/(2*distance),normal=unit(sub(bend,mul(axis,dot(bend,axis))));return{elbow:add(add(shoulder,mul(axis,along)),mul(normal,Math.sqrt(Math.max(0,a*a-along*along)))),wrist:add(shoulder,mul(axis,distance))};}
  function inverse(m){const r=[m[0],m[4],m[8],0,m[1],m[5],m[9],0,m[2],m[6],m[10],0],t=[m[3],m[7],m[11]];for(let a=0;a<3;a++)r[a*4+3]=-dot(r.slice(a*4,a*4+3),t);return r;}
  function multiply(a,b){const r=Array(12).fill(0);for(let i=0;i<3;i++){for(let j=0;j<3;j++)r[i*4+j]=a[i*4]*b[j]+a[i*4+1]*b[4+j]+a[i*4+2]*b[8+j];r[i*4+3]=dot(a.slice(i*4,i*4+3),[b[3],b[7],b[11]])+a[i*4+3];}return r;}
  const leg=s=>len(sub(D.bind['lowerleg.'+s],D.bind['upperleg.'+s]))+len(sub(D.bind['foot.'+s],D.bind['lowerleg.'+s])),scale=(L('thighL')+L('shinL')+L('thighR')+L('shinR'))/(leg('l')+leg('r')),hipHalf=len(sub(bone('thighL').start,bone('thighR').start))/2;
  const feetPoints={};for(const side of['L','R']){const points=[];for(let i=0;i<M.materials.length;i++)for(let k=0;k<4;k++)if(M.skin[i*8+k*2]===ids['foot'+side]&&M.skin[i*8+k*2+1]>.98){points.push(M.vertices.slice(i*3,i*3+3));break;}feetPoints[side]=points;}
  function sample(state,phase){const clip=D.clips[state];if(!clip)throw Error('Missing source combat clip: '+state);const t=Math.max(0,Math.min(1,phase))*(clip.frames.length-1),i=Math.floor(t),f=t-i,a=clip.frames[i],b=clip.frames[Math.min(i+1,clip.frames.length-1)];return{positions:Object.fromEntries(Object.keys(a.positions).map(n=>[n,mix(a.positions[n],b.positions[n],f)])),rotations:Object.fromEntries(Object.keys(a.rotations).map(n=>[n,mix(a.rotations[n],b.rotations[n],f)]))};}
  function pose(state,phase){
   if(!D.clips[state])throw Error('No authored combat source for '+state);
   const s=sample(state,phase),P=Object.fromEntries(Object.entries(s.positions).map(([n,p])=>[n,point(p)])),R=s.rotations,closed=!['sit','cast','book','hit','fall'].includes(state),original=baseRig.pose(closed,0,{state:'idle'}),matrices=original.matrices.map(m=>m.slice()),targets={},bindHip=mul(add(point(D.bind['upperleg.l']),point(D.bind['upperleg.r'])),.5),sourceHip=mul(add(P['upperleg.l'],P['upperleg.r']),.5),delta=mul(sub(sourceHip,bindHip),scale),horizontal=Math.hypot(delta[0],delta[2]);if(horizontal>.20){delta[0]*=.20/horizontal;delta[2]*=.20/horizontal;}
   let pelvis=add(bone('pelvis').start,[delta[0],0,delta[2]]);const right=unit(sub(P['upperleg.r'],P['upperleg.l']));targets.pelvis=pelvis;
   let start=pelvis;
   for(const[name,source]of[['pelvis','hips'],['abdomen','spine'],['chest','chest'],['neck','head'],['head','head']]){const axis=['pelvis','abdomen'].includes(name)?unit(sub(P.spine,sourceHip)):name==='chest'?unit(sub(P.head,P.spine)):unit(rotate(R[source],sub(bone(name).end,bone(name).start))),end=add(start,mul(axis,L(name))),r=rotate(R[source],bind[ids[name]][0]);matrices[ids[name]]=transform(name,start,end,r);targets[name]={start,end};start=end;}
   for(const[side,S,sign]of[['l','L',-1],['r','R',1]]){
    const hip=add(pelvis,mul(right,sign*hipHalf)),thigh=unit(sub(P['lowerleg.'+side],P['upperleg.'+side])),shin=unit(sub(P['foot.'+side],P['lowerleg.'+side])),knee=add(hip,mul(thigh,L('thigh'+S))),ankle=add(knee,mul(shin,L('shin'+S)));
    matrices[ids['thigh'+S]]=transform('thigh'+S,hip,knee,right);matrices[ids['shin'+S]]=transform('shin'+S,knee,ankle,right);
    const fm=Array(12).fill(0);for(let a=0;a<3;a++){for(let b=0;b<3;b++)fm[a*4+b]=R['foot.'+side][a*3+b]*C[a]*C[b];fm[a*4+3]=ankle[a]-dot(fm.slice(a*4,a*4+3),bone('foot'+S).start);}matrices[ids['foot'+S]]=fm;
    const shoulder=apply(matrices[ids.chest],bone('upperArm'+S).start),upper=unit(sub(P['lowerarm.'+side],P['upperarm.'+side])),fore=unit(sub(P['wrist.'+side],P['lowerarm.'+side])),chestRight=rotate(R.chest,[1,0,0]);let handAxis=unit(sub(P['hand.'+side],P['wrist.'+side])),elbow=add(shoulder,mul(upper,L('upperArm'+S))),wrist=add(elbow,mul(fore,L('foreArm'+S)));
    // Preserve the source body performance while fitting the two grips to the
    // character's own arm lengths. These props require a shared support plane.
    if(state==='book'||state==='crossbow'){
     const center=mul(add(bone('upperArmL').start,bone('upperArmR').start),.5),offset=state==='book'?[sign*.14,-.23,.31]:side==='l'?[-.07,-.16,.47]:[.15,-.16,.25],target=apply(matrices[ids.chest],add(center,offset)),bend=rotate(R.chest,[sign*.7,-1,0]),fit=reach(shoulder,target,L('upperArm'+S),L('foreArm'+S),bend);elbow=fit.elbow;wrist=fit.wrist;handAxis=unit(rotate(R.chest,state==='book'?[sign*.35,0,1]:[0,0,1]));
    }
    const hand=add(wrist,mul(handAxis,L('hand'+S)));
    matrices[ids['upperArm'+S]]=transform('upperArm'+S,shoulder,elbow,chestRight);matrices[ids['foreArm'+S]]=transform('foreArm'+S,elbow,wrist,chestRight);
    const handBind=bind[ids['hand'+S]],across=unit(sub(bone('finger2-1.'+S).start,bone('finger5-1.'+S).start)),bindDirection=unit(sub(bone('hand'+S).end,bone('hand'+S).start)),palmNormal=mul(unit(cross(across,bindDirection)),side==='l'?1:-1);let facing=rotate(R['hand.'+side],[0,0,1]);facing=sub(facing,mul(handAxis,dot(facing,handAxis)));if(len(facing)<.01)facing=sub([0,1,0],mul(handAxis,handAxis[1]));facing=unit(facing);const tangent=cross(handAxis,facing),handRight=add(mul(facing,dot(palmNormal,handBind[0])),mul(tangent,dot(palmNormal,handBind[2]))),oldHand=matrices[ids['hand'+S]],newHand=transform('hand'+S,wrist,hand,handRight),change=multiply(newHand,inverse(oldHand));matrices[ids['hand'+S]]=newHand;
    for(let finger=1;finger<=5;finger++)for(let joint=1;joint<=3;joint++){const i=ids['finger'+finger+'-'+joint+'.'+S];matrices[i]=multiply(change,matrices[i]);}
    targets[side]={hip,knee,ankle,shoulder,elbow,wrist,hand};
   }
   // Ground the actual fitted boot soles; a fall instead grounds the full body.
   let low=Infinity;const support={};for(const side of['L','R']){const m=matrices[ids['foot'+side]];let best;for(const p of feetPoints[side]){const v=apply(m,p);if(!best||v[1]<best.world[1])best={local:sub(p,bone('foot'+side).start),world:v};}support[side]=best;low=Math.min(low,best.world[1]);}
   if(state==='fall'){const skin=PaintedModelGeometry.skin(M,matrices);for(let i=1;i<skin.positions.length;i+=3)low=Math.min(low,skin.positions[i]);}
   for(const m of matrices)m[7]-=low;const shifted=new Set(),shift=p=>{if(!shifted.has(p)){p[1]-=low;shifted.add(p);}};for(const entry of Object.values(targets)){if(Array.isArray(entry)){shift(entry);continue;}for(const key of Object.keys(entry))if(Array.isArray(entry[key]))shift(entry[key]);}
   targets.feet={};for(const[side,S]of[['l','L'],['r','R']]){support[S].world[1]-=low;targets.feet[side]={target:targets[side].ankle,pitch:0,yaw:0,active:support[S].world[1]<.018,support:support[S]};}
   return{matrices,targets,state,phase,source:D.clips[state].source,duration:D.clips[state].duration};
  }
  return{pose,states:Object.keys(D.clips)};
 }
 return{create};
})();
if(typeof module!=='undefined')module.exports=PaintedReleaseCombat;
