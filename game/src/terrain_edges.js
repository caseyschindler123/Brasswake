/* Terrain edging is decoration; collision and surface ownership stay unchanged. */
const TerrainEdges=(()=>{
  const natural=new Set([0,1,5]);
  const directions=[[0,-1],[1,0],[0,1],[-1,0]];
  // Nested coverage bands blend the real material textures with source-over
  // drawing. No filters or temporary composite canvases are needed on WebKit.
  const feather=[[-.32,.08],[-.16,.2173913043],[0,.375],[.16,.6],[.32,1]];
  function blend(g,trace,fill){
    for(const [threshold,alpha]of feather){
      const path=trace(threshold);if(!path)continue;
      g.save();g.globalAlpha*=alpha;g.clip(path);fill();g.restore();
    }
  }
  function kind(tile,neighbor){return tile===3&&natural.has(neighbor)?'stone':tile===2&&natural.has(neighbor)?'earth':null;}
  function noise(x,y,n){
    return ((Math.imul(x,73856093)^Math.imul(y,19349663)^Math.imul(n,83492791))>>>0)%997/997;
  }
  function frame(x,y,size,side){
    const [dx,dy]=directions[side];
    // Along-edge coordinates run east on horizontal sides and south on vertical sides.
    const originX=(x+(dx>0?1:0))*size,originY=(y+(dy>0?1:0))*size;
    return (along,inset)=>[originX+(dx?-dx*inset:along),originY+(dy?-dy*inset:along)];
  }
  function polygon(g,points,fill){
    g.fillStyle=fill;g.beginPath();g.moveTo(...points[0]);
    for(let i=1;i<points.length;i++)g.lineTo(...points[i]);
    g.closePath();g.fill();
  }
  function strip(g,point,from,to,outside,inside,fill){
    polygon(g,[point(from,outside),point(to,outside),point(to,inside),point(from,inside)],fill);
  }
  const corners=[
    {offset:[0,0],sides:[0,3],diagonal:[-1,-1]},
    {offset:[1,0],sides:[0,1],diagonal:[1,-1]},
    {offset:[1,1],sides:[2,1],diagonal:[1,1]},
    {offset:[0,1],sides:[2,3],diagonal:[-1,1]},
  ];
  const ends=[[3,1],[0,2],[3,1],[0,2]];
  function paving(g,x,y,size,neighbors,at,r){
    const edge=neighbors.map(tile=>kind(3,tile)==='stone'), depth=size*.148;
    const mortar='rgba(57,48,39,.67)', lip=r===8?'#ddd0b4a6':r===5?'#b88d72a6':'#c5b291a6';
    const stone=r===8?'#b1a488d9':r===5?'#7c6256df':r===7?'#969a96db':'#a08f73db';
    for (let side=0;side<4;side++) {
      if(!edge[side])continue;
      const [first,last]=ends[side],point=frame(x,y,size,side);
      const lo=edge[first]?depth:0,hi=edge[last]?size-depth:size;
      strip(g,point,lo,hi,-size*.017,depth+size*.025,mortar);
      strip(g,point,lo,hi,0,depth,stone);
      strip(g,point,lo,hi,(side===0||side===3)?0:depth*.79,(side===0||side===3)?depth*.21:depth,lip);
      for(const along of [size*.29+size*.08*noise(x,y,side+12),size*.64+size*.08*noise(x,y,side+21)])
        strip(g,point,along,along+size*.018,0,depth,mortar);
    }
    for (const {offset:[ox,oy],sides:[a,b],diagonal:[dx,dy]} of corners) {
      const convex=edge[a]&&edge[b], recess=neighbors[a]===3&&neighbors[b]===3&&natural.has(at(x+dx,y+dy));
      if(!convex&&!recess)continue;
      const point=(u,v)=>[(x+ox)*size-dx*u,(y+oy)*size-dy*v];
      if(convex){
        polygon(g,[[0,0],[depth,0],[depth,depth],[0,depth]].map(([u,v])=>point(u,v)),stone);
        polygon(g,[[0,0],[depth,0],[depth,depth*.17],[depth*.2,depth*.17],[depth*.2,depth],[0,depth]].map(([u,v])=>point(u,v)),lip);
        polygon(g,[[depth*.76,depth*.76],[depth,depth*.76],[depth,depth],[depth*.76,depth]].map(([u,v])=>point(u,v)),mortar);
      }else{
        polygon(g,[[0,0],[depth,0],[depth,depth*.45],[depth*.45,depth],[0,depth]].map(([u,v])=>point(u,v)),mortar);
        polygon(g,[[0,0],[depth*.91,0],[depth*.28,depth*.88],[0,depth*.91]].map(([u,v])=>point(u,v)),stone);
      }
    }
  }
  function wornEarth(g,x,y,size,neighbors,palette){
    g.fillStyle='rgba(229,194,132,.12)';g.fillRect(x*size,y*size,size,size);
    for(let side=0;side<4;side++){
      if(kind(2,neighbors[side])!=='earth')continue;
      const point=frame(x,y,size,side), points=[];
      const [dx,dy]=directions[side];
      for(let i=0;i<=7;i++){
        const along=size*i/7;
        const wx=(x+(dx>0?1:0))*7+(dx?0:i),wy=(y+(dy>0?1:0))*7+(dy?0:i);
        const reach=size*(.1+.16*noise(wx,wy,26));
        points.push([along,reach]);
      }
      const shoulder = (distance,fraction,color) => polygon(g,[point(0,distance),point(size,distance),
        ...points.slice().reverse().map(([along,reach])=>point(along,reach*fraction))],color);
      shoulder(-size*.042,1.42,'rgba(104,81,51,.18)');
      shoulder(-size*.06,.82,'rgba(79,74,47,.24)');
      g.save();g.globalAlpha=.33;
      shoulder(-size*.08,.55,palette?.G || '#727144');
      g.restore();
      for(let i=1;i<7;i++){
        const [along,reach]=points[i],n=noise(x*7+i,y,side+44);
        if(n<.34)continue;
        const fore=point(along,reach*.36),tip=point(along+size*.025,reach*.66+size*.025);
        g.lineWidth=Math.max(.5,size*.016);g.strokeStyle=n<.65?'rgba(70,70,38,.38)':'rgba(165,153,91,.43)';
        g.beginPath();g.moveTo(...fore);g.lineTo(...tip);g.stroke();
      }
    }
  }
  function paint(m,g,x0,y0,count,size){
    if(m.dungeon||m.hall||m.venue||m.ship)return;
    const at=(x,y)=>x>=0&&x<m.w&&y>=0&&y<m.h?m.t[y*m.w+x]:-1;
    for(let y=Math.max(0,y0-1);y<Math.min(m.h,y0+count+1);y++)for(let x=Math.max(0,x0-1);x<Math.min(m.w,x0+count+1);x++){
      const i=y*m.w+x,tile=m.t[i];if(tile!==2&&tile!==3)continue;
      if(m.venueRoofs?.has(i))continue;
      const neighbors=directions.map(([dx,dy])=>at(x+dx,y+dy));
      if(tile===3)paving(g,x,y,size,neighbors,at,m.reg[i]);
      else wornEarth(g,x,y,size,neighbors,m.pal?.[m.b?.[i]]);
    }
  }
  return {kind,paint,blend};
})();
if(typeof module!=='undefined')module.exports=TerrainEdges;
