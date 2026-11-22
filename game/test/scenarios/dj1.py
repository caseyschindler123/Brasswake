E = lambda js: pg.evaluate(js)
def shot(n): pg.screenshot(path=f'/home/claude/game/shots/dj_{n}.png')
def say(): return E("document.querySelector('#say') && !document.querySelector('#say').hidden ? document.querySelector('#say').innerText.replace(/\\n/g,' ').slice(0,220) : ''")
print('dojos', E("[1,2,3,4,5,6,7,8].map(r => !!Scene.spots()['dojo'+r])"))
E("window.__bwFast = false")
d = E("Scene.spots().dojo1"); E(f"Scene.warp({d[0]}, {d[1]+2})"); pg.wait_for_timeout(1500); shot('0_door')
E("__bw.HOST.interact(Scene.find(e => e.kind === 'dojo'))"); pg.wait_for_timeout(2500); shot('1_hall')
print('inHall', E("Scene.inHall()"), E("Scene.ents().map(e=>e.kind+':'+e.name).join(', ')"))
pg.wait_for_timeout(800); shot('2_spar')
E("__bw.HOST.interact(Scene.find(e => e.kind === 'master'))"); pg.wait_for_timeout(1500); print('master:', say()); shot('3_master')
E("__bw.ACT.closesheet()"); E("__bw.S.gold = 500")
E("__bw.ACT.djboard()"); pg.wait_for_timeout(300); shot('4_board')
E("__bw.ACT.djsign()"); pg.wait_for_timeout(800); shot('5_bracket')
print('djb', E("JSON.stringify(__bw.S.djb.wins.map(r=>r.length))"), E("__bw.S.gold"))
def bout(win=True):
    E("__bw.ACT.closesheet()"); E("__bw.ACT.djfight()") if E("!!(__bw.S.djb)") else None
    pg.wait_for_timeout(600)
    for rnd in range(4):
        du = E("__bw.DU && [__bw.DU.st, __bw.DU.score, __bw.DU.done]")
        if not du: break
        if du[0] == 'after':
            if du[2]: break
            E("__bw.ACT.dunext()"); pg.wait_for_timeout(400); continue
        E("__bw.DU.o.T = 1e9; __bw.DU.o.think = 1e9")
        if win: pg.fill('#sql', E("__bw.DU.task.sql")); pg.dispatch_event('#kb [data-fn=run]', 'pointerdown')
        else: E("__bw.ACT.duyield()")
        pg.wait_for_timeout(900)
    return E("__bw.DU && [__bw.DU.score, __bw.DU.done]")
print('bout1', bout()); shot('6_bout_after'); E("__bw.ACT.duover()"); pg.wait_for_timeout(600); print('round', E("__bw.S.djb && __bw.S.djb.round"))
for k in range(3): print('bout', k+2, bout()); E("__bw.ACT.duover()"); pg.wait_for_timeout(900)
print('champ', E("JSON.stringify(__bw.S.dj[1])"), E("__bw.S.gold")); pg.wait_for_timeout(800); print('say:', say()); shot('7_champ')
E("__bw.ACT.closesheet()"); E("__bw.ACT.djmaster()"); pg.wait_for_timeout(800); shot('8_master_bout')
for rnd in range(4):
    du = E("__bw.DU && [__bw.DU.st, __bw.DU.score, __bw.DU.done]")
    if not du or (du[0]=='after' and du[2]): break
    if du[0]=='after': E("__bw.ACT.dunext()"); pg.wait_for_timeout(400); continue
    E("__bw.DU.o.T = 1e9; __bw.DU.o.think = 1e9"); pg.fill('#sql', E("__bw.DU.task.sql")); pg.dispatch_event('#kb [data-fn=run]', 'pointerdown'); pg.wait_for_timeout(900)
E("__bw.ACT.duover()"); pg.wait_for_timeout(1200); print('prize say:', say()); shot('9_prize')
print('inv', E("__bw.S.inv.filter(i=>i.unique).map(i=>i.name)"), E("JSON.stringify(__bw.S.dj[1])"))
E("__bw.ACT.closesheet()")
# watch and practice
E("__bw.ACT.dudone && 0"); E("__bw.HOST.interact(Scene.find(e => e.kind === 'dummy' && e.i === 0))"); pg.wait_for_timeout(700); shot('10_practice')
pg.fill('#sql', E("__bw.DU.task.sql")); pg.dispatch_event('#kb [data-fn=run]', 'pointerdown'); pg.wait_for_timeout(600); shot('11_practice_hit'); print('practice', E("__bw.DU.n"))
E("__bw.ACT.dudone()")
E("__bw.ACT.tab({t:'hero'})"); pg.wait_for_timeout(500); shot('12_hero'); E("__bw.ACT.tab({t:'world'})")
E("__bw.HOST.interact(Scene.find(e => e.kind === 'hallexit'))"); pg.wait_for_timeout(1800); print('out', E("Scene.inHall()"), E("Scene.pos()")); shot('13_out')
E("Scene.load(null, 2)"); pg.wait_for_timeout(500); d2 = E("Scene.spots().dojo2"); E(f"Scene.warp({d2[0]}, {d2[1]+2})"); pg.wait_for_timeout(800)
E("__bw.HOST.interact(Scene.find(e => e.kind === 'dojo' && e.r === 2))"); pg.wait_for_timeout(2000); print('hall2', E("Scene.ents().map(e=>e.kind).join(',')")); shot('14_hall2')
E("__bw.HOST.interact(Scene.find(e => e.kind === 'rnote'))"); pg.wait_for_timeout(500); shot('15_note')
E("__bw.ACT.closesheet()"); E("__bw.HOST.interact(Scene.find(e => e.kind === 'student' && e.spar))"); pg.wait_for_timeout(600); print('student', say())
E("__bw.ACT.djwatch()"); pg.wait_for_timeout(5000); shot('16_watch'); print('watch', E("__bw.DU && [__bw.DU.st, __bw.DU.o.st, __bw.DU.o.typed]"))
