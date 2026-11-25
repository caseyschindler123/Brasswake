  /* Presentation-only settlement life. Structural plans remain collision's owner. */
  const LIVING_ART = new Map();
  function livingCanvas(key, w, h, paint) {
    if (LIVING_ART.has(key)) {
      const c=LIVING_ART.get(key);LIVING_ART.delete(key);LIVING_ART.set(key,c);return c;
    }
    const c = mk(w*K,h*K); c.hr=1;
    const g=c.getContext('2d'); g.scale(K,K); paint(g);
    LIVING_ART.set(key,c);
    if(LIVING_ART.size>96)LIVING_ART.delete(LIVING_ART.keys().next().value);
    return c;
  }
  function livingRect(g,x,y,w,h,c) { g.fillStyle=c;g.fillRect(x,y,w,h); }
  function livingPoly(g,pts,c) {
    g.fillStyle=c;g.beginPath();g.moveTo(...pts[0]);
    for(const p of pts.slice(1))g.lineTo(...p);g.closePath();g.fill();
  }
  function venueEntrance(b,d,list,wx,wy) {
    if(b.fa<=.01)return;
    const civic=['bank','guild','civic','palace','temple','casino'].includes(b.slot);
    const cloth=['shop','tavern','cartographer'].includes(b.slot);
    const workshop=b.slot==='work'||b.slot==='warehouse'||b.slot==='dojo';
    const side=d.side==='east'||d.side==='west';
    const key=['entrance',b.r,b.slot,side,d.side].join('/');
    const c=livingCanvas(key,76,68,g=>{
      const timber=Interiors.timber[b.r], trim=Interiors.trim[b.r];
      const pale=['#c6b08a','#a6b098','#d8c398','#c6b18a','#a49283','#b1b0c5','#d2dfe5','#e0cca5'][b.r-1];
      if(side){
        const x=d.side==='east'?39:32;
        livingRect(g,x,15,6,20,timber);livingRect(g,x,15,1.5,20,pale);
        livingPoly(g,[[x-3,15],[x+7,15],[x+7,30],[x-3,27]],cloth?trim:pale);
        livingRect(g,x-3,27,10,2,'#574a3a');return;
      }
      // Posts flank the complete walkable tile and meet the floor at y=60.
      if(civic){
        for(const x of [20,51]){
          livingRect(g,x-2,25,8,35,'#625447');livingRect(g,x,25,4,35,pale);
          livingRect(g,x-3,26,10,3,'#e1cfab');livingRect(g,x-3,57,10,3,pale);
        }
        livingPoly(g,[[13,26],[38,12],[65,26]],'#5b4939');
        livingPoly(g,[[16,24],[38,14],[62,24]],pale);
        livingPoly(g,[[27,23],[38,18],[50,23]],trim);
        livingRect(g,14,26,49,4,pale);livingRect(g,16,29,45,1,'#79664d');
      } else if(cloth){
        for(const x of [15,59]){livingRect(g,x,24,2.5,36,timber);livingRect(g,x,24,.7,36,pale);}
        for(let i=0;i<10;i++){
          const x=12+i*5;
          livingPoly(g,[[x+4,16],[x+9,16],[x+5,30],[x,30]],i%2?pale:trim);
          const shade=g.createLinearGradient(0,16,0,31);shade.addColorStop(0,'rgba(255,245,210,.22)');shade.addColorStop(.55,'rgba(255,245,210,.03)');shade.addColorStop(1,'rgba(34,27,20,.23)');
          livingPoly(g,[[x+4,16],[x+9,16],[x+5,30],[x,30]],shade);
          livingPoly(g,[[x,30],[x+5,30],[x+5,33],[x+2.5,35],[x,33]],i%2?'#b8a484':trim);
        }
        livingRect(g,12,29,50,1,'#735b43');
      } else if(workshop){
        for(const x of [16,58]){
          livingRect(g,x,19,3,41,timber);livingRect(g,x,19,.8,41,pale);
          livingPoly(g,[[x,34],[x+11*(x<30?1:-1),24],[x+11*(x<30?1:-1),21],[x,29]],timber);
        }
        livingRect(g,13,18,51,4,timber);livingRect(g,13,18,51,1,pale);
        livingPoly(g,[[12,17],[17,11],[65,11],[65,17]],'#665d4d');
        livingRect(g,12,17,53,2,'#a49471');
        if(b.slot==='work'){
          livingRect(g,50,20,1,13,'#504a40');
          g.strokeStyle='#b39c71';g.lineWidth=1;g.beginPath();g.arc(51,34,3,0,Math.PI);g.stroke();
        }
      } else {
        livingRect(g,23,23,31,3,timber);livingRect(g,23,23,31,1,pale);
        livingPoly(g,[[20,23],[26,17],[57,17],[57,23]],b.r===7?'#e0e9e9':trim);
        if(b.slot==='healer')for(const x of [21,55]){
          livingRect(g,x,26,1.6,34,timber);
          for(let y=28;y<59;y+=6){livingRect(g,x-2,y,5,2,'#71925c');livingRect(g,x+1,y-2,3,2,'#a0b57a');}
        }
      }
    });
    // For side entrances the narrow canopy follows the projected door itself.
    const sort=side?wy+T+.8:wy+.9;
    list.push([sort,c,wx-38,wy-60,false,1,0,b.fa]);
    if(!side&&d.side==='south'){
      // Goods sit against a solid frontage panel, away from the threshold.
      const offset=[2,-2].find(dx=>b.plan.tiles[d.y*b.w+d.x+dx]===Buildings.WALL);
      if(offset===undefined)return;
      const stock=livingCanvas('stock/'+b.slot+'/'+b.r,30,25,g=>{
        const timber=Interiors.timber[b.r],trim=Interiors.trim[b.r];
        if(['shop','warehouse','work','tavern'].includes(b.slot)){
          livingRect(g,2,13,26,3,timber);livingRect(g,4,16,2,8,timber);livingRect(g,24,16,2,8,timber);
          if(b.slot==='tavern')for(const x of [7,18]){
            livingPoly(g,[[x-3,4],[x+3,4],[x+5,12],[x-4,12]],'#9b7650');
            livingRect(g,x-3,6,7,1,'#50483c');livingRect(g,x-3,10,7,1,'#50483c');
          }else if(b.slot==='work'){
            livingRect(g,7,8,13,4,'#92918b');livingRect(g,18,4,3,10,'#6b5a41');
            livingRect(g,15,3,9,3,'#a5a79e');
          }else for(let i=0;i<4;i++){
            const x=4+i*6;livingPoly(g,[[x,12],[x+1,5+i%2],[x+4,4],[x+5,12]],i%2?'#b9a77b':trim);
            livingRect(g,x+1,5,3,1,'#dac69a');
          }
        }else{
          livingRect(g,3,18,24,6,'#8a6c52');livingRect(g,2,17,26,2,'#baa082');
          for(let i=0;i<8;i++){
            const x=5+i*2.7,y=11-i%3*2;livingRect(g,x,y,1,7,'#677d43');
            livingRect(g,x-1,y-1,3,2,b.slot==='healer'?'#aebda0':i%2?'#d3a777':trim);
          }
        }
      });
      list.push([wy-.3,stock,wx+offset*T-15,wy-25,false,1,0,b.fa]);
    }
  }

  function livingVisible(b,margin=64) {
    return b.x*T+b.w*T>=cam.x-margin&&b.x*T<=cam.x+vw+margin
      &&b.y*T+b.h*T>=cam.y-margin&&b.y*T<=cam.y+vh+100;
  }
  function livingDraw(g,ox0,oy0,now) {
    if(!map||map.ship)return;
    if(map.dungeonFloor){dungeonLiving(g,ox0,oy0,now);return;}
    if(map.dungeon||map.venue)return;
    g.save();g.translate(-ox0,-oy0);
    for(const b of map.blds){
      if(!b.modular||b.indoor||!livingVisible(b))continue;
      for(const d of b.plan.doors){
        const x=(b.x+d.x)*T, y=(b.y+d.y)*T;
        const side=!!d.facing.x, outward=d.facing.x||d.facing.y;
        const across=side?x+(outward>0?T:0):y+(outward>0?T:0);
        const pale=b.r===7?'#c1cdd2':b.r===5?'#8b8073':'#b8a98a';
        const x0=side?across+(outward<0?-8:0):x-4;
        const y0=side?y-2:across+(outward<0?-7:0);
        // These shallow steps are paving; they do not introduce solid cells.
        livingRect(g,x0,y0,side?8:24,side?20:7,'#514b3e');
        for(let i=0;i<3;i++)livingRect(g,x0+(side?i*2.5:0),y0+(side?0:i*2.2),side?2:24,side?20:1.5,pale);
      }
    }
    g.restore();
  }

  function livingLayers(list,now) {
    if(!map||map.dungeon||map.venue||map.ship)return;
    const smoke=livingCanvas('smoke',16,13,g=>{
      g.fillStyle='#cbc9bc';g.beginPath();g.ellipse(8,7,6,3.6,0,0,7);g.fill();
      g.beginPath();g.ellipse(5,5,3.5,3.5,0,0,7);g.fill();
    });
    for(const b of map.blds){
      if(!b.modular||b.indoor||!livingVisible(b)||b.fa<.01||!['house','cottage','tavern','work','healer','warehouse'].includes(b.slot))continue;
      const chimney=livingCanvas('chimney/'+b.r,13,25,g=>{
        const stone=b.r===7?'#a8b7c2':b.r===5?'#84736c':'#998c77';
        livingRect(g,3,4,7,21,'#4b443b');livingRect(g,3,4,4,21,stone);
        for(let y=7;y<25;y+=4)livingRect(g,3,y,7,.65,'#62594b');
        livingRect(g,1,2,11,4,stone);livingRect(g,2,1,9,2,'#423c35');
      });
      const column=Math.max(1,Math.min(b.w-2,Math.floor(b.w*.7))), row=Math.max(1,Math.floor(b.h*.38));
      if(!b.plan.roof[row*b.w+column])continue;
      const view=worldView(b),lift=view.roofLift?view.roofLift(column*T,row*T):0;
      const x=(b.x+column)*T, y=(b.y+row)*T-view.wallHeight-(b.storeyLift||0)-lift;
      list.push([b.by+1.4,chimney,x-6,y-21,false,1,0,b.fa]);
      for(let j=0;j<3;j++){
        const life=((now/4100+j/3+(b.x%13)/13)%1), sway=Math.sin(life*4+b.y)*2;
        list.push([b.by+1.5,smoke,x-7+life*12+sway,y-28-life*28,false,.5+life*.6,0,(1-life)*.3*b.fa]);
      }
    }
  }

  const LIVING_NPCS = new WeakMap();
  function livingNpcPublic(e,state,x,y,occupied=false) {
    const m=state.map,i=y*m.w+x;
    if(x<1||y<1||x>=m.w-1||y>=m.h-1||Math.hypot(x-state.home[0],y-state.home[1])>8
      ||m.solid[i]||![2,3,...(e.wander===3?[6]:[])].includes(m.t[i])
      ||(m.reg&&m.reg[i]!==e.r)||(m.venueRoofs&&m.venueRoofs.has(i))
      ||(m.doorApproaches&&m.doorApproaches.has(i)))return false;
    if(e.roam&&(x<e.roam[0]||y<e.roam[1]||x>e.roam[2]||y>e.roam[3]))return false;
    if(occupied){
      const who=m.occ.get(i);
      if((who&&who!==e)||(P&&(P.x===x&&P.y===y||Math.hypot(x-P.fx,y-P.fy)<.9)))return false;
    }
    return true;
  }
  function livingNpcReach(e,state) {
    const m=state.map,start=e.y*m.w+e.x,parent=new Map([[start,-1]]),queue=[start];
    // The eight-tile home radius contains fewer than 225 cardinal cells.
    for(let head=0;head<queue.length&&head<225;head++){
      const i=queue[head],x=i%m.w,y=Math.floor(i/m.w);
      const steps=[[0,-1],[1,0],[0,1],[-1,0]];
      for(let n=0;n<4;n++){
        const [dx,dy]=steps[(n+state.seed%4)%4],xx=x+dx,yy=y+dy,next=yy*m.w+xx;
        if(parent.has(next)||!livingNpcPublic(e,state,xx,yy))continue;
        parent.set(next,i);queue.push(next);
      }
    }
    return parent;
  }
  function livingNpcStops(e,state,parent) {
    const m=state.map,stops=[];
    const offer=(x,y,faceX,faceY,activity)=>{
      if(!parent.has(y*m.w+x)||Math.abs(x-state.home[0])+Math.abs(y-state.home[1])<2)return;
      if(stops.some(p=>p.x===x&&p.y===y))return;
      stops.push({x,y,faceX,faceY,activity});
    };
    for(const b of m.blds){
      if(b.r!==e.r||!b.modular||Math.abs(b.x-e.x)>b.w+12||Math.abs(b.y-e.y)>b.h+12)continue;
      for(const d of b.plan.doors){
        const xx=b.x+d.outside.x,yy=b.y+d.outside.y;
        const activity=['work','warehouse'].includes(b.slot)?'unload':b.slot==='tavern'?'rest':'browse';
        for(const offset of [-3,-2,2,3])offer(xx+(d.facing.y?offset:0),yy+(d.facing.x?offset:0),b.x+d.x,b.y+d.y,activity);
      }
    }
    for(const p of m.props||[]){
      if(!/^(dock_|market_|well|bench|fountain)/.test(p.kind))continue;
      if(Math.abs(p.x-state.home[0])+Math.abs(p.y-state.home[1])>10)continue;
      for(const [dx,dy]of [[0,1],[-1,0],[1,0]])offer(Math.round(p.x)+dx,Math.round(p.y)+dy,Math.round(p.x),Math.round(p.y),p.kind.startsWith('dock_')?'unload':'browse');
    }
    // Street corners provide short delivery/rest stops where a town's public
    // frontage is farther away. Every offered stop has an actual dry route.
    if(stops.length<2){
      const cells=[...parent.keys()].filter(i=>Math.hypot(i%m.w-state.home[0],Math.floor(i/m.w)-state.home[1])>=4);
      cells.sort((a,b)=>((a*31+state.seed)%101)-((b*31+state.seed)%101));
      for(const i of cells){
        const x=i%m.w,y=Math.floor(i/m.w);
        if(stops.every(p=>Math.hypot(p.x-x,p.y-y)>=4))offer(x,y,state.home[0],state.home[1],'rest');
        if(stops.length>=2)break;
      }
    }
    return stops.slice(0,6);
  }
  function livingNpcStep(e,dt) {
    if(!map||map!==world||map.dungeon||map.venue||!P||!e||e.dead||e.busy||e.tx!=null
      ||e.wander<2||!['folk','resident','traveller'].includes(e.kind)
      ||!['Townsfolk','Aldermoot','Harbour crew'].includes(e.sub)
      ||e.venueId||e.venueLine||e.hid||e.i!==undefined||e.quest||e.companion)return false;
    if(e.t>0)return true;
    let state=LIVING_NPCS.get(e);
    if(!state||state.map!==map){
      const home=Array.isArray(e.home)?e.home.slice():[e.x,e.y];
      const seed=[...(e.name||'')].reduce((n,ch)=>(n*31+ch.charCodeAt(0))>>>0,e.x*17+e.y*23);
      state={map,home,seed,index:0,path:[],stops:[],failures:0};
      if(!livingNpcPublic(e,state,e.x,e.y)){LIVING_NPCS.delete(e);return false;}
      state.stops=livingNpcStops(e,state,livingNpcReach(e,state));
      if(state.stops.length<2)return false;
      state.index=seed%state.stops.length;LIVING_NPCS.set(e,state);
    }
    const target=state.stops[state.index];
    if(e.x===target.x&&e.y===target.y){
      e.dir=dirOf(target.faceX-e.x,target.faceY-e.y);
      e.livingActivity=target.activity;e.mv=null;e.t=2.2+(state.seed+state.index*13)%35/10;
      state.index=(state.index+1)%state.stops.length;state.path=[];state.failures=0;return true;
    }
    if(!state.path.length){
      const parent=livingNpcReach(e,state);let i=target.y*map.w+target.x;
      if(!parent.has(i)){
        state.index=(state.index+1)%state.stops.length;e.t=1;return true;
      }
      while(parent.get(i)!==-1){state.path.unshift([i%map.w,Math.floor(i/map.w)]);i=parent.get(i);}
    }
    const [x,y]=state.path[0],dx=x-e.x,dy=y-e.y;
    if(!livingNpcPublic(e,state,x,y,true)||!npcStepClear(e,dx,dy)){
      e.t=.45+Math.min(.3,Math.max(0,dt||0));state.path=[];
      if(++state.failures>=3){state.index=(state.index+1)%state.stops.length;state.failures=0;e.t=1.4;}
      return true;
    }
    e.dir=dirOf(dx,dy);e.mv=[dx,dy];e.livingActivity='walking';
    sit(map,e,x,y);e.tx=x;e.ty=y;e.t=0;state.path.shift();state.failures=0;return true;
  }
