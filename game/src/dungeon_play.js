/* Dungeon game rules use the game's narrow adapter; Scene owns drawing/movement. */
const DungeonPlay = (() => {
  const HEALTH = { skirmisher:1.1, armored:1.35, caster:.95, brute:1.6, lieutenant:1.8, keeper:2.4 };
  const ARMORED_DAMAGE = .8, FLOOR_DIFFICULTY = 2, KEEPER_DIFFICULTY = 6;
  const CACHE_GOLD = { multiplier:10, base:8, materials:2 };
  function create(a) {
    let movementSave=0,lastMovementSave=0;
    const s = () => a.state(), dg = () => a.run(), progress = r => DungeonProgress.ensure(s(), r, a.day());
    const current = () => { const d = dg(); return d && progress(d.r); };
    function snapshot() {
      clearTimeout(movementSave);movementSave=0;
      const d=dg(),m=a.scene.debug().map;if(!d||!m||!m.dungeonFloor||m.r!==d.r||m.f!==d.f)return;
      DungeonProgress.compact(s(),a.now());
      const p=current();p.seen[d.f]=DungeonProgress.packSeen(m.discovered||[]);
      p.bodies=p.bodies||{};
      for(const e of m.ents)if(e.kind==='corpse'&&e.id&&e.decay>0)p.bodies[e.id]={x:e.x,y:e.y,loot:e.loot,empty:!!e.empty,until:a.now()+e.decay*1000};
      const at=a.scene.pos();s().dungeon={r:d.r,f:d.f,x:at[0],y:at[1],back:d.back,tutorial:d.tutorial};
    }
    function floor(f, pos) {
      const d = dg(), def = Dungeons.get(d.r);
      if (!Number.isInteger(f) || f < 0 || f >= def.floors.length) return;
      snapshot();
      d.f = f; const p = progress(d.r), layout = Dungeons.build(d.r, f);
      d.left = d.tutorial ? (p.claimed.tutorialKey ? 0 : 1) : DungeonProgress.missing(p, def.floors.length).length;
      d.keeper = p.keeper; d.done = !!p.claimed.vault;
      const at = DungeonProgress.validPosition(layout, pos, p, a.now()) ? pos : layout.entry;
      s().dungeon = { r: d.r, f, x: at[0], y: at[1], back: d.back, tutorial: d.tutorial };
      a.close(); a.scene.enterDungeon(d.r, { floor: f, progress: p, now: a.now(), tutorial: d.tutorial, pos: at });
      a.save(); a.hud();
    }
    function enter(r, resume) {
      const saved = resume && s().dungeon;
      const back = saved && saved.back || a.scene.pos();
      a.setRun({ r, f: 0, back, tutorial: saved ? !!saved.tutorial : r===1 && ['vault','chest'].includes(a.guideId()), done: false, left: 0 });
      if (!saved && r===1 && a.guideId()==='vault') a.guideStart();
      floor(saved ? saved.f : 0, saved ? [saved.x, saved.y] : null);
    }
    function restore() {
      const d = s().dungeon;
      if (!d || !Dungeons.get(d.r) || !Number.isInteger(d.f) || !Dungeons.get(d.r).floors[d.f]) { s().dungeon = null; return false; }
      enter(d.r, true); return true;
    }
    function exit() {
      snapshot();
      const d = dg(), back = d && d.back || s().pos;
      s().dungeon = null; a.setRun(null); a.close(); a.scene.load(back, d ? d.r : s().region); if(a.surface)a.surface(); a.save(); a.hud();
    }
    function moved(x, y) {
      const d = dg(); if (!d) return;
      s().dungeon = { r:d.r, f:d.f, x,y, back:d.back, tutorial:d.tutorial };
      clearTimeout(movementSave);
      if(a.now()-lastMovementSave>=1500){lastMovementSave=a.now();a.save();}
      else movementSave=setTimeout(()=>{movementSave=0;if(dg())a.save();},600);
    }
    function fight(e) {
      const d = dg(), p = current(); if (!d || !e || !p) return;
      const sp = Dungeons.species[e.species] || {}, keeper = e.kind === 'keeper', role = e.role || sp.role || 'skirmisher';
      const diff = Math.min(100, a.difficulty(d.r, !!e.lieutenant || keeper) + d.f * FLOOR_DIFFICULTY + (keeper ? KEEPER_DIFFICULTY : 0));
      const mult = HEALTH[keeper?'keeper':e.lieutenant?'lieutenant':role];
      const foe = a.foe(d.r, diff, mult); if (role === 'caster') foe.swings = 3;
      a.fight({ kind:'dungeon', act:'fight', r:d.r, diff, ent:e, sig:e.inst && e.inst.tpl || sp.tpl, inst:e.inst || {tpl:sp.tpl}, title:e.name, keeper:keeper ? 1 : 0, noHint:!!e.lieutenant || keeper, drole:role, foe });
    }
    function victory(e) {
      const d = dg(), p = current(); if (!d || !e) return;
      DungeonProgress.defeat(p, Object.assign({}, e, { floor:d.f }), a.now());
      if (e.tutorial) p.claimed.tutorialKey = true;
      d.keeper = p.keeper; d.left = d.tutorial ? (p.claimed.tutorialKey ? 0 : 1) : DungeonProgress.missing(p,Dungeons.get(d.r).floors.length).length;
      if (e.kind === 'keeper') s().vault[d.r] = 1;
      if (e.lieutenant) a.toast('Floor seal recovered. ' + d.left + ' left.');
    }
    function reward(e) {
      const d = dg(), p = current(); if (!d) return;
      const starter = !!e.tutorial, vault = e.kind === 'chest' && !starter, id = starter ? 'tutorial' : vault ? 'vault' : e.id;
      if (p.claimed[id]) return a.toast('Already collected today.');
      if (!vault&&!starter&&a.unlock&&a.unlock(e,()=>reward(e)))return;
      if (starter && !p.claimed.tutorialKey) return a.dialog(e,'The entrance guardian holds this chest’s key.',[{t:'Leave',a:'closesheet'}]);
      if (vault && !DungeonProgress.canVault(p,Dungeons.get(d.r).floors.length)) {
        const need = DungeonProgress.missing(p,Dungeons.get(d.r).floors.length).map(f=>Dungeons.floor(d.r,f).name).join(', ');
        return a.dialog(e,need ? 'Recover the floor seals from '+need+'. Then defeat the keeper.' : 'Defeat the keeper to open the vault.',[{t:'Leave',a:'closesheet'}]);
      }
      const t = d.r, lk = a.luck(), o = {gold: vault || starter ? 30*t+20 : CACHE_GOLD.multiplier*t+CACHE_GOLD.base,mats:{[t]:vault || starter ? a.int(4,6) : CACHE_GOLD.materials},sigils:vault || starter ? 1+(a.random()<.4?1:0) : 0,items:[a.item(a.rarity(lk,vault || starter ? 2 : 1),t)],scrolls: vault || starter ? ['s'+t+'r'] : []};
      if (vault || starter) { o.bless=a.random()<.06?1:0; o.gscr=a.random()<.3?1:0; a.dye(.12); }
      let note=''; const u='u_w'+t;
      if ((vault || starter) && !s().codex[u]) { s().dpity[t]=(s().dpity[t]||0)+1; if(a.random()<.2*(1+lk/100)||s().dpity[t]>=5) {o.items.push(a.unique(u));s().dpity[t]=0;note='At the bottom of the chest: a named rare.';} }
      DungeonProgress.claim(p,id);
      if (vault || starter) { s().stats.dungeons++; d.done = true; }
      if (starter && a.guideId()==='chest') a.guideChest();
      const g=a.grant(o); a.scene.FX.treasure(e.x,e.y); a.save(); a.hud(); a.scene.refresh();
      a.sheet('<p class="eyebrow">'+a.escape(Dungeons.get(t).name)+'</p><h2>'+(vault || starter?'The vault chest':'A hidden cache')+'</h2>'+(note?'<p class="story">'+note+'</p>':'')+a.spoils(g)+'<p class="cap2">Collected for today.</p><div class="row end"><button class="btn solid" data-a="closesheet">Take it</button></div>');
    }
    function interact(e) {
      const d=dg(),p=current(); if(!d||!e) return;
      if(e.kind==='dtravel') return a.dialog(e,e.to<0?'Stairs lead back to daylight. Your discoveries and floor seals are kept.':'Stairs lead to '+Dungeons.floor(d.r,e.to).name+'.', [{t:e.to<0?'Climb out':'Use stairs',a:'dtravel',d:{id:e.id}},{t:'Stay',a:'closesheet'}]);
      if(e.kind==='dcache'||e.kind==='chest') return reward(e);
      if(e.kind==='dlore') {p.lore[e.id]=true;a.save();return a.dialog(e,'An old note reads: '+e.text,[{t:'Leave',a:'closesheet'}]);}
      if(e.kind==='dgate') return a.dialog(e,p.gates[e.target||e.gate||e.id]?'The passage is open.':(e.text||'A nearby control opens this passage. Another route goes around.'),[{t:'Leave',a:'closesheet'}]);
      if(e.kind==='dlever'||e.kind==='dsecret') return a.dialog(e,p.gates[e.target||e.gate||e.id]?'The passage is open.':(e.text||'This control opens a shortcut. You can return through it later.'),[{t:p.gates[e.target||e.gate||e.id]?'Leave':'Open passage',a:p.gates[e.target||e.gate||e.id]?'closesheet':'dopen',d:{id:e.id}},{t:'Stay',a:'closesheet'}]);
    }
    function travel(id) {const e=a.scene.find(e=>e.id===id&&e.kind==='dtravel');if(!e)return; if(e.to<0)exit();else floor(e.to,e.arrival);}
    function open(id) {const e=a.scene.find(e=>e.id===id);if(!e)return;const p=current();p.gates[e.target||e.gate||e.id]=true;a.scene.dungeonRefresh(p);a.close();a.save();a.toast('Passage opened.');}
    function table(e) {const p=current();if(!a.main())return a.toast('This lost table belongs to your main character’s story.');if(a.haveTable(dg().r))return a.toast('The pedestal is empty.');if(!p.keeper)return a.dialog(e,'The keeper guards this scroll.',[{t:'Leave',a:'closesheet'}]);a.takeTable(dg().r);a.save();a.scene.refresh();}
    return { enter,restore,floor,exit,moved,fight,victory,reward,interact,travel,open,table,progress,current,snapshot };
  }
  return {create,HEALTH,ARMORED_DAMAGE,FLOOR_DIFFICULTY,KEEPER_DIFFICULTY,CACHE_GOLD};
})();
