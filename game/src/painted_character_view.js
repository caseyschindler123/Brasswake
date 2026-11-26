/* Semantic finish masks retain painted detail when dye/material colors change. */
const PaintedCharacterView = (() => {
  const skin=[[1.03,1.05,1.08],[1,1,1],[.84,.81,.77],[.65,.58,.51],[.49,.41,.35]];
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)),valid=hex=>typeof hex==='string'&&/^#[0-9a-f]{6}$/i.test(hex);
  const mix=(a,b,t)=>a.map((n,i)=>n+(b[i]-n)*t),hex=a=>'#'+a.map(n=>Math.round(n).toString(16).padStart(2,'0')).join('');
  const ramps=new Map();
  function ramp(palette){
    if(!palette||![palette.shadow,palette.mid,palette.light].every(valid))return null;
    const key=[palette.shadow,palette.mid,palette.light].join('|');if(ramps.has(key))return ramps.get(key);
    const stops=[0,48,128,205,255],colors=[[0,0,0],rgb(palette.shadow),rgb(palette.mid),rgb(palette.light),[255,255,255]],result=[];
    for(let l=0;l<256;l++){let i=0;while(i<3&&l>stops[i+1])i++;result.push(mix(colors[i],colors[i+1],(l-stops[i])/(stops[i+1]-stops[i])));}
    if(ramps.size>=32)ramps.delete(ramps.keys().next().value);ramps.set(key,result);return result;
  }
  function dye(color){if(!valid(color))return null;const c=rgb(color);return{shadow:hex(c.map(n=>n*.38)),mid:color,light:hex(mix(c,[255,255,255],.48))};}
  function tintPixels(pixels,masks,a){
    if(pixels.length!==masks.length)throw Error('Painted color/mask dimensions differ');
    const outfit=(a.combo-1)%5,mat=a.armorMaterial,cloth=ramp(a.cloth?dye(a.cloth):mat?.family==='cloth'?mat.palette:null),leather=ramp(mat?.family==='leather'?mat.palette:null),metal=ramp(mat?.family==='metal'?mat.palette:a.metal?dye(a.metal):null),gloves=ramp(a.handMaterial?.palette),boots=ramp(a.footMaterial?.palette),skinTone=skin[a.skin]||skin[1];
    for(let i=0;i<pixels.length;i+=4){if(!pixels[i+3]||masks[i+3]<64)continue;const id=Math.round(masks[i]/24),part=component(masks,i);if(part===11&&pixels[i]-pixels[i+2]>28&&pixels[i]>pixels[i+1])continue;if(id===4||id===8&&!gloves&&outfit<3){for(let c=0;c<3;c++)pixels[i+c]*=skinTone[c];continue;}const colors=id===1?cloth:id===2?leather:id===3?metal:id===8?gloves||(outfit===4?metal:null):id===9||id===6&&part===9?boots||(outfit===4?metal:null):null;if(!colors)continue;
      const light=Math.max(0,Math.min(255,Math.round(pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722))),mapped=colors[light];for(let c=0;c<3;c++)pixels[i+c]=pixels[i+c]*.08+mapped[c]*.92;
    }return pixels;
  }
  /* Camera yaw labels differ from clockwise screen-facing indices. */
  function sourceDirection(direction,art){return art?.sourceDirections?.indexOf(direction)??direction;}
  function state(a,row){let value=row===23?'sit':row===22?'block':row===20?'hit':row===19?'fall':row<0?'idle':row<5?'walk':row<10?'run':row<13?'swing':row<16?'thrust':'cast';
    if(['swing','thrust','cast'].includes(value)){if(a.wpn===27||a.wkind==='crossbow')value='crossbow';else if(a.wkind==='bow')value='bow';else if(a.wkind==='book')value='book';else if(value!=='cast'&&['long','staff'].includes(a.wkind))value+='two';}return value;
  }
  function slotSources(a,art=typeof ArtData!=='undefined'?ArtData.painted:null){
    const build=Number.isInteger(a.build)&&a.build>=0&&a.build<3?a.build:0,sex=Math.floor((a.combo-1)/5),profile=sex*3+build;
    if(art?.slots){const gear=a.gear||{},catalog=art.slots[profile]||{};return[['hands',8,'handMaterial'],['feet',9,'footMaterial'],['cloak',10,'cloakMaterial']].flatMap(([slot,id,key])=>{const bank=catalog[slot]?.[gear[slot]];return bank?[{id,slot,bank,material:a[key],outfit:(a.combo-1)%5}]:[];});}
    const base=sex*15+build*5,outfit=(a.combo-1)%5;return[['handMaterial',8],['footMaterial',9]].filter(([key])=>a[key]).map(([key,id])=>({id,index:base+(a[key].family==='metal'?4:2)+1,outfit:a[key].family==='metal'?4:2})).filter(s=>s.outfit!==outfit);
  }
  const component=(mask,i)=>Math.round((mask[i+2]||mask[i])/24);
  function fitCarry(bounds,grip,hand,angle,scale,preferredFlip){
    const c=Math.cos(angle),s=Math.sin(angle),candidates=[preferredFlip,!preferredFlip].map(flip=>{
      let fit=scale;for(const x of [bounds[0],bounds[2]])for(const y of [bounds[1],bounds[3]]){const dx=((x-grip[0])*c-(y-grip[1])*s)*(flip?-1:1),dy=(x-grip[0])*s+(y-grip[1])*c;fit=Math.min(fit,dx>0?(293-hand[0])/dx:dx<0?(hand[0]-7)/-dx:Infinity,dy>0?(443-hand[1])/dy:dy<0?(hand[1]-7)/-dy:Infinity);}return{flip,scale:Math.max(0,fit)};
    });return candidates[0].scale>=scale?candidates[0]:candidates.sort((a,b)=>b.scale-a.scale)[0];
  }
  return{tintPixels,state,sourceDirection,slotSources,component,fitCarry,dyePalette:dye};
})();
if(typeof module!=='undefined')module.exports=PaintedCharacterView;
