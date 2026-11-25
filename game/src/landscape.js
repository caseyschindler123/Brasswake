/* Deterministic presentation ecology. This module never writes physical world data. */
const Landscape = (() => {
  const CHUNK = 16, MAX_CHUNK = 110;
  const families = [null, 'Coastal oak / silver birch', 'Willow / black alder',
    'Holm oak / cypress', 'Oak / orchard apple', 'Ash / mountain rowan',
    'Giant mushroom / pale birch', 'Scots pine / mountain spruce', 'Beech / lime'];
  function hash(x,y,s=0) {
    let n=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,2147483647);
    n=Math.imul(n^n>>>13,1274126177);return ((n^n>>>16)>>>0)/4294967296;
  }
  function field(x,y,s) {
    const a=Math.floor(x),b=Math.floor(y),u=x-a,v=y-b;
    const f=u*u*(3-2*u),g=v*v*(3-2*v);
    return (hash(a,b,s)*(1-f)+hash(a+1,b,s)*f)*(1-g)+(hash(a,b+1,s)*(1-f)+hash(a+1,b+1,s)*f)*g;
  }
  function tree(x,y,r=1,biome=r) {
    const grove=field(x/11,y/11,271),species=hash(x,y,272)<(r===4?.28:r===8?.55:.42)?1:0;
    const age=hash(x,y,273),stage=age<.13?0:age<.37?1:age<.91?2:3;
    return {x,y,r,species,stage,key:'tree'+(species*4+stage),
      scale:(.9+hash(x,y,274)*.2)*(r===6?.87:1),width:.91+hash(x,y,275)*.18,
      flip:hash(x,y,276)<.5,phase:hash(x,y,277)*Math.PI*2,
      grove,biome,bird:stage>1&&r!==6&&hash(x,y,278)<.045};
  }
  const family=(region,biome)=>biome>=1&&biome<=8?biome:biome===9?3:biome===10?7:region||1;
  function build(m) {
    const chunks=new Map(),trees=new Map(),trails=[],orchards=[],stats={trees:0,details:0,ground:0,gardens:0,regions:Array(9).fill(0)};
    const add=o=>{const key=Math.floor(o.x/CHUNK)+','+Math.floor(o.y/CHUNK),a=chunks.get(key)||[];
      if(a.length>=MAX_CHUNK)return false;a.push(o);chunks.set(key,a);stats.details++;stats.regions[o.r]++;if(o.ground)stats.ground++;if(o.tended)stats.gardens++;return true;};
    const inside=(x,y)=>x>1&&y>1&&x<m.w-2&&y<m.h-2;
    const free=(x,y)=>{if(!inside(x,y))return false;const i=y*m.w+x;
      return m.t[i]<2&&!m.keep[i]&&!m.solid[i]&&!m.o[i];};
    const gardenFree=(x,y)=>{if(!inside(x,y))return false;const i=y*m.w+x;
      return m.t[i]<2&&!m.solid[i]&&!m.o[i]&&!m.doorApproaches?.has(i)
        &&!(m.props||[]).some(p=>Math.hypot(p.x-x,p.y-y)<1.1)
        &&!(m.fields||[]).some(([a,b,w,h])=>x>=a&&x<a+w&&y>=b&&y<b+h);};
    for(let y=2;y<m.h-2;y++)for(let x=2;x<m.w-2;x++){
      const i=y*m.w+x,b=m.b[i],r=family(m.reg[i],b);
      if(m.o[i]>0&&m.o[i]<4){const t=tree(x,y,r,b);trees.set(i,t);stats.trees++;}
      if(!free(x,y))continue;
      const wet=[-m.w,m.w,-1,1].some(d=>m.t[i+d]===4),forest=field(x/11,y/11,271),u=hash(x,y,281);
      let nearTree=false;
      for(let dy=-2;dy<=2&&!nearTree;dy++)for(let dx=-2;dx<=2;dx++){
        const v=m.o[(y+dy)*m.w+x+dx];if(v>0&&v<4){nearTree=true;break;}}
      const threshold=wet?.34:nearTree?(forest>.48?.42:.2):forest>.62?.16:.028;
      if(u>threshold)continue;
      const a=hash(x,y,282),ground=nearTree&&a<.43;
      let slot=ground?(a<.29?4:5):wet?(b===2||r===2?2:3):nearTree?(a<.57?2:a<.72?0:a<.87?1:a<.95?6:7):(a<.4?3:a<.7?0:1);
      if(r===8&&slot===0)slot=1; // Clipped box belongs to tended gardens.
      add({x:x+(hash(x,y,283)-.5)*.48,y:y+(hash(x,y,284)-.5)*.42,r,key:'detail'+slot,
        ground,scale:ground?.9+hash(x,y,285)*.55:.62+hash(x,y,285)*.48,
        flip:hash(x,y,286)<.5,phase:hash(x,y,287)*6.283,slot,anchor:i});
    }
    // Tended clusters sit outside physical homestead footprints, away from roads and thresholds.
    const gardens=[...(m.sites||[]).filter(s=>s.kind==='home'),...(m.props||[]).filter(p=>/^tree[0-2]$/.test(p.kind)).map(p=>({...p,planted:true}))];
    for(const st of gardens)for(const [dx,dy]of st.planted?[[-1,-1],[1,-1]]:[[-4,0],[-4,2],[5,3],[6,3],[5,5]]){
      const x=Math.round(st.x+dx),y=Math.round(st.y+dy);if(!gardenFree(x,y))continue;
      add({x,y,r:st.r||1,key:'detail'+(dx<0?0:3),slot:dx<0?0:3,ground:false,tended:true,
        scale:.7,flip:dx<0,phase:hash(x,y,288)*6.283,anchor:y*m.w+x});
    }
    // Short worn approaches follow actual open cells to an existing road. No
    // shortcut is painted across a wall, water, trunk or an unreachable gap.
    for(const st of m.sites||[])if(st.kind==='home'||st.kind==='camp'){
      const sx=Math.round(st.x),sy=Math.round(st.y+1),start=sy*m.w+sx;
      if(!inside(sx,sy)||m.solid[start])continue;
      const parents=new Map([[start,-1]]),queue=[start];let end=-1;
      for(let head=0;head<queue.length&&head<900;head++){
        const i=queue[head],x=i%m.w,y=Math.floor(i/m.w);
        if(m.t[i]===2){end=i;break;}
        for(const [dx,dy]of [[0,1],[1,0],[-1,0],[0,-1]]){
          const nx=x+dx,ny=y+dy,j=ny*m.w+nx;
          if(!inside(nx,ny)||Math.hypot(nx-sx,ny-sy)>18||parents.has(j)||m.solid[j]||m.t[j]>2)continue;
          parents.set(j,i);queue.push(j);
        }
      }
      if(end>=0){const points=[];for(let i=end;i!==-1;i=parents.get(i))points.push([i%m.w+.5,Math.floor(i/m.w)+.75]);
        if(points.length>2&&points.length<=32)trails.push({r:st.r,points});}
    }
    // Tended fruit rows reuse real, already-blocked trunks south of suitable
    // farms. No tree, route or saved plot is physically moved or introduced.
    const orchardRoots=[];
    for(const st of m.sites||[])if(st.kind==='home'&&['farmer','beekeeper'].includes(st.role)&&[1,3,4,8].includes(st.r)){
      const rows=new Map();
      for(const [i,t]of trees)if(!t.orchard&&[1,3,4,8].includes(t.biome)&&Math.abs(t.x-st.x)<=17&&t.y>=st.y+6&&t.y<=st.y+23
        &&(!m.seen||[-m.w,m.w,-1,1].some(d=>m.seen[i+d]&&!m.solid[i+d]))){
        const row=rows.get(t.y)||[];row.push([i,t]);rows.set(t.y,row);
      }
      const ranked=[...rows.values()].filter(row=>row.length>=3).sort((a,b)=>b.length-a.length||a[0][1].y-b[0][1].y);
      if(!ranked.length)continue;
      const first=ranked[0],next=ranked.find(row=>Math.abs(row[0][1].y-first[0][1].y)>=2&&Math.abs(row[0][1].y-first[0][1].y)<=6);
      const selected=[first,...(next?[next]:[])].map(row=>row.sort((a,b)=>a[1].x-b[1].x).slice(0,6));
      const orchard={id:st.id||'orchard-'+st.x+'-'+st.y,r:st.r,rows:[]};
      for(const row of selected){const points=[];
        for(const [i,t]of row){
          const stage=hash(t.x,t.y,291)<.15?1:hash(t.x,t.y,292)<.13?3:2;
          Object.assign(t,{r:4,species:1,stage,key:'tree'+(4+stage),scale:.76+hash(t.x,t.y,293)*.12,orchard:orchard.id});
          points.push([t.x,t.y]);orchardRoots.push([t.x,t.y]);
        }orchard.rows.push(points);
      }orchards.push(orchard);
    }
    const orchardClear=new Set();for(const [x,y]of orchardRoots)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)orchardClear.add((y+dy)*m.w+x+dx);
    const trailCells=new Set(trails.flatMap(t=>t.points.map(([x,y])=>Math.floor(y)*m.w+Math.floor(x))));
    for(const [key,items]of chunks){
      chunks.set(key,items.filter(o=>{
        const tendedEdge=!o.ground&&orchardClear.has(o.anchor);
        if(!tendedEdge&&(o.ground||!trailCells.has(o.anchor)))return true;
        stats.details--;stats.regions[o.r]--;if(o.tended)stats.gardens--;return false;
      }));
    }
    return {chunks,trees,trails,orchards,stats};
  }
  function visible(data,x0,y0,x1,y1) {
    const out=[];if(!data)return out;
    for(let y=Math.floor(y0/CHUNK);y<=Math.floor(y1/CHUNK);y++)for(let x=Math.floor(x0/CHUNK);x<=Math.floor(x1/CHUNK);x++)
      for(const o of data.chunks.get(x+','+y)||[])if(o.x>=x0&&o.x<=x1&&o.y>=y0&&o.y<=y1)out.push(o);
    return out;
  }
  function wind(o,seconds,reduced=false) {
    if(reduced||o.ground||o.slot>=4)return 0;
    // Adjacent crowns/reeds share a wind front with small individual differences.
    return Math.sin(seconds*.75-o.x*.055-o.y*.035)*.005+Math.sin(seconds*1.3+o.phase)*.002;
  }
  function alpha(bounds,actors) {
    return actors.some(a=>a.x>bounds.x+2&&a.x<bounds.x+bounds.w-2&&a.y>bounds.y+2&&a.y<bounds.y+bounds.h-6&&a.foot<bounds.foot-3)?.16:1;
  }
  return {families,CHUNK,MAX_CHUNK,hash,family,tree,build,visible,wind,alpha};
})();
if(typeof module!=='undefined')module.exports=Landscape;
