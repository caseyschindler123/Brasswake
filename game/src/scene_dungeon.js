  /* Dungeon maps share Scene's movement/rendering boundary and use editable data. */
  function dungeonArt(kind, r) {
    if (typeof DungeonArt === 'undefined') return null;
    const rc = DungeonArt.props[r + '-' + kind];
    const name=kind.indexOf('gate')===0&&DungeonArt.gateImage?DungeonArt.gateImage:DungeonArt.image;
    if (!rc) return null; img(name);
    return artRect(name, rc);
  }
  function dungeonMob(k) {
    if (typeof DungeonArt === 'undefined' || !DungeonArt.mobs[k]) return null;
    const name = DungeonArt.creatures, q = DungeonArt.mobs[k]; img(name);
    if (!have(name)) return null;
    const c = cut(name, q[0], q[1], q[2], q[3]);
    return { f:[c],b:[c],s:[c],art:1,left:1,bob:1,msc:Dungeons.species[k].scale || 1 };
  }
  function dungeonGate(e,r) {
    const cells=e.cells||[[e.x,e.y]],xs=cells.map(c=>c[0]),ys=cells.map(c=>c[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),side=maxY>minY;
    const original=dungeonArt(side?'gate-side':'gate',r);if(!original)return null;
    const height=side?(maxY-minY+1)*TS+24:Math.round(original.c.height*(maxX-minX+1)*TS/original.c.width),width=side?Math.round(original.c.width*height/original.c.height):(maxX-minX+1)*TS;
    const c=mk(width,height);c.hr=1;c.getContext('2d').drawImage(original.c,0,0,width,height);
    return {c,ax:side?lw(c)/2:(e.x-minX+.5)*T,ay:lh(c)-1-(side?(maxY-e.y)*T:0)};
  }
  function genDungeon(r, options) {
    const opt = options && !Array.isArray(options) ? options : {}, f=opt.floor||0, layout=Dungeons.build(r,f), theme=layout.theme;
    const w=layout.w,h=layout.h,p=opt.progress||{seen:{},gates:{},claimed:{},kills:{}}, b=Object.assign({},BIO[r],{dw:theme.wall,df:theme.floor,g:theme.floor,G:theme.alternate,amb:.17,fx:r===5?'ember':r===7?'snow':'mote',liquid:r===5?'lava':'none'});
    const m={r,f,w,h,t:new Uint8Array(w*h),dt:layout.tiles,b:new Uint8Array(w*h).fill(r),reg:new Uint8Array(w*h).fill(r),solid:new Uint8Array(w*h),o:new Uint8Array(w*h),keep:new Uint8Array(w*h),blds:[],props:[],ents:[],lights:[],pal:[],dungeon:true,dungeonFloor:true,tutorial:!!opt.tutorial,occ:new Map(),chunks:new Map(),terr:[],layout,progress:p,discovered:new Uint8Array(w*h),entry:layout.entry,mini:mk(w,h),spawnDefs:[]};
    m.pal[r]=b;
    for(let i=0;i<w*h;i++){m.t[i]=[8,7,4,4,6][m.dt[i]];m.solid[i]=m.dt[i]===0||m.dt[i]===2||m.dt[i]===3?1:0;}
    for(const i of p.seen && Array.isArray(p.seen[f]) ? p.seen[f] : []) if(Number.isInteger(i)&&i>=0&&i<w*h)m.discovered[i]=1;
    if(typeof DungeonArt!=='undefined'){img(DungeonArt.image);img(DungeonArt.creatures);if(DungeonArt.gateImage)img(DungeonArt.gateImage);}
    for(const source of layout.entities){
      const e=Object.assign({r,floor:f},source);
      if(e.kind==='dmon'||e.kind==='keeper'){
        if(e.tutorial&&!opt.tutorial)continue;
        m.spawnDefs.push(e);
        if(!DungeonProgress.alive(p,e,opt.now||Date.now())){
          const body=p.bodies&&p.bodies[e.id];if(body&&body.until>Date.now()){
            const sp=Dungeons.species[e.species]||{},art=sp.art||e.species;
            addEnt(m,Object.assign({},e,body,{kind:'corpse',name:e.name+', dead',dead:1,solid:0,decay:(body.until-Date.now())/1000,spr:dungeonMob(art)||monSprite(art),inst:{dungeon:1,tpl:sp.tpl,art}}));
          }
          continue;
        }
        dungeonSpawn(m,e,opt.tutorial);
      }else{
        if(e.tutorial&&!opt.tutorial)continue;
        if(e.tutorial)e.kind='chest';
        e.sub=e.kind==='dtravel'?'Stairs':e.kind==='dcache'?'Treasure':e.kind==='dlever'?'Open a shortcut':e.kind==='dsecret'?'Investigate':e.kind==='dlore'?'Read':e.kind==='dgate'?'Passage':e.kind==='ltable'?'A lost table':'Vault';
        e.ok=e.kind==='chest'||e.kind==='dcache'?(p.claimed[e.tutorial?'tutorial':e.kind==='chest'?'vault':e.id]?'chestopen':'chest'):e.kind==='dtravel'?'exit':e.kind==='ltable'?(host.haveTable(r)?'pi_pedestal0':'pi_pedestal'):null;
        if(e.kind==='dlever')e.obj=dungeonArt('control',r);
        if(e.kind==='dgate')e.obj=dungeonGate(e,r);
        if(e.kind==='dsecret')e.obj=dungeonArt('landmark',r);
        if(e.kind==='dlore')e.obj=dungeonArt('lore',r);
        addEnt(m,e);
      }
    }
    for(const R of layout.rooms){
      for(const x of [R.x+1,R.x+R.w-2]){m.props.push({x,y:R.y-1,kind:'torch',r,hang:1});m.lights.push({x:x+.5,y:R.y-.2,r:42,c:r===6?3:2,fl:1});}
      m.props.push({x:R.x+R.w-2,y:R.y+1,kind:'dn_decoration',r});
      if((R.cx+R.cy)%3===0)m.props.push({x:R.x+1,y:R.y+1,kind:'dn_landmark',r});
    }
    dungeonApply(m,p);return m;
  }
  function dungeonSpawn(m,source,tutorial) {
    const sp=Dungeons.species[source.species]||{},art=sp.art||source.species||'k'+m.r,keeper=source.kind==='keeper';
    const e=Object.assign({},source,{r:m.r,floor:m.f,kind:keeper?'keeper':source.tutorial&&tutorial?'guard':'mon',sub:keeper?'Vault keeper':source.lieutenant?'Floor lieutenant':sp.description||sp.desc||'Dungeon creature',inst:{dungeon:1,tpl:sp.tpl||'b'+m.r+'01',art,role:source.role||sp.role||'skirmisher',elite:!!source.lieutenant},spr:dungeonMob(art)||monSprite(art),home:[source.x,source.y],range:source.lieutenant||keeper?2:4,wander:keeper||source.tutorial?0:1,t:2+Math.random()*4,agg:!keeper&&!source.tutorial&&!source.lieutenant&&(source.role||sp.role)==='skirmisher'?1:0,dir:'l'});
    if(m.occ.has(e.y*m.w+e.x))return false;
    addEnt(m,e);return true;
  }
  function dungeonApply(m,p) {
    if(!m.dungeonFloor)return;
    m.progress=p;
    for(const e of m.ents){
      if(e.kind==='dgate'||e.kind==='dsecret'){
        const opened=!!p.gates[e.target||e.gate||e.id];
        for(const [x,y]of e.cells||[])m.solid[y*m.w+x]=opened?0:1;
        e.hidden=opened;
        if(opened){const i=e.y*m.w+e.x;if(m.occ.get(i)===e)m.occ.delete(i);e.solid=0;e.sub='Open passage';}
      }
      if(e.kind==='dcache'||e.kind==='chest'){const id=e.tutorial?'tutorial':e.kind==='chest'?'vault':e.id;if(p.claimed[id]){e.ok='chestopen';e.obj=spr(e.ok,m.r);e.sub='Collected today';}}
      if(e.kind==='ltable'&&host.haveTable(m.r)){e.ok='pi_pedestal0';e.obj=spr(e.ok,m.r);}
    }
    dungeonReveal(m,m.entry[0],m.entry[1]);
  }
  function dungeonReveal(m,x,y) {
    if(!m.dungeonFloor)return;const g=m.mini.getContext('2d');
    for(let yy=Math.max(0,y-8);yy<=Math.min(m.h-1,y+8);yy++)for(let xx=Math.max(0,x-8);xx<=Math.min(m.w-1,x+8);xx++){
      const i=yy*m.w+xx;if(Math.hypot(xx-x,yy-y)>8)continue;m.discovered[i]=1;
    }
    g.fillStyle='#090d13';g.fillRect(0,0,m.w,m.h);
    for(let i=0;i<m.discovered.length;i++)if(m.discovered[i]){g.fillStyle=m.solid[i]?'#29333c':m.dt[i]===4?'#ae9161':'#a5aaa5';g.fillRect(i%m.w,Math.floor(i/m.w),1,1);}
    for(const e of m.ents)if(m.discovered[e.y*m.w+e.x]&&['dtravel','chest','dcache','keeper','dlever','dsecret'].includes(e.kind)){g.fillStyle=e.kind==='dtravel'?'#88d3ed':e.kind==='keeper'?'#f38d75':'#e3b656';g.fillRect(e.x,e.y,2,2);}
  }
  function dungeonRespawn(m) {
    if(!m.dungeonFloor||!host.dungeonState)return;
    const p=host.dungeonState(),time=Date.now();if(!p)return;
    if(!m.artReady&&typeof DungeonArt!=='undefined'&&have(DungeonArt.image)){m.artReady=true;m.chunks.clear();}
    for(const e of m.spawnDefs){
      if(e.tutorial&&p.claimed.tutorialKey)continue;
      if(m.ents.some(x=>x.id===e.id&&!x.dead&&!x.dying)||!DungeonProgress.alive(p,e,time))continue;
      if(Math.hypot(e.x-P.x,e.y-P.y)<7||m.occ.has(e.y*m.w+e.x))continue;
      dungeonSpawn(m,e,m.tutorial);
    }
  }
  const DUNPAT={};
  function dungeonPaint(m,g,X0,Y0){
    const th=m.layout.theme,art=typeof DungeonArt!=='undefined'&&DungeonArt.themes[m.r];
    const texture=key=>{if(!art)return null;const rc=art[key];if(!rc||!have(DungeonArt.image))return null;const k=m.r+key;if(!DUNPAT[k])DUNPAT[k]=g.createPattern(cut(DungeonArt.image,...rc),'repeat');return DUNPAT[k];};
    for(let y=Y0;y<Math.min(m.h,Y0+CS);y++)for(let x=X0;x<Math.min(m.w,X0+CS);x++){
      const i=y*m.w+x,t=m.dt[i],room=m.layout.rooms.find(R=>x>=R.x&&y>=R.y&&x<R.x+R.w&&y<R.y+R.h),alt=room&&(room.cx+room.cy+m.f)%4===0,key=t===0?'wall':t===2||t===3?'hazard':t===4?'alternate':alt?'alternate':'floor';
      g.fillStyle=texture(key)||(t===0?th.wall:t===2?th.water:t===3?th.hazard:t===4?th.bridge:alt?th.alternate:th.floor);
      g.fillRect(x*TS,y*TS,TS,TS);
      if(t===0){g.fillStyle='rgba(0,0,0,.55)';g.fillRect(x*TS,y*TS,TS,TS);if(y+1<m.h&&m.dt[i+m.w]===1){g.fillStyle=texture('wall')||th.wall;g.fillRect(x*TS,y*TS+TS*.25,TS,TS*.75);g.fillStyle='rgba(0,0,0,.4)';g.fillRect(x*TS,(y+1)*TS-6,TS,6);}}
      else if(t===4){g.strokeStyle='rgba(55,35,20,.45)';g.lineWidth=2;g.beginPath();g.moveTo(x*TS,y*TS+TS*.5);g.lineTo((x+1)*TS,y*TS+TS*.5);g.stroke();}
    }
  }
