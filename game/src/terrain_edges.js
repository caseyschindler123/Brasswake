/* Terrain edging is decoration; collision and surface ownership stay unchanged. */
const TerrainEdges=(()=>{
  const natural=new Set([0,1,5]);
  function kind(tile,neighbor){return tile===3&&natural.has(neighbor)?'stone':tile===2&&natural.has(neighbor)?'earth':null;}
  function paint(m,g,x0,y0,count,size){
    if(m.dungeon||m.hall||m.venue||m.ship)return;
    for(let y=Math.max(0,y0-1);y<Math.min(m.h,y0+count+1);y++)for(let x=Math.max(0,x0-1);x<Math.min(m.w,x0+count+1);x++){
      const tile=m.t[y*m.w+x];if(tile!==2&&tile!==3)continue;
      for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=m.w||ny>=m.h)continue;
        const type=kind(tile,m.t[ny*m.w+nx]);if(!type)continue;
        const bx=(x+(dx>0?1:0))*size,by=(y+(dy>0?1:0))*size;
        if(type==='stone'){
          const vertical=!!dx,inset=dx>0||dy>0?-4:0;
          g.fillStyle='rgba(33,31,24,.4)';g.fillRect(bx+(vertical?inset-1:0),by+(vertical?0:inset-1),vertical?6:size,vertical?size:6);
          for(let i=0;i<4;i++){
            const along=i*size/4+.8,len=size/4-1.2;
            g.fillStyle=m.reg[y*m.w+x]===8?'#c9bea1':'#a69d80';g.fillRect(bx+(vertical?inset:along),by+(vertical?along:inset),vertical?3.8:len,vertical?len:3.8);
            g.fillStyle='#e1d5b5';g.fillRect(bx+(vertical?inset:along),by+(vertical?along:inset),vertical?1:len,vertical?len:1);
          }
        }else{
          for(let i=0;i<7;i++){
            const seed=((x*73856093)^(y*19349663)^(i*83492791))>>>0;
            const t=(i+.2+(seed%57)/100)/7*size,spread=2+(seed%37)/10;
            const px=bx+(dx?dx*((seed%5)-2):t),py=by+(dy?dy*((seed%5)-2):t);
            g.fillStyle=i%3?'rgba(104,85,49,.3)':'rgba(171,150,101,.5)';g.beginPath();g.ellipse(px,py,dx?spread:spread*1.5,dy?spread:spread*1.5,0,0,Math.PI*2);g.fill();
          }
        }
      }
    }
  }
  return {kind,paint};
})();
if(typeof module!=='undefined')module.exports=TerrainEdges;
