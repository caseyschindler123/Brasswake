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
  // Fitted jambs and lintels belong to BuildingView's real aperture.
  // Entrance decoration never puts a canopy in front of the moving leaf.
  function venueEntrance() {}

  function livingVisible(b,margin=64) {
    return b.x*T+b.w*T>=cam.x-margin&&b.x*T<=cam.x+vw+margin
      &&b.y*T+b.h*T>=cam.y-margin&&b.y*T<=cam.y+vh+100;
  }
  function livingDraw(g,ox0,oy0,now) {
    if(!map||map.ship)return;
    if(map.dungeonFloor){dungeonLiving(g,ox0,oy0,now);return;}
    if(map.dungeon||map.venue)return;
    // Surface thresholds meet grade; stair artwork is reserved for actual travel.
  }

  function livingLayers(list,now) {
    if(!map||map.dungeon||map.venue||map.ship)return;
    const smoke=livingCanvas('smoke',16,13,g=>{
      g.fillStyle='#cbc9bc';g.beginPath();g.ellipse(8,7,6,3.6,0,0,7);g.fill();
      g.beginPath();g.ellipse(5,5,3.5,3.5,0,0,7);g.fill();
    });
    for(const b of map.blds){
      if(!b.modular||b.indoor||!livingVisible(b)||b.fa<.01||!['house','cottage','tavern','work','healer','warehouse'].includes(b.slot))continue;
      const painted=architecturePiece(b.r,'chimney');
      if(painted){
        const view=worldView(b),candidates=[];
        for(let y=1;y<b.h-1;y++)for(let x=1;x<b.w-1;x++){
          if(!b.plan.roof[y*b.w+x])continue;
          const lx=(x+.5)*T,ly=(y+.5)*T;
          if(Math.min(...[-8,8].flatMap(dx=>[-3,3].map(dy=>view.roofLift(lx+dx,ly+dy))))<3)continue;
          candidates.push({lx,ly,d:Math.hypot(x-b.w*.55,y-b.h*.62)});
        }
        const anchor=candidates.sort((a,b)=>a.d-b.d)[0];
        if(anchor){
          const {lx,ly}=anchor,lift=view.roofLift(lx,ly);
          const chimney=livingCanvas('painted-chimney/'+artVer+'/'+b.plan.id,36,50,g=>{
            const h=14*painted.height/painted.width;g.drawImage(painted,11,40-h,14,h);
            const point=dx=>[18+dx,39-(view.roofLift(lx+dx,ly-1)-lift)];
            const a=point(-8),z=point(8);g.save();g.beginPath();g.moveTo(...a);g.lineTo(...z);
            g.lineTo(z[0],z[1]+3);g.lineTo(a[0],a[1]+3);g.closePath();g.clip();
            g.drawImage(view.roof,(lx-18)*K,(ly-lift-40)*K,36*K,50*K,0,0,36,50);g.restore();
          });
          list.push([b.by+1.4,chimney,b.x*T+lx-18,b.y*T+ly-view.wallHeight-(b.storeyLift||0)-lift-40,false,1,0,b.fa]);
        }
        continue;
      }
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
