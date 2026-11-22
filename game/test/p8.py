import subprocess, time, json, sys
from playwright.sync_api import sync_playwright
ASM = open('/home/claude/game/node_modules/sql.js/dist/sql-asm.js').read()
srv = subprocess.Popen(['python3', '-m', 'http.server', '8765', '--directory', '/home/claude/game/dist'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
def shot(pg, n): pg.screenshot(path=f'/home/claude/game/shots/p8_{n}.png')
try:
  with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 720}, device_scale_factor=2, has_touch=True, is_mobile=True)
    pg = ctx.new_page(); logs = []; bad = []
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
    pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
    pg.on('response', lambda r: bad.append(r.url) if r.status >= 400 else None)
    pg.route('**/cdnjs.cloudflare.com/**', lambda r: r.fulfill(body=ASM, content_type='application/javascript')); pg.route('**/fonts.g*/**', lambda r: r.abort())
    t0 = time.time(); pg.goto('http://localhost:8765/index.html'); pg.wait_for_function("typeof Scene !== 'undefined' && Scene.debug().map", timeout=30000); print('world up in', round(time.time() - t0, 1), 's'); pg.wait_for_timeout(900); shot(pg, '0_title')
    pg.click('[data-a=newslot]'); pg.wait_for_timeout(300); pg.click('[data-a=pick][data-look="0"]'); pg.fill('#cr-name', 'Casey'); pg.click('[data-a=begin]'); pg.wait_for_timeout(700); shot(pg, '1_cold')
    pg.click('[data-a=beat]'); pg.wait_for_timeout(200); shot(pg, '1_beat1'); pg.click('[data-a=beat]'); pg.wait_for_timeout(200); shot(pg, '1_beat2')
    pg.click('[data-a=ashore]'); pg.wait_for_timeout(1800); shot(pg, '2_dock')
    S = lambda: pg.evaluate("JSON.parse(JSON.stringify(__bw.S))")
    d = pg.evaluate("(() => { const m = Scene.debug().map, k = {}; for (const e of m.ents) k[e.kind] = (k[e.kind] || 0) + 1; return { ents: k, blds: m.blds.length, props: m.props.length, terr: m.terr.length, pos: Scene.pos(), towns: Scene.towns(), spots: Scene.spots() }; })()")
    print(json.dumps(d)[:900])
    for i in range(8):
        if not pg.evaluate('!!__bw.SB'): break
        pg.click('#say'); pg.wait_for_timeout(400)
    pg.evaluate("__bw.ACT.closesheet()")
    # walk east by tapping
    for i in range(3): pg.mouse.click(360, 300); pg.wait_for_timeout(1500)
    shot(pg, '3_walk'); print('pos after taps', pg.evaluate("Scene.pos()"), 'mv', S()['mv'])
    t = d['towns'][1]; pg.evaluate(f"Scene.warp({t[0]-4},{t[1]-3})"); pg.wait_for_timeout(1500); shot(pg, '4_town')
    pg.evaluate(f"Scene.warp({t[0]+8},{t[1]+3})"); pg.wait_for_timeout(1500); shot(pg, '5_town2')
    pg.evaluate("window.__bwFast = true")
    pg.evaluate("__bw.HOST.interact(Scene.find(e => e.kind === 'npc' && e.i === 0 && e.r === 1))"); pg.wait_for_timeout(200); shot(pg, '6_odalys')
    pg.click('#say .opt[data-a=start]'); pg.wait_for_timeout(300); shot(pg, '7_i1')
    pg.click('[data-a=qstep]'); pg.wait_for_timeout(200); shot(pg, '8_i2'); pg.click('[data-a=qstep]'); pg.wait_for_timeout(200)
    pg.click('[data-a=blank][data-w=name]'); pg.click('[data-a=blank][data-w=vendors]'); pg.click('[data-a=blankrun]'); pg.wait_for_timeout(150); shot(pg, '9_i3_wrong')
    pg.click('[data-a=unblank][data-i="0"]'); pg.click('[data-a=blank][data-w=realm]'); pg.click('[data-a=blankrun]'); pg.wait_for_timeout(150); shot(pg, '10_i3_ok')
    pg.click('[data-a=qstep]'); pg.wait_for_timeout(250); shot(pg, '11_rep1')
    # type with the game keyboard: SELECT name FROM items
    def key(sel): pg.dispatch_event(sel, 'pointerdown')
    def li(v):
        pg.dispatch_event(f'#klist .li[data-ins="{v}"]', 'pointerdown', {'clientX': 5, 'clientY': 5}); pg.dispatch_event(f'#klist .li[data-ins="{v}"]', 'pointerup', {'clientX': 5, 'clientY': 5})
    key('#kb [data-fn=lcmd]'); li('SELECT'); key('#kb [data-fn=ldone]')
    for ch in 'name': key(f'#kb .row .k[data-k="{ch}"]')
    key('#kb [data-fn=lcmd]'); li('FROM'); key('#kb [data-fn=lfld]'); li('items'); key('#kb [data-fn=ldone]'); pg.wait_for_timeout(100); shot(pg, '12_rep1_typed'); print('typed:', repr(pg.input_value('#sql')))
    key('#kb [data-fn=run]'); pg.wait_for_timeout(200)
    for i in range(3):
        print('rep', pg.evaluate("__bw.Q.i"), pg.evaluate("__bw.Q.task.ask")); pg.fill('#sql', pg.evaluate("__bw.Q.task.sql")); key('#kb [data-fn=run]'); pg.wait_for_timeout(200)
    shot(pg, '13_result'); print('step', pg.evaluate("__bw.Q.step"), 'tut', S()['tut'], 'gold', S()['gold'])
    pg.click('[data-a=qleave]'); pg.wait_for_timeout(300); shot(pg, '14_after'); print('odalys:', pg.inner_text('#say')[:80].replace('\n', ' ')); pg.evaluate("__bw.ACT.closesheet()")
    # first fight
    mon = "Scene.find(e => e.kind === 'mon' && e.r === 1 && !e.inst.elite)"
    mp = pg.evaluate(f"(() => {{ const e = {mon}; return [e.x, e.y, e.inst.tpl]; }})()"); print('nearest tpls', mp)
    pg.evaluate(f"(() => {{ const e = {mon}; Scene.warp(e.x + 1, e.y); }})()"); pg.wait_for_timeout(1200)
    pg.evaluate(f"__bw.HOST.interact({mon})"); pg.wait_for_timeout(500); shot(pg, '15_choose')
    pg.evaluate("window.__bwFast = false"); pg.click('.pg[data-a=fpage]'); pg.wait_for_timeout(500); shot(pg, '16_prompt'); print('ask:', pg.evaluate("__bw.F.task.ask"))
    pg.fill('#sql', pg.evaluate("__bw.F.task.sql")); key('#kb [data-fn=run]'); pg.wait_for_timeout(900); shot(pg, '17_swing'); pg.wait_for_timeout(4500); shot(pg, '18_after')
    for i in range(6):
        st = pg.evaluate("__bw.F && [__bw.F.st, __bw.F.over, __bw.F.foe && __bw.F.foe.hp, __bw.S.hp]"); print('fight', st)
        if not st or st[1]: break
        pg.click('#f-after [data-a=fpage]'); pg.wait_for_timeout(300); pg.fill('#sql', pg.evaluate("__bw.F.task.sql")); key('#kb [data-fn=run]'); pg.wait_for_timeout(5500)
    shot(pg, '19_end'); pg.click('[data-a=fdone]'); pg.wait_for_timeout(600); shot(pg, '20_world'); print('kills', S()['stats']['kills'], 'tut', S()['tut'], 'hp', S()['hp'])
    print('ERRORS', logs[:8]); print('BAD', bad[:8])
finally:
    srv.terminate()
