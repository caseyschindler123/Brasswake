// Injected by test:paths into localhost only. Never included in the game build.
window.installPathAudit = function ({ path, seed, mistakeEvery=0 }) {
  if (location.hostname !== 'localhost' || !window.__bw) throw Error('Path audit requires the local test server');
  const B = window.__bw, log = [], counters = {}, warnings = [];
  let randomState = seed >>> 0, offensiveQueries=0;
  const random = () => {
    randomState |= 0; randomState = randomState + 0x6D2B79F5 | 0;
    let t = Math.imul(randomState ^ randomState >>> 15, 1 | randomState);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const copy = x => JSON.parse(JSON.stringify(x));
  const snapshot = () => ({ path: B.S.path, sk: copy(B.S.sk), attr: copy(B.S.attr),
    hp: B.S.hp, mana: B.S.mana, stamina: B.S.stamina, bandages:B.S.bandages,tonics:B.S.tonics,gold: B.S.gold,
    modes: copy(B.S.skillModes), statModes: copy(B.S.attrModes), targets: copy(B.S.skillTargets),
    statTargets: copy(B.S.attrTargets), stats: copy(B.S.stats), marks: Object.keys(B.S.boss).length,
    pages: Object.keys(B.S.pages), equipment: Object.fromEntries(Object.entries(B.S.eq).map(([k,id])=>[k,B.S.inv.find(i=>i.id===id)])),
    skillTotal: Progression.total(B.S), statTotal: Progression.statTotal(B.S) });
  function check(before) {
    if (Progression.total(B.S)>700 || Progression.statTotal(B.S)>225) throw Error('Shared cap exceeded');
    if (B.S.gold<0 || B.S.mana<0 || B.S.stamina<0 || B.S.hp<0) throw Error('Negative resource');
    if (!before) return;
    for (const [id,mode] of Object.entries(before.modes)) if(mode==='lock' && (before.sk[id]||0)!==(B.S.sk[id]||0)) throw Error('Locked skill changed: '+id);
    for (const [id,mode] of Object.entries(before.statModes)) if(mode==='lock' && before.attr[id]!==B.S.attr[id]) throw Error('Locked stat changed: '+id);
  }
  function act(name,data={}) {
    const prior=Math.random;
    try { Math.random=random; B.ACT[name](data); }
    finally { Math.random=prior; }
  }
  function seeded(fn) { const prior=Math.random;try{Math.random=random;return fn();}finally{Math.random=prior;} }
  function dismiss() { act('coachok');act('closesheet'); }
  function record(kind,before,extra={}) {
    check(before);counters[kind]=(counters[kind]||0)+1;
    const after=snapshot();
    log.push({kind,r:B.S.region,q:after.stats.q,deltaGold:after.gold-before.gold,
      gains:Object.fromEntries(Progression.ids.map(id=>[id,+( (after.sk[id]||0)-(before.sk[id]||0)).toFixed(1)]).filter(([,v])=>v)),
      attrs:Object.fromEntries(Progression.stats.map(id=>[id,+(after.attr[id]-before.attr[id]).toFixed(1)]).filter(([,v])=>v)),
      hp:after.hp,mana:after.mana,stamina:after.stamina,...extra});
    return after;
  }
  function answer(kind,wrong=false) {
    dismiss();const c=B.F||B.Q;if(!c?.task)throw Error('Missing real query for '+kind);
    if(['attack','backstab'].includes(kind) && mistakeEvery && ++offensiveQueries%mistakeEvery===0)wrong=true;
    if(B.Q?.step==='learn')act('qturn');
    const before=snapshot(),sql=wrong?'SELECT -987654321 AS unrelated_result':c.task.sql;
    const box=document.querySelector('#sql');if(!box)throw Error('SQL input missing for '+kind);
    box.value=sql;act('run');
    if(B.F?.busy)throw Error('Fast presentation did not complete');
    if(!wrong && B.F?.res && !B.F.res.ok)throw Error('Reference SQL rejected: '+JSON.stringify(B.F.res));
    if(B.Q && B.Q.step!=='result')throw Error('Reference SQL did not complete '+kind+': '+document.querySelector('#enc').textContent.slice(-500));
    record(kind,before,{grade:B.F?.res?.grade||(!wrong?'correct':'wrong'),result:(B.F?.after||B.Q?.result||'').replace(/<[^>]*>/g,' ').slice(0,160)});
    if(B.Q)act('qleave');
  }
  function equip() {
    const weapon={warrior:'swords',mage:'magery',thief:'fencing'}[path];
    const score=i=>(i.stats.def||0)*3+(i.stats.dmg||0)*3+(i.stats.xp||0)*3+(i.stats.learn||0)*2+(i.stats.deft||0)+(i.stats.luck||0)+(i.stats.gold||0);
    for(const slot of ['weapon','shield','armor','head','hands','feet','cloak','ring','charm','relic']) {
      const candidates=B.S.inv.filter(i=>i.slot===slot&&(slot!=='weapon'||i.w===weapon)&&(path!=='thief'||slot!=='armor'||/Leather/.test(i.name))).sort((a,b)=>score(b)-score(a));
      if(candidates[0] && B.S.eq[slot]!==candidates[0].id)act('equip',{id:candidates[0].id});
      else if(path==='thief'&&slot==='armor'&&!candidates.length&&B.S.eq.armor)act('unequip',{s:'armor'});
    }
    dismiss();
  }
  function rest() {
    if(B.S.hp<Progression.maxHp(B.S)) {const before=snapshot();act('rest',{c:4*B.S.region});record('paid-rest',before);}
    if(path==='mage') {
      const cost=Math.max(...Content.PAGES.filter(p=>p.book==='spell'&&B.S.pages[p.id]).map(p=>Progression.castCost(p.c)));
      if(B.S.mana<cost*2)for(let i=0;i<12&&B.S.mana<Math.min(Progression.maxMana(B.S),cost*3);i++){seeded(()=>B.beginSkillWork('recover'));answer('out-recover');}
    }
    if(path==='thief'&&B.S.stamina<16)for(let n=0;n<3&&B.S.stamina<Math.min(24,Progression.maxStamina(B.S));n++){seeded(()=>B.beginSkillWork('recover'));if(!B.Q)break;answer('out-stamina');}
  }
  function travel(r) {
    if(B.F||B.Q)throw Error('Travel with unfinished action');dismiss();
    const town=Scene.towns()[r],at=Scene.safePosition(town,r);if(!at)throw Error('No safe town '+r);
    Scene.warp(...at);B.HOST.entered(r);B.setCE(null);counters.travelShortcuts=(counters.travelShortcuts||0)+1;
    act('tab',{t:'world'});Scene.pause();
  }
  function contract(id) {seeded(()=>B.START.contract({id}));answer('lesson');equip();}
  function shopping(r) {
    const e=Scene.find(e=>e.r===r&&e.kind==='npc');if(!e)throw Error('No regional teacher '+r);B.setCE(e);
    const books=path==='mage'?['spell']:path==='thief'?['arms','shadow']:['arms'];
    for(const p of Content.PAGES.filter(p=>p.c===r&&!p.rare&&books.includes(p.book)&&!B.S.pages[p.id])) {
      if(B.S.gold>=p.price){const before=snapshot();act('buypage',{id:p.id});record('buy-page',before,{page:p.id});}
      else warnings.push('Cannot afford '+p.id+' in Circle '+r);
    }
    supplies(r,3);
    if(r===8){const before=snapshot();act('sellcommon');record('sell-unworn-common',before);}
    if(r===8)for(const vendor of Scene.ents().filter(e=>e.kind==='specialist'&&[0,1].includes(e.specialty))){
      B.setCE(vendor);seeded(()=>B.SH.specialist(vendor));const stock=B.S.cs['specialist:'+vendor.specialty];
      for(let n=0;n<2&&stock?.items.length;n++) {
        const skill={warrior:'swords',mage:'magery',thief:'fencing'}[path];
        const i=stock.items.findIndex(it=>it.slot==='weapon'&&it.w===skill&&(it.stats.dmg||0)>(B.S.inv.find(x=>x.id===B.S.eq.weapon)?.stats.dmg||0)||it.slot==='shield'&&(it.stats.def||0)>(B.S.inv.find(x=>x.id===B.S.eq.shield)?.stats.def||0));
        if(i<0)break;B.setCE(vendor);B.SH.specialist(vendor);const button=document.querySelector(`[data-a=buygear][data-i="${i}"]`),cost=button&&Number.parseInt(button.textContent,10);if(!cost||B.S.gold-cost<200)break;
        const before=snapshot(),item=stock.items[i];act('buygear',{i:String(i)});
        if(!B.S.inv.some(x=>x.id===item.id)||before.gold-B.S.gold!==cost)throw Error('The intended upgrade was not actually purchased: '+item.name);
        record('buy-upgrade',before,{name:item.name,cost});equip();
      }
    }
    if(path==='mage')for(let n=0;n<3&&SkillCrafting.can(B.S,'spellscroll',r);n++){B.setCE(e);act('profession',{id:'spellscroll'});if(B.Q)answer('inscribe-scroll');}
    dismiss();
  }
  function supplies(r,desired=5) {
    const healer=Scene.find(e=>e.r===r&&e.kind==='healer');if(!healer)return;B.setCE(healer);B.SH.healer(healer);const button=document.querySelector('[data-a=buytonic]');
    if(button)for(let n=0;n<desired&&B.S.tonics<desired&&B.S.gold>=Number(button.dataset.c);n++){const before=snapshot();act('buytonic',{c:button.dataset.c});record('buy-tonic',before);}
    B.SH.healer(healer);const band=document.querySelector('[data-a=buybandages]');if(band)for(let n=0;n<3&&B.S.bandages<10&&B.S.gold>=Number(band.dataset.c);n++){const before=snapshot();act('buybandages',{c:band.dataset.c});record('buy-bandages',before);}
    dismiss();Scene.pause();
  }
  function closeFight() {
    if(!B.F)return;
    const dead=B.S.hp<=0,body=B.F.body;
    if(body){act('floot');act('lootall');}else act('fdone');
    dismiss();
    if(dead) {
      const remains=Scene.find(e=>e.mine);if(remains){B.setCE(remains);B.SH.corpse(remains);act('lootall');dismiss();counters.bodyRecoveryShortcuts=(counters.bodyRecoveryShortcuts||0)+1;}
    }
    equip();Scene.pause();
  }
  // Campaign travel/approach is compressed; recovery and enemy attacks use real
  // active-world time. Never advance clocks or refill resources from this helper.
  async function fight(e,{boss=false,utilitySample=false,active=false}={}) {
    if(!e)throw Error('Missing campaign combat target');
    if(!active&&!B.Combat.active())rest();const start=snapshot();B.setCE(e);
    if(active)boss=B.F?.kind==='boss'||e.kind==='boss';
    else {
      // Keep the existing encounter-approach shortcut, now checked against real
      // range/LOS. It grants no skill, gear, knowledge or combat resources.
      const facts=Scene.combatFacts(e);
      if(!facts?.melee){
        const {map}=Scene.debug(),at=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>[e.x+dx,e.y+dy])
          .find(([x,y])=>x>0&&y>0&&x<map.w&&y<map.h&&!map.solid[y*map.w+x]&&!map.occ.has(y*map.w+x)&&map.t[y*map.w+x]!==4);
        if(!at)throw Error('No clear campaign approach to '+e.name);
        Scene.hop(...at);counters.encounterApproachShortcuts=(counters.encounterApproachShortcuts||0)+1;
      }
      if(!B.Combat.active())B.Combat.setSupply(B.S.tonics>0?'draught':'bandage');
      seeded(()=>boss?B.START.boss():B.START.monster(e));
    }
    dismiss();Scene.resume();let n=0;
    while(B.S.hp>0&&!e.dead&&!B.F?.over&&n<60) {
      if(B.F?.live&&B.F.st==='after')B.Combat.cancel();
      if(B.F?.st==='prompt') {
        if(!B.F.live)throw Error('Unexpected non-live campaign fight');
        answer(B.F.actionId==='backstab'?'backstab':'attack');n++;continue;
      }
      const deadline=performance.now()+15000;
      while(!B.Combat.snapshot().recovery.ready&&!B.F?.over&&B.S.hp>0) {
        if(performance.now()>deadline)throw Error('Live campaign recovery did not finish');
        await new Promise(resolve=>requestAnimationFrame(resolve));
      }
      if(B.F?.over||B.S.hp<=0||e.dead)break;
      B.Combat.selectTarget(e);
      const view=B.Combat.snapshot(),slots=view.loadout.filter(a=>a?.ready),basic=view.actions.find(a=>a.id==='basic.'+({warrior:'swords',mage:'magery',thief:'fencing'}[path]));
      let choice=null;
      if(B.S.hp<Progression.maxHp(B.S)*.55)choice=slots.find(a=>a.effect==='heal')||view.actions.find(a=>a.id==='supply'&&a.ready);
      if(!choice&&(!basic?.ready&&/mana|stamina/i.test(basic?.reason||'')||utilitySample&&n===0))
        choice=view.actions.find(a=>a.id==='recover'&&a.ready);
      if(!choice&&utilitySample&&n===0)choice=slots.find(a=>a.target==='self');
      if(!choice)choice=slots.find(a=>a.target==='enemy')||(basic?.ready?basic:null);
      if(!choice?.ready)throw Error('No ready campaign action: '+(basic?.reason||'target/loadout unavailable'));
      if(!seeded(()=>B.Combat.begin(choice.id)))throw Error('Campaign action rejected: '+choice.id);
      answer(choice.id.startsWith('basic.')||choice.target==='enemy'?'attack':'combat-'+choice.effect);n++;
    }
    if(!B.F?.over&&!e.dead&&B.S.hp>0){warnings.push('Combat stalled after 60 actions: '+e.name);throw Error(warnings.at(-1));}
    const won=boss?!!B.S.boss[e.r]:B.F?.foe?.hp<=0;
    record(boss?'examiner':'encounter',start,{won,actions:n,title:e.name});closeFight();return won;
  }
  function locks(r) {
    for(const e of Scene.ents().filter(e=>e.kind==='cache'&&e.r===r&&!B.S.cache[e.cid]).slice(0,2)) {
      B.setCE(e);B.SH.cache(e);if(!document.querySelector('[data-a=lockwork]')){dismiss();continue;}
      for(let n=0;n<12 && !B.S.openLocks?.['surface:'+e.cid];n++) {
        act('lockwork',{kind:'lock'});answer('lockpick');
        if(!B.S.cache[e.cid]){B.setCE(e);B.SH.cache(e);}
      }dismiss();
    }
  }
  const theftTargets=new Set();let theftPending=null,strikePending=null;
  function clearCell(map,x,y,r) {const i=y*map.w+x;return x>0&&y>0&&x<map.w&&y<map.h&&map.reg[i]===r&&!map.solid[i]&&!map.occ.has(i)&&map.t[i]!==4;}
  function facing(e) {return e.npcLook?Scene.debug().npcPose(e).direction:({f:0,l:2,b:4,s:6}[e.dir]||0);}
  function prepareStrike(r,index=0,boss=false) {
    rest();dismiss();Scene.pause();const {map}=Scene.debug(),enemies=Scene.ents().filter(e=>e.kind==='mon'&&e.r===r&&!e.dead&&!e.dying&&e.inst?.tpl?.startsWith('b'));
    const e=boss?Scene.find(e=>e.kind==='boss'&&e.r===r):enemies[index%enemies.length];if(!e)return null;
    strikePending=e;
    if((B.S.sk.stealth||0)<10)return {fallback:true};
    for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]) {
      if(!Backstab.rear(-dx,-dy,facing(e)))continue;
      const cells=[3,2,1].map(n=>[e.x-n*dx,e.y-n*dy]);if(!cells.every(([x,y])=>clearCell(map,x,y,r)))continue;
      Scene.hop(...cells[0]);B.setCE(null);
      for(let n=0;n<3&&!B.CONCEAL.hidden;n++){seeded(()=>B.beginSkillWork('hide'));if(!B.Q)return {fallback:true};answer('hide-for-backstab');}
      if(!B.CONCEAL.hidden)return {fallback:true};Scene.resume();return {path:cells.slice(1)};
    }return {fallback:true};
  }
  async function strikePendingTarget(boss=false) {
    const e=strikePending;if(!e)return {done:true};
    if(B.F){await resolveIntercept();if(e.dead||boss&&B.S.boss[e.r])return {done:true,won:true};return {fallback:true};}
    const before=snapshot();B.setCE(e);seeded(()=>boss?B.START.boss():B.START.monster(e));
    if(!B.F?.ambush){const reason=document.querySelector('.backstab-choice .cap2')?.textContent;record('backstab-unavailable',before,{reason});act('flee');counters.backstabFallbacks=(counters.backstabFallbacks||0)+1;return {fallback:true};}
    act('fbackstab');if(!B.F?.backstab){act('flee');return {fallback:true};}
    answer('backstab');const won=B.F.foe.hp<=0;
    record(boss?'backstab-examiner':'backstab-encounter',before,{won,title:e.name});
    if(won||B.S.hp<=0){closeFight();return {done:true,won};}
    act('flee');Scene.resume();return {done:false};
  }
  function line(map,ax,ay,bx,by){const n=Math.ceil(Math.max(Math.abs(bx-ax),Math.abs(by-ay))*2);for(let k=1;k<n;k++){const x=Math.floor(ax+(bx-ax)*k/n+.5),y=Math.floor(ay+(by-ay)*k/n+.5);if(map.solid[y*map.w+x])return false;}return true;}
  function route(goal,maxSteps) {
    const {map}=Scene.debug(),start=Scene.pos(),queue=[[...start,[]]],seen=new Set([start.join(',')]);
    for(let n=0;n<queue.length&&n<2200;n++){const [x,y,path]=queue[n];if(path.length&&goal(x,y,map))return path;if(path.length>=maxSteps)continue;
      for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(!seen.has(k)&&clearCell(map,nx,ny,B.S.region)){seen.add(k);queue.push([nx,ny,path.concat([[nx,ny]])]);}}}return null;
  }
  function escapeRoute() {
    if(B.F)return null;const e=strikePending;if(!e)return null;
    const path=route((x,y,map)=>Math.hypot(e.fx-x,e.fy-y)>=8||Math.hypot(e.fx-x,e.fy-y)>2&&!line(map,e.fx,e.fy,x,y),14);
    dismiss();Scene.resume();return path;
  }
  function returnRoute() {
    if(B.F)return null;seeded(()=>B.beginSkillWork('hide'));if(!B.Q)return null;answer('reconceal');if(!B.CONCEAL.hidden)return null;
    const e=strikePending,path=route((x,y,map)=>Math.abs(e.x-x)+Math.abs(e.y-y)===1&&Backstab.rear(x-e.fx,y-e.fy,facing(e))&&line(map,e.fx,e.fy,x,y),B.CONCEAL.steps);
    if(!path){warnings.push('No concealed return route within current Stealth budget');act('conceal');return null;}dismiss();Scene.resume();return path;
  }
  function resolveIntercept(){if(!B.F)return;warnings.push('A patrol intercepted the approach');return fight(B.F.ent,{active:true});}
  async function fallbackStrike(boss=false) {const e=strikePending;if(B.F)await resolveIntercept();if(e?.dead||boss&&e&&B.S.boss[e.r])return true;return e?fight(e,{boss}):false;}
  function continueApproach() {const e=strikePending;if(!e||B.F||!B.CONCEAL.hidden)return null;const [x,y]=Scene.pos();if(Math.abs(e.x-x)+Math.abs(e.y-y)===1&&Scene.behind(e)&&Scene.sight(e))return [];return route((x,y,map)=>Math.abs(e.x-x)+Math.abs(e.y-y)===1&&Backstab.rear(x-e.fx,y-e.fy,facing(e))&&line(map,e.fx,e.fy,x,y),B.CONCEAL.steps);}
  function prepareTheft(r) {
    dismiss();Scene.pause();const {map}=Scene.debug();
    for(const e of Scene.ents()) {
      if(e.kind!=='mon'||e.r!==r||e.dead||e.dying||!e.inst?.tpl?.startsWith('b')||theftTargets.has(e)||!CreatureLoot.carries(e))continue;
      for(const [dx,dy,key] of [[1,0,'ArrowRight'],[-1,0,'ArrowLeft'],[0,1,'ArrowDown'],[0,-1,'ArrowUp']]) {
        if(!Backstab.rear(-dx,-dy,facing(e)))continue;
        const cells=[3,2,1].map(n=>[e.x-n*dx,e.y-n*dy]);
        if(!cells.every(([x,y])=>{const i=y*map.w+x;return map.reg[i]===r&&!map.solid[i]&&!map.occ.has(i)&&map.t[i]!==4;}))continue;
        Scene.hop(...cells[0]);B.setCE(null);seeded(()=>B.beginSkillWork('hide'));if(!B.Q)continue;answer('hide');
        if(!B.CONCEAL.hidden){Scene.pause();return {retry:true};}
        // A real arrow-key step below exercises movement, detection and Stealth gain.
        theftPending=e;Scene.resume();return {key,at:cells[0],to:cells[2],path:cells.slice(1)};
      }
    }return null;
  }
  async function steal(id,prize=false) {
    const e=theftPending;if(!e||!Scene.ents().includes(e))throw Error('Theft target disappeared');
    if(B.F){await resolveIntercept();return;}if(e.dead||!B.CONCEAL.hidden){warnings.push('Concealment lost before theft in Circle '+e.r);return;}
    theftTargets.add(e);const before=snapshot();seeded(()=>B.START.monster(e));act('fsteal');
    if(B.F?.act!=='steal'){act('flee');warnings.push('Concealment lost before theft in Circle '+e.r);return;}
    if(prize)act('fprize',{id:'prize'});answer(prize?'steal-prize':'steal-purse');
    record('theft-attempt',before,{prize,success:/Clean lift/.test(B.F?.after||'')});closeFight();
  }
  function skillControls(id,stat=false) {
    const value=stat?B.S.attr[id]:B.S.sk[id]||0,before=snapshot();
    act('progressmode',{id,stat:stat?'1':'0'});act('progressmode',{id,stat:stat?'1':'0'});
    if(Progression.mode(B.S,id,stat)!=='lock')throw Error('Lock control failed '+id);
    return {id,stat,value,before};
  }
  function controlMode(id,next,stat=false) {
    act('tab',{t:'hero'});for(let n=0;n<3&&Progression.mode(B.S,id,stat)!==next;n++)act('progressmode',{id,stat:stat?'1':'0'});
    if(Progression.mode(B.S,id,stat)!==next)throw Error('Mode control failed '+id);
    counters['control-'+next]=(counters['control-'+next]||0)+1;
    act('tab',{t:'world'});dismiss();Scene.pause();
  }
  function controlTarget(id,n,stat=false) {
    act('tab',{t:'hero'});const box=document.querySelector(`input[data-target="${id}"][data-stat="${stat?'1':'0'}"]`);
    if(!box)throw Error('Target control missing '+id);box.value=n==null?'':String(n);act('progresstarget',{id,stat:stat?'1':'0'});
    act('tab',{t:'world'});dismiss();Scene.pause();
  }
  function learnBackstab() {
    if(path!=='thief'||(B.S.sk.stealth||0)>=10)return;
    controlTarget('stealth',10);act('djtrain');
    for(let n=0;n<10&&(B.S.sk.stealth||0)<10;n++) {
      let quote=B.trainCost('stealth',5),points=5;if(B.S.gold<quote.c){quote=B.trainCost('stealth',1);points=1;}
      if(!quote.add||B.S.gold<quote.c)break;const before=snapshot();act('train',{id:'stealth',n:String(points)});record('paid-stealth-lesson',before,{cost:quote.c});
      if(JSON.stringify(before.attr)!==JSON.stringify(B.S.attr))throw Error('Dojo granted free attribute gains');
    }
    if((B.S.sk.stealth||0)>=10&&Progression.mode(B.S,'stealth')!=='lock')throw Error('Paid training ignored stop target');
    controlTarget('stealth',null);controlMode('stealth','up');dismiss();Scene.pause();
  }
  window.PathAudit={act,answer,equip,rest,travel,contract,shopping,supplies,fight,locks,prepareTheft,steal,prepareStrike,strikePendingTarget,escapeRoute,returnRoute,fallbackStrike,continueApproach,resolveIntercept,snapshot,log,warnings,counters,check,skillControls,controlMode,controlTarget,learnBackstab,
    movement:(before,purpose)=>record(purpose,before,{position:Scene.pos(),concealed:B.CONCEAL.hidden,steps:B.CONCEAL.steps}),
    report:()=>({path,seed,mistakeEvery,final:snapshot(),counters,warnings,log}),
    enemies:r=>Scene.ents().filter(e=>e.kind==='mon'&&e.r===r&&!e.dead&&!e.dying&&e.inst?.tpl?.startsWith('b')),
    checkpoint:label=>({label,...snapshot()}),
    start(){window.__bwFast=true;Sound.setMu(false);Sound.setFx(false);dismiss();Scene.pause();check();return snapshot();}
  };
};
