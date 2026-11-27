  /* Scene-owned spatial facts; game host owns resources, SQL and rewards. */
  const combatEntity = e => !!(e && ['mon','boss','guard','keeper'].includes(e.kind) && !e.dead && e.dying == null);
  function combatState(e) { return combatEntity(e) && host.combatEnemy ? host.combatEnemy(e) : null; }
  function combatOpaque(x,y) {
    if (!map || x<0 || y<0 || x>=map.w || y>=map.h) return true;
    if (map.opaque) return !!map.opaque[y*map.w+x];
    /* On the surface water stops feet, not sight. Building walls remain solid. */
    return !!map.solid[y*map.w+x] && !(map === world && map.t[y*map.w+x]===4);
  }
  function combatFacts(e) {
    if (!map || !P || !combatEntity(e) || !map.ents.includes(e)) return null;
    const state=combatState(e),d=LiveCombat.distance(P,e),visible=clearSight(P.fx,P.fy,e.fx,e.fy);
    return { entity:e,id:e.id||e,name:e.name,distance:d,visible,lineOfFire:visible,
      melee:d<=LiveCombat.RULES.meleeRange&&interactionDistance(e)<Infinity,
      moving:!!(P.moving||P.path.length),returning:state?.phase==='return',
      hp:state?.hp,max:state?.max,aggro:state?.awareness||0,phase:state?.phase||'idle',
      windup:state?.windup||0,position:[e.fx,e.fy],player:[P.fx,P.fy] };
  }
  function combatTarget(value) {
    const e=typeof value==='string'?map?.ents.find(x=>x.id===value):value;
    if(!combatFacts(e))return false;
    if(host.combatSelect)host.combatSelect(e);
    return true;
  }
  function combatEngage(e) {
    const state=combatState(e);if(!state||!LiveCombat.engage(state))return false;
    e.pursuitAnchor=e.pursuitAnchor||e.home?.slice()||[e.x,e.y];e.engaged=true;e.chase=LiveCombat.RULES.loseDelay+100/LiveCombat.RULES.aggroDecay;e.alert=4;e.calm=0;e.busy=0;e.lastSeen=[P.fx,P.fy];
    return true;
  }
  function combatPush(e,amount=2) {
    if(!combatEntity(e)||!map)return 0;
    const dx=e.fx-P.fx,dy=e.fy-P.fy,n=Math.hypot(dx,dy)||1;let moved=0;
    e.tx=e.ty=null;
    for(let k=0;k<Math.floor(amount);k++){
      const sx=Math.abs(dx)>=Math.abs(dy)?Math.sign(dx):0,sy=sx?0:Math.sign(dy)||1;
      if(!npcStepClear(e,sx,sy))break;
      sit(map,e,e.x+sx,e.y+sy);e.fx=e.x;e.fy=e.y;moved++;
    }
    return moved;
  }
  function combatLunge(e,commit=false){
    if(!combatFacts(e))return false;
    if(LiveCombat.distance(P,e)<=LiveCombat.RULES.meleeRange)return true;
    const next=LiveCombat.pathStep([P.fx,P.fy],[e.fx,e.fy],(x,y)=>blocked(x,y),{range:LiveCombat.RULES.meleeRange,maxNodes:16,visible:(x,y)=>clearSight(x,y,e.fx,e.fy)});
    if(!next||Math.hypot(next[0]-e.fx,next[1]-e.fy)>LiveCombat.RULES.meleeRange||!clearSight(P.fx,P.fy,next[0],next[1]))return false;
    if(commit){clearSceneControls();P.x=P.fx=next[0];P.y=P.fy=next[1];P.path=[];P.moving=false;onTile();}
    return true;
  }
  function combatMove(e,next,dt,speed) {
    if(e.tx==null&&next){const [nx,ny]=next;if(!blocked(nx,ny,e)&&!heroOverlaps(nx,ny)){e.dir=dirOf(nx-e.x,ny-e.y);sit(map,e,nx,ny);e.tx=nx;e.ty=ny;}}
    if(e.tx==null)return;
    const dx=e.tx-e.fx,dy=e.ty-e.fy,d=Math.hypot(dx,dy),step=Math.min(d,speed*dt);
    advanceGait(e,step,true);e.walk=(e.walk||0)+step*2;
    if(d<=step){e.fx=e.tx;e.fy=e.ty;e.tx=e.ty=null;}else{e.fx+=dx/d*step;e.fy+=dy/d*step;}
  }
  function combatStep(dt) {
    if(!map||!P||!host.combatEnabled?.())return;
    const paused=locked||map.pending||document.hidden||!host.combatRunning?.();
    if(paused)return;
    host.combatTick?.(dt,!!(P.moving||P.path.length));
    for(const e of map.ents){
      if(!combatEntity(e))continue;
      const s=combatState(e);if(!s)continue;
      const p=s.profile,anchor=e.pursuitAnchor||e.home||[e.x,e.y],d=LiveCombat.distance(P,e),visible=clearSight(e.fx,e.fy,P.fx,P.fy),oldPhase=s.phase;
      const facing=(P.fx-e.fx)*(DIRV[e.dir]?.[0]??0)+(P.fy-e.fy)*(DIRV[e.dir]?.[1]??1)>0;
      const concealed=!!host.visibility?.().hidden;
      const detectable=s.phase==='chase'?!concealed||(host.detects?host.detects(d,facing,true):true):(host.detects?host.detects(d,facing,!!e.agg):true);
      LiveCombat.awareness(s,dt,{distance:d,homeDistance:Math.hypot(e.fx-anchor[0],e.fy-anchor[1]),visible,detectable,
        aggressive:!!e.agg&&host.aggro(),safe:!!host.safeGround?.(e)},p);
      if(s.phase==='chase'){
        e.engaged=true;e.chase=1;e.alert=4;e.hunt=true;
        if(oldPhase!=='chase'){e.pursuitAnchor=anchor.slice();host.noticed?.();host.combatSelect?.(e,true);}
        if(visible&&detectable)e.lastSeen=[P.fx,P.fy];
      }else{e.chase=0;e.engaged=false;e.hunt=false;e.alert=s.awareness>0?1:0;}
      if(s.phase==='return'){
        if(oldPhase!=='return'){s.hp=s.max;s.bleed=s.bleedTime=s.slow=s.slowTime=s.windup=0;e.lastSeen=null;host.combatReset?.(e);}
        e.returning=true;
      }else e.returning=false;
      if(s.phase==='chase'||s.phase==='return'){
        if(s.phase==='chase'&&visible){e.dir=dirOf(P.fx-e.fx,P.fy-e.fy);if(e.npcLook)e.npcFacing=NpcAppearance.direction(P.fx-e.fx,P.fy-e.fy,e.npcFacing);}
        const canAttack=s.phase==='chase'&&d<=p.range&&visible&&detectable&&(p.ranged||interactionDistance(e)<Infinity);
        if(LiveCombat.advanceEnemy(s,dt,{canAttack},p))host.combatHit?.(e,s);
        if(host.combatRunning?.()===false)break;
        if(s.bleed>0&&s.bleedTime>0){s.bleedTick=(s.bleedTick||0)+dt;if(s.bleedTick>=1){s.bleedTick-=1;host.combatBleed?.(e,s.bleed);if(e.dead)continue;}}
        if(e.tx==null){
          e.livePathWait=Math.max(0,(e.livePathWait||0)-dt);
          if(!e.livePathWait){
            const target=s.phase==='return'?anchor:e.lastSeen||[P.fx,P.fy];
            e.livePathWait=.3;
            if(s.phase==='return'||!canAttack){
              const next=LiveCombat.pathStep([e.x,e.y],target,(x,y)=>blocked(x,y,e)||heroOverlaps(x,y),{
                range:s.phase==='return'?.4:p.range,maxNodes:1400,
                visible:s.phase==='return'?()=>true:(x,y)=>clearSight(x,y,target[0],target[1])});
              if(next)combatMove(e,next,dt,p.speed*(1-s.slow));
            }
          }
        }else combatMove(e,null,dt,p.speed*(1-s.slow));
      }
    }
  }
  function combatLabels(o,ox0,oy0,z){
    if(!host.combatEnabled?.())return;
    for(const e of map.ents){
      if(!combatEntity(e)||!sight(e))continue;
      const s=combatState(e);if(!s||(!e.agg&&!s.awareness&&s.hp===s.max))continue;
      const x=(e.fx*T+8-ox0)*z,y=(e.fy*T-28-oy0)*z,w=34*dpr,h=3*dpr;
      if(x<0||y<0||x>ov.width||y>ov.height)continue;
      o.fillStyle='#101b24';o.fillRect(x-w/2-1,y-1,w+2,h*3+3);
      o.fillStyle='#b54646';o.fillRect(x-w/2,y,w*Math.max(0,s.hp/s.max),h);
      o.fillStyle=s.phase==='chase'?'#ed844f':'#d7b15b';o.fillRect(x-w/2,y+h*2,w*s.awareness/100,h);
    }
  }
