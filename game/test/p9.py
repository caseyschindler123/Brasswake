import subprocess, time, json, sys
from playwright.sync_api import sync_playwright
ASM = open('/home/claude/game/node_modules/sql.js/dist/sql-asm.js').read()
srv = subprocess.Popen(['python3', '-m', 'http.server', '8765', '--directory', '/home/claude/game/dist'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
def shot(pg, n): pg.screenshot(path=f'/home/claude/game/shots/p9_{n}.png')
try:
  with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 720}, device_scale_factor=2, has_touch=True, is_mobile=True)
    pg = ctx.new_page(); logs = []; bad = []
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
    pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
    pg.on('response', lambda r: bad.append(r.url) if r.status >= 400 else None)
    pg.route('**/cdnjs.cloudflare.com/**', lambda r: r.fulfill(body=ASM, content_type='application/javascript')); pg.route('**/fonts.g*/**', lambda r: r.abort())
    pg.goto('http://localhost:8765/index.html'); pg.wait_for_function("typeof Scene !== 'undefined' && Scene.debug().map", timeout=30000); pg.wait_for_timeout(600)
    pg.click('[data-a=newslot]'); pg.click('[data-a=pick][data-look="2"]'); pg.click('[data-a=begin]'); pg.wait_for_timeout(400); pg.click('[data-a=beat]'); pg.click('[data-a=beat]'); pg.click('[data-a=ashore]'); pg.wait_for_timeout(300)
    pg.evaluate("window.__bwFast = true; __bw.ACT.gskip(); __bw.ACT.closesheet(); const S = __bw.S; S.tut = 3; S.gold = 900; S.done.c101 = S.done.c102 = { t: 1 }; S.stats.ok = 9; __bw.save()")
    S = lambda: pg.evaluate("JSON.parse(JSON.stringify(__bw.S))"); key = lambda sel: pg.dispatch_event(sel, 'pointerdown')
    d = pg.evaluate("(() => { const m = Scene.debug().map, k = {}; for (const e of m.ents) k[e.kind] = (k[e.kind] || 0) + 1; return { k, blds: m.blds.length }; })()"); print(d, 'pages', S()['pages'])
    npc = lambda r, i: f"Scene.find(e => e.kind === 'npc' && e.i === {i} && e.r === {r})"
    go = lambda expr: (pg.evaluate(f"(() => {{ const e = {expr}; Scene.warp(e.x, e.y + 1); }})()"), pg.wait_for_timeout(900))
    # lesson with learn card, a wrong answer, help, hint, then right
    go(npc(1, 0)); pg.evaluate(f"__bw.HOST.interact({npc(1,0)})"); pg.wait_for_timeout(150); shot(pg, '0_master'); pg.click('#say .opt[data-a=offer]'); pg.wait_for_timeout(100); pg.click('#say .opt[data-a=contract]'); pg.wait_for_timeout(250); shot(pg, '1_learn'); print('Q', pg.evaluate("[__bw.Q.id, __bw.Q.step]"))
    pg.click('[data-a=qturn]'); pg.wait_for_timeout(200); pg.fill('#sql', 'SELECT name FROM items'); key('#kb [data-fn=run]'); pg.wait_for_timeout(200); shot(pg, '2_wrong')
    pg.click('[data-a=help]'); pg.wait_for_timeout(200); shot(pg, '3_help'); pg.click('[data-a=hint]'); pg.wait_for_timeout(150); pg.evaluate("__bw.ACT.closesheet()")
    pg.fill('#sql', pg.evaluate("__bw.Q.task.sql")); key('#kb [data-fn=run]'); pg.wait_for_timeout(200); shot(pg, '4_result'); print('done', list(S()['done'].keys()), 'next', pg.evaluate("__bw.Q.nextId"))
    pg.click('[data-a=qleave]'); pg.wait_for_timeout(200)
    # pages shop
    pg.evaluate(f"__bw.HOST.interact({npc(1,0)})"); pg.click('#say .opt[data-a=pages]'); pg.wait_for_timeout(150); shot(pg, '5_pages'); pg.click('[data-a=buypage][data-id=s1]'); pg.click('[data-a=buypage][data-id=c1]'); pg.wait_for_timeout(100); print('pages', S()['pages'], 'gold', S()['gold']); pg.evaluate("__bw.ACT.closesheet()")
    # steal from a creature
    mon = "Scene.find(e => e.kind === 'mon' && e.r === 1 && !e.inst.elite && e.inst.tpl !== 'b101')"
    pg.evaluate(f"(() => {{ const e = {mon}; Scene.warp(e.x + 1, e.y); e.unseen = true; __bw.HOST.interact(e); }})()"); pg.wait_for_timeout(700); shot(pg, '6_choose_thief')
    pg.click('[data-a=fsteal]'); pg.wait_for_timeout(200); print('steal ask', pg.evaluate("[__bw.F.act, __bw.F.oddsLine, __bw.F.task.ask]")); pg.fill('#sql', pg.evaluate("__bw.F.task.sql")); key('#kb [data-fn=run]'); pg.wait_for_timeout(200); shot(pg, '7_steal'); print('steal', pg.inner_text('#f-after')[:60].replace('\n', ' | ')); pg.click('[data-a=fdone]')
    # spell fight
    pg.evaluate(f"(() => {{ const e = {mon}; Scene.warp(e.x + 1, e.y); __bw.HOST.interact(e); }})()"); pg.wait_for_timeout(500); pg.click('.pg[data-id=s1]'); pg.wait_for_timeout(100); print('spell', pg.evaluate("[__bw.F.page.name, __bw.F.oddsLine, __bw.F.task.ask]")); pg.fill('#sql', 'SELECT 1'); key('#kb [data-fn=run]'); pg.wait_for_timeout(200); shot(pg, '8_wrongswing'); print('after wrong', pg.evaluate("[__bw.F.res.grade, __bw.F.st, __bw.F.foe.hp, __bw.S.hp]"))
    pg.click('[data-a=fchoose]'); pg.wait_for_timeout(100); pg.click('[data-a=flee]'); pg.wait_for_timeout(200); print('fled', pg.evaluate("!__bw.F"))
    # rival duel + boss card + boss fight
    riv = "Scene.find(e => e.kind === 'rival' && e.r === 1)"; go(riv); pg.evaluate(f"__bw.HOST.interact({riv})"); pg.wait_for_timeout(150); shot(pg, '9_rival'); pg.click("#say .opt[data-m=duel]"); pg.wait_for_timeout(200); pg.fill('#sql', pg.evaluate("__bw.F.task.sql")); key('#kb [data-fn=run]'); pg.wait_for_timeout(200); print('duel', pg.inner_text('#f-after')[:50].replace('\n', ' | ')); pg.click('[data-a=fdone]')
    boss = "Scene.find(e => e.kind === 'boss' && e.r === 1)"; go(boss); pg.evaluate(f"__bw.HOST.interact({boss})"); pg.wait_for_timeout(300); shot(pg, '10_bosscard'); pg.click('[data-a=start][data-k=boss]'); pg.wait_for_timeout(400); shot(pg, '11_bossfight')
    pg.evaluate("__bw.S.sk.fencing = Math.max(__bw.S.sk.fencing || 0, 45)")   # since pass 23 a thief needs a trained weapon skill to fight well
    for i in range(9):
        st = pg.evaluate("__bw.F && [__bw.F.st, !!__bw.F.over, __bw.F.foe.hp, __bw.S.hp, __bw.F.round]")
        if not st or st[1]: break
        pg.click('.pg[data-id=a1]' if st[0] == 'choose' else '#f-after [data-a=fpage]'); pg.wait_for_timeout(80); pg.fill('#sql', pg.evaluate("__bw.F.task.sql")); key('#kb [data-fn=run]'); pg.wait_for_timeout(120)
    print('boss', st, S()['boss'], 'codex', list(S()['codex'].keys())); shot(pg, '12_bosswin'); pg.click('[data-a=fdone]'); pg.wait_for_timeout(200)
    # dungeon
    pg.evaluate("__bw.S.hp = 60")
    st_ = "Scene.find(e => e.kind === 'stairs' && e.r === 1)"; go(st_); pg.evaluate(f"__bw.HOST.interact({st_})"); pg.click("#say .opt[data-a=start]"); pg.wait_for_timeout(1200); shot(pg, '13_dungeon'); print('in dungeon', pg.evaluate("Scene.inDungeon()"))
    for i in range(3):
        pg.evaluate(f"__bw.HOST.interact(Scene.find(e => e.kind === 'guard' && e.i === {i}))"); pg.wait_for_timeout(150)
        for k in range(8):
            st = pg.evaluate("__bw.F && [__bw.F.st, !!__bw.F.over]")
            if not st or st[1]: break
            pg.click('.pg[data-id=a1]' if st[0] == 'choose' else '#f-after [data-a=fpage]'); pg.fill('#sql', pg.evaluate("__bw.F.task.sql")); key('#kb [data-fn=run]'); pg.wait_for_timeout(60)
        if i == 0: shot(pg, '14_guard')
        pg.evaluate("__bw.S.hp = 60"); pg.click('[data-a=fdone]'); pg.wait_for_timeout(600)
        if i == 0: pg.evaluate("__bw.HOST.interact(Scene.find(e => e.kind === 'corpse'))"); pg.wait_for_timeout(200); shot(pg, '14b_loot'); print('looted', pg.evaluate("!Scene.find(e => e.kind === 'corpse' && e.dying == null && !e.empty)")); pg.evaluate("__bw.ACT.closesheet()")
    pg.evaluate("__bw.HOST.interact(Scene.find(e => e.kind === 'chest'))"); pg.wait_for_timeout(200); shot(pg, '15_chest'); print('scrolls', S()['scr']); pg.evaluate("__bw.ACT.closesheet()")
    pg.evaluate("__bw.HOST.interact(Scene.find(e => e.kind === 'exit'))"); pg.click("#say .opt[data-a=exitdungeon]"); pg.wait_for_timeout(900); print('out', pg.evaluate("[Scene.inDungeon(), Scene.pos()]"))
    # bag: scroll -> book; hero; map; journal page; healer; bench craft; board
    pg.evaluate('__bw.ACT.closesheet()'); pg.wait_for_timeout(150); pg.click('#nav [data-t=bag]'); pg.wait_for_timeout(200); shot(pg, '16_bag'); pg.click('[data-a=scroll]'); pg.wait_for_timeout(100); pg.click('[data-a=inscribe]'); print('pages', S()['pages'])
    pg.click('#nav [data-t=hero]'); pg.wait_for_timeout(200); pg.evaluate("document.querySelector('details.book').open = true"); shot(pg, '17_hero')
    pg.click('#nav [data-t=map]'); pg.wait_for_timeout(300); shot(pg, '18_map'); pg.click('#nav [data-t=world]'); pg.wait_for_timeout(200)
    pgE = "Scene.find(e => e.kind === 'page' && e.r === 1)"; go(pgE); pg.evaluate(f"__bw.HOST.interact({pgE})"); pg.wait_for_timeout(200); shot(pg, '19_page'); pg.evaluate("__bw.ACT.closesheet()")
    pg.evaluate("__bw.S.mats[1] = 20; __bw.S.hp = 20"); he = "Scene.find(e => e.kind === 'healer' && e.r === 1)"; go(he); pg.evaluate(f"__bw.HOST.interact({he})"); pg.wait_for_timeout(250); shot(pg, '19b_healer'); pg.click("#sheet [data-a=rest]"); print('healed', S()['hp']); pg.evaluate("__bw.ACT.closesheet()")
    be = "Scene.find(e => e.kind === 'bench' && e.r === 1)"; go(be); pg.evaluate(f"__bw.HOST.interact({be})"); pg.wait_for_timeout(200); shot(pg, '20_bench'); pg.click('[data-a=craft][data-id=uncommon]'); pg.wait_for_timeout(200); pg.fill('#sql', pg.evaluate("__bw.Q.task.sql")); key('#kb [data-fn=run]'); pg.wait_for_timeout(200); shot(pg, '21_craft'); print('craft:', pg.inner_text('#enc h2')); pg.click('[data-a=qleave]')
    bo = "Scene.find(e => e.kind === 'board' && e.r === 1)"; pg.evaluate(f"__bw.HOST.interact({bo})"); pg.click("#say .opt[data-a=start]"); pg.wait_for_timeout(200); pg.fill('#sql', pg.evaluate("__bw.Q.task.sql")); key('#kb [data-fn=run]'); pg.wait_for_timeout(150); print('drill:', pg.inner_text('#enc h2')); pg.click('[data-a=qleave]')
    # other regions render: warp to each town, screenshot
    for r in range(2, 9):
        pg.evaluate(f"(() => {{ const t = Scene.towns()[{r}]; Scene.warp(t[0] + 2, t[1] - 2); }})()"); pg.wait_for_timeout(1700); shot(pg, f'r{r}')
    pg.evaluate("__bw.ACT.journal()"); pg.wait_for_timeout(200); shot(pg, '22_journal')
    print('region', S()['region'], 'been', S()['been']); print('ERRORS', logs[:8]); print('BAD', bad[:8])
finally:
    srv.terminate()
