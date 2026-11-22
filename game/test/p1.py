import sys, json
from playwright.sync_api import sync_playwright
ASM = open('/home/claude/game/node_modules/sql.js/dist/sql-asm.js').read()
def shot(pg, n): pg.screenshot(path=f'dist/p1_{n}.png')
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 760}, device_scale_factor=2, has_touch=True, is_mobile=True)
    pg = ctx.new_page(); logs = []
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
    pg.route('**/cdnjs.cloudflare.com/**', lambda r: r.fulfill(body=ASM, content_type='application/javascript'))
    pg.route('**/fonts.g*/**', lambda r: r.abort())
    pg.goto('file:///home/claude/game/dist/index.html')
    pg.wait_for_function("typeof Scene !== 'undefined' && Scene.debug().map", timeout=20000)
    pg.wait_for_timeout(700); shot(pg, '0_paths')
    pg.click('[data-a=path][data-id=warrior]'); pg.wait_for_timeout(900); shot(pg, '1_world')
    S = lambda: pg.evaluate("JSON.parse(JSON.stringify(__bw.S))")
    print('start', S()['sk'], 'hp', S()['hp'])
    # speech box, typed
    pg.evaluate("__bw.HOST.interact(Scene.debug().map.ents.find(e => e.kind === 'npc' && e.i === 0))")
    pg.wait_for_timeout(250); shot(pg, '2_say_typing')
    pg.click('#say'); pg.wait_for_timeout(100); pg.click('#say'); pg.wait_for_timeout(1200); pg.click('#say'); pg.wait_for_timeout(300); shot(pg, '3_say_opts')
    pg.evaluate("window.__bwFast = true")
    pg.click('#say .opt[data-a=offer]'); pg.wait_for_timeout(100); shot(pg, '4_offer')
    pg.click('#say .opt[data-a=contract]'); pg.wait_for_timeout(300); shot(pg, '5_lesson')
    pg.fill('#sql', 'SELEC * FROM items'); pg.click('#e-run'); pg.wait_for_timeout(100)
    print('typo:', pg.inner_text('#e-out')[:90].replace('\n', ' | '))
    pg.fill('#sql', pg.evaluate("__bw.E.task.sql")); pg.click('#e-run'); pg.wait_for_timeout(200); shot(pg, '6_lesson_done')
    pg.click('#e-out [data-a=leave]'); pg.wait_for_timeout(200)
    # a fight, animated once
    pg.evaluate("window.__bwFast = false")
    pg.evaluate("__bw.HOST.interact(Scene.debug().map.ents.find(e => e.kind === 'mon' && !e.inst.elite))")
    pg.wait_for_timeout(1500); pg.click('#say'); pg.wait_for_timeout(1500); pg.click('#say'); pg.wait_for_timeout(400); shot(pg, '7_mon_say')
    pg.click("#say .opt[data-m=fight]"); pg.wait_for_timeout(400); shot(pg, '8_battle')
    pg.fill('#sql', pg.evaluate("__bw.E.task.sql")); pg.click('#e-run'); pg.wait_for_timeout(450); shot(pg, '9_battle_mid')
    pg.wait_for_timeout(3200); shot(pg, '10_battle_end')
    print('after round 1:', pg.inner_text('#e-out')[:200].replace('\n', ' | '))
    pg.evaluate("window.__bwFast = true")
    for i in range(6):
        if pg.evaluate("__bw.E && __bw.E.over"): break
        if pg.evaluate("__bw.E.wait"): pg.click('[data-a=nextround]')
        pg.fill('#sql', pg.evaluate("__bw.E.task.sql")); pg.click('#e-run'); pg.wait_for_timeout(60)
    print('fight over:', pg.evaluate("__bw.E.over"), 'kills', S()['stats']['kills'], 'sk', S()['sk'], 'hp', S()['hp'], 'gold', S()['gold'])
    pg.click('#e-after [data-a=leave]'); pg.wait_for_timeout(100)
    # grades
    print('grades:', pg.evaluate("""(() => { const t = { sql: 'SELECT name, unit_price FROM items ORDER BY unit_price DESC', order: [1] }, g = q => { const r = Engine.grade(t, q); return r.err ? 'err' : r.grade + ' ' + r.share.toFixed(2); };
      return [g(t.sql), g('SELECT name, unit_price FROM items ORDER BY unit_price'), g('SELECT unit_price, name FROM items ORDER BY unit_price DESC'), g('SELECT name, unit_price FROM items WHERE unit_price > 20 ORDER BY unit_price DESC'), g('SELECT name, unit_price FROM items ORDER BY unit_price DESC LIMIT 5'), g('SELECT name FROM items'), g('SELECT 1, 2'), g('SELEC')]; })()"""))
    print('odds 40v8:', pg.evaluate("['correct','close','partial','wrong'].map(g => __bw.odds(40, 8, g, .75).p)"), ' 0v8:', pg.evaluate("['correct','close','partial','wrong'].map(g => __bw.odds(0, 8, g, .75).p)"), ' 40v56:', pg.evaluate("['correct','close','partial','wrong'].map(g => __bw.odds(40, 56, g, .75).p)"))
    # wrong answers until the hero falls
    pg.evaluate("__bw.S.hp = 9")
    pg.evaluate("__bw.HOST.interact(Scene.debug().map.ents.find(e => e.kind === 'mon'))"); pg.click("#say .opt[data-m=fight]"); pg.wait_for_timeout(100)
    for i in range(30):
        if pg.evaluate("__bw.E.over"): break
        if pg.evaluate("__bw.E.wait"): pg.click('[data-a=nextround]')
        pg.fill('#sql', 'SELECT 1'); pg.click('#e-run'); pg.wait_for_timeout(40)
    shot(pg, '11_fall'); print('fell:', pg.inner_text('#e-after')[:120].replace('\n', ' | '))
    pg.click('#e-after [data-a=leave]'); pg.wait_for_timeout(600); print('after fall hp', S()['hp'], 'pos', pg.evaluate("Scene.pos()"), 'falls', S()['stats']['falls'])
    # steal
    pg.evaluate("(() => { const e = Scene.debug().map.ents.find(e => e.kind === 'mon'); e.unseen = true; __bw.HOST.interact(e); })()")
    pg.click("#say .opt[data-m=steal]"); pg.wait_for_timeout(100); shot(pg, '12_steal')
    pg.fill('#sql', pg.evaluate("__bw.E.task.sql")); pg.click('#e-run'); pg.wait_for_timeout(80); print('steal:', pg.inner_text('#e-out')[:140].replace('\n', ' | '), '| stealing', S()['sk'].get('stealing'))
    pg.click('#e-after [data-a=leave]')
    # rival duel, boss, dungeon
    pg.evaluate("__bw.HOST.interact(Scene.debug().map.ents.find(e => e.kind === 'rival'))"); shot(pg, '13_rival'); pg.click("#say .opt[data-m=duel]"); pg.wait_for_timeout(80)
    pg.fill('#sql', pg.evaluate("__bw.E.task.sql")); pg.click('#e-run'); pg.wait_for_timeout(80); print('duel:', pg.inner_text('#e-after')[:80].replace('\n', ' | ')); pg.click('#e-after [data-a=leave]')
    pg.evaluate("__bw.S.hp = 60; __bw.HOST.interact(Scene.debug().map.ents.find(e => e.kind === 'boss'))"); shot(pg, '14_boss_say'); pg.click("#say .opt[data-k=boss]"); pg.wait_for_timeout(100); shot(pg, '15_boss')
    for i in range(12):
        if pg.evaluate("__bw.E.over"): break
        if pg.evaluate("__bw.E.wait"): pg.click('[data-a=nextround]')
        pg.fill('#sql', pg.evaluate("__bw.E.task.sql")); pg.click('#e-run'); pg.wait_for_timeout(40)
    print('boss:', pg.inner_text('#e-after')[:160].replace('\n', ' | '), '| rounds', pg.evaluate("__bw.E.round")); pg.click('#e-after [data-a=leave]'); pg.wait_for_timeout(500)
    pg.evaluate("__bw.S.hp = 70; __bw.START.dungeon({})"); pg.wait_for_timeout(900); shot(pg, '16_dungeon')
    for gi in range(3):
        pg.evaluate("__bw.S.hp = 70; __bw.HOST.interact(Scene.debug().map.ents.find(e => e.kind === 'guard'))"); pg.wait_for_timeout(60)
        if gi == 0: shot(pg, '17_guard')
        for i in range(10):
            if pg.evaluate("__bw.E.over"): break
            if pg.evaluate("__bw.E.wait"): pg.click('[data-a=nextround]')
            pg.fill('#sql', pg.evaluate("__bw.E.task.sql")); pg.click('#e-run'); pg.wait_for_timeout(40)
        if pg.evaluate("!!__bw.E.kick"): print('fell in dungeon'); break
        pg.click('#e-after [data-a=leave]'); pg.wait_for_timeout(60)
    if pg.evaluate("!!__bw.DG"):
        pg.evaluate("__bw.HOST.interact(Scene.debug().map.ents.find(e => e.kind === 'chest'))"); pg.wait_for_timeout(100); shot(pg, '18_chest'); print('chest:', pg.inner_text('#sheet-body')[:120].replace('\n', ' | ')); pg.click('#sheet [data-a=closesheet]')
        pg.evaluate("__bw.ACT.exitdungeon()"); pg.wait_for_timeout(500)
    # open road and every region's look
    pg.evaluate("window.__bwFast = false")
    for r in range(2, 9):
        pg.evaluate(f"__bw.HOST.travel({r}, 'S')"); pg.wait_for_timeout(1000); shot(pg, f'r{r}')
    pg.evaluate("__bw.HOST.travel(1, 'plaza')"); pg.wait_for_timeout(900)
    for t in ['hero', 'bag', 'map', 'ledger']:
        pg.click(f'#nav [data-t={t}]'); pg.wait_for_timeout(250); shot(pg, 'v_' + t)
    print('final', json.dumps(S()['sk']), 'hp', S()['hp'], 'gold', S()['gold'], 'been', S()['been'])
    print('LOGS', logs)
    b.close()
