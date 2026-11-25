/* Anatomical, distance-driven locomotion. Mesh and capture provenance: arttools/human_*_sources.json. */
const HumanLocomotion = (() => {
 function create(M){
  const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,k)=>a.map(v=>v*k);
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const len=a=>Math.hypot(...a),unit=a=>mul(a,1/(len(a)||1)),mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=t=>(t=clamp(t,0,1))*t*(3-2*t),frac=x=>x-Math.floor(x);
  const D=HumanMotionData,B=M.bones,N=M.vertices.length/3;
  const boneIndex=Object.fromEntries(B.map((b,i)=>[b.name,i]));
  const bone=n=>B[boneIndex[n]],length=n=>len(sub(bone(n).end,bone(n).start));
  const captured=D.walk.frames[0].joints;
  const captureLeg=(side)=>len(sub(captured[side+'femur'],captured[side+'hipjoint']))+len(sub(captured[side+'tibia'],captured[side+'femur']));
  const retargetScale=(length('thighL')+length('shinL')+length('thighR')+length('shinR'))/(captureLeg('l')+captureLeg('r'));
  const GROUND=48,HEIGHT=35.56,WIDTH=256,HEIGHT_PIXELS=256,ORIGIN=[128,128];
  const cache=new Map();
  function basis(a,b,right=[1,0,0]){const y=unit(sub(b,a));let x=sub(right,mul(y,dot(right,y)));if(len(x)<.001)x=cross(y,[0,0,1]);x=unit(x);return [x,y,unit(cross(x,y))];}
  const bindBasis=B.map(b=>basis(b.start,b.end));
  const soles={};
  for(const side of ['l','r']){
    const index=boneIndex['foot'+side.toUpperCase()],origin=B[index].start,points=[];
    for(let i=0;i<N;i++)for(let k=0;k<4;k++)if(M.skin[i*8+k*2]===index&&M.skin[i*8+k*2+1]>.98){points.push(sub(M.vertices.slice(i*3,i*3+3),origin));break;}
    soles[side]=points;
  }
  function transform(i,a,b,right){
    const from=bindBasis[i],to=basis(a,b,right),r=Array(12).fill(0);
    for(let row=0;row<3;row++){for(let col=0;col<3;col++)r[row*4+col]=to[0][row]*from[0][col]+to[1][row]*from[1][col]+to[2][row]*from[2][col];r[row*4+3]=a[row]-dot(r.slice(row*4,row*4+3),B[i].start);}
    return r;
  }
  function rotateFoot(p,pitch,yaw){const c=Math.cos(pitch),s=Math.sin(pitch),cy=Math.cos(yaw),sy=Math.sin(yaw),y=p[1]*c-p[2]*s,z=p[1]*s+p[2]*c;return[p[0]*cy+z*sy,y,-p[0]*sy+z*cy];}
  function footMatrix(name,ankle,pitch,yaw){const i=boneIndex[name],v=[[1,0,0],[0,1,0],[0,0,1]].map(p=>rotateFoot(p,pitch,yaw)),r=[];for(let row=0;row<3;row++){for(let col=0;col<3;col++)r[row*4+col]=v[col][row];r[row*4+3]=ankle[row]-dot(r.slice(row*4,row*4+3),B[i].start);}return r;}
  function setup(running){
    const key=running?'run':'walk';if(cache.has(key))return cache.get(key);
    const clip=D[key],n=clip.frames.length,onset=clip.frames.findIndex((f,i)=>f.contacts.left&&!clip.frames[(i+n-1)%n].contacts.left);
    const frames=clip.frames.map((_,i)=>clip.frames[(i+onset)%n]),stride=clip.stride*retargetScale,stances={};
    for(const [side,flag]of [['l','left'],['r','right']]){
      const start=frames.findIndex((f,i)=>f.contacts[flag]&&!frames[(i+n-1)%n].contacts[flag]);let count=0;
      while(count<n&&frames[(start+count)%n].contacts[flag])count++;
      const world=[];for(let k=0;k<count;k++){const index=start+k,p=mul(frames[index%n].joints[side+'foot'],retargetScale);world.push([p[0],p[2]+index/n*stride]);}
      const median=a=>a.sort((a,b)=>a-b)[a.length>>1];
      const yaws=Array.from({length:count},(_,k)=>{const p=frames[(start+k)%n].joints,v=sub(p[side+'toes'],p[side+'tibia']);return Math.atan2(v[0],v[2]);});
      stances[side]={start:start/n,duration:count/n,yaw:clamp(median(yaws),-.45,.45),anchor:[median(world.map(p=>p[0])),median(world.map(p=>p[1]))]};
    }
    const value={...clip,frames,stride,stances,phaseOffset:onset/n};cache.set(key,value);return value;
  }
  function sampled(clip,phase){const f=frac(phase)*clip.frames.length,i=Math.floor(f),t=f-i,a=clip.frames[i].joints,b=clip.frames[(i+1)%clip.frames.length].joints;return Object.fromEntries(Object.keys(a).map(k=>[k,mix(a[k],b[k],t)]));}
  function foot(clip,j,side,phase,running){
    const stance=clip.stances[side],u=frac(phase-stance.start),active=u<stance.duration,relative=u/stance.duration;
    const ankle=mul(j[side+'tibia'],retargetScale),delta=sub(j[side+'toes'],j[side+'tibia']);
    let yaw=active?stance.yaw:clamp(Math.atan2(delta[0],delta[2]),-.45,.45);const rest=bone('foot'+side.toUpperCase()).start;
    const ball=[0,.0425-rest[1],.0658],heel=[0,-rest[1],-.0525],toe=[0,-rest[1],.200];
    const landingPitch=running?-.08:-.32,toePitch=running?.90:.78;
    const cycle=Math.floor(phase-stance.start),anchor=[stance.anchor[0],.0425,stance.anchor[1]+cycle*clip.stride-phase*clip.stride];
    let pitch=clamp(-.49-Math.atan2(delta[1],Math.hypot(delta[0],delta[2])),-1.05,1.5),target=ankle,support=null;
    function contact(at){
      const start=.15,end=.70;let angle=0,point=ball;
      if(at<start){angle=landingPitch*(1-smooth(at/start));point=heel;}
      else if(at>end){angle=toePitch*smooth((at-end)/(1-end));point=toe;}
      const fixed=add(anchor,rotateFoot(sub(point,ball),0,yaw));
      return {target:sub(fixed,rotateFoot(point,angle,yaw)),pitch:angle,support:point,fixed};
    }
    if(active){const c=contact(relative);target=c.target;pitch=c.pitch;support={local:c.support===ball?[0,-rest[1],ball[2]]:c.support,world:c.support===ball?[c.fixed[0],0,c.fixed[2]]:c.fixed,part:relative<.15?'heel':relative>.70?'toe':'sole'};}
    else{
      const until=1-u;
      if(until<.09){
        const nextAnchor=[stance.anchor[0],.0425,stance.anchor[1]+(cycle+1)*clip.stride-phase*clip.stride],fixed=add(nextAnchor,rotateFoot(sub(heel,ball),0,stance.yaw)),next=sub(fixed,rotateFoot(heel,landingPitch,stance.yaw));
        const w=smooth(1-until/.09);target=mix(target,next,w);pitch+=(landingPitch-pitch)*w;yaw+=(stance.yaw-yaw)*w;
      }
      // Captured ankle/toe landmarks sit above the actual sole. Correct their
      // retargeted clearance, including the incoming foot during real flight.
      // This bends the free leg; the captured pelvis/head motion is unchanged.
      const windows=Object.values(clip.stances),airborne=windows.every(s=>frac(phase-s.start)>=s.duration);
      const since=Math.min(...windows.map(s=>frac(phase-s.start-s.duration))),untilContact=Math.min(...windows.map(s=>1-frac(phase-s.start)));
      const clearance=running&&airborne?.07*Math.sin(Math.PI*since/(since+untilContact)):0;
      const lowest=Math.min(...soles[side].map(p=>rotateFoot(p,pitch,yaw)[1]));
      target[1]=Math.max(target[1],clearance-lowest);
    }
    return {target,pitch,yaw,active,support};
  }
  function knee(hip,ankle,pole,a,b){
    const v=sub(ankle,hip),distance=len(v),axis=unit(v),d=clamp(distance,Math.abs(a-b)+1e-5,a+b-1e-5),along=(a*a-b*b+d*d)/(2*d),height=Math.sqrt(Math.max(0,a*a-along*along));
    let bend=sub(sub(pole,hip),mul(axis,dot(sub(pole,hip),axis)));if(len(bend)<.001)bend=sub([0,0,1],mul(axis,dot([0,0,1],axis)));
    return add(add(hip,mul(axis,along)),mul(unit(bend),height));
  }
  function pose(running,phase,options={}){
    const state=options.state,action=!!state,t=clamp(phase,0,1);
    phase=frac(phase);const clip=setup(running),j=sampled(clip,action?0:phase),right=action?[1,0,0]:unit(sub(j.rhipjoint,j.lhipjoint)),chestRight=action?[1,0,0]:unit(sub(j.rclavicle,j.lclavicle));
    let pelvis=mul(mix(j.lhipjoint,j.rhipjoint,.5),retargetScale);
    const hipHalf=len(sub(bone('thighL').start,bone('thighR').start))/2;
    const feet={l:foot(clip,j,'l',phase,running),r:foot(clip,j,'r',phase,running)};
    if(action){
      pelvis=[0,bone('pelvis').start[1]-(state==='hit'?.035*Math.sin(t*Math.PI):0),0];
      for(const [side,sign]of [['l',-1],['r',1]]){const rest=bone('foot'+side.toUpperCase()).start;feet[side]={target:[sign*.115,rest[1],side==='l'?.035:-.035],pitch:0,yaw:sign*.08,active:true,support:null};}
    }
    let lower=0;
    for(const [side,sign]of [['l',-1],['r',1]])if(feet[side].active){const hip=add(pelvis,mul(right,sign*hipHalf)),v=sub(hip,feet[side].target),L=length('thigh'+side.toUpperCase())+length('shin'+side.toUpperCase())-.002;const maxY=Math.sqrt(Math.max(0,L*L-v[0]*v[0]-v[2]*v[2]));lower=Math.max(lower,v[1]-maxY);}
    if(lower>0)pelvis[1]-=lower;
    const matrices=Array(B.length),targets={pelvis,feet};
    let start=pelvis;
    for(const [name,a,b,axis]of [['pelvis','root','lowerback',right],['abdomen','lowerback','upperback',right],['chest','upperback','lowerneck',chestRight],['neck','lowerneck','upperneck',chestRight],['head','upperneck','head',mix([1,0,0],chestRight,.3)]]){
      // A capture head marker follows the crown, rather than the facial gaze.
      // Stabilise the skull above the neck and keep the eyes facing ahead.
      const direction=name==='head'?unit(mix(unit(sub(j[b],j[a])),[0,1,-.11],.8)):action?unit([0,1,name==='chest'?-.02:0]):unit(sub(j[b],j[a]));
      const end=add(start,mul(direction,length(name)));matrices[boneIndex[name]]=transform(boneIndex[name],start,end,axis);targets[name]={start,end};start=end;
    }
    function apply(m,p){return [dot(m.slice(0,3),p)+m[3],dot(m.slice(4,7),p)+m[7],dot(m.slice(8,11),p)+m[11]];}
    for(const [side,sign]of [['l',-1],['r',1]]){
      const S=side.toUpperCase(),hip=add(pelvis,mul(right,sign*hipHalf));let ankle=feet[side].target;
      const reach=length('thigh'+S)+length('shin'+S)-.002,delta=sub(ankle,hip);
      if(!feet[side].active&&len(delta)>reach)ankle=feet[side].target=add(hip,mul(unit(delta),reach));
      const kneepoint=knee(hip,ankle,mul(j[side+'femur'],retargetScale),length('thigh'+S),length('shin'+S));
      matrices[boneIndex['thigh'+S]]=transform(boneIndex['thigh'+S],hip,kneepoint,right);matrices[boneIndex['shin'+S]]=transform(boneIndex['shin'+S],kneepoint,ankle,right);matrices[boneIndex['foot'+S]]=footMatrix('foot'+S,ankle,feet[side].pitch,feet[side].yaw);
      let upper=unit(sub(j[side+'humerus'],j[side+'clavicle'])),fore=unit(sub(j[side+'wrist'],j[side+'humerus'])),palm=unit(sub(j[side+'fingers'],j[side+'wrist']));
      // CMU's short finger markers are noisy. Keep the wrist close to neutral
      // along the captured forearm instead of magnifying a tiny marker angle.
      palm=unit(mix(fore,palm,running?.25:.15));
      if(action){
        upper=unit([sign*.22,-1,.02]);fore=unit([sign*.04,-1,.25]);palm=fore;
        const stroke=smooth(t),dominant=side==='r';
        if(state==='swing'&&dominant){const angle=-1.8+stroke*3.2;upper=unit([.22,-Math.sin(angle),Math.cos(angle)]);fore=unit([-.15,-Math.sin(angle+.65),Math.cos(angle+.65)]);palm=fore;}
        if(state==='thrust'&&dominant){upper=unit([.15,-.55,.20+.8*Math.sin(t*Math.PI)]);fore=unit([-.12,.05,.35+Math.sin(t*Math.PI)]);palm=fore;}
        if(state==='cast'){upper=unit([sign*.4,-.5,.5+.4*Math.sin(t*Math.PI)]);fore=unit([sign*.08,.7*Math.sin(t*Math.PI),1]);palm=fore;}
        if(state==='hit'){upper=unit([sign*.4,-.4,.8]);fore=unit([-sign*.8,.4,.5]);palm=fore;}
      }
      const shoulder=apply(matrices[boneIndex.chest],bone('upperArm'+S).start),elbow=add(shoulder,mul(upper,length('upperArm'+S))),wrist=add(elbow,mul(fore,length('foreArm'+S))),hand=add(wrist,mul(palm,length('hand'+S)));
      matrices[boneIndex['upperArm'+S]]=transform(boneIndex['upperArm'+S],shoulder,elbow,chestRight);matrices[boneIndex['foreArm'+S]]=transform(boneIndex['foreArm'+S],elbow,wrist,chestRight);
      // Relaxed walking hands and a loose running fist are authored: capture has no fingers.
      const handDirection=unit(sub(bone('hand'+S).end,bone('hand'+S).start)),across=unit(sub(bone('finger2-1.'+S).start,bone('finger5-1.'+S).start));
      // Anatomical handedness selects the palm, rather than the back of the
      // hand. Curling toward a forced +Z normal hyperextended both hands.
      const palmNormal=mul(unit(cross(across,handDirection)),side==='l'?1:-1),bindHand=bindBasis[boneIndex['hand'+S]];
      let facing=sub([-sign,0,0],mul(palm,dot([-sign,0,0],palm)));if(len(facing)<.01)facing=sub([0,0,1],mul(palm,palm[2]));facing=unit(facing);
      const tangent=cross(palm,facing),handRight=add(mul(facing,dot(palmNormal,bindHand[0])),mul(tangent,dot(palmNormal,bindHand[2])));
      matrices[boneIndex['hand'+S]]=transform(boneIndex['hand'+S],wrist,hand,handRight);
      const handMatrix=matrices[boneIndex['hand'+S]];
      const curlAxis=unit(cross(handDirection,palmNormal));
      function vector(m,v){return[dot(m.slice(0,3),v),dot(m.slice(4,7),v),dot(m.slice(8,11),v)];}
      for(let finger=1;finger<=5;finger++)for(let joint=1;joint<=3;joint++){
        const name='finger'+finger+'-'+joint+'.'+S,index=boneIndex[name],bind=B[index],parent=joint===1?handMatrix:matrices[boneIndex['finger'+finger+'-'+(joint-1)+'.'+S]];
        const a=apply(parent,bind.start),v=vector(parent,sub(bind.end,bind.start)),axis=unit(vector(parent,curlAxis));
        const angle=(running?[1.10,1.20,.65]:[.38,.55,.32])[joint-1]*(finger===1?.6:1),c=Math.cos(angle),sn=Math.sin(angle);
        const rotate=v=>add(add(mul(v,c),mul(cross(axis,v),sn)),mul(axis,dot(axis,v)*(1-c)));
        // Preserve the parent's twist through the small finger joints. Building
        // a fresh world-facing basis here splays the fingers during arm swing.
        const columns=[[parent[0],parent[4],parent[8]],[parent[1],parent[5],parent[9]],[parent[2],parent[6],parent[10]]].map(rotate),matrix=[];
        for(let row=0;row<3;row++){for(let col=0;col<3;col++)matrix[row*4+col]=columns[col][row];matrix[row*4+3]=a[row]-dot(matrix.slice(row*4,row*4+3),bind.start);}
        matrices[index]=matrix;
      }
      targets[side]={hip,knee:kneepoint,ankle,shoulder,elbow,wrist,hand};
    }
    return {matrices,targets,stride:clip.stride,cadence:clip.cadence,phase};
  }
  const COLORS=[[174,158,124],[83,65,47],[61,43,29],[179,132,95],[65,43,28],[55,38,23],[168,158,139],[62,34,28]];
  function skin(running,phase,options={}){
    const p=pose(running,phase,options),positions=new Float64Array(N*3),normals=new Float64Array(N*3);
    for(let i=0;i<N;i++){
      const x=M.vertices[i*3],y=M.vertices[i*3+1],z=M.vertices[i*3+2],nx=M.normals[i*3],ny=M.normals[i*3+1],nz=M.normals[i*3+2];
      for(let k=0;k<4;k++){const bi=M.skin[i*8+k*2],w=M.skin[i*8+k*2+1];if(!w)continue;const m=p.matrices[bi];
        positions[i*3]+=(m[0]*x+m[1]*y+m[2]*z+m[3])*w;positions[i*3+1]+=(m[4]*x+m[5]*y+m[6]*z+m[7])*w;positions[i*3+2]+=(m[8]*x+m[9]*y+m[10]*z+m[11])*w;
        normals[i*3]+=(m[0]*nx+m[1]*ny+m[2]*nz)*w;normals[i*3+1]+=(m[4]*nx+m[5]*ny+m[6]*nz)*w;normals[i*3+2]+=(m[8]*nx+m[9]*ny+m[10]*nz)*w;
      }
    }
    if(options.state==='fall'){
      const angle=clamp(phase,0,1)*Math.PI/2,c=Math.cos(angle),sn=Math.sin(angle);let floor=Infinity;
      for(let i=0;i<N;i++){const y=positions[i*3+1],z=positions[i*3+2],ny=normals[i*3+1],nz=normals[i*3+2];positions[i*3+1]=y*c-z*sn;positions[i*3+2]=y*sn+z*c;normals[i*3+1]=ny*c-nz*sn;normals[i*3+2]=ny*sn+nz*c;floor=Math.min(floor,positions[i*3+1]);}
      for(let i=0;i<N;i++)positions[i*3+1]-=floor;
    }
    return {...p,positions,normals};
  }
  function project(point,direction=0){const angle=-direction*Math.PI/4,c=Math.cos(angle),sn=Math.sin(angle),x=point[0]*c+point[2]*sn,z=-point[0]*sn+point[2]*c;return[ORIGIN[0]+x*GROUND,ORIGIN[1]+z*GROUND-point[1]*HEIGHT];}
  function render(canvas,running,phase,direction=0,options={}){
    const s=skin(running,phase,options),ss=options.supersample||2,w=WIDTH*ss,h=HEIGHT_PIXELS*ss,angle=-direction*Math.PI/4,c=Math.cos(angle),sn=Math.sin(angle);
    const screen=new Float64Array(N*3),colors=new Float64Array(N*3),pixels=new Uint8ClampedArray(w*h*4),depth=new Float64Array(w*h);depth.fill(-Infinity);
    const light=unit([-.45,.85,.5]);
    for(let i=0;i<N;i++){
      let x=s.positions[i*3],y=s.positions[i*3+1],z=s.positions[i*3+2],nx=s.normals[i*3],ny=s.normals[i*3+1],nz=s.normals[i*3+2];const X=x*c+z*sn,Z=-x*sn+z*c,NX=nx*c+nz*sn,NZ=-nx*sn+nz*c;
      screen[i*3]=(ORIGIN[0]+X*GROUND)*ss;screen[i*3+1]=(ORIGIN[1]+Z*GROUND-y*HEIGHT)*ss;screen[i*3+2]=y*GROUND+Z*HEIGHT;
      const material=M.materials[i],base=(options.colors&&options.colors[material])||COLORS[material]||COLORS[0],normalLength=Math.hypot(NX,ny,NZ)||1;
      const diffuse=Math.max(0,(NX*light[0]+ny*light[1]+NZ*light[2])/normalLength),grain=Math.sin(M.vertices[i*3]*491+M.vertices[i*3+1]*733+M.vertices[i*3+2]*317)*.025,shade=.40+.61*diffuse+grain;
      for(let k=0;k<3;k++)colors[i*3+k]=options.encode?(k===0?material+1:clamp(shade*200,0,255)):clamp(base[k]*shade,0,255);
    }
    const T=M.triangles;
    for(let q=0;q<T.length;q+=3){
      const a=T[q]*3,b=T[q+1]*3,c=T[q+2]*3,ax=screen[a],ay=screen[a+1],bx=screen[b],by=screen[b+1],cx=screen[c],cy=screen[c+1];
      const area=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);if(Math.abs(area)<.001)continue;
      const x0=Math.max(0,Math.floor(Math.min(ax,bx,cx))),x1=Math.min(w-1,Math.ceil(Math.max(ax,bx,cx))),y0=Math.max(0,Math.floor(Math.min(ay,by,cy))),y1=Math.min(h-1,Math.ceil(Math.max(ay,by,cy)));
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
        const u=((bx-x-.5)*(cy-y-.5)-(by-y-.5)*(cx-x-.5))/area,v=((cx-x-.5)*(ay-y-.5)-(cy-y-.5)*(ax-x-.5))/area,t=1-u-v;if(u<0||v<0||t<0)continue;
        const z=u*screen[a+2]+v*screen[b+2]+t*screen[c+2],index=y*w+x;if(z<=depth[index])continue;depth[index]=z;
        for(let k=0;k<3;k++)pixels[index*4+k]=options.encode&&k===0?M.materials[T[q]]+1:u*colors[a+k]+v*colors[b+k]+t*colors[c+k];pixels[index*4+3]=255;
      }
    }
    canvas.width=WIDTH;canvas.height=HEIGHT_PIXELS;
    if(options.encode){
      const output=new Uint8ClampedArray(WIDTH*HEIGHT_PIXELS*4);
      for(let y=0;y<HEIGHT_PIXELS;y++)for(let x=0;x<WIDTH;x++){
        const counts=new Map();let covered=0;
        for(let yy=0;yy<ss;yy++)for(let xx=0;xx<ss;xx++){const i=((y*ss+yy)*w+x*ss+xx)*4;if(!pixels[i+3])continue;covered++;const material=pixels[i],a=counts.get(material)||[0,0];a[0]++;a[1]+=pixels[i+1];counts.set(material,a);}
        if(!covered)continue;const [material,[count,shade]]=[...counts].sort((a,b)=>b[1][0]-a[1][0])[0],q=(y*WIDTH+x)*4;output[q]=material*24;output[q+1]=Math.round(shade/count);output[q+3]=Math.round(covered/(ss*ss)*255);
      }
      canvas.getContext('2d').putImageData(new ImageData(output,WIDTH,HEIGHT_PIXELS),0,0);
    }else{
      const staging=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):document.createElement('canvas');staging.width=w;staging.height=h;staging.getContext('2d').putImageData(new ImageData(pixels,w,h),0,0);canvas.getContext('2d').drawImage(staging,0,0,WIDTH,HEIGHT_PIXELS);
    }
    return {pose:s,origin:ORIGIN,groundScale:GROUND,heightScale:HEIGHT,stride:s.stride,cadence:s.cadence};
  }
  return {pose,skin,render,setup,project,retargetScale,groundScale:GROUND,heightScale:HEIGHT,width:WIDTH,height:HEIGHT_PIXELS,origin:ORIGIN};
 }
 return {...create(HumanMeshData),create};
})();
if(typeof module!=='undefined')module.exports=HumanLocomotion;
