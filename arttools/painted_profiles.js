/* Offline body cuts. Head, hands and soles retain their shared attachment sizes. */
const PaintedProfiles = (() => {
  const bump=(y,c,r)=>Math.max(0,1-Math.abs(y-c)/r)**2;
  function make(base,sex=0,build=0){
    const shape=([x,y,z])=>{
      if(y>1.53||y<.16)return[x,y,z];
      const chest=bump(y,1.36,.25),waist=bump(y,1.08,.27),hips=bump(y,.92,.23);
      const w=1+(sex?-.05*chest+.09*hips-.04*waist:.05*chest)+
        (build===1?.17*chest+.07*hips:build===2?.22*chest+.43*waist+.23*hips:0);
      const d=1+(sex?.025*chest+.07*hips:0)+(build===1?.12*chest:build===2?.20*chest+.55*waist+.18*hips:0);
      return[x*w,y,z*d+(build===2?.035*waist:0)];
    };
    const vertices=[];for(let i=0;i<base.vertices.length;i+=3)vertices.push(...shape(base.vertices.slice(i,i+3)));
    const arms={};for(const side of ['L','R']){const shoulder=base.bones.find(b=>b.name==='upperArm'+side).start;arms[side]=shape(shoulder).map((v,i)=>v-shoulder[i]);}
    // Broader shoulders translate the whole arm. Applying waist expansion to
    // each joint independently lengthened heavy forearms and hands.
    return{...base,vertices,bones:base.bones.map(b=>{const side=/L|\.l$/.test(b.name)?'L':'R',delta=arms[side],arm=/^(upperArm|foreArm|hand|finger)/.test(b.name),point=p=>arm?p.map((v,i)=>v+delta[i]):shape(p);return{...b,start:point(b.start),end:point(b.end)};})};
  }
  return{make};
})();
if(typeof module!=='undefined')module.exports=PaintedProfiles;
