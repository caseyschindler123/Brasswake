/* Offline painted cutout composition over human joint guides. No mesh lighting. */
const PaintedRig = (()=>{
 const mean=(a,b)=>a.map((n,i)=>(n+b[i])/2),skirts=new WeakMap();
 function render(canvas,rig,parts,rects,running,phase,direction,state='walk',scale=1,semantic=false){
  const native=state==='swingtwo'?'swing':state==='thrusttwo'?'thrust':state;
  const s=rig.pose(running,phase,{state:state==='walk'||state==='run'?undefined:native}),g=canvas.getContext('2d');canvas.width=256*scale;canvas.height=256*scale;g.scale(scale,scale);g.imageSmoothingEnabled=!semantic;
  const profile=rig.paintedProfile||{build:1,outfit:2},wide=profile.build===2?.07:profile.build===1?.015:0;
  if(state==='idle'||state==='fall')for(const[side,sign]of[['l',-1],['r',1]]){s.targets[side].elbow[0]+=sign*wide*.65;s.targets[side].hand[0]+=sign*wide;}
  // Paint needs quieter arm recovery than a literal marker retarget. Keep the
  // captured opposing phase, with elbows below shoulders and a relaxed wrist.
  if(state==='walk'||state==='run')for(const side of ['l','r']){
   const t=s.targets[side],sign=side==='l'?-1:1,sub=(a,b)=>a.map((n,i)=>n-b[i]),len=p=>Math.hypot(...p),unit=p=>p.map(n=>n/(len(p)||1)),add=(a,b,k)=>a.map((n,i)=>n+b[i]*k);
   const upper=sub(t.elbow,t.shoulder),fore=sub(t.hand,t.elbow),swing=Math.max(-.14,Math.min(.14,upper[2]*.45)),u=unit([sign*(.025+wide),-.28,swing]);
   t.elbow=add(t.shoulder,u,len(upper));const f=unit(running?[sign*.012,.28,.08+swing*.35]:[sign*.01,-.30,fore[2]*.35]);t.hand=add(t.elbow,f,len(fore));
   if(running){const shoulderScreen=rig.project(t.shoulder,direction),handScreen=rig.project(t.hand,direction);if(handScreen[1]<shoulderScreen[1]+6)t.hand[1]-=(shoulderScreen[1]+6-handScreen[1])/rig.heightScale;}
  }
  if(state==='sit'){
   const drop=.505;for(const name of ['pelvis','abdomen','chest','neck','head'])if(s.targets[name]?.start)for(const key of ['start','end'])s.targets[name][key][1]-=drop;
   for(const[side,sign]of[['l',-1],['r',1]]){const t=s.targets[side];t.hip=[sign*.13,.43,0];t.knee=[sign*.15,.40,.20];t.ankle=[sign*.15,.08,.23];t.shoulder[1]-=drop;t.elbow=[sign*(.24+wide),.72,.10];t.hand=[sign*.12,.57,.22];}
  }
  if(['bow','block','swingtwo','thrusttwo'].includes(state)){
   const stroke=Math.sin(phase*Math.PI),l=s.targets.l,r=s.targets.r;
   if(state==='bow'){l.elbow=[-.20,1.18,.25];l.hand=[-.12,1.27,.52];r.elbow=[.28,1.28,.10];r.hand=[.08,1.28,.43-.30*stroke];}
   if(state==='block'){l.elbow=[-.22,1.12,.20];l.hand=[-.08,1.27,.31];r.elbow=[.24,1.08,.08];r.hand=[.20,1.12,.30];}
   if(state==='swingtwo'){const y=1.08+.37*Math.cos(phase*Math.PI);r.hand=[.10,y,.35+.12*stroke];l.hand=[-.03,y-.07,.41+.12*stroke];l.elbow=[-.25,1.12,.18];r.elbow=[.27,1.10,.17];}
   if(state==='thrusttwo'){r.hand=[.10,1.04,.25+.28*stroke];l.hand=[-.06,1.10,.47+.28*stroke];l.elbow=[-.24,1.12,.26];r.elbow=[.27,1.08,.11];}
  }
  if(state==='book'){for(const[side,sign]of[['l',-1],['r',1]]){s.targets[side].elbow=[sign*.24,1.10,.16];s.targets[side].hand=[sign*.08,1.16,.31];}}
  const project=p=>rig.project(p,direction),items=[],source=[0,7,6,5,4].indexOf(direction);
  const angle=-direction*Math.PI/4,c=Math.cos(angle),sn=Math.sin(angle),viewZ=p=>-p[0]*sn+p[2]*c;
  const chestZ=viewZ(mean(s.targets.l.shoulder,s.targets.r.shoulder));
  function segment(row,a,b,nominal,extra=.12,mirror=false){
   const r=rects[row][source],A=project(a),B=project(b),dx=B[0]-A[0],dy=B[1]-A[1],length=Math.hypot(dx,dy),height=length*(1+extra),width=r[2]/r[3]*nominal*35.56;
   const z=row===0?100:row<=2?(viewZ(mean(a,b))<chestZ-.025?90:110)+row*.01:50+viewZ(mean(a,b));
   items.push({z,draw(){g.save();g.translate(A[0],A[1]);g.rotate(Math.atan2(dy,dx)-Math.PI/2);if(mirror)g.scale(-1,1);g.drawImage(parts,...r,-width/2,row===4?-length*extra:-height*extra/2,width,height);g.restore();}});
  }
  const sole=side=>{const foot=s.targets.feet[side],a=s.targets[side].ankle;return foot.active&&foot.support?foot.support.world:[a[0],a[1]-.07,a[2]+.035];};
  for(const side of ['l','r']){const t=s.targets[side],mirror=side==='l'&&(direction===0||direction===4);segment(3,t.hip,t.knee,.45,.22,mirror);segment(4,t.knee,sole(side),.49,.14,mirror);
   segment(1,t.shoulder,t.elbow,.35,.3,mirror);segment(2,t.elbow,t.hand,.39,.16,mirror);}
  const shoulder=mean(s.targets.l.shoulder,s.targets.r.shoulder),hip=mean(s.targets.l.hip,s.targets.r.hip);
  const torsoTop=[shoulder[0],shoulder[1]+.055,shoulder[2]],torsoBottom=[hip[0],hip[1]-.13,hip[2]];
  segment(0,torsoTop,torsoBottom,1.06,.04);
  if(rects.length===6){
   const r=rects[5][source];let cache=skirts.get(parts);if(!cache){cache=new Map();skirts.set(parts,cache);}let spans=cache.get(source);
   if(!spans){const c=document.createElement('canvas');c.width=r[2];c.height=r[3];const q=c.getContext('2d',{willReadFrequently:true});q.drawImage(parts,...r,0,0,r[2],r[3]);const pixels=q.getImageData(0,0,r[2],r[3]).data;spans=[];
    for(let row=0;row<18;row++){const y0=Math.floor(row*r[3]/18),y1=Math.ceil((row+1)*r[3]/18);let l=r[2],right=0;for(let y=y0;y<y1;y++)for(let x=0;x<r[2];x++)if(pixels[(y*r[2]+x)*4+3]>80){l=Math.min(l,x);right=Math.max(right,x);}spans.push([l,y0,Math.max(1,right-l+1),y1-y0]);}cache.set(source,spans);
   }
   const waist=project([hip[0],hip[1]+.04,hip[2]]),air=state==='walk'||state==='run'?Math.max(0,hip[1]-.935):0;
   const hem=project([hip[0]+(running?.025:0)*Math.sin(phase*Math.PI*2),state==='sit'?.12:.13+air,hip[2]-(running?.10:.025)]),profileWidth=profile.build===2?1.25:profile.build===1?1.07:1;
   items.push({z:95,draw(){for(let row=0;row<spans.length;row++){const t=row/spans.length,u=(row+1)/spans.length,[sx,sy,sw,sh]=spans[row],cx=waist[0]+(hem[0]-waist[0])*t,cy=waist[1]+(hem[1]-waist[1])*t,w=(16+8*t)*profileWidth,dh=Math.max(.3,(hem[1]-waist[1])*(u-t));g.drawImage(parts,r[0]+sx,r[1]+sy,sw,sh,cx-w/2,cy,w,dh+.25);}}});
  }
  items.sort((a,b)=>a.z-b.z);for(const p of items)p.draw();
  let head=project(s.targets.head.end),neck=project(s.targets.neck.end),hands=['l','r'].flatMap(k=>project(s.targets[k].hand.map((v,i)=>v*.85+s.targets[k].elbow[i]*.15))),fallAngle=0;
  if(state==='fall'){
   fallAngle=Math.max(0,Math.min(1,phase))*Math.PI/2;const copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;copy.getContext('2d').drawImage(canvas,0,0);g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,canvas.width,canvas.height);g.translate(128*scale,128*scale);g.rotate(fallAngle);g.drawImage(copy,-128*scale,-128*scale);g.setTransform(1,0,0,1,0,0);
   const pixels=g.getImageData(0,0,canvas.width,canvas.height).data;let bottom=0;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>30)bottom=y;const dy=128-bottom/scale;copy.getContext('2d').clearRect(0,0,copy.width,copy.height);copy.getContext('2d').drawImage(canvas,0,0);g.clearRect(0,0,canvas.width,canvas.height);g.drawImage(copy,0,dy*scale);
   const turn=p=>{const x=p[0]-128,y=p[1]-128;return[128+x*Math.cos(fallAngle)-y*Math.sin(fallAngle),128+x*Math.sin(fallAngle)+y*Math.cos(fallAngle)+dy];};head=turn(head);neck=turn(neck);hands=[...turn(hands.slice(0,2)),...turn(hands.slice(2,4))];
  }
  const feet=['l','r'].map(side=>{const p=sole(side),q=project(p),floor=project([p[0],0,p[2]]);return[q[0],q[1],floor[1],p[1]];});
  return{pose:s,head,neck,hands,feet,angle:fallAngle,origin:state==='sit'?[128,139]:[128,128]};
 }
 return{render};
})();
