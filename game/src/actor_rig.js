/* Renderer-owned calibration over immutable generated body coordinates. */
const ActorRig = (() => {
  const HEAD_HEIGHT=10, FOOT_Y=77, RUN_FLIGHT=[0,2,3.5,1,0,2,3.5,1];
  function headAnchor(body,combo,row,frame) {
    const anchors=body.combos[combo].a, raw=anchors[row*8+frame]||[0,0,0];
    if(row<5||row>9||!raw[2])return raw;
    // Keep hair and headgear the same size when changing gait. The run sheet's
    // width estimate varies with bent arms/face silhouettes, not skull size.
    const widths=anchors.slice((row-5)*8,(row-4)*8).map(a=>a[2]).filter(Boolean).sort((a,b)=>a-b);
    return [raw[0],raw[1],widths[Math.floor(widths.length/2)]||raw[2]];
  }
  const baked=typeof HumanGaits!=='undefined'?HumanGaits:require('./human_gaits');
  const GAITS = Object.freeze([
    Object.freeze({...baked.walk,referenceSpeed:2.2}),
    Object.freeze({...baked.run,referenceSpeed:4.6}),
  ]);
  const gait = running => GAITS[running ? 1 : 0];
  const speed = running => gait(running).stride*gait(running).cadence/120;
  const paceScale = running => speed(running)/gait(running).referenceSpeed;
  function contacts(from,to,running) {
    if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from)return 0;
    const stride=gait(running).stride;
    return gait(running).contacts.reduce((n,offset)=>n+Math.floor(Math.max(0,to)/stride-offset)-Math.floor(Math.max(0,from)/stride-offset),0);
  }
  function phase(distance,running,count=baked.frames) {
    const stride=gait(running).stride;
    return Math.floor(Math.max(0,distance)/stride*count)%count;
  }
  const distance=actor=>(actor.wd||0)+(actor.gaitOffset||0);
  function advance(actor,travel,running){
    if(!(travel>0)||!Number.isFinite(travel))return 0;
    const actual=actor.wd||0;
    if(actor.gaitRun!=null&&actor.gaitRun!==running)actor.gaitOffset=distance(actor)/gait(actor.gaitRun).stride*gait(running).stride-actual;
    const before=distance(actor);actor.wd=actual+travel;actor.gaitRun=!!running;if(actor.npcLook)actor.npcRun=!!running;
    return contacts(before,distance(actor),running);
  }
  function headProfile(pixels,width,height){
    let top=0;
    const span=y=>{let left=width,right=-1;for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]>160){left=Math.min(left,x);right=x;}return {left,right};};
    for(;top<height-HEAD_HEIGHT;top++){const s=span(top);if(s.right-s.left>=2)break;}
    const bands=[];
    for(let y=top+2;y<Math.min(height,top+8);y++){const s=span(y);if(s.right>=s.left)bands.push(s);}
    const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)]||0;
    const left=median(bands.map(s=>s.left)),right=median(bands.map(s=>s.right));
    let foot=height-1;for(;foot>top;foot--){const s=span(foot);if(s.right>=s.left)break;}
    return {top,center:(left+right)/2,width:right-left+1,foot,left:left-2,right:right+2};
  }
  function pose(body,combo,row,frame,profiles){
    const raw=body.combos[combo].a[row*8+frame]||[0,0,0],running=row>=5&&row<=9;
    if(!running){
      const source=row<5&&profiles&&profiles[row*8+frame],reference=source&&profiles[row*8+2];
      return {anchor:source?[source.top,source.center,reference.width]:raw,lift:0};
    }
    const ref=profiles&&profiles[(row-5)*8+2],source=profiles&&profiles[row*8+frame];
    const reference=ref?[ref.top,ref.center,ref.width]:body.combos[combo].a[(row-5)*8+2];
    // The original packer pins the lowest foot in every image to y=77.
    // Restore two contact/flight cycles while keeping all equipment on the body.
    const lift=RUN_FLIGHT[frame%8]+(source&&Number.isFinite(source.foot)?source.foot-FOOT_Y:0);
    return {anchor:[source?source.top:raw[0],source?source.center:raw[1],reference[2]],lift,reference,source,
      headHeight:HEAD_HEIGHT,running:true};
  }
  function normalizeLook(value,fallback){
    const look=value&&typeof value==='object'&&!Array.isArray(value)?value:{...fallback};
    const limits={body:[0,1],skin:[0,4],hair:[-1,11],hc:[0,6],beard:[-1,5],hat:[-1,5],wear:[0,1]};
    for(const [key,[min,max]]of Object.entries(limits))if(!Number.isInteger(look[key])||look[key]<min||look[key]>max)look[key]=fallback[key];
    if(!(typeof look.dye==='string'||Number.isInteger(look.dye)&&look.dye>=0&&look.dye<=8))look.dye=fallback.dye;
    return look;
  }
  return {headAnchor,headProfile,pose,phase,gait,speed,paceScale,contacts,distance,advance,normalizeLook};
})();
if(typeof module!=='undefined')module.exports=ActorRig;
