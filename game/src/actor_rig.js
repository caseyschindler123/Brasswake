/* Renderer-owned calibration over immutable generated body coordinates. */
const ActorRig = (() => {
  function headAnchor(body,combo,row,frame) {
    const anchors=body.combos[combo].a, raw=anchors[row*8+frame]||[0,0,0];
    if(row<5||row>9||!raw[2])return raw;
    // Keep hair and headgear the same size when changing gait. The run sheet's
    // width estimate varies with bent arms/face silhouettes, not skull size.
    const widths=anchors.slice((row-5)*8,(row-4)*8).map(a=>a[2]).filter(Boolean).sort((a,b)=>a-b);
    return [raw[0],raw[1],widths[Math.floor(widths.length/2)]||raw[2]];
  }
  function phase(distance,running,count=8) {
    const stride=running?2.25:1.8;
    return Math.floor(Math.max(0,distance)/stride*count)%count;
  }
  function normalizeLook(value,fallback){
    const look=value&&typeof value==='object'&&!Array.isArray(value)?value:{...fallback};
    const limits={body:[0,1],skin:[0,4],hair:[-1,11],hc:[0,6],beard:[-1,5],hat:[-1,5],wear:[0,1]};
    for(const [key,[min,max]]of Object.entries(limits))if(!Number.isInteger(look[key])||look[key]<min||look[key]>max)look[key]=fallback[key];
    if(!(typeof look.dye==='string'||Number.isInteger(look.dye)&&look.dye>=0&&look.dye<=8))look.dye=fallback.dye;
    return look;
  }
  return {headAnchor,phase,normalizeLook};
})();
if(typeof module!=='undefined')module.exports=ActorRig;
