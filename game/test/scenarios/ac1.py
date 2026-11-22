E = lambda js: pg.evaluate(js)
import json
st = lambda: json.loads(E("JSON.stringify({ cur: __bw.A.cur, main: __bw.A.main, slots: __bw.A.slots.map(c => c && c.name), homes: __bw.A.homes.length, name: __bw.S.name, gold: __bw.S.gold, bank: __bw.S.bank.gold, paid: Object.keys(__bw.A.paid).length, old: Object.keys(localStorage).filter(k => k.indexOf('brasswake') === 0) })"))
print('after main', st())
# main puts money in bank and builds a home with a chest item
E("""(() => { const S = __bw.S; S.bank.gold = 900; const h = { id: 'hx', shape: 0, mat: 2, r: 1, x: 60, y: 890, w: 3, h: 2, chest: [__bw.makeItem('rare', 2, 'ring')], wall: '#8a6', roof: '#733', name: 'Shared' }; S.homes.push(h); __bw.A.paid.c103 = 1; __bw.ACT.reset(); })()""")
pg.wait_for_timeout(400); pg.screenshot(path='/home/claude/game/shots/ac_title.png')
# make an alt in slot 2
E("__bw.ACT.newslot({ i: 2 })"); pg.wait_for_timeout(200)
pg.click('[data-a=pick][data-look="3"]'); pg.fill('#cr-name', 'Pip'); pg.click('[data-a=begin]'); pg.wait_for_timeout(800)
print('after alt', st())
print('alt sees home', E("JSON.stringify([__bw.S.homes.length, __bw.S.homes[0] && __bw.S.homes[0].chest.length])"))
# alt is blocked from the boss
print('alt boss', E("(() => { const b = Scene.find(e => e.kind === 'boss' && e.r === 1); __bw.HOST.interact(b); return document.querySelector('#say') ? document.querySelector('#say').innerText.slice(0, 120) : 'no say'; })()"))
E("__bw.ACT.closesheet && __bw.ACT.closesheet()")
# alt takes the ring from the shared chest
E("""(() => { const h = __bw.S.homes[0], it = h.chest[0]; __bw.ACT.htake({ h: h.id, id: it.id }); })()""")
print('alt took', E("JSON.stringify([__bw.S.inv.length, __bw.A.homes[0].chest.length])"))
# switch back to main
E("__bw.ACT.reset()"); pg.wait_for_timeout(200); E("__bw.ACT.playslot({ i: 0 })"); pg.wait_for_timeout(800)
print('back to main', st())
# reload the page: account persists
pg.reload(); pg.wait_for_function("typeof Scene !== 'undefined' && Scene.debug().map", timeout=30000); pg.wait_for_timeout(800)
print('after reload', st())
pg.screenshot(path='/home/claude/game/shots/ac_reload.png')
E("__bw.ACT.delpick()"); pg.wait_for_timeout(200); E("__bw.ACT.delslot({ i: 2 })"); E("__bw.ACT.delyes({ i: 2 })"); pg.wait_for_timeout(200)
print('after delete', st())
