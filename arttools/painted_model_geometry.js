/* Single-profile source proof. Body dimensions own the armor; no bitmap fitting. */
const PaintedModelGeometry=(()=>{
  const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),sub=(a,b)=>a.map((v,i)=>v-b[i]);
  const unit=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
  function make(source){
    const body={...source,vertices:Array.from(source.vertices),normals:Array.from(source.normals),triangles:Array.from(source.triangles),skin:Array.from(source.skin),materials:Array.from(source.materials)};
    const bones=body.bones,ids=Object.fromEntries(bones.map((b,i)=>[b.name,i]));
    // Closed low boots replace individual toe silhouettes. Their bounds and
    // weights come from this body's feet, rather than a generic shoe scale.
    function boot(side){const bone=bones[ids['foot'+side]],f=unit([bone.end[0]-bone.start[0],0,bone.end[2]-bone.start[2]]),r=[f[2],0,-f[0]],points=[];
      for(let i=0;i<source.materials.length;i++){const p=source.vertices.slice(i*3,i*3+3);if(p[1]>.20||Math.sign(p[0])!==Math.sign(bone.start[0]))continue;const v=sub(p,bone.start);points.push([dot(v,r),p[1],dot(v,f)]);}
      const z0=Math.min(...points.map(p=>p[2]))-.006,z1=Math.max(...points.map(p=>p[2]))+.012,wide=Math.max(...points.map(p=>Math.abs(p[0])))+.006,rows=[],segments=20;
      const add=(p,n,footWeight=1)=>{const at=body.materials.length;body.vertices.push(...p);body.normals.push(...n);body.materials.push(2);body.skin.push(ids['foot'+side],footWeight,ids['shin'+side],1-footWeight,0,0,0,0);return at;};
      for(let j=0;j<9;j++){const t=j/8,z=z0+(z1-z0)*t,range=points.filter(p=>Math.abs(p[2]-z)<.045),h=Math.max(.035,...range.map(p=>p[1]))+.009,w=wide*(t>.8?Math.max(.62,Math.sqrt(1-((t-.8)/.2)**2)):t<.12?.83:.98),row=[];
        for(let k=0;k<segments;k++){const a=k/segments*Math.PI*2,s=Math.sin(a),c=Math.cos(a),y=s>=0?.008+(h-.008)*Math.pow(s,.8):.008+.008*s,x=w*Math.sign(c)*Math.pow(Math.abs(c),.8),p=[bone.start[0]+r[0]*x+f[0]*z,y,bone.start[2]+r[2]*x+f[2]*z];row.push(add(p,unit([r[0]*c,s,r[2]*c])));}rows.push(row);}
      const join=(a,b)=>{for(let k=0;k<segments;k++){const n=(k+1)%segments;body.triangles.push(a[k],b[k],b[n],a[k],b[n],a[n]);}};for(let j=0;j<rows.length-1;j++)join(rows[j],rows[j+1]);
      for(const [j,reverse]of[[0,true],[rows.length-1,false]]){const row=rows[j],center=[0,0,0];for(const i of row)for(let a=0;a<3;a++)center[a]+=body.vertices[i*3+a]/segments;const at=add(center,reverse?f.map(n=>-n):f);for(let k=0;k<segments;k++){const n=(k+1)%segments;body.triangles.push(at,row[reverse?n:k],row[reverse?k:n]);}}
      const cuff=[];for(const y of [.105,.17,.235]){const row=[],rx=wide*.82,rz=.050;for(let k=0;k<segments;k++){const a=k/segments*Math.PI*2,x=Math.cos(a)*rx,z=Math.sin(a)*rz;row.push(add([bone.start[0]+r[0]*x+f[0]*z,y,bone.start[2]+r[2]*x+f[2]*z],unit([r[0]*Math.cos(a)+f[0]*Math.sin(a),0,r[2]*Math.cos(a)+f[2]*Math.sin(a)]),clamp((.235-y)/.14)));}cuff.push(row);}join(cuff[0],cuff[1]);join(cuff[1],cuff[2]);
    }
    body.triangles=body.triangles.filter((_,i,all)=>{const a=i-i%3;return!all.slice(a,a+3).every(v=>source.vertices[v*3+1]<.205);});boot('L');boot('R');
    const dominant=i=>{let best=0;for(let k=1;k<4;k++)if(body.skin[i*8+k*2+1]>body.skin[i*8+best*2+1])best=k;return bones[body.skin[i*8+best*2]].name;};
    const along=(p,name)=>{const b=bones[ids[name]],v=sub(b.end,b.start);return dot(sub(p,b.start),v)/dot(v,v);};
    const parts=[],semantic=[],clearance=[];
    for(let i=0;i<body.materials.length;i++){
      const p=body.vertices.slice(i*3,i*3+3),name=dominant(i),head=name==='head'||name==='neck',hand=/^(hand|finger)/.test(name),arm=/Arm/.test(name),foot=i>=source.materials.length||name.startsWith('foot')||p[1]<.20;
      parts.push(head?'head':hand?'hands':foot?'boots':arm?'arms':p[1]<.94?'legs':'torso');
      // One connected anatomical mesh, modest underwear, simple low boots.
      let id=head?(source.materials[i]===4?7:source.materials[i]===6||source.materials[i]===7?7:4):foot?6:arm||hand||p[1]<.62?4:1;
      semantic.push(id);
      let offset=0;
      if(!head){
        if(hand)offset=.004;
        else if(foot)offset=p[2]>.04&&p[1]<.10?.004:0;
        else if(arm){const t=along(p,name);offset=name.startsWith('upperArm')?(t<.27?.012:t>.34&&t<.86?.009:0):(t>.14&&t<.87?.008:0);
          const joint=bones[ids[(name.endsWith('L')?'foreArmL':'foreArmR')]].start;
          if(Math.abs(p[1]-joint[1])<.042&&p[2]>joint[2]+.005)offset=.014;
        }else if(p[1]>=1.055&&p[1]<1.51)offset=.010;
        else if(name.startsWith('thigh')){const t=along(p,name);offset=t>.08&&t<.90?.009:0;}
        else if(name.startsWith('shin')){const t=along(p,name);offset=t>.13&&t<.90?.009:0;}
        const side=name.endsWith('L')?'L':'R',knee=bones[ids['shin'+side]]?.start;
        if(knee&&Math.abs(p[0]-knee[0])<.085&&Math.abs(p[1]-knee[1])<.048&&p[2]>knee[2])offset=.014;
      }
      clearance.push(offset);
    }
    const armor={...body,vertices:[],normals:[],skin:[],triangles:[],materials:[],partLabels:[],bindings:[]};
    const original=i=>({p:body.vertices.slice(i*3,i*3+3),n:body.normals.slice(i*3,i*3+3),weights:Array.from({length:4},(_,k)=>[body.skin[i*8+k*2],body.skin[i*8+k*2+1]]),part:parts[i],binding:[[i,1]]});
    const blend=(a,b,t)=>{const weights=new Map();for(const [bone,w]of a.weights)weights.set(bone,(weights.get(bone)||0)+w*(1-t));for(const[bone,w]of b.weights)weights.set(bone,(weights.get(bone)||0)+w*t);const binding=new Map();for(const[i,w]of a.binding)binding.set(i,(binding.get(i)||0)+w*(1-t));for(const[i,w]of b.binding)binding.set(i,(binding.get(i)||0)+w*t);return{binding:[...binding],p:a.p.map((v,i)=>v+(b.p[i]-v)*t),n:unit(a.n.map((v,i)=>v+(b.n[i]-v)*t)),weights:[...weights],part:a.part};};
    function clip(poly,fn){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],fa=fn(a.p),fb=fn(b.p);if(fa>=0)out.push(a);if((fa>=0)!==(fb>=0))out.push(blend(a,b,fa/(fa-fb)));}return out;}
    const sections=new Map();function torsoEnvelope(y){const k=Math.round(y/.025);if(sections.has(k))return sections.get(k);const points=[];for(let i=0;i<semantic.length;i++)if(parts[i]==='torso'&&Math.abs(body.vertices[i*3+1]-y)<.035)points.push(body.vertices.slice(i*3,i*3+3));if(!points.length)return null;let w=Math.max(...points.map(p=>Math.abs(p[0]))),lo=Math.min(...points.map(p=>p[2])),hi=Math.max(...points.map(p=>p[2])),z=(lo+hi)/2,d=(hi-lo)/2;const expand=Math.max(1,...points.map(p=>Math.hypot(p[0]/w,(p[2]-z)/d)));const result={w:w*expand+.007,d:d*expand+.007,z};sections.set(k,result);return result;}
    function emit(poly,offset,torso){const indices=[];for(const v of poly){const p=v.p.map((n,i)=>n+v.n[i]*offset);let normal=v.n;if(torso){const e=torsoEnvelope(v.p[1]);if(e){const a=Math.atan2(v.p[2]-e.z,v.p[0]),radius=1/Math.hypot(Math.cos(a)/e.w,Math.sin(a)/e.d),x=radius*Math.cos(a),z=e.z+radius*Math.sin(a);if(Math.hypot(x-v.p[0],z-v.p[2])<.035){p[0]=x;p[2]=z;normal=unit([x/(e.w*e.w),v.n[1]*3,(z-e.z)/(e.d*e.d)]);}}}const at=armor.materials.length;armor.vertices.push(...p);armor.normals.push(...normal);armor.materials.push(3);armor.partLabels.push(v.part);armor.bindings.push({source:v.binding,delta:p.map((n,i)=>n-v.p[i])});const weights=v.weights.filter(p=>p[1]>1e-7).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=weights.reduce((s,p)=>s+p[1],0);for(let k=0;k<4;k++)armor.skin.push(weights[k]?.[0]||0,(weights[k]?.[1]||0)/sum);indices.push(at);}for(let i=1;i<indices.length-1;i++)armor.triangles.push(indices[0],indices[i],indices[i+1]);}
    function patch(accept,planes,offset,torso=false){for(let i=0;i<body.triangles.length;i+=3){let poly=body.triangles.slice(i,i+3).map(original);if(!poly.every(accept))continue;for(const plane of planes){poly=clip(poly,plane);if(poly.length<3)break;}if(poly.length>=3)emit(poly,offset,torso);}}
    patch(v=>v.part==='torso'||v.part==='legs',[p=>p[1]-1.035,p=>1.49-p[1]],.010,true);
    patch(v=>v.part==='torso'||v.part==='legs',[p=>p[1]-.935,p=>1.045-p[1]],.012);
    for(const side of ['L','R']){const sign=bones[ids['thigh'+side]].start[0]<0?-1:1,member=v=>(v.part==='arms'||v.part==='hands')&&v.p[0]*sign>0,leg=v=>v.part==='legs'&&v.p[0]*sign>0;
      // Wrap the cap over the deltoid and inward onto the chest/back overlap.
      // Neck-weighted trapezius vertices belong to this fitted shoulder too.
      const shoulder=bones[ids['upperArm'+side]].start;patch(v=>['torso','arms','head'].includes(v.part)&&v.p[0]*sign>0&&v.p[1]<1.56,[p=>along(p,'upperArm'+side)+.34,p=>.35-along(p,'upperArm'+side),p=>p[0]*sign-Math.abs(shoulder[0])+.085,p=>.19-Math.hypot(...sub(p,shoulder))],.010);
      for(const[name,lo,hi,offset]of[['upperArm',.33,.88,.009],['foreArm',.12,.89,.009]])patch(member,[p=>along(p,name+side)-lo,p=>hi-along(p,name+side)],offset);
      const elbow=bones[ids['foreArm'+side]].start;patch(member,[p=>p[1]-elbow[1]+.040,p=>elbow[1]+.040-p[1],p=>p[2]-elbow[2]],.014);
      patch(v=>v.part==='hands'&&v.p[0]*sign>0,[],.004);
      patch(leg,[p=>along(p,'thigh'+side)-.08,p=>.88-along(p,'thigh'+side)],.009);
      patch(leg,[p=>along(p,'shin'+side)-.13,p=>.94-along(p,'shin'+side)],.009);
      const knee=bones[ids['shin'+side]].start;patch(leg,[p=>p[1]-knee[1]+.050,p=>knee[1]+.050-p[1],p=>p[2]-knee[2]],.014);
      patch(v=>v.part==='boots'&&v.p[0]*sign>0,[p=>.095-p[1],p=>p[2]-bones[ids['foot'+side]].start[2]-.05],.004);
    }
    // The neck-weighted trapezius is still covered by the arming garment.
    // Bone ownership alone must not expose bare shoulders above the cuirass.
    const collarHeight=p=>1.505+.020*clamp((.06-p[2])/.09)+.045*clamp((Math.abs(p[0])-.055)/.085);
    const under=semantic.map((id,i)=>parts[i]==='boots'?6:body.vertices[i*3+1]>=collarHeight(body.vertices.slice(i*3,i*3+3))?(id===7?7:4):1);
    const moved=clearance.filter(n=>n>0),max=Math.max(...moved);
    return{body,armor,semantic,under,parts,clearance,metrics:{bodyHeight:1.8,bodyVertices:body.vertices.length/3,armorTriangles:armor.triangles.length/3,maxNormalClearance:max,minNormalClearance:Math.min(...moved),cuirassContourAllowanceLimit:.035,sharedBones:body.bones===armor.bones,weightsDerivedFromBody:true}};
  }
  function skin(mesh,matrices,bodyPose){const positions=new Float32Array(mesh.vertices.length),normals=new Float32Array(mesh.vertices.length);
    for(let i=0;i<mesh.materials.length;i++){const p=mesh.vertices.slice(i*3,i*3+3),n=mesh.normals.slice(i*3,i*3+3);for(let k=0;k<4;k++){const bi=mesh.skin[i*8+k*2],w=mesh.skin[i*8+k*2+1];if(!w)continue;const m=matrices[bi];for(let a=0;a<3;a++){positions[i*3+a]+=(dot(m.slice(a*4,a*4+3),p)+m[a*4+3])*w;normals[i*3+a]+=dot(m.slice(a*4,a*4+3),n)*w;}}}
    if(mesh.bindings){if(!bodyPose)throw Error('A fitted armor surface requires its body pose');for(let i=0;i<mesh.bindings.length;i++){const binding=mesh.bindings[i],p=[0,0,0],delta=[0,0,0];for(const[v,w]of binding.source)for(let a=0;a<3;a++)p[a]+=bodyPose.positions[v*3+a]*w;for(let k=0;k<4;k++){const bi=mesh.skin[i*8+k*2],w=mesh.skin[i*8+k*2+1],m=matrices[bi];if(w)for(let a=0;a<3;a++)delta[a]+=dot(m.slice(a*4,a*4+3),binding.delta)*w;}for(let a=0;a<3;a++)positions[i*3+a]=p[a]+delta[a];}}
    return{positions,normals};
  }
  return{make,skin};
})();
if(typeof module!=='undefined')module.exports=PaintedModelGeometry;
