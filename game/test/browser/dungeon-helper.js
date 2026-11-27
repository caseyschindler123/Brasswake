const { test, expect } = require('@playwright/test');
const { screenshot, observeErrors } = require('./flow');
const { drivePath } = require('./movement');

async function dismiss(f) {
  const coach=f.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();
}
async function closeSheet(f) {
  for(const selector of ['#sheet [data-a=closesheet]','#say [data-a=closesheet]']){const b=f.locator(selector).last();if(await b.isVisible())await b.click();}
  for(let i=0;i<4&&await f.locator('#say-text').isVisible();i++)await f.locator('#say-text').click();
}
async function win(f, stats) {
  if(stats.solveVisibleFight)return stats.solveVisibleFight(f,stats);
  await dismiss(f);
  // Each query and each draught now allows one enemy response. Bound complete
  // exchanges, including deliberate recovery actions, rather than old batches.
  for(let n=0;n<60;n++){
    await dismiss(f);
    const state=await f.evaluate(()=>({over:!!__bw.F?.over,act:__bw.F?.act,st:__bw.F?.st,dead:__bw.S.hp<=0}));
    if(state.dead)throw Error('Dungeon traversal character died');
    if(state.over)break;
    if(state.st==='after'){
      const choose=f.locator('[data-a=fchoose]');if(await choose.isVisible())await choose.click();
    }
    const needsDraught=await f.evaluate(()=>__bw.S.hp<Progression.maxHp(__bw.S)*.7&&__bw.S.tonics>0);
    if(needsDraught&&await f.locator('[data-a=tonic]').isVisible()){
      await f.locator('[data-a=tonic]').click();
      await f.waitForFunction(()=>__bw.F&&!__bw.F.busy);
      continue;
    }
    if(await f.locator('[data-a=fpage]').first().isVisible()){const low=await f.evaluate(()=>__bw.S.mana<Progression.castCost(__bw.F.r));if(low)await f.locator('[data-a=futility][data-id=recover]').click();else await f.locator('[data-a=fpage]').first().click();}
    await expect(f.locator('#sql')).toBeVisible();await dismiss(f);
    await f.locator('#sql').fill(await f.evaluate(()=>__bw.F.task.sql));
    await f.locator('#kb [data-fn=run]').click();stats.queries++;
    await f.waitForFunction(()=>__bw.F&&!__bw.F.busy);
  }
  expect(await f.evaluate(()=>!!__bw.F?.over)).toBe(true);
  stats.fights++;
  const loot=f.locator('[data-a=floot]');
  if(await loot.isVisible()){
    await loot.click();await dismiss(f);
    const take=f.locator('[data-a=lootall]');if(await take.isVisible())await take.click();
  }else await f.locator('[data-a=fdone]').click();
  await closeSheet(f);
}
async function canvasClick(f, x, y) {
  const point=await f.evaluate(({x,y})=>{const d=Scene.debug();return {x:(x*16+8-d.cam.x)*d.zoom,y:(y*16+8-d.cam.y)*d.zoom};},{x,y});
  for(let attempt=0;attempt<3;attempt++){try{await f.locator('#stage canvas.over').click({position:point,timeout:1500});return;}catch(error){if(!await f.locator('#say').isVisible())throw error;await closeSheet(f);}}
  throw Error('Dialogue repeatedly interrupted the ground click');
}
async function assertTexture(f) {
  let samples=[];
  await expect.poll(async()=>{
    samples=await f.evaluate(async()=>{
    const {map:m,CS,TS}=Scene.debug(),im=new Image();im.src='art/'+DungeonArt.image;await im.decode();
    const atlas=document.createElement('canvas');atlas.width=im.width;atlas.height=im.height;const g=atlas.getContext('2d');g.drawImage(im,0,0);
    const samples=[];
    for(const [key,chunk] of m.chunks){const cx=key%1000,cy=Math.floor(key/1000);
      for(let ly=1;ly<CS-1;ly++)for(let lx=1;lx<CS-1;lx++){
        const x=cx*CS+lx,y=cy*CS+ly;if(m.dt[y*m.w+x]!==1)continue;
        const room=Dungeons.roomAt(m.layout,x,y),alt=room&&(room.cx+room.cy+m.f)%4===0,rc=DungeonArt.themes[m.r][alt?'alternate':'floor'];
        const actual=Array.from(chunk.getContext('2d').getImageData(lx*TS+21,ly*TS+21,1,1).data);
        const expected=Array.from(g.getImageData(rc[0]+(x*TS+21)%rc[2],rc[1]+(y*TS+21)%rc[3],1,1).data);
        samples.push({actual,expected});if(samples.length===8)return samples;
      }
    }
    return samples;
    });
    return samples.length;
  },{message:'Wait for eight rendered dungeon floor samples'}).toBe(8);
  for(const sample of samples)expect(sample.actual).toEqual(sample.expected);
}
async function assertPortalArt(f, target, r, direction) {
  const args={target,r,direction};
  await f.waitForFunction(({target,r})=>Scene.find(e=>e.r===r&&(e.id===target||e.kind===target))?.obj?.source,args);
  const facts=await f.evaluate(async({target,r,direction})=>{
    const {map,TS,cam,zoom}=Scene.debug();
    const e=Scene.find(e=>e.r===r&&(e.id===target||e.kind===target));
    const {c,ax,ay,source,supported,faceSource,copingSource}=e.obj;
    const {f:file,r:rect}=ArchitectureArt.at['architecture_'+r+'_stairs_'+direction];
    const im=new Image();
    im.src='art/'+file;
    await im.decode();
    const [, ,width,height]=rect;
    const expected=document.createElement('canvas');
    expected.width=width;
    expected.height=height;
    const g=expected.getContext('2d');
    g.drawImage(im,...rect,0,0,width,height);
    const pixels=g.getImageData(0,0,width,height).data;
    const actual=source.getContext('2d').getImageData(0,0,source.width,source.height).data;
    const index=e.y*map.w+e.x;
    const down=direction==='down';
    const scale=Math.min((down?50:44)*3/width,(down?34:44)*3/height);
    const masonry=down||[['dungeon_face',faceSource],['dungeon_coping',copingSource]].every(([name,actual])=>{
      if(!actual)return false;const entry=ArchitectureArt.at['architecture_'+r+'_'+name],a=document.createElement('canvas');
      a.width=entry.r[2];a.height=entry.r[3];a.getContext('2d').drawImage(im,...entry.r,0,0,a.width,a.height);
      return a.toDataURL()===actual.toDataURL();
    });
    return {
      masonry,
      hudClear:down||(e.y*16+16-ay-cam.y)*zoom>=108,
      painted:source.width===width&&source.height===height&&pixels.every((value,i)=>actual[i]===value),
      size:(down?c.width===Math.round(width*scale)&&c.height===Math.round(height*scale):c.width===144&&c.height===144&&supported===true&&!!faceSource&&!!copingSource)
        && c.width>=TS*2 && c.height>=TS*1.5,
      anchored:ax===c.width/6&&ay===c.height/3,
      occupiesStructuralTile:e.solid===1&&map.occ.get(index)===e&&(down?!map.solid[index]:!!map.solid[index]
        &&e.side==='north'&&[-2,-1,0].every(dy=>[-1,0,1].every(dx=>map.solid[(e.y+dy)*map.w+e.x+dx]))
        &&[1,2].every(dy=>[-1,0,1].every(dx=>!map.solid[(e.y+dy)*map.w+e.x+dx])))
    };
  },args);
  expect(facts).toEqual({masonry:true,hudClear:true,painted:true,size:true,anchored:true,occupiesStructuralTile:true});
}
async function capturePortal(f, page, info, name) {
  await f.waitForFunction(()=>!Scene.debug().map.pending);
  // Scene takes 455 ms of animation time to fade in after entering.
  await f.waitForTimeout(525);
  await screenshot(page,info,name);
}
async function walk(f, goal, stats, adjacent=true, recovering=false) {
  if(stats.fixture&&typeof goal==='string'){
    await f.evaluate(id=>{
      const {map:m}=Scene.debug(),e=m.ents.find(e=>e.id===id);if(!e)return;
      for(const mon of m.ents)if(['mon','guard','keeper'].includes(mon.kind)){mon.agg=0;mon.wander=0;mon.tx=null;mon.fx=mon.x;mon.fy=mon.y;}
      const at=[[e.x-1,e.y],[e.x+1,e.y],[e.x,e.y-1],[e.x,e.y+1]].find(([x,y])=>!m.solid[y*m.w+x]&&!m.occ.has(y*m.w+x));
      if(at)Scene.hop(...at);
    },goal);await f.waitForTimeout(450);
  }
  const recent=[];
  for(let guard=0;guard<700;guard++){
    if(stats.stopWhenGuideEnds&&await f.evaluate(()=>__bw.S.gd>=15))return;
    if(stats.solveVisibleFight)await dismiss(f);
    if(await f.locator('#say').isVisible())await closeSheet(f);
    if(await f.locator('#fight').isVisible()){await win(f,stats);recent.length=0;continue;}
    const step=await f.evaluate(({goal,adjacent})=>{
      const {map:m,P,cam,zoom}=Scene.debug(),start=P.y*m.w+P.x;
      const e=typeof goal==='string'?(m.ents.find(e=>e.id===goal&&!e.dead&&!e.dying)||m.ents.find(e=>e.id===goal)):null;
      if(typeof goal==='string'&&!e)return {missing:goal};
      const tx=e?e.x:goal[0],ty=e?e.y:goal[1],done=(x,y)=>adjacent?Math.abs(x-tx)+Math.abs(y-ty)===1:x===tx&&y===ty;
      if(done(P.x,P.y))return {done:true,e:e?{x:e.x,y:e.y,kind:e.kind,id:e.id}:null};
      function route(ignoreMonsters){
        const prev=new Int32Array(m.w*m.h).fill(-1),q=[start];prev[start]=start;let end=-1;
        for(let i=0;i<q.length;i++){
          const a=q[i],x=a%m.w,y=Math.floor(a/m.w);if(done(x,y)){end=a;break;}
          for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
            const X=x+dx,Y=y+dy,j=Y*m.w+X,occ=m.occ.get(j);
            if(X<0||Y<0||X>=m.w||Y>=m.h||m.solid[j]||prev[j]>=0||occ&&!(ignoreMonsters&&['mon','guard','keeper'].includes(occ.kind)))continue;
            prev[j]=a;q.push(j);
          }
        }
        if(end<0)return null;const path=[];for(let a=end;a!==start;a=prev[a])path.push([a%m.w,Math.floor(a/m.w)]);return path.reverse();
      }
      let path=route(false);
      const from=[P.x,P.y];
      if(!path){path=route(true);if(!path)return {blocked:{goal,at:from}};const mon=path.map(([x,y])=>m.occ.get(y*m.w+x)).find(Boolean);if(mon)return {fight:mon.id,first:path[0],from};}
      let at=null;
      for(const pos of path.slice(0,7)){
        const sx=(pos[0]*16+8-cam.x)*zoom,sy=(pos[1]*16+8-cam.y)*zoom;
        const box=document.querySelector('#stage').getBoundingClientRect();
        if(sx<28||sx>box.width-28||sy<115||sy>box.height-70)break;
        if(m.occ.has(pos[1]*m.w+pos[0]))break;
        if(!m.ents.some(e=>Math.hypot(e.fx+.5-(pos[0]+.5),e.fy+(e.big?-.2:.2)-(pos[1]+.5))<1.12))at=pos;
      }
      return {at,first:path[0],path:at?path.slice(0,path.findIndex(p=>p[0]===at[0]&&p[1]===at[1])+1):path.slice(0,1),from};
    },{goal,adjacent});
    if(step.missing)throw Error('Missing destination '+step.missing);
    if(step.blocked)throw Error('Unreachable UI destination '+JSON.stringify(step.blocked));
    if(step.done)return step.e;
    if(step.fight&&!recovering){await engage(f,step.fight,stats,true);recent.length=0;continue;}
    recent.push(step.from.join(','));if(recent.length>8)recent.shift();
    const repeated=!stats.fixture&&recent.length===8&&new Set(recent).size<=3;
    if(repeated){
      stats.pathRecoveries=(stats.pathRecoveries||0)+1;
      recent.length=0;
      const nearby=recovering?null:await f.evaluate(goal=>{
        const {map,P}=Scene.debug(),distance=e=>Math.abs(e.x-P.x)+Math.abs(e.y-P.y);
        return map.ents.filter(e=>e.id!==goal&&!e.dead&&!e.dying&&!e.hidden&&['mon','guard','keeper'].includes(e.kind)&&distance(e)<=2)
          .sort((a,b)=>distance(a)-distance(b))[0]?.id;
      },goal);
      if(nearby){await engage(f,nearby,stats,true);continue;}
    }
    if(repeated||!step.at){
      await drivePath(f,[step.first],false);
    }else await drivePath(f,step.path,true);
    // Roaming creatures can step into a route and stop ground movement.
    // Replan from the actual position; the destination assertion above still
    // requires physically reaching the requested chamber or interaction.
    await f.waitForFunction(()=>!Scene.debug().P.path.length||!!__bw.F||!!__bw.SB,null,{timeout:12000});
    const actual=await f.evaluate(()=>Scene.pos());
    stats.steps+=Math.abs(actual[0]-step.from[0])+Math.abs(actual[1]-step.from[1]);
  }
  const diagnostic=await f.evaluate(goal=>{
    const {map,P}=Scene.debug(),F=__bw.F,e=typeof goal==='string'?map.ents.find(e=>e.id===goal):null;
    return {at:[P.x,P.y],goal,target:e?[e.x,e.y]:goal,
      nearby:map.ents.filter(e=>!e.dead&&!e.dying&&!e.hidden&&['mon','guard','keeper'].includes(e.kind)&&Math.abs(e.x-P.x)+Math.abs(e.y-P.y)<=3).map(e=>e.id),
      fight:F?{id:F.ent?.id,state:F.st,title:F.title}:null};
  },goal);
  throw Error('Too many walking steps: '+JSON.stringify(diagnostic));
}
async function interact(f,id,stats,recovering=false,beforeClick){
  for(let attempt=0;attempt<20;attempt++){
    const e=await walk(f,id,stats,true,recovering);
    if(await f.locator('#fight').isVisible()){
      if(await f.evaluate(id=>__bw.F?.ent?.id===id,id))return e;
      await win(f,stats);continue;
    }
    if(beforeClick)await beforeClick();
    await canvasClick(f,e.x,e.y);await f.waitForTimeout(150);
    if(await f.locator('#fight').isVisible()){
      if(await f.evaluate(id=>__bw.F?.ent?.id===id,id))return e;
      await win(f,stats);continue;
    }
    if(['mon','guard','keeper'].includes(e.kind))continue;
    return e;
  }
  throw Error('Repeated ambushes prevented reaching '+id);
}
async function engage(f,id,stats,recovering=false){
  const status=await f.evaluate(id=>{const e=Scene.find(e=>e.id===id&&!e.dead&&!e.dying)||Scene.find(e=>e.id===id);return {kind:e?.kind,killed:!!__bw.DP.current()?.kills[id]};},id);
  if(status.killed&&(!status.kind||status.kind==='corpse'))return;
  await interact(f,id,stats,recovering);
  if(await f.locator('#fight').isVisible())await win(f,stats);
  else expect(await f.evaluate(id=>!!__bw.DP.current().kills[id],id)).toBe(true);
}


module.exports={dismiss,closeSheet,win,canvasClick,assertTexture,assertPortalArt,capturePortal,walk,interact,engage};
