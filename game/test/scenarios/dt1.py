E = lambda js: pg.evaluate(js)
R = []
# 1. gain curve: count correct answers 40 -> 100 at matched difficulty
print('curve', E("""(() => { const S = __bw.S; S.sk = { swords: 40 }; let n = 0, marks = {}; while (S.sk.swords < 100 && n < 5000) { const v = S.sk.swords; __bw.gain('swords', Math.min(100, v), 1); n++; for (const m of [60,70,80,90,100]) if (S.sk.swords >= m && !marks[m]) marks[m] = n; } return JSON.stringify(marks); })()"""))
print('odds correct', E("JSON.stringify([__bw.odds(40, 60, 'correct').p, __bw.odds(60, 60, 'correct').p, __bw.odds(100, 92, 'correct').p])"))
# 2. death: worn sword unprotected, armor insured, ring blessed
print(E("""(() => { const S = __bw.S, mk = __bw.makeItem; S.sk = { swords: 50 }; const a = mk('rare', 3, 'weapon', 'swords'), b = mk('rare', 3, 'armor'), c = mk('rare', 3, 'ring'), d = mk('common', 1, 'feet');
  S.inv = [a, b, c, d]; S.eq = { weapon: a.id, armor: b.id, ring: c.id, feet: d.id }; b.ins = 1; c.bless = 1; S.bank = S.bank || { gold: 0, items: [] }; S.bank.gold = 500; S.gold = 77;
  window._ids = [a.id, b.id, c.id, d.id]; window._fee = __bw.insFee(b); __bw.dropBody();
  return JSON.stringify({ eq: S.eq, inv: S.inv.map(i => i.name), bank: S.bank.gold, fee: _fee, remains: S.remains && S.remains.loot.items.map(i => i.name + ':' + i.was), gold: S.gold, D: S.lastDeath }); })()"""))
pg.wait_for_timeout(500)
# take loot back from the body
print(E("""(() => { const S = __bw.S, e = Scene.find(x => x.mine); if (!e) return 'no body'; Scene.debug(); __bw.ACT.corpse ? 0 : 0; return 'body at ' + e.x + ',' + e.y; })()"""))
print(E("""(() => { const e = Scene.find(x => x.mine); __bw.HOST.act ? 0 : 0; __bw.SH ? 0 : 0; try { __bw.ACT.lootall ? 0 : 0; } catch (x) {} return typeof __bw.ACT.lootall; })()"""))
print(E("""(() => { const S = __bw.S, e = Scene.find(x => x.mine); __bw.HOST.interact(e); __bw.ACT.lootall(); return JSON.stringify({ eq: Object.keys(S.eq), inv: S.inv.length, gold: S.gold, remains: !!S.remains, empty: !!e.empty, decay: e.decay }); })()"""))
# 3. corpse of a monster stays after looting
print(E("""(() => { const m = Scene.debug().map, mon = m.ents.find(e => e.kind === 'mon' && e.r === 1); Scene.corpse(mon, { gold: 5 }); __bw.HOST.interact(mon); __bw.ACT.lootall(); return JSON.stringify({ kind: mon.kind, empty: mon.empty, decay: mon.decay, still: m.ents.includes(mon), dying: mon.dying, resp: (m.respawn || []).slice(-2).map(o => Math.round(o.t)) }); })()"""))
# 4. bless at bank, insure toggle, buy bless
print(E("""(() => { const S = __bw.S; S.bank.gold = 3000; S.gold = 0; __bw.ACT.buybless(); const it = S.inv.find(i => S.eq.weapon === i.id) || S.inv[0]; __bw.ACT.bless({ id: it.id, from: 'bank' }); const t = document.querySelector('#sheet-body').innerText.includes('Protect your gear'); return JSON.stringify({ blessd: S.blessd, bank: S.bank.gold, blessed: it.bless, name: it.name, sheet: t }); })()"""))
pg.screenshot(path='/home/claude/game/shots/dt_bank.png', full_page=False)
E("document.querySelector('#sheet-body h2:last-of-type') && [...document.querySelectorAll('#sheet-body .sec h2')].find(h => h.textContent.includes('Protect')).scrollIntoView()"); pg.wait_for_timeout(300)
pg.screenshot(path='/home/claude/game/shots/dt_guard.png')
# 5. training and scrolls
print(E("""(() => { const S = __bw.S; __bw.ACT.closesheet(); S.gold = 2000; S.sk.healing = 30; __bw.ACT.djtrain(); __bw.ACT.train({ id: 'healing', n: 5 }); __bw.ACT.train({ id: 'archery', n: 5 }); const a = S.sk.healing, b = S.sk.archery, g = S.gold; S.pscr = [{ id: 'swords', cap: 105 }, { id: 'swords', cap: 115 }]; S.gscr = 2; __bw.ACT.readp({ i: 0 }); __bw.ACT.reads(); return JSON.stringify({ healing: a, archery: b, gold: g, cap: S.pcap, boost: Math.round((S.boost - Date.now()) / 60000), left: S.pscr }); })()"""))
pg.screenshot(path='/home/claude/game/shots/dt_train.png')
E("__bw.ACT.closesheet(); __bw.ACT.tab({ t: 'hero' })"); pg.wait_for_timeout(800)
E("[...document.querySelectorAll('h3')].find(h => h.textContent === 'Scrolls') && [...document.querySelectorAll('h3')].find(h => h.textContent === 'Scrolls').scrollIntoView()"); pg.wait_for_timeout(300)
pg.screenshot(path='/home/claude/game/shots/dt_scrolls.png')
# 6. priced looks
print(E("""(() => { const S = __bw.S; S.gold = 100; __bw.ACT.tab({ t: 'world' }); __bw.ACT.looks(); const L0 = JSON.stringify(S.app); __bw.ACT.lookset({ k: 'hair', v: '2' }); const g1 = S.gold; __bw.ACT.lookset({ k: 'body', v: '1' }); return JSON.stringify({ g1, g2: S.gold, body: S.app && S.app.body }); })()"""))
pg.screenshot(path='/home/claude/game/shots/dt_looks.png')
