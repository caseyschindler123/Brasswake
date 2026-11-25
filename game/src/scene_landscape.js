  /* Painted vegetation uses its own stable presentation data; collision stays authoritative. */
  const LANDSCAPE_IMAGES=new Map();
  const landscapeReduced=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
  function landscapePiece(r,key) {
    if(typeof LandscapeArt==='undefined')return null;
    const name=LandscapeArt.files[r-1],rc=LandscapeArt.at[r]&&LandscapeArt.at[r][key];
    if(!name||!rc)return null;if(!IMG[name])img(name);if(!have(name))return null;
    const id=r+'/'+key;if(LANDSCAPE_IMAGES.has(id))return LANDSCAPE_IMAGES.get(id);
    const c=cut(name,...rc),s={c,ax:lw(c)/2,ay:lh(c)-1};LANDSCAPE_IMAGES.set(id,s);return s;
  }
  function landscapeEntry(o,foot,actors,now) {
    const s=landscapePiece(o.r,o.key);if(!s)return null;
    const scale=o.scale||1,w=lw(s.c)*scale*(o.width||1),h=lh(s.c)*scale;
    const x=o.x*T+8-w/2,y=foot-h+1;
    const al=o.key.startsWith('tree')?Landscape.alpha({x,y,w,h,foot},actors):1;
    const item=[foot,s.c,x,y,o.flip,scale,0,al,0,null,{...o,w,h}];
    return item;
  }
  function landscapeActors() {
    const actors=[{x:P.fx*T+8,y:P.fy*T-3,foot:P.fy*T+15}];
    for(const e of map.ents)if(!e.hidden&&!e.dead&&e.fx!=null&&Math.hypot(e.fx-P.fx,e.fy-P.fy)<7&&['mon','npc','folk','rival','guard','boss','banker','guide','shopkeep','healer','stallkeep','specialist','home','poi','stairs','page','camp','cache','chest','node','ferry','landmark','cartographer'].includes(e.kind))
      actors.push({x:e.fx*T+8,y:e.fy*T-3,foot:e.fy*T+15});
    for(const b of map.blds||[])if(b.plan)for(const d of b.plan.doors){
      const x=b.x+d.x,y=b.y+d.y;if(Math.hypot(x-P.fx,y-P.fy)<7)actors.push({x:x*T+8,y:y*T-6,foot:y*T+15});
    }
    return actors;
  }
  function landscapeLayers(list,now,x0,y0,x1,y1,actors) {
    if(map!==world||!map.landscape)return;
    for(const o of Landscape.visible(map.landscape,x0-4,y0-1,x1+4,y1+8)){
      if(o.ground||map.solid[o.anchor]||(!o.tended&&map.keep[o.anchor])||map.o[o.anchor]||map.occ.has(o.anchor))continue;
      const item=landscapeEntry(o,o.y*T+15,actors,now);if(item)list.push(item);
    }
  }
  function landscapeGround(g,ox0,oy0,x0,y0,x1,y1) {
    if(map!==world||!map.landscape)return;
    const soil=gpat('trail');
    if(soil)for(const trail of map.landscape.trails){
      const points=trail.points;if(!points.some(([x,y])=>x>=x0-2&&x<=x1+2&&y>=y0-2&&y<=y1+2))continue;
      g.save();g.translate(-ox0,-oy0);g.scale(1/K,1/K);g.strokeStyle=soil;g.lineCap=g.lineJoin='round';
      for(const [width,alpha]of [[11,.045],[7,.075],[3.5,.12]]){
        g.globalAlpha=alpha;g.lineWidth=width*K;g.beginPath();g.moveTo(points[0][0]*T*K,points[0][1]*T*K);
        for(let i=1;i<points.length;i++){
          const p=points[i],next=points[i+1]||p;g.quadraticCurveTo(p[0]*T*K,p[1]*T*K,(p[0]+next[0])*T*K/2,(p[1]+next[1])*T*K/2);
        }g.stroke();
      }g.restore();
    }
    // Leaf/needle fall belongs to the supporting tree, with loose irregular edges.
    for(let y=Math.max(0,y0-2);y<=Math.min(map.h-1,y1+2);y++)for(let x=Math.max(0,x0-2);x<=Math.min(map.w-1,x1+2);x++){
      const i=y*map.w+x,o=map.landscape.trees.get(i);if(!o||map.o[i]<1||map.o[i]>3)continue;
      const s=landscapePiece(o.r,'detail4');if(!s)continue;
      const w=lw(s.c)*(.8+o.stage*.13),h=lh(s.c)*1.4;
      g.save();g.globalAlpha=.55;g.drawImage(s.c,x*T+8-w/2-ox0,y*T+17-h/2-oy0,w,h);g.restore();
    }
    for(const o of Landscape.visible(map.landscape,x0-2,y0-2,x1+2,y1+2)){
      if(!o.ground||map.solid[o.anchor]||map.keep[o.anchor]||map.o[o.anchor])continue;
      const s=landscapePiece(o.r,o.key);if(!s)continue;const w=lw(s.c)*o.scale,h=lh(s.c)*o.scale;
      const x=o.x*T+8-w/2-ox0,y=o.y*T+15-h-oy0;
      g.save();g.globalAlpha=o.slot===4?.7:.87;
      if(o.flip){g.translate(x+w,y);g.scale(-1,1);g.drawImage(s.c,0,0,w,h);}else g.drawImage(s.c,x,y,w,h);g.restore();
    }
  }
  function landscapePaint(g,im,x,y,flip,al,plant,now) {
    const {w,h}=plant,shear=Landscape.wind(plant,now/1000,landscapeReduced&&landscapeReduced.matches);
    g.save();g.globalAlpha=al==null?1:al;g.translate(x,y);
    g.transform(1,0,shear,1,-shear*h,0);
    if(flip){g.translate(w,0);g.scale(-1,1);}g.drawImage(im,0,0,w,h);g.restore();g.globalAlpha=1;
  }
  function landscapeBird(list,o,foot,now) {
    if(!o.bird||landscapeReduced&&landscapeReduced.matches)return;
    const t=(now/1000+o.phase*9)%33;if(t>14)return;
    const im=artFx2(3,t<10?2:Math.floor(now/115)%4);if(!im)return;
    const s=landscapePiece(o.r,o.key);if(!s)return;
    const flight=Math.max(0,t-10),direction=o.flip?-1:1;
    const x=o.x*T+8+direction*(7+flight*19),y=foot-lh(s.c)*o.scale*.77-flight*7;
    list.push([foot+.1,im,x-3,y-3,direction<0,.17,0,t>13?14-t:1]);
  }
