E = lambda js: pg.evaluate(js)
print(E("""(() => { const S = __bw.S; S.bank = S.bank || { gold: 0, items: [] }; S.bank.gold = 5000; S.gold = 0; const h = { id: 'h1', shape: 0, mat: 2, r: 1, x: 60, y: 890, chest: [], wall: '#8a6', roof: '#733', name: 'Test home', w: 3, h: 2 }; S.homes = [h];
  __bw.homeSheet(h); __bw.ACT.hup({ h: 'h1', k: 'xch' }); __bw.ACT.hup({ h: 'h1', k: 'xch' }); __bw.ACT.hup({ h: 'h1', k: 'fbed' }); __bw.ACT.hup({ h: 'h1', k: 'garden' }); __bw.ACT.hpick({ h: 'h1' }); __bw.ACT.hpick({ h: 'h1' }); __bw.ACT.hbed({ h: 'h1' }); __bw.ACT.paint({ h: 'h1', k: 'wall', c: '#123456' });
  return JSON.stringify({ xch: h.xch, fbed: h.fbed, garden: h.garden, gday: !!h.gday, bank: S.bank.gold, rest: Math.round((S.rest - Date.now()) / 60000), wall: h.wall, food: S.food, mats: S.mats }); })()"""))
pg.wait_for_timeout(400)
E("[...document.querySelectorAll('#sheet-body .sec h2')].find(h => h.textContent.includes('Upgrades')).scrollIntoView()"); pg.wait_for_timeout(300)
pg.screenshot(path='/home/claude/game/shots/dt_home.png')
