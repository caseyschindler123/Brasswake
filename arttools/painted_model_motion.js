/* Local fitted-model leg correction. Published locomotion remains untouched. */
const PaintedModelMotion=(()=>{
  const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(v,k)=>v.map(n=>n*k);
  const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),length=v=>Math.hypot(...v),unit=v=>mul(v,1/(length(v)||1));
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),frac=v=>v-Math.floor(v),mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t),smooth=t=>(t=clamp(t))*t*(3-2*t);
  function create(M){
    const base=HumanLocomotion.create(M),bones=M.bones,ids=Object.fromEntries(bones.map((b,i)=>[b.name,i])),bone=n=>bones[ids[n]],boneLength=n=>length(sub(bone(n).end,bone(n).start));
    const captured=HumanMotionData.walk.frames[0].joints,leg=s=>length(sub(captured[s+'femur'],captured[s+'hipjoint']))+length(sub(captured[s+'tibia'],captured[s+'femur']));
    const scale=(boneLength('thighL')+boneLength('shinL')+boneLength('thighR')+boneLength('shinR'))/(leg('l')+leg('r')),hipHalf=length(sub(bone('thighL').start,bone('thighR').start))/2,clips=new Map();
    function basis(a,b,right=[1,0,0]){const y=unit(sub(b,a));let x=sub(right,mul(y,dot(right,y)));if(length(x)<.001)x=cross(y,[0,0,1]);x=unit(x);return[x,y,unit(cross(x,y))];}
    const bind=bones.map(b=>basis(b.start,b.end));
    function transform(name,a,b,right){const i=ids[name],from=bind[i],to=basis(a,b,right),m=Array(12).fill(0);for(let row=0;row<3;row++){for(let col=0;col<3;col++)m[row*4+col]=to[0][row]*from[0][col]+to[1][row]*from[1][col]+to[2][row]*from[2][col];m[row*4+3]=a[row]-dot(m.slice(row*4,row*4+3),bones[i].start);}return m;}
    function rotateFoot(p,pitch,yaw){const c=Math.cos(pitch),s=Math.sin(pitch),cy=Math.cos(yaw),sy=Math.sin(yaw),y=p[1]*c-p[2]*s,z=p[1]*s+p[2]*c;return[p[0]*cy+z*sy,y,-p[0]*sy+z*cy];}
    function footMatrix(name,ankle,pitch,yaw){const b=bone(name),v=[[1,0,0],[0,1,0],[0,0,1]].map(p=>rotateFoot(p,pitch,yaw)),m=[];for(let row=0;row<3;row++){for(let col=0;col<3;col++)m[row*4+col]=v[col][row];m[row*4+3]=ankle[row]-dot(m.slice(row*4,row*4+3),b.start);}return m;}
    const sole={};for(const side of['l','r']){const S=side.toUpperCase(),origin=bone('foot'+S).start,points=[];for(let i=0;i<M.materials.length;i++)for(let k=0;k<4;k++)if(M.skin[i*8+k*2]===ids['foot'+S]&&M.skin[i*8+k*2+1]>.98){points.push(sub(M.vertices.slice(i*3,i*3+3),origin));break;}
      const lo=Math.min(...points.map(p=>p[2])),hi=Math.max(...points.map(p=>p[2])),y=Math.min(...points.map(p=>p[1]));sole[side]={points,heel:[0,y,lo],ball:[0,y,lo+(hi-lo)*.67],toe:[0,y,hi]};
    }
    const median=a=>a.sort((a,b)=>a-b)[a.length>>1];
    function setup(running){const key=running?'run':'walk';if(clips.has(key))return clips.get(key);const source=HumanMotionData[key],n=source.frames.length,onset=source.frames.findIndex((f,i)=>f.contacts.left&&!source.frames[(i+n-1)%n].contacts.left),frames=source.frames.map((_,i)=>source.frames[(i+onset)%n]),stride=source.stride*scale,stances={};
      for(const[side,flag]of[['l','left'],['r','right']]){const start=frames.findIndex((f,i)=>f.contacts[flag]&&!frames[(i+n-1)%n].contacts[flag]);let count=0;while(count<n&&frames[(start+count)%n].contacts[flag])count++;const world=[],yaws=[];for(let k=0;k<count;k++){const i=start+k,j=frames[i%n].joints,p=mul(j[side+'foot'],scale),v=sub(j[side+'toes'],j[side+'tibia']);world.push([p[0],p[2]+i/n*stride]);yaws.push(Math.atan2(v[0],v[2]));}stances[side]={start:start/n,duration:count/n,anchor:[median(world.map(p=>p[0])),0,start/n*stride+sole[side].ball[2]+stride*(count/n)*.5-.035],yaw:clamp(median(yaws),-.35,.35)};}
      const reference=PaintedModelReference[key].frames.map((_,i)=>PaintedModelReference[key].frames[(i+onset)%n]);
      const meanHeight=frames.reduce((sum,f)=>sum+(f.joints.lhipjoint[1]+f.joints.rhipjoint[1])*.5*scale,0)/n;const clip={frames,stride,cadence:source.cadence,stances,running,meanHeight,reference};clips.set(key,clip);
      // Retain the source's mean feet-to-hips balance. A centred generic arc
      // placed the running feet too far ahead and weakened forward drive.
      let sourceBalance=0,arcBalance=0;for(let i=0;i<240;i++){const phase=i/240,j=sample(clip,phase),hip=(j.lhipjoint[2]+j.rhipjoint[2])*.5*scale;sourceBalance+=(j.ltibia[2]+j.rtibia[2])*.5*scale-hip;arcBalance+=(foot(clip,'l',phase).target[2]+foot(clip,'r',phase).target[2])*.5-hip;}const offset=(sourceBalance-arcBalance)/240;for(const stance of Object.values(stances))stance.anchor[2]+=offset;
      // Smooth the required reach correction around the full periodic cycle.
      // A small constant safety offset keeps every planted leg within reach.
      const count=240,raw=Array.from({length:count},(_,i)=>{const phase=i/count,j=sample(clip,phase),pelvis=capturedPelvis(clip,j),right=unit(sub(j.rhipjoint,j.lhipjoint));let drop=0;for(const[side,sign]of[['l',-1],['r',1]]){const f=foot(clip,side,phase),hip=add(pelvis,mul(right,sign*hipHalf)),d=sub(hip,f.target),reach=boneLength('thigh'+side.toUpperCase())+boneLength('shin'+side.toUpperCase())-.003;if(f.active)drop=Math.max(drop,d[1]-Math.sqrt(Math.max(0,reach*reach-d[0]*d[0]-d[2]*d[2])));}return drop;});
      const smoothed=raw.map((_,i)=>{let sum=0,weight=0;for(let k=-36;k<=36;k++){const w=Math.exp(-k*k/288);sum+=raw[(i+k+count)%count]*w;weight+=w;}return sum/weight;}),safety=Math.max(0,...raw.map((v,i)=>v-smoothed[i]))+.001;clip.drop=smoothed.map(v=>v+safety);return clip;
    }
    function capturedPelvis(clip,j){const p=mul(mix(j.lhipjoint,j.rhipjoint,.5),scale);p[1]=bone('pelvis').start[1]+(p[1]-clip.meanHeight)*(clip.running?.65:.35);return p;}
    function sample(clip,phase){const f=frac(phase)*clip.frames.length,i=Math.floor(f),t=f-i,a=clip.frames[i].joints,b=clip.frames[(i+1)%clip.frames.length].joints;return Object.fromEntries(Object.keys(a).map(k=>[k,mix(a[k],b[k],t)]));}
    function sampleReference(clip,phase){const at=frac(phase)*clip.reference.length,i=Math.floor(at),t=at-i,a=clip.reference[i],b=clip.reference[(i+1)%clip.reference.length];return{neckRotation:mix(a.neckRotation,b.neckRotation,t),headRotation:mix(a.headRotation,b.headRotation,t)};}
    function rotateReference(matrix,v){return[0,1,2].map(a=>dot(matrix.slice(a*3,a*3+3),v));}
    function foot(clip,side,phase){const s=clip.stances[side],u=frac(phase-s.start),cycle=Math.floor(phase-s.start),active=u<s.duration,parts=sole[side],landing=clip.running?-.08:-.26,push=clip.running?.90:.70;
      function contact(at,turn,p){let pitch=0,point=parts.ball;if(at<.16){pitch=landing*(1-smooth(at/.16));point=parts.heel;}else if(at>.68){pitch=push*smooth((at-.68)/.32);point=parts.toe;}const anchor=add(s.anchor,[0,0,turn*clip.stride-p*clip.stride]),fixed=add(anchor,rotateFoot(sub(point,parts.ball),0,s.yaw)),target=sub(fixed,rotateFoot(point,pitch,s.yaw));return{target,pitch,yaw:s.yaw,active:true,support:{local:point,world:fixed}};}
      if(active)return contact(u/s.duration,cycle,phase);
      const t=(u-s.duration)/(1-s.duration),p0=s.start+cycle+s.duration,p1=s.start+cycle+1,a=contact(1,cycle,p0),b=contact(0,cycle+1,p1),worldA=add(a.target,[0,0,p0*clip.stride]),worldB=add(b.target,[0,0,p1*clip.stride]),target=sub(mix(worldA,worldB,smooth(t)),[0,0,phase*clip.stride]);
      target[1]+=(clip.running?.17:.075)*Math.sin(Math.PI*t)**2;
      const mid=clip.running?.22:0,pitch=t<.52?push+(mid-push)*smooth(t/.52):mid+(landing-mid)*smooth((t-.52)/.48);
      // Clearance correction is continuous and vanishes at the grounded ends.
      const lowest=Math.min(...parts.points.map(p=>rotateFoot(p,pitch,s.yaw)[1]));target[1]=Math.max(target[1],-lowest);
      return{target,pitch,yaw:s.yaw,active:false,support:null};
    }
    function pose(running,phase,options={}){if(options.state)return base.pose(running,phase,options);phase=frac(phase);const p=base.pose(running,phase),clip=setup(running),j=sample(clip,phase),right=unit(sub(j.rhipjoint,j.lhipjoint)),forward=unit(cross(right,[0,1,0])),pelvis=capturedPelvis(clip,j),at=phase*clip.drop.length,i=Math.floor(at),t=at-i;pelvis[1]-=clip.drop[i]*(1-t)+clip.drop[(i+1)%clip.drop.length]*t;
      const shift=sub(pelvis,p.targets.pelvis.start);for(const m of p.matrices)for(let a=0;a<3;a++)m[a*4+3]+=shift[a];for(const item of Object.values(p.targets))if(item&&item.start){item.start=add(item.start,shift);item.end=add(item.end,shift);}p.targets.pelvis=pelvis;p.targets.feet={};
      // Apply actual source rotation deltas to this body's own neutral neck
      // and skull axes. This preserves anatomy and removes the old rear bias.
      const reference=sampleReference(clip,phase),neckStart=p.targets.neck.start,neckAxis=unit(rotateReference(reference.neckRotation,sub(bone('neck').end,bone('neck').start))),neckEnd=add(neckStart,mul(neckAxis,boneLength('neck'))),headAxis=unit(rotateReference(reference.headRotation,sub(bone('head').end,bone('head').start))),headEnd=add(neckEnd,mul(headAxis,boneLength('head')));
      p.matrices[ids.neck]=transform('neck',neckStart,neckEnd,rotateReference(reference.neckRotation,bind[ids.neck][0]));p.matrices[ids.head]=transform('head',neckEnd,headEnd,rotateReference(reference.headRotation,bind[ids.head][0]));p.targets.neck={start:neckStart,end:neckEnd};p.targets.head={start:neckEnd,end:headEnd};
      for(const[side,sign]of[['l',-1],['r',1]]){const S=side.toUpperCase(),hip=add(pelvis,mul(right,sign*hipHalf)),f=foot(clip,side,phase),a=boneLength('thigh'+S),b=boneLength('shin'+S),reach=a+b-.00001;let delta=sub(f.target,hip),distance=length(delta);if(distance>reach&&!f.active){f.target=add(hip,mul(unit(delta),reach));delta=sub(f.target,hip);distance=reach;}const axis=unit(delta),d=clamp(distance,Math.abs(a-b)+.00001,reach),along=(a*a-b*b+d*d)/(2*d),height=Math.sqrt(Math.max(0,a*a-along*along)),bend=unit(sub(forward,mul(axis,dot(forward,axis)))),knee=add(add(hip,mul(axis,along)),mul(bend,height));
        p.matrices[ids['thigh'+S]]=transform('thigh'+S,hip,knee,right);p.matrices[ids['shin'+S]]=transform('shin'+S,knee,f.target,right);p.matrices[ids['foot'+S]]=footMatrix('foot'+S,f.target,f.pitch,f.yaw);const previous=p.targets[side];p.targets[side]={...previous,hip,knee,ankle:f.target,shoulder:add(previous.shoulder,shift),elbow:add(previous.elbow,shift),wrist:add(previous.wrist,shift),hand:add(previous.hand,shift)};p.targets.feet[side]=f;
      }
      return p;
    }
    function skin(running,phase,options={}){const p=pose(running,phase,options);return{...p,...PaintedModelGeometry.skin(M,p.matrices)};}
    return{pose,skin};
  }
  return{create};
})();
if(typeof module!=='undefined')module.exports=PaintedModelMotion;
