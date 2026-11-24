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
  return {headAnchor,phase};
})();
if(typeof module!=='undefined')module.exports=ActorRig;
