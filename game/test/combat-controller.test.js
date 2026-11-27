const test=require('node:test'),assert=require('node:assert/strict');
global.LiveCombat=require('../src/live_combat');global.Techniques=require('../src/techniques');global.BattleRules=require('../src/battle_rules');
const {create}=require('../src/combat_controller');
function setup(){
  let s={sk:{magery:100,swords:100},attr:{dex:50},pages:{},mana:100,stamina:100,hp:50,bandages:3,tonics:2},f=null,paused=false,draft='',tasks=0;
  const e={id:'enemy',kind:'mon',name:'Mage',r:8},config={r:8,diff:92,title:'Mage',foe:{hp:200,max:200}};
  const h={state:()=>s,weapon:()=>({w:'swords'}),entities:()=>[e],facts:e=>({distance:1,visible:true,lineOfFire:true,melee:true,returning:e.combat?.phase==='return'}),
    encounter:()=>config,fight:()=>f,paused:()=>paused,pausedForLoadout:()=>false,retire:()=>{f=null;paused=false;},resume:()=>paused=false,changed:()=>{},message:()=>{},save:()=>{},circle:()=>8,difficulty:()=>92,
    maxHp:()=>100,maxMana:()=>100,maxStamina:()=>100,manaCost:n=>n,backstab:()=>'No opening.',draft:()=>draft,
    open:cfg=>{f=cfg;paused=true;},task:c=>({sql:'SELECT '+(++tasks),r:c}),challenge:()=>{},
    practice:()=>{},engage:e=>LiveCombat.engage(e.combat),reveal:()=>{},recover:()=>{s.mana=Math.min(100,s.mana+25);},bandage:()=>10,heal:n=>{const old=s.hp;s.hp=Math.min(100,s.hp+n);return s.hp-old;},
    attack:()=>({damage:20}),present:()=>{},settled:()=>{},push:()=>{},victory:()=>{},finish:()=>paused=false,enemyDamage:()=>5,defeat:()=>{}};
  const c=create(h);c.snapshot();c.selectTarget(e);return {c,e,get s(){return s;},get f(){return f;},setDraft:v=>draft=v,tasks:()=>tasks,replace:()=>{s={...s,techniques:undefined,pages:{}};}};
}
test('opponent offsets reach real IX/X and four-slot equipment uses real skill',()=>{
  const x=setup();Techniques.learn(x.s,'magery.frost-dart');Techniques.learn(x.s,'magery.unwrite');
  assert.equal(x.c.equip('magery.frost-dart',0).ok,true);assert.equal(x.c.equip('magery.unwrite',1).ok,true);
  assert.equal(x.c.descriptor('magery.frost-dart').sqlCircle,9);assert.equal(x.c.descriptor('magery.unwrite').sqlCircle,10);
  x.s.sk.magery=94;assert.equal(x.c.descriptor('magery.unwrite').eligible,false);assert.equal(x.s.techniques.equipped[1],'magery.unwrite');
});
test('cancel retains task, draft, editor state and assistance across action changes',()=>{
  const x=setup();assert.equal(x.c.begin('basic.magery'),true);const original=x.f.task;
  x.f.hint=1;x.f.fixed=1;x.f.editorState={selectionStart:4};x.setDraft('SELECT draft');x.c.cancel();
  assert.equal(x.c.begin('basic.swords'),true);assert.equal(x.f.task,original);assert.equal(x.f.drafts[original.sql],'SELECT draft');assert.equal(x.f.hint,1);assert.equal(x.f.fixed,1);assert.equal(x.f.editorState.selectionStart,4);assert.equal(x.tasks(),1);
});
test('wrong committed spells spend resources and recovery; movement never bypasses shared physical recovery',()=>{
  const x=setup();x.c.begin('basic.magery');const f=x.f;f.queryPower=0;f.round=1;x.c.resolve(f,{quality:0});
  assert.equal(x.s.mana,97);assert.equal(x.e.combat.hp,200);assert.equal(x.c.snapshot().recovery.discipline,'magery');assert.equal(x.c.begin('basic.swords'),false);
  x.c.tick(2,false);x.c.cancel();assert.equal(x.c.begin('basic.swords'),true);x.f.queryPower=1;x.f.round=1;x.c.resolve(x.f,{quality:1});
  const remaining=x.c.snapshot().recovery.remaining;x.c.tick(2,true);assert.equal(x.c.snapshot().recovery.remaining,remaining);assert.equal(x.e.combat.hp,180);
});
test('prepared scroll pays mana only and cannot bypass learned skill or slots',()=>{
  const x=setup();x.s.mana=0;x.s.prepared=2;assert.equal(x.c.begin('magery.unwrite'),false);
  assert.equal(x.c.begin('basic.magery'),true);x.f.queryPower=1;x.f.round=1;x.c.resolve(x.f,{quality:1});assert.equal(x.s.prepared,1);assert.equal(x.s.mana,0);
});
test('owner replacement clears target/preparation/recovery without sharing knowledge',()=>{
  const x=setup();Techniques.teach(x.s,1);x.c.begin('basic.magery');x.c.cancel();x.replace();const view=x.c.snapshot();assert.equal(view.target,null);assert.equal(view.techniques.some(t=>t.learned),false);assert.equal(view.recovery.ready,true);
});
test('a defeated target cannot award another action victory or keep combat active',()=>{
  const x=setup();x.e.combat.hp=0;x.e.combat.phase='chase';assert.equal(x.c.active(),false);assert.equal(x.c.descriptor('basic.magery').ready,false);assert.equal(x.c.begin('basic.magery'),false);
});
test('healing and wards are available before high mastery and support uses local SQL outside pursuit',()=>{
  const x=setup();assert.equal(Techniques.get('magery.healing').requirement,60);assert.equal(Techniques.get('magery.ward').requirement,70);
  Techniques.teach(x.s,2);x.c.equip('magery.healing',0);assert.equal(x.c.descriptor('magery.healing').sqlCircle,9);
  assert.equal(x.c.begin('magery.healing'),true);assert.equal(x.f.ent,null);assert.equal(x.f.kc,9);
});
