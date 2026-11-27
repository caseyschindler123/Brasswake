/* Gameplay adapter: presentation consumes snapshots; all mutations revalidate here. */
const CombatController = (() => {
  function create(h) {
    let owner=null,target=null,cooldown=LiveCombat.recovery(),protection=null,prepared=null,serial=0;
    const preparations=new Map();let assistance={hint:0,shown:0,fixed:0};
    const state=()=>h.state();
    const sync=()=>{if(owner!==state()){owner=state();target=null;cooldown=LiveCombat.recovery();protection=null;prepared=null;preparations.clear();assistance={hint:0,shown:0,fixed:0};Techniques.normalize(state());}else if(!state().techniques)Techniques.normalize(state());};
    const active=()=>h.entities().some(e=>!e.dead&&e.combat?.phase==='chase'&&e.combat.hp>0);
    const weapon=()=>h.weapon()?.w||'swords', equippedWeapon=()=>h.weapon()?.w||null;
    function enemy(e,cfg) {
      if(!e||!['mon','boss','guard','keeper'].includes(e.kind)||e.dead)return null;
      if(!e.id)e.id='live-'+(++serial);
      if(cfg)e.combatConfig=cfg;
      if(e.combat&&e.combat.owner===state().uid)return e.combat;
      const config=cfg||e.combatConfig||h.encounter(e),p=LiveCombat.profile({role:config.drole,name:config.title,circle:config.r,boss:!!config.boss});
      e.combat={...LiveCombat.enemy(),queries:0,owner:state().uid,hp:config.foe.hp,max:config.foe.max,profile:p,config};
      return e.combat;
    }
    function prepare(cfg) {
      sync();const e=cfg.ent;if(!e)return false;
      const s=enemy(e,cfg);s.config={...cfg,foe:{...cfg.foe,hp:s.hp,max:s.max}};
      if(cfg.boss)e.combatAuthorized=true;
      target=e;h.resume();h.changed();return true;
    }
    function selectTarget(value,automatic=false) {
      sync();const e=typeof value==='string'?h.entities().find(e=>e.id===value):value;
      if(!e||!h.facts(e)||e.dead)return false;
      if(automatic&&target&&h.facts(target)&&!target.dead)return true;
      if(h.fight()?.live&&h.fight().st==='prompt')return false;
      target=e;enemy(e);h.changed();return true;
    }
    const baseline=id=>{
      if(id==='recover')return {id,name:'Recover',discipline:'support',target:'self',effect:'recover',power:1,mana:0,stamina:0,sqlOffset:0,range:0,recovery:3};
      if(id==='supply')return {id,name:state().techniques.supply==='draught'?'Draught':'Bandage',discipline:'support',target:'self',effect:state().techniques.supply,mana:0,stamina:0,sqlOffset:0,range:0,recovery:2.8};
      if(id==='backstab')return {id,name:'Backstab',discipline:'fencing',target:'enemy',effect:'backstab',power:1,mana:0,stamina:8,sqlOffset:0,range:1.35,recovery:3};
      if(id==='steal')return {id,name:'Steal',discipline:'stealing',target:'enemy',effect:'covert',mana:0,stamina:0,sqlOffset:0,range:1.35,recovery:2};
      if(id==='hide')return {id,name:h.hidden?.()?'Reveal':'Hide',discipline:'support',target:'self',effect:'hide',mana:0,stamina:0,sqlOffset:0,range:0,recovery:2};
      return id?.startsWith('basic.')?Techniques.basic(id.slice(6)):Techniques.get(id);
    };
    function referenceTarget(){return target&&h.facts(target)&&!target.dead&&enemy(target).hp>0?target:h.entities().filter(e=>e.combat?.phase==='chase'&&e.combat.hp>0&&!e.dead).sort((a,b)=>(b.combat.config.r-a.combat.config.r))[0]||null;}
    function descriptor(id) {
      const d=baseline(id);if(!d)return null;
      const s=state(),e=d.target==='self'?(active()?h.entities().filter(e=>!e.dead&&e.combat?.phase==='chase').sort((a,b)=>b.combat.config.r-a.combat.config.r)[0]:null):referenceTarget(),facts=e&&h.facts(e);
      const circle=(e?enemy(e).config.r:h.circle())+d.sqlOffset,mana=h.manaCost(d.mana||0);
      let reason='';
      if(d.id.startsWith('basic.')&&d.discipline!=='magery'&&weapon()!==d.discipline)reason='Equip the matching weapon.';
      else if(Techniques.get(id)?.source){
        if(!s.techniques.equipped.includes(id))reason='Equip this technique in the Technique Book.';
        else {const check=Techniques.eligibility(s,id,{weapon:equippedWeapon()});if(!check.ok)reason=check.reason;}
      }
      if(!reason&&h.paused())reason='Finish or leave the current activity.';
      if(!reason&&d.target==='enemy'&&!facts)reason='Choose a target.';
      if(!reason&&e&&h.targetReason)reason=h.targetReason(e)||'';
      if(!reason&&facts?.returning)reason='This creature is returning to its territory.';
      if(!reason&&d.target==='enemy'&&facts.distance>d.range)reason='Move within range.';
      if(!reason&&d.target==='enemy'&&!facts.lineOfFire)reason='The target is behind an obstacle.';
      if(!reason&&d.target==='enemy'&&d.range<=1.5&&!facts.melee)reason='Move beside the target with a clear approach.';
      if(!reason&&d.effect==='lunge'&&h.lungeClear&&!h.lungeClear(e))reason='There is no clear ground for that thrust.';
      if(!reason&&s.mana<mana&&!(s.prepared>0&&d.discipline==='magery'))reason='Not enough mana.';
      if(!reason&&s.stamina<(d.stamina||0))reason='Not enough stamina.';
      if(!reason&&d.effect==='heal'&&s.hp>=h.maxHp())reason='Health is already full.';
      if(!reason&&id==='recover'&&s.mana>=h.maxMana()&&s.stamina>=h.maxStamina())reason='Mana and stamina are already full.';
      if(!reason&&id==='supply'&&(s.hp>=h.maxHp()||!(s[d.effect==='draught'?'tonics':'bandages']>0)))reason=s.hp>=h.maxHp()?'Health is already full.':'You have none of that supply.';
      if(!reason&&id==='backstab'){const why=h.backstab(e);if(why)reason=why;}
      if(!reason&&id==='steal')reason=h.covert?.(e)||'';
      if(!reason&&id==='hide')reason=h.hideReason?.()||'';
      const recovery=LiveCombat.recoveryView(cooldown);
      return {...d,icon:d.discipline==='magery'?'scroll_spell':d.discipline==='archery'?'bow':d.discipline==='support'?'healing':'sword',sqlCircle:id==='hide'?h.circle():circle,mana,eligible:!reason,ready:!reason&&(recovery.ready||id==='hide'&&h.hidden?.()),reason:reason||(!recovery.ready?'Recovering.':''),remaining:recovery.remaining,targetId:e?.id||null};
    }
    function snapshot() {
      sync();if(target&&!h.facts(target))target=null;
      const s=state(),e=referenceTarget(),facts=e&&h.facts(e),definitions=Techniques.catalog;
      const actions=[descriptor('basic.'+weapon())];if(weapon()!=='magery')actions.push(descriptor('basic.magery'));
      actions.push(descriptor('recover'),descriptor('supply'));
      if(h.hideUnlocked?.())actions.push(descriptor('hide'));
      if(e&&!h.backstab(e))actions.push(descriptor('backstab'));
      if(e&&h.covert&&!h.covert(e))actions.push(descriptor('steal'));
      return {version:1,active:active(),locked:active()||h.paused(),worldPaused:h.paused(),
        target:facts?{...facts,entity:undefined,id:e.id||'target',sqlCircle:enemy(e).config.r}:null,
        recovery:LiveCombat.recoveryView(cooldown),resources:{hp:s.hp,maxHp:h.maxHp(),mana:s.mana,maxMana:h.maxMana(),stamina:s.stamina,maxStamina:h.maxStamina()},
        actions,loadout:s.techniques.equipped.map(id=>id?descriptor(id):null),supply:s.techniques.supply,
        techniques:definitions.map(d=>({...descriptor(d.id),learned:!!s.techniques.learned[d.id],equipped:s.techniques.equipped.indexOf(d.id),source:d.source}))};
    }
    function begin(id) {
      sync();const view=descriptor(id);if(!view?.ready){h.message(view?.reason||'That action is unavailable.');return false;}
      const e=view.targetId?h.entities().find(e=>e.id===view.targetId):null;
      if(id==='hide'){if(h.fight()?.live)h.retire();return !!h.hide();}
      if(id==='steal'){if(assistance.hint||assistance.shown||assistance.fixed){h.message('Finish this prepared action before switching to theft.');return false;}return !!h.steal(e);}
      if(e?.kind==='boss'&&!e.combatAuthorized){h.challenge(e);return false;}
      if(h.fight()?.live)h.retire();
      const config=e?enemy(e).config:{kind:'recovery',act:'fight',r:h.circle(),diff:h.difficulty(h.circle()),title:'Recovery',foe:{hp:1,max:1,diff:0,swings:0}};
      const key=(e?.id||'self')+':'+view.sqlCircle;
      if(!preparations.has(key))preparations.set(key,{key,task:h.task(view.sqlCircle,e,config),draft:'',editorState:null});
      prepared=preparations.get(key);
      if(!prepared.task){h.message('No question is available at that Circle.');return false;}
      h.open({...config,ent:e||null,foe:e?{...config.foe,hp:enemy(e).hp,max:enemy(e).max}:config.foe,
        live:true,round:e?enemy(e).queries:0,actionId:id,definition:baseline(id),page:{id,book:view.discipline==='magery'?'spell':'arms',c:view.sqlCircle,rare:!!view.rare},
        st:'prompt',task:prepared.task,verb:view.name,kc:view.sqlCircle,utility:view.target==='self'?view.effect:null,
        hint:assistance.hint,shown:assistance.shown,fixed:assistance.fixed,syntaxError:!!assistance.fixed,readinessHelp:!!assistance.readinessHelp,hints:[],editorState:prepared.editorState,drafts:{[prepared.task.sql]:prepared.draft}});
      h.changed();return true;
    }
    function cancel() {
      const f=h.fight();if(!f?.live||f.busy)return false;
      if(f.st==='prompt'&&prepared){prepared.draft=h.draft();prepared.editorState=f.editorState||null;assistance={hint:Math.max(assistance.hint,f.hint||0),shown:Math.max(assistance.shown,f.shown||0),fixed:Math.max(assistance.fixed,f.fixed||0),readinessHelp:assistance.readinessHelp||f.readinessHelp};}
      h.retire();h.resume();h.changed();return true;
    }
    function equip(id,slot){sync();const result=Techniques.equip(state(),id,slot,{weapon:equippedWeapon(),combat:active()||!!h.fight()||h.pausedForLoadout()});if(result.ok){h.save();h.changed();}else h.message(result.reason);return result;}
    function setSupply(kind){sync();if(!['bandage','draught'].includes(kind)||active()||h.fight())return false;state().techniques.supply=kind;h.save();h.changed();return true;}
    function tick(dt,moving) {
      sync();LiveCombat.advanceRecovery(cooldown,dt,moving);
      if(protection){protection.left-=dt;if(protection.left<=0)protection=null;}
      const s=state();s.stamina=Math.min(h.maxStamina(),s.stamina+dt*LiveCombat.RULES.staminaRecovery);
    }
    function resolve(f,res) {
      const s=state(),d=f.definition,e=f.ent,es=e&&enemy(e),q=f.queryPower||0,quality=f.shown?0:(res.quality??0)*(f.hint?.6:1),gains=[];
      const mana=h.manaCost(d.mana||0);
      if(s.stamina<(d.stamina||0)||s.mana<mana&&!(s.prepared>0&&d.discipline==='magery')){f.round--;f.st='prompt';h.message('The action is no longer affordable.');return;}
      if(d.discipline==='magery'&&s.prepared>0&&(f.scroll||s.mana<mana)){s.prepared--;f.scroll=false;}else s.mana-=mana;
      s.stamina-=d.stamina||0;
      if(es)es.queries++;
      cooldown=LiveCombat.recovery(d.recovery,d.discipline,s.attr.dex);prepared=null;preparations.clear();assistance={hint:0,shown:0,fixed:0};f.busy=true;
      const skill=d.discipline==='support'?(d.effect==='recover'?'meditation':'healing'):d.discipline;
      if(d.effect!=='draught')h.practice(skill,f.diff,quality,gains);
      let note=q>0?'The action succeeds.':'The query gives no useful effect.';
      if(e&&d.target==='enemy'){h.engage(e);h.reveal();}
      if(d.effect==='bandage'||d.effect==='draught'){
        s[d.effect==='draught'?'tonics':'bandages']--;
        if(q>0){const healed=h.heal(d.effect==='draught'?30:h.bandage()*q);note=`Restored ${healed} health.`;}
      }else if(d.effect==='recover'){
        if(q>0){const before=s.mana,st=s.stamina;h.recover();s.mana=before+Math.round((s.mana-before)*q);s.stamina=st+Math.round((s.stamina-st)*q);note=`Recovered ${s.mana-before} mana and ${s.stamina-st} stamina.`;}
      }else if(d.target==='self'){
        if(q>0){
          if(d.effect==='heal'){note=`Restored ${h.heal((8+(s.sk.magery||0)*.4)*q)} health.`;}
          else {const strength=Math.min(.7,.25+(d.power||10)*.01+(d.effect==='ward'?(s.sk.inscription||0)*.002:0));protection={left:5,physical:strength*q,magic:(d.effect==='ward'?strength:.15)*q,riposte:d.effect==='riposte'?(d.power||10)/20*q:0};note='Protection holds for five seconds of active combat.';if(d.effect==='ward')h.practice('inscription',f.diff,quality*.35,gains);}
        }
      }else if(es&&q>0){
        const strike=h.attack(d,e,q,f),landed=strike.damage;
        es.hp=Math.max(0,es.hp-landed);f.foe.hp=es.hp;h.present(e,d,landed);
        if(landed>0){
          if(d.effect==='slow'){es.slow=LiveCombat.RULES.maxSlow*q;es.slowTime=4*q;}
          if(d.effect==='bleed'){es.bleed=Math.max(1,Math.round(3*q));es.bleedTime=4*q;}
          if(['interrupt','disrupt'].includes(d.effect))LiveCombat.interrupt(es,d.rare?1.8:1.1);
          if(d.effect==='push')h.push(e,Math.ceil(2*q));
          if(d.effect==='expose')es.exposed=4*q;
          if(d.effect==='siphon'&&es.profile.magic){const restored=Math.min(h.maxMana()-s.mana,Math.round(10*q));s.mana+=restored;note=`Drained ${restored} mana from the caster.`;}
          h.practice(d.discipline==='magery'?'eval':'tactics',f.diff,quality*.35,gains);
          if(d.discipline!=='magery')h.practice('anatomy',f.diff,quality*.35,gains);
        }
        note=landed>0?`${d.name} dealt ${landed} damage. ${d.effect==='siphon'?note:''}`:'The attack missed.';
      }
      h.settled(e);
      f.pline=note;f.chips='';f.busy=false;f.st='after';
      if(es&&es.hp<=0)return h.victory(res,gains);
      h.finish(note,gains);h.save();h.changed();
    }
    function hit(e,es) {
      if(h.paused()||state().hp<=0)return;
      const s=state(),p=es.profile,intent=BattleRules.intent({role:es.config.drole,boss:!!es.config.boss,magic:p.magic,circle:es.config.r},es.round-1);
      if(intent.swings===0){h.changed();return;}
      const skill=s.sk[weapon()]||0,accuracy=BattleRules.enemyHit(skill,es.config.diff,intent.accuracy);
      const blocked=protection?(p.magic?protection.magic:protection.physical):0;
      const damage=h.enemyDamage(e,es,accuracy,blocked,intent);
      if(damage>0&&protection?.riposte){const counter=Math.max(1,Math.round(damage*.6*protection.riposte));es.hp=Math.max(1,es.hp-counter);protection.riposte=0;}
      h.changed();if(s.hp<=0)h.defeat(e,es);
    }
    function bleed(e,amount){const es=enemy(e);if(!es||es.hp<=0)return;es.hp=Math.max(1,es.hp-amount);h.present(e,{discipline:'swords'},amount);h.settled(e);}
    function reset(e){if(e.combat){e.combat.hp=e.combat.max;e.combat.round=0;e.combat.queries=0;}h.settled(e);}
    function commitEligibility(){
      const f=h.fight(),d=f?.definition,s=state();if(!f?.live||!d)return {ok:false,reason:'No live action is prepared.'};
      let reason='';const facts=f.ent&&h.facts(f.ent);
      if(d.target==='enemy'&&(!facts||f.ent.combat?.hp<=0))reason='The target is no longer available.';
      if(!reason&&d.target==='enemy'&&facts.returning)reason='This creature is returning to its territory.';
      if(!reason&&d.target==='enemy'&&(!facts.lineOfFire||facts.distance>d.range))reason='The target is out of reach or behind an obstacle.';
      if(!reason&&Techniques.get(d.id)?.source){const result=Techniques.eligibility(s,d.id,{weapon:equippedWeapon()});if(!result.ok)reason=result.reason;else if(!s.techniques.equipped.includes(d.id))reason='This technique is no longer equipped.';}
      if(!reason&&d.id==='backstab')reason=h.backstab(f.ent)||'';
      if(!reason&&s.stamina<(d.stamina||0))reason='Not enough stamina for that action.';
      if(!reason&&s.mana<h.manaCost(d.mana||0)&&!(s.prepared>0&&d.discipline==='magery'))reason='Not enough mana for that action.';
      if(!reason&&['bandage','draught'].includes(d.effect)&&!(s[d.effect==='draught'?'tonics':'bandages']>0))reason='That supply is no longer available.';
      return {ok:!reason,reason};
    }
    function utilityCommitted(seconds=2){cooldown=LiveCombat.recovery(seconds,'support');}
    return {snapshot,begin,cancel,equip,setSupply,selectTarget,prepare,enemy,tick,resolve,hit,bleed,reset,active,descriptor,utilityCommitted,commitEligibility};
  }
  return {create};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=CombatController;
