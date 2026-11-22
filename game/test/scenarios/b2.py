E = lambda js: pg.evaluate(js)
E("window.__bwFast = false"); pg.wait_for_timeout(1500)
setups = [
 "S.path='warrior'; S.look=0; S.app=null; const w=__mk('rare',3,'weapon','swords'), a=__mk('uncommon',3,'armor'); a.name='Chain Shirt'; const sh=__mk('common',2,'shield'); sh.rarity='common';",
 "S.path='thief'; S.look=1; S.app=null; const w=__mk('epic',3,'weapon','fencing'), a=__mk('common',2,'armor'); a.name='Leather Jerkin'; const sh=null;",
 "S.path='warrior'; S.look=1; S.app=null; const w=__mk('legendary',6,'weapon','swords'), a=__mk('epic',6,'armor'); a.name='Knight’s Plate'; const sh=__mk('rare',6,'shield');",
 "S.path='crafter'; S.look=0; S.app=null; const w=__mk('common',1,'weapon','archery'), a=null; const sh=null;",
]
for i, su in enumerate(setups):
    E("""(() => { const S = __bw.S, __mk = __bw.makeItem; """ + su + """ S.inv = [w, a, sh].filter(Boolean); S.eq = {}; S.inv.forEach(it => S.eq[it.slot] = it.id); })()""")
    pg.wait_for_timeout(2500); E('Scene.refresh()'); pg.wait_for_timeout(500)
    print(i, E("JSON.stringify(__bw.HOST.app())"))
    E("""(() => { const s = Scene.debug().P.spr, c = document.createElement('canvas'); c.width = 80*8; c.height = 80*3; c.id='dbg'; const g = c.getContext('2d');
     for (let d = 0; d < 8; d++) g.drawImage(s.w8[d][2], d*80, 0);
     for (let k = 0; k < 4; k++) { g.drawImage(s.af[k], k*80, 80); g.drawImage(s.as[k], 320+k*80, 80); g.drawImage(s.ab[k], k*80, 160); }
     document.body.appendChild(c); c.style.cssText='position:fixed;left:0;top:0;z-index:999;background:#c878c8;width:640px;height:240px;image-rendering:pixelated'; })()""")
    pg.set_viewport_size({'width': 640, 'height': 240}); pg.wait_for_timeout(200); pg.screenshot(path=f'/home/claude/game/shots/b2_{i}.png'); E("document.getElementById('dbg').remove()"); pg.set_viewport_size({'width': 390, 'height': 844})
    E("__bw.ACT.tab({t:'hero'})"); pg.wait_for_timeout(900); pg.screenshot(path=f'/home/claude/game/shots/b2h_{i}.png', clip={'x':0,'y':100,'width':390,'height':300}); E("__bw.ACT.tab({t:'world'})")
