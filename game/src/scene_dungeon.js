  /* Dungeon maps share Scene's movement/rendering boundary and use editable data. */
  function dungeonArt(kind, r) {
    if(kind.startsWith('fixture_'))return dungeonFixture(kind.slice(8),r);
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
  const DUNGEON_STAIRS = new Map();
  function dungeonTravelArt(e) {
    const down = e.kind === 'stairs' || e.to > e.floor;
    const name = down ? 'stairs_down' : 'stairs_up';
    const source = architecturePiece(e.r, name);
    if (!source) return null;
    const wall=!down&&e.support?dungeonWallArt(e.r):null;
    if(!down&&e.support&&!wall)return null;
    const key = e.r + '/' + name+(wall?'/supported':'');
    const cached = DUNGEON_STAIRS.get(key);
    if (cached?.source === source&&cached.faceSource===wall?.face) return cached;

    if(wall){
      // The complete housing lives inside the authored solid support volume.
      // Reuse the adjacent wall's actual courses and coping at their normal
      // repeat scale; the painted stairs rise away from the floor into it.
      const size=48*K,c=mk(size,size),g=c.getContext('2d');c.hr=1;
      g.imageSmoothingQuality='high';g.fillStyle=Dungeons.themes[e.r].wall;g.fillRect(0,0,size,size);
      for(let y=0;y<size;y+=39)for(let x=0;x<size;x+=48)g.drawImage(wall.face,x,y,48,39);
      for(let x=0;x<size;x+=TS)g.drawImage(wall.coping,x,4,TS,7);
      g.fillStyle='#10131791';g.fillRect(0,size-6,size,6);
      const scale=Math.min(44*K/source.width,44*K/source.height),w=Math.round(source.width*scale),h=Math.round(source.height*scale);
      g.drawImage(source,(size-w)/2,size-h,w,h);
      const sprite={c,ax:24,ay:48,source,faceSource:wall.face,copingSource:wall.coping,supported:true};
      DUNGEON_STAIRS.set(key,sprite);return sprite;
    }

    const maxWidth = (down ? 50 : 44) * K;
    const maxHeight = (down ? 34 : 44) * K;
    const scale = Math.min(maxWidth / source.width, maxHeight / source.height);
    const c = mk(Math.round(source.width * scale), Math.round(source.height * scale));
    c.hr = 1;
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    // A soft contact shadow sits behind the rim, clipped to the sprite.
    g.save();
    const radius=c.width*.49, flatten=.18, rim=(c.height-c.width*.065)/flatten;
    g.scale(1,flatten);
    const shadow=g.createRadialGradient(c.width/2,rim,0,c.width/2,rim,radius);
    shadow.addColorStop(0,'#100e0d56');
    shadow.addColorStop(.66,'#100e0d36');
    shadow.addColorStop(1,'#100e0d00');
    g.fillStyle=shadow;
    g.fillRect(0,rim-radius,c.width,radius*2);
    g.restore();
    g.drawImage(source, 0, 0, c.width, c.height);
    // Object feet are y*T+15 and gain one pixel in Scene's object layer.
    const sprite = { c, ax: lw(c) / 2, ay: lh(c), source };
    DUNGEON_STAIRS.set(key, sprite);
    return sprite;
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
    m.discovered= DungeonProgress.unpackSeen(p.seen&&p.seen[f],w*h);
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
      for(const {x,y} of dungeonTorchSites(layout,R)){
        m.props.push({x,y,kind:'torch',r,hang:1});m.lights.push({x:x+.5,y:y+.8,r:42,c:r===6?3:2,fl:1});
      }
      m.props.push({x:R.x+R.w-2,y:R.y+1,kind:'dn_decoration',r});
      if((R.cx+R.cy)%3===0)m.props.push({x:R.x+1,y:R.y+1,kind:'dn_landmark',r});
    }
    m.props.push(...dungeonDress(layout,r));
    dungeonApply(m,p);return m;
  }
  function dungeonTorchSites(layout,room){
    const sites=[];
    for(const x of [room.x+1,room.x+room.w-2])for(let y=room.y-1;y<room.cy;y++){
      if(layout.tiles[y*layout.w+x]!==Dungeons.WALL||layout.tiles[(y+1)*layout.w+x]!==Dungeons.FLOOR)continue;
      if(layout.entities.some(e=>e.support&&x>=e.support.x&&x<e.support.x+e.support.w&&y>=e.support.y&&y<e.support.y+e.support.h))break;
      sites.push({x,y});break;
    }
    return sites;
  }
  function dungeonSpawn(m,source,tutorial) {
    const sp=Dungeons.species[source.species]||{},art=sp.art||source.species||'k'+m.r,keeper=source.kind==='keeper';
    const e=Object.assign({},source,{r:m.r,floor:m.f,kind:keeper?'keeper':source.tutorial&&tutorial?'guard':'mon',sub:keeper?'Vault keeper':source.lieutenant?'Floor lieutenant':sp.description||sp.desc||'Dungeon creature',inst:{dungeon:1,tpl:sp.tpl||'b'+m.r+'01',art,role:source.role||sp.role||'skirmisher',elite:!!source.lieutenant},spr:dungeonMob(art)||monSprite(art),home:[source.x,source.y],range:source.lieutenant||keeper?2:4,wander:keeper||source.tutorial?0:1,t:2+Math.random()*4,agg:!keeper&&!source.tutorial&&!source.lieutenant?1:0,dir:'l'});
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
    if(!m.dungeonFloor)return;
    const materialReady = typeof DungeonArt !== 'undefined' && have(DungeonArt.image);
    const architecture = dungeonWallArt(m.r);
    if(m.artReady !== materialReady || m.wallArt?.face !== architecture?.face || m.wallArt?.coping !== architecture?.coping){
      m.artReady=materialReady;
      m.wallArt=architecture;
      m.chunks.clear();
    }
    if(!host.dungeonState)return;
    const p=host.dungeonState(),time=Date.now();if(!p)return;
    for(const e of m.spawnDefs){
      if(e.tutorial&&p.claimed.tutorialKey)continue;
      if(m.ents.some(x=>x.id===e.id&&!x.dead&&!x.dying)||!DungeonProgress.alive(p,e,time))continue;
      if(Math.hypot(e.x-P.x,e.y-P.y)<7||m.occ.has(e.y*m.w+e.x))continue;
      dungeonSpawn(m,e,m.tutorial);
    }
  }
  const DUNPAT={};
  const DUNFIX = new Map();
  function dungeonFixture(kind,r) {
    const key=kind+'/'+r;
    const preferred={wheel:'control',forge:'control',tomb:'landmark',crystal:'landmark',roots:'landmark',records:'lore',shelf:'lore',bed:'decoration',crates:'decoration'}[kind]||'decoration';
    const painted=dungeonArt(preferred,r);
    const source=painted&&painted.c,cached=DUNFIX.get(key);
    // Resolve readiness before looking up the cache. Loaded atlas cuts replace
    // the temporary procedural fallback on their first available render.
    if(cached&&cached.source===source)return cached;
    const c=mk(48*K,40*K),g=c.getContext('2d');c.hr=1;g.scale(K,K);
    if(source){
      const fit=Math.min(44/source.width,34/source.height),w=source.width*fit,h=source.height*fit;
      g.drawImage(source,(48-w)/2,37-h,w,h);
      const art={c,ax:24,ay:38,source};DUNFIX.set(key,art);return art;
    }
    const accent=Dungeons.themes[r].accent, wood=r===7?'#788d9b':'#79604a', dark='#352f2c', light=r===7?'#b2c9d1':'#b29a76';
    const rect=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};
    const poly=(p,col)=>{g.fillStyle=col;g.beginPath();g.moveTo(...p[0]);for(const q of p.slice(1))g.lineTo(...q);g.closePath();g.fill();};
    if(kind==='shelf'||kind==='records'){
      rect(3,4,40,33,dark);rect(4,4,3,33,wood);rect(40,4,3,33,wood);
      for(let y=8;y<36;y+=10){
        rect(6,y+7,35,2,light);
        for(let j=0;j<7;j++){
          const x=8+j*4.4;
          rect(x,y+(j%3),3,7-j%3,kind==='records'?['#b88a59','#8b665d','#697d74',accent][j%4]:'#a89c7f');
          if(kind==='records')rect(x,y+4,3,.6,'#d6c69e');
        }
      }
    }else if(kind==='tomb'){
      poly([[7,17],[17,8],[41,11],[32,21]],'#ad9a80');
      poly([[7,17],[32,21],[32,35],[7,31]],'#6a6257');poly([[32,21],[41,11],[41,27],[32,35]],'#4b4c49');
      rect(10,18,19,2,accent);rect(10,28,18,1,'#908676');
      g.strokeStyle='#6d6257';g.lineWidth=1;g.beginPath();g.ellipse(24,14,6,2,.15,0,7);g.stroke();
    }else if(kind==='wheel'){
      rect(4,30,38,5,dark);rect(21,4,5,31,wood);
      g.strokeStyle=light;g.lineWidth=3;g.beginPath();g.arc(24,20,13,0,7);g.stroke();
      g.strokeStyle=wood;g.lineWidth=2;
      for(let i=0;i<8;i++){const a=i*Math.PI/4;g.beginPath();g.moveTo(24,20);g.lineTo(24+Math.cos(a)*13,20+Math.sin(a)*13);g.stroke();}
      rect(21,17,6,6,accent);
    }else if(kind==='bed'){
      rect(6,8,35,26,wood);poly([[8,9],[38,9],[40,29],[10,29]],'#8f8d79');
      rect(10,12,26,15,r===7?'#b0c5d1':'#625e6d');rect(10,8,9,5,'#cebea2');
      rect(5,5,3,32,wood);rect(39,7,3,30,wood);rect(10,26,27,1,accent);
    }else if(kind==='forge'){
      rect(5,11,17,23,'#57504a');rect(6,13,14,15,'#2c2524');rect(8,22,10,5,'#b74e2a');rect(10,24,6,2,'#efb16c');
      poly([[23,19],[30,14],[44,17],[37,23]],'#a29d8e');poly([[26,23],[39,23],[35,28],[35,34],[28,34],[29,27]],'#605e58');
      rect(6,8,16,4,light);rect(7,3,12,5,'#72695b');
    }else if(kind==='crystal'){
      for(const [x,y,s]of [[10,35,1],[25,36,1.4],[38,35,.8]]){
        poly([[x-5*s,y],[x-6*s,y-17*s],[x,y-26*s],[x+6*s,y-16*s],[x+4*s,y]],'#60589a');
        poly([[x,y-26*s],[x+6*s,y-16*s],[x+4*s,y],[x,y-6*s]],accent);
        poly([[x-6*s,y-17*s],[x,y-26*s],[x,y-6*s]],'#819fb8');
      }
    }else if(kind==='roots'){
      g.strokeStyle='#686b42';g.lineCap='round';
      for(let i=0;i<5;i++){
        g.lineWidth=2+i%3;g.beginPath();g.moveTo(7+i*8,2);g.bezierCurveTo(21-i*2,12,39-i*4,21,7+i*7,36);g.stroke();
      }
      for(let i=0;i<5;i++){g.fillStyle=i%2?'#a6aa7a':'#827f58';g.beginPath();g.ellipse(12+i*6,25+i%3*4,4,3,0,0,7);g.fill();}
    }else{
      for(const [x,y,s]of [[5,15,17],[23,9,18],[25,25,13]]){
        rect(x,y,s,s*.65,wood);rect(x,y,s,2,light);rect(x,y+s*.65-2,s,2,'#493e31');
        rect(x+2,y,1,s*.65,light);rect(x+s-3,y,1,s*.65,dark);
        g.strokeStyle=light;g.lineWidth=1;g.beginPath();g.moveTo(x+3,y+2);g.lineTo(x+s-4,y+s*.65-2);g.stroke();
      }
    }
    const art={c,ax:24,ay:38,source};DUNFIX.set(key,art);return art;
  }
  function dungeonRoomUse(name,r) {
    if(/bed|bunk|berth|rest|camp|refuge|shelter/i.test(name))return 'bed';
    if(/desk|record|index|scribe|shelf|book|catalog|reading|archive|scroll/i.test(name))return 'records';
    if(/pump|wheel|sluice|winch|hoist|weir|valve|chain|crane/i.test(name))return 'wheel';
    if(/tomb|burial|offering|grave|oath|king|crypt|seal|dais/i.test(name))return 'tomb';
    if(/forge|furnace|slag|kiln|anvil|vent|coal|smelt|cinder/i.test(name))return 'forge';
    if(/prism|shard|crystal|mirror|survey|lens|ice|frost|rime/i.test(name))return 'crystal';
    if(/root|silk|web|brood|egg|reed|garden|moss/i.test(name))return 'roots';
    return ['crates','wheel','tomb','roots','forge','crystal','crystal','records'][r-1];
  }
  function dungeonDress(layout,r) {
    const result=[];
    for(const R of layout.rooms){
      const kind=dungeonRoomUse(R.name,r);
      // Recessed wall displays use existing solid wall cells. They never hide
      // an entity, fill a corridor, or change an authored walkable tile.
      for(const fraction of [.25,.75]){
        const x=Math.round(R.x+R.w*fraction), y=R.y-1;
        if(layout.tiles[y*layout.w+x]!==0||layout.tiles[(y+1)*layout.w+x]!==1)continue;
        if(layout.entities.some(e=>Math.abs(e.x-x)<2&&Math.abs(e.y-y)<3))continue;
        result.push({x,y,kind:'dn_fixture_'+kind,r,sc:.285,hang:1,wallDisplay:1});
      }
      // The north displays can be above a phone's first arrival view. Carve a
      // second visual recess into the near wall's existing solid mass. At .75
      // scale its complete 36×30px image fits behind a 3×2 solid-cell footprint.
      const wallY=R.y+R.h;
      const candidates=[R.cx-2,R.cx+2,R.cx-3,R.cx+3].sort((a,b)=>{
        const arrival=R.id==='A'&&layout.entry?layout.entry[0]:R.cx;
        return Math.abs(a-arrival)-Math.abs(b-arrival);
      });
      for(const x of candidates){
        const clear=[0,1].every(dy=>[-1,0,1].every(dx=>layout.tiles[(wallY+dy)*layout.w+x+dx]===0));
        const nearbyFloor=[1,2,3].some(dy=>layout.tiles[(wallY-dy)*layout.w+x]===1);
        if(!clear||!nearbyFloor||layout.entities.some(e=>Math.abs(e.x-x)<3&&Math.abs(e.y-wallY)<3))continue;
        result.push({x,y:wallY+1,kind:'dn_fixture_'+kind,r,sc:.75,hang:1,recess:{x,y:wallY,side:'south'}});break;
      }
    }
    return result;
  }
  function dungeonFloorDetail(m,g,x,y,R) {
    if(!R||m.dt[y*m.w+x]!==1)return false;
    // Insets belong to the floor. Keep stairs, caches, creatures and controls
    // on their original, clearly readable paving, including adjacent feet.
    if((m.layout.entities||[]).some(e=>Math.abs(e.x-x)<=1&&Math.abs(e.y-y)<=1))return false;
    const kind=dungeonRoomUse(R.name,m.r),th=m.layout.theme;
    const X=R.cx*TS,Y=R.cy*TS,unit=TS,phase=(R.cx*3+R.cy*7+m.f)%5;
    const rect=(xx,yy,w,h,col)=>{g.fillStyle=col;g.fillRect(xx,yy,w,h);};
    const line=(points,col,width=1.4)=>{
      g.strokeStyle=col;g.lineWidth=width;g.beginPath();g.moveTo(...points[0]);
      for(const p of points.slice(1))g.lineTo(...p);g.stroke();
    };
    const ellipse=(xx,yy,rx,ry,col)=>{g.fillStyle=col;g.beginPath();g.ellipse(xx,yy,rx,ry,0,0,Math.PI*2);g.fill();};
    g.save();g.beginPath();g.rect(x*TS,y*TS,TS,TS);g.clip();
    if(m.r===1||m.r===2){
      // Tide lines and shallow stains cross tile joins as one room-scale mark.
      const channel=kind==='wheel'?1.35:2.45,level=Y+channel*unit;
      ellipse(X+(phase-2)*.6*unit,Y+unit,Math.min(4,R.w*.37)*unit,Math.min(2.5,R.h*.31)*unit,m.r===1?'#173a4336':'#38513b3b');
      line([[R.x*unit+unit,level],[(R.x+R.w-1)*unit,level]],'#14252d66',3.7);
      line([[R.x*unit+unit,level+3],[(R.x+R.w-1)*unit,level+3]],'#bdc6ad28',1.2);
      const wells=kind==='wheel'?[[-2,1],[2,1]]:[[2,2],[-3,-2]];
      for(const [dx,dy]of wells){
        const xx=X+dx*unit,yy=Y+dy*unit;
        rect(xx+5,yy+8,unit*1.25,unit*.62,'#17252b66');
        g.strokeStyle='#a1aaa344';g.lineWidth=1.6;g.strokeRect(xx+4,yy+7,unit*1.25+2,unit*.62+2);
        for(let i=0;i<8;i++)rect(xx+8+i*7,yy+9,2,unit*.58,'#71858777');
      }
      if(kind==='bed'||kind==='records'){
        g.strokeStyle='#b1a38735';g.lineWidth=2;g.strokeRect((R.x+1.4)*unit,(R.y+1.3)*unit,(R.w-2.8)*unit,(R.h-2.6)*unit);
      }
    }else if(m.r===3){
      const width=kind==='tomb'?2.8:2.2,height=kind==='tomb'?3.8:2.7;
      rect(X-width*.5*unit,Y-height*.5*unit,width*unit,height*unit,'#b5a28a15');
      g.strokeStyle='#c5ac8942';g.lineWidth=2.1;g.strokeRect(X-width*.5*unit,Y-height*.5*unit,width*unit,height*unit);
      g.strokeStyle='#23252e60';g.lineWidth=2;g.strokeRect(X-width*.5*unit+5,Y-height*.5*unit+5,width*unit-10,height*unit-10);
      for(let i=-1;i<=1;i++)line([[X-width*.5*unit+8,Y+i*unit],[X+width*.5*unit-8,Y+i*unit]],'#c9b59630');
      line([[X,Y-unit*.8],[X+unit*.65,Y],[X,Y+unit*.8],[X-unit*.65,Y],[X,Y-unit*.8]],th.accent+'44',2.5);
      if(kind==='tomb')for(const dx of [-3,3]){
        rect(X+dx*unit-17,Y-unit,34,unit*2.1,'#ada28b1f');
        g.strokeStyle='#28252d55';g.lineWidth=2;g.strokeRect(X+dx*unit-17,Y-unit,34,unit*2.1);
      }
    }else if(m.r===4){
      for(let i=0;i<3;i++){
        const xx=X+(i-1)*1.9*unit,yy=Y+(i%2?1:-1)*unit;
        ellipse(xx,yy,unit*(.8+i*.17),unit*.7,'#7b744a27');
        for(let j=0;j<5;j++)ellipse(xx+Math.sin(j*2.4+phase)*unit*.8,yy+Math.cos(j*1.7)*unit*.5,3+j%2,2,'#b4a47f37');
      }
      g.strokeStyle='#4c513e55';g.lineWidth=kind==='roots'?3:1.8;
      for(const side of [-1,1]){
        g.beginPath();g.moveTo(X+side*(R.w*.4)*unit,(R.y+.8)*unit);
        g.bezierCurveTo(X+side*unit,Y-unit,X+side*3*unit,Y+unit,X+side*1.4*unit,(R.y+R.h-.8)*unit);g.stroke();
      }
    }else if(m.r===5){
      const spread=kind==='forge'?2.3:1.6;
      rect(X-spread*unit,Y-unit,spread*2*unit,unit*2.5,'#2d303536');
      g.strokeStyle='#b1a28a40';g.lineWidth=2;g.strokeRect(X-spread*unit,Y-unit,spread*2*unit,unit*2.5);
      for(let side=-1;side<=1;side+=2){
        const xx=X+side*1.2*unit;
        line([[xx,(R.y+1)*unit],[xx,(R.y+R.h-1)*unit]],'#161d2670',4);
        line([[xx+3,(R.y+1)*unit],[xx+3,(R.y+R.h-1)*unit]],'#c99d6538',1.5);
      }
      for(let n=-2;n<=2;n++){
        line([[X+n*unit,Y-unit],[X+n*unit,Y+unit*1.5]],'#c3b7a02f',1.4);
        for(const dy of [-.7,1.2])ellipse(X+n*unit+7,Y+dy*unit,2,2,'#c2b79b50');
      }
    }else if(m.r===6||m.r===7){
      const ice=m.r===7,start=(R.x+1)*unit,end=(R.x+R.w-1)*unit;
      const seam=[[start,Y-unit*1.5],[X-unit*2,Y-unit*.4],[X-unit*.6,Y+unit*.1],[X+unit*.8,Y+unit*1.8],[end,Y+unit*(phase%2?2.6:.5)]];
      line(seam,ice?'#172e4454':'#171e3e58',ice?2:3);
      line(seam.map(([xx,yy])=>[xx,yy+2]),ice?'#c8e8ec50':th.accent+'50',1.2);
      for(let i=1;i<4;i++){
        const [xx,yy]=seam[i];
        line([[xx,yy],[xx+unit*.8,yy-unit*.55],[xx+unit*.55,yy-unit*1.2]],ice?'#b5d9e53e':th.accent+'3a',1.1);
      }
      if(!ice&&kind==='crystal')for(const side of [-1,1]){
        line([[X+side*unit*2.8,Y-unit*.7],[X+side*unit*3.3,Y],[X+side*unit*2.5,Y+unit*.4],[X+side*unit*2.8,Y-unit*.7]],th.accent+'3d',2);
      }
    }else{
      const inset=kind==='records'?1.45:2.2;
      for(const extra of [0,.17]){
        const x0=(R.x+inset+extra)*unit,y0=(R.y+inset+extra)*unit;
        g.strokeStyle=extra?'#342a325e':th.accent+'38';g.lineWidth=2;
        g.strokeRect(x0,y0,(R.w-2*(inset+extra))*unit,(R.h-2*(inset+extra))*unit);
      }
      line([[X-unit,Y],[X,Y-unit],[X+unit,Y],[X,Y+unit],[X-unit,Y]],th.accent+'38',2.2);
      if(kind==='records')for(const side of [-1,1])for(let i=-2;i<=2;i++){
        rect(X+side*2.8*unit,Y+i*.65*unit,unit*.6,3,'#d4b77b37');
      }
    }
    g.restore();return true;
  }
  function dungeonWallArt(r) {
    if(typeof architecturePiece !== 'function')return null;
    const face=architecturePiece(r,'dungeon_face'),coping=architecturePiece(r,'dungeon_coping');
    return face&&coping?{face,coping}:null;
  }
  function dungeonWallStrip(g, art, x, y, width, height, u = 0, fraction = 1) {
    g.drawImage(art, art.width * u, 0, art.width * fraction, art.height, x, y, width, height);
  }
  function dungeonSideCoping(g, coping, x, y, width, height, east) {
    g.save();
    g.translate(x + (east ? width : 0), y + (east ? 0 : height));
    g.rotate((east ? 1 : -1) * Math.PI / 2);
    g.drawImage(coping, 0, 0, height, width);
    g.restore();
  }
  function dungeonPaintWall(g, art, x, y, south, north, west, east, r) {
    const X = x * TS, Y = y * TS, {face,coping} = art;
    const shade = (xx,yy,w,h,colour) => {g.fillStyle=colour;g.fillRect(xx,yy,w,h);};
    g.save();
    g.beginPath();
    g.rect(X,Y,TS,TS);
    g.clip();

    if(south){
      dungeonWallStrip(g,face,X,Y+9,TS,TS-9);
      dungeonWallStrip(g,coping,X,Y+4,TS,7);
      shade(X,Y+TS-6,TS,6,'#10131791');
      shade(X,Y+TS-6,TS,1,'#c3ae8b42');
    }
    if(north){
      dungeonWallStrip(g,face,X,Y+4,TS,27,0,.78);
      dungeonWallStrip(g,coping,X,Y,TS,6);
      shade(X,Y+29,TS,6,'#090e15ac');
      if((x+r)%5===0){
        shade(X+10,Y+4,28,34,'#080b108c');
        dungeonWallStrip(g,face,X+13,Y+5,21,28,.29,.4);
        dungeonWallStrip(g,coping,X+10,Y+2,27,6);
        dungeonWallStrip(g,coping,X+10,Y+31,27,6);
        shade(X+30,Y+8,4,23,'#10151c7d');
      }
    }
    for(const right of [false,true]){
      if(!(right ? east : west))continue;
      const xx=X+(right?TS-22:0);
      const top=Y+(north?6:0),height=TS-(north?6:0)-(south?6:0);
      dungeonWallStrip(g,face,xx,top,22,height,right ? .3 : .12,.48);
      shade(xx,top,22,height,'#14192454');
      shade(xx+(right?0:19),top,3,height,'#0d121a88');
      dungeonSideCoping(g,coping,xx+(right?16:0),top,6,height,right);
      if((y+r)%5===0&&!north&&!south){
        dungeonWallStrip(g,face,xx+(right?0:4),Y+12,18,22,.2,.4);
        dungeonWallStrip(g,coping,xx+(right?0:4),Y+11,18,5);
        shade(xx+(right?0:4),Y+32,18,4,'#080d1599');
      }
    }
    g.restore();
  }
  function dungeonPaintWallFallback(g, th, texture, x, y, south, north, west, east, r) {
    if(south){
      // A bright coping, textured masonry face, and dark plinth distinguish
      // the raised wall from the floor below it in all eight palettes.
      g.fillStyle=texture('wall')||th.wall;g.fillRect(x*TS,y*TS+8,TS,TS-8);
      g.fillStyle=th.accent+'46';g.fillRect(x*TS,y*TS+8,TS,3);
      g.fillStyle='#090b1055';g.fillRect(x*TS,y*TS+29,TS,2);
      g.fillRect(x*TS+((x+y)%2?14:32),y*TS+10,1.5,19);
      g.fillRect(x*TS+((x+y)%2?31:13),y*TS+31,1.5,13);
      g.fillStyle='#080d1099';g.fillRect(x*TS,(y+1)*TS-5,TS,5);
      g.fillStyle=th.accent+'24';g.fillRect(x*TS,(y+1)*TS-6,TS,1);
    }
    if(north){
      const X=x*TS,Y=y*TS;
      g.fillStyle=texture('wall')||th.alternate;g.fillRect(X,Y+5,TS,25);
      g.fillStyle=th.accent+'36';g.fillRect(X,Y+5,TS,25);
      g.fillStyle='#0a101351';g.fillRect(X,Y+17,TS,1.5);
      g.fillRect(X+((x+y)%2?13:33),Y+6,1.5,11);g.fillRect(X+((x+y)%2?32:12),Y+19,1.5,10);
      g.fillStyle=th.accent+'94';g.fillRect(X,Y,TS,4);
      g.fillStyle='#dce3c74d';g.fillRect(X,Y,TS,1);
      g.fillStyle='#070c14bb';g.fillRect(X,Y+30,TS,5);
      if((x+r)%5===0){
        g.fillStyle='#0a0e16b3';g.fillRect(X+14,Y+3,23,34);
        g.fillStyle=texture('wall')||th.alternate;g.fillRect(X+13,Y+4,16,29);
        g.fillStyle=th.accent+'66';g.fillRect(X+13,Y+4,3,29);
        g.fillStyle=th.accent+'8f';g.fillRect(X+11,Y+1,20,4);
        g.fillStyle='#080c15aa';g.fillRect(X+12,Y+33,19,4);
      }
    }
    for(const dx of [-1,1]){
      if(dx<0?!west:!east)continue;
      const xx=x*TS+(dx>0?TS-22:0),yy=y*TS;
      g.fillStyle=texture('wall')||th.alternate;g.fillRect(xx,yy,22,TS);
      g.fillStyle='#090f185e';g.fillRect(xx,yy,22,TS);
      g.fillStyle=th.accent+'80';g.fillRect(xx+(dx>0?17:0),yy,5,TS);
      g.fillStyle='#e0e2ca3b';g.fillRect(xx+(dx>0?20:0),yy,2,TS);
      g.fillStyle='#060b159c';g.fillRect(xx+(dx>0?0:19),yy,3,TS);
      g.fillStyle='#080d155e';g.fillRect(xx,yy+18,22,1.5);g.fillRect(xx,yy+36,22,1.5);
      if((y+r)%5===0){
        g.fillStyle=texture('wall')||th.alternate;g.fillRect(xx+(dx>0?0:5),yy+13,17,20);
        g.fillStyle=th.accent+'68';g.fillRect(xx+(dx>0?0:5),yy+13,17,3);
        g.fillStyle='#080c15aa';g.fillRect(xx+(dx>0?0:5),yy+30,17,3);
      }
    }
  }
  function dungeonPaintWallDisplay(g, art, X, Y, th) {
    g.fillStyle='#0a0f15d9';
    g.fillRect(X+4,Y+8,40,35);
    if(art){
      dungeonWallStrip(g,art.face,X+1,Y+6,4,37,.18,.14);
      dungeonWallStrip(g,art.face,X+43,Y+6,4,37,.63,.14);
      dungeonWallStrip(g,art.coping,X+1,Y+4,46,6);
      dungeonWallStrip(g,art.coping,X+1,Y+41,46,5);
    }else{
      g.fillStyle=th.alternate;
      g.fillRect(X+1,Y+41,46,5);
      g.fillStyle=th.accent+'6a';
      g.fillRect(X+1,Y+41,46,1);
    }
  }
  function dungeonPaintRecess(g, art, X, Y) {
    const {face,coping}=art;
    // The jambs continue into masonry shoulders inside the three solid cells.
    for(const [x,u] of [[X-15,.15],[X+114,.64]]){
      dungeonWallStrip(g,face,x,Y,15,87,u,.22);
      dungeonWallStrip(g,coping,x,Y,15,7);
      dungeonWallStrip(g,coping,x,Y+82,15,6);
      g.fillStyle='#0a111a8a';
      g.fillRect(x,Y+88,15,2);
    }
    dungeonWallStrip(g,face,X,Y,114,87);
    g.fillStyle='#0c1015d9';
    g.fillRect(X+8,Y+7,98,74);
    g.fillStyle='#080b11a6';
    g.fillRect(X+8,Y+7,98,11);
    g.fillRect(X+8,Y+17,5,62);
    g.fillRect(X+101,Y+17,5,62);
    dungeonSideCoping(g,coping,X+1,Y+6,6,77,false);
    dungeonSideCoping(g,coping,X+107,Y+6,6,77,true);
    dungeonWallStrip(g,coping,X-2,Y,118,7);
    dungeonWallStrip(g,coping,X-2,Y+82,118,6);
    g.fillStyle='#0a111a8a';
    g.fillRect(X-2,Y+88,118,2);
  }
  function dungeonPaintStairWall(m,g,art,x,y){
    const stair=m.layout.entities?.find(e=>e.support),room=m.layout.rooms[0];
    if(!stair||!room||x<room.x||x>=room.x+room.w||y<stair.y-2||y>stair.y)return;
    if(m.dt[(stair.y+1)*m.w+x]!==Dungeons.FLOOR||![-2,-1,0].every(dy=>m.dt[(stair.y+dy)*m.w+x]===Dungeons.WALL))return;
    // A full-height far wall continues on both sides of the recess. Each
    // destination cell clips its own section, including at chunk boundaries.
    const X=x*TS,top=(stair.y-2)*TS,bottom=(stair.y+1)*TS;
    g.save();g.beginPath();g.rect(X,y*TS,TS,TS);g.clip();
    for(let yy=top;yy<bottom;yy+=39)g.drawImage(art.face,X,yy,TS,39);
    g.drawImage(art.coping,X,top+4,TS,7);
    g.fillStyle='#10131791';g.fillRect(X,bottom-6,TS,6);
    g.restore();
  }
  function dungeonPaint(m,g,X0,Y0){
    const th=m.layout.theme,art=typeof DungeonArt!=='undefined'&&DungeonArt.themes[m.r],wallArt=dungeonWallArt(m.r);
    const texture=key=>{if(!art)return null;const rc=art[key];if(!rc||!have(DungeonArt.image))return null;const k=m.r+key;if(!DUNPAT[k])DUNPAT[k]=g.createPattern(cut(DungeonArt.image,...rc),'repeat');return DUNPAT[k];};
    for(let y=Y0;y<Math.min(m.h,Y0+CS);y++)for(let x=X0;x<Math.min(m.w,X0+CS);x++){
      const i=y*m.w+x,t=m.dt[i],room=m.layout.rooms.find(R=>x>=R.x&&y>=R.y&&x<R.x+R.w&&y<R.y+R.h),alt=room&&(room.cx+room.cy+m.f)%4===0,key=t===0?'wall':t===2||t===3?'hazard':t===4?'alternate':alt?'alternate':'floor';
      g.fillStyle=texture(key)||(t===0?th.wall:t===2?th.water:t===3?th.hazard:t===4?th.bridge:alt?th.alternate:th.floor);
      g.fillRect(x*TS,y*TS,TS,TS);
      if(t===1&&room)dungeonFloorDetail(m,g,x,y,room);
      if(t===0){
        const floor=t=>t===1||t===4, south=y+1<m.h&&floor(m.dt[i+m.w]),north=y>0&&floor(m.dt[i-m.w]);
        // The ceiling mass has no floor-like masonry courses. Texture returns
        // on its exposed cutaway faces, with relief inside solid cells only.
        g.fillStyle=th.wall;g.fillRect(x*TS,y*TS,TS,TS);
        g.fillStyle='#070c1266';g.fillRect(x*TS,y*TS,TS,TS);
        const west=x>0&&floor(m.dt[i-1]),east=x+1<m.w&&floor(m.dt[i+1]);
        if(wallArt){
          if(south||north||west||east)dungeonPaintWall(g,wallArt,x,y,south,north,west,east,m.r);
        }else{
          dungeonPaintWallFallback(g,th,texture,x,y,south,north,west,east,m.r);
        }
        if(wallArt)dungeonPaintStairWall(m,g,wallArt,x,y);
        for(const prop of m.props||[]){
          if(prop.wallDisplay&&prop.x===x&&prop.y===y){
            g.save();g.beginPath();g.rect(x*TS,y*TS,TS,TS);g.clip();
            dungeonPaintWallDisplay(g,wallArt,x*TS,y*TS,th);
            g.restore();
            continue;
          }
          const recess=prop.recess;if(!recess||recess.side!=='south'||Math.abs(x-recess.x)>1||y<recess.y||y>recess.y+1)continue;
          g.save();g.beginPath();g.rect(x*TS,y*TS,TS,TS);g.clip();
          const X=prop.x*TS-33,Y=recess.y*TS+3;
          if(wallArt)dungeonPaintRecess(g,wallArt,X,Y);
          else{
            g.fillStyle='#080c1278';g.fillRect(X,Y,114,87);
            g.fillStyle='#080d16aa';g.fillRect(X+2,Y+3,110,7);g.fillRect(X+1,Y+6,4,76);
            g.fillStyle=texture('wall')||th.alternate;g.fillRect(X-2,Y+82,118,5);
            g.fillStyle='#a8ada738';g.fillRect(X-2,Y+82,118,1.2);
            g.fillStyle='#0a111a8a';g.fillRect(X-2,Y+87,118,3);
            // Broken masonry courses and shadow replace a picture-frame outline.
            for(let n=0;n<6;n++){
              g.fillStyle='#9da69e28';g.fillRect(X+n*19,Y,17,2.2);
              g.fillStyle='#0b111a70';g.fillRect(X+n*19+17,Y,2,4);
            }
          }
          g.restore();
        }
      } else {
        if(y>0&&m.dt[i-m.w]===0){g.fillStyle='#080e143f';g.fillRect(x*TS,y*TS,TS,7);}
        if(x>0&&m.dt[i-1]===0){g.fillStyle='#080e142c';g.fillRect(x*TS,y*TS,4,TS);}
        if(t===4){g.strokeStyle='rgba(55,35,20,.45)';g.lineWidth=2;g.beginPath();g.moveTo(x*TS,y*TS+TS*.5);g.lineTo((x+1)*TS,y*TS+TS*.5);g.stroke();}
      }
    }
  }
  function dungeonLiving(g,ox0,oy0,now) {
    if(!map||!map.dungeonFloor)return;
    const th=map.layout.theme, x0=Math.max(0,Math.floor(ox0/T)), y0=Math.max(0,Math.floor(oy0/T));
    const x1=Math.min(map.w-1,Math.ceil((ox0+vw)/T)), y1=Math.min(map.h-1,Math.ceil((oy0+vh)/T));
    g.save();g.translate(-ox0,-oy0);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const i=y*map.w+x,t=map.dt[i];
      if(t===2||t===3){
        const wet=t===2||map.r===1||map.r===2||map.r===8;
        const phase=(now/2400+(x*13+y*7)%19/19)%1;
        g.globalAlpha=.12+Math.sin(phase*Math.PI)*.18;
        g.strokeStyle=map.r===5?'#ffc475':wet?'#99c6c4':th.accent;g.lineWidth=.65;
        if(wet){g.beginPath();g.ellipse(x*T+8,y*T+8,2+phase*5,.6+phase*1.6,0,.1,Math.PI*1.8);g.stroke();}
        else {g.fillStyle=th.accent;g.fillRect(x*T+4+phase*8,y*T+10-phase*8,1,.8);}
      }
      if(t===1&&(x*17+y*29)%97===0){
        const phase=(now/6500+(x+y)%11/11)%1;
        g.globalAlpha=Math.sin(phase*Math.PI)*.3;g.fillStyle=th.accent;
        g.fillRect(x*T+7+Math.sin(phase*5)*2,y*T+10-phase*17,.7,1.1);
      }
      if(t===1&&(map.r===1||map.r===2)&&(x*13+y*19)%43===0){
        const phase=(now/4800+(x+y)%13/13)%1;
        const room=map.layout.rooms.find(R=>x>=R.x&&y>=R.y&&x<R.x+R.w&&y<R.y+R.h);
        if(room){
          g.globalAlpha=Math.max(0,Math.sin(phase*Math.PI))*.25;g.strokeStyle='#b6cfca';g.lineWidth=.55;
          if(phase<.5){g.fillStyle='#b5d0d0';g.fillRect(x*T+6,y*T-12+phase*44,.65,1.8);}
          else {g.beginPath();g.ellipse(x*T+6,y*T+10,(phase-.5)*7,(phase-.5)*2.3,0,0,Math.PI*2);g.stroke();}
        }
      }
    }
    g.restore();
  }
