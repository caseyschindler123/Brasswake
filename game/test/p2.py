import subprocess, time, json
from playwright.sync_api import sync_playwright
ASM = open('/home/claude/game/node_modules/sql.js/dist/sql-asm.js').read()
srv = subprocess.Popen(['python3', '-m', 'http.server', '8765', '--directory', '/home/claude/game/dist'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
def shot(pg, n): pg.screenshot(path=f'/home/claude/game/dist/p2_{n}.png')
try:
  with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 760}, device_scale_factor=2, has_touch=True, is_mobile=True)
    pg = ctx.new_page(); logs = []; reqs = []
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
    pg.on('response', lambda r: reqs.append((r.status, r.url.split('/dist/')[-1].split('8765/')[-1])) if '8765' in r.url else None)
    pg.route('**/cdnjs.cloudflare.com/**', lambda r: r.fulfill(body=ASM, content_type='application/javascript'))
    pg.route('**/fonts.g*/**', lambda r: r.abort())
    pg.goto('http://localhost:8765/index.html')
    pg.wait_for_function("typeof Scene !== 'undefined' && Scene.debug().map", timeout=20000)
    pg.wait_for_timeout(1200); shot(pg, '0_paths')
    pg.click('[data-a=path][data-look="1"]'); pg.wait_for_timeout(1200); shot(pg, '1_world')
    print('pending', pg.evaluate("!!Scene.debug().map.pending"), 'hero art', pg.evaluate("!!Scene.debug().P.spr.art"), 'look', pg.evaluate("__bw.S.look"))
    pg.touchscreen.tap(120, 600); pg.wait_for_timeout(450); shot(pg, '2_walk')
    pg.wait_for_timeout(1500)
    pg.evaluate("__bw.HOST.interact(Scene.debug().map.ents.find(e => e.kind === 'npc' && e.i === 0))"); pg.wait_for_timeout(1400); pg.click('#say'); pg.wait_for_timeout(300); shot(pg, '3_say')
    pg.evaluate("window.__bwFast = true"); pg.click('#say .opt[data-a=offer]'); pg.click('#say .opt[data-a=contract]'); pg.wait_for_timeout(500); shot(pg, '4_lesson')
    pg.fill('#sql', pg.evaluate("__bw.E.task.sql")); pg.click('#e-run'); pg.wait_for_timeout(100); pg.click('#e-out [data-a=leave]')
    pg.evaluate("(() => { const e = Scene.debug().map.ents.find(e => e.kind === 'mon' && e.inst.tpl === 'b103') || Scene.debug().map.ents.find(e => e.kind === 'mon' && e.inst.tpl !== 'b101'); __bw.HOST.interact(e); })()"); pg.wait_for_timeout(300); shot(pg, '5_mon_say')
    pg.click("#say .opt[data-m=fight]"); pg.wait_for_timeout(900); shot(pg, '6_battle')
    pg.evaluate("window.__bwFast = false"); pg.fill('#sql', pg.evaluate("__bw.E.task.sql")); pg.click('#e-run'); pg.wait_for_timeout(500); pg.evaluate("document.querySelector('#e-body').scrollTop = 0"); shot(pg, '7_battle_hit'); pg.wait_for_timeout(3500)
    pg.evaluate("window.__bwFast = true")
    for i in range(6):
        if pg.evaluate("__bw.E.over"): break
        if pg.evaluate("__bw.E.wait"): pg.click('[data-a=nextround]')
        pg.fill('#sql', pg.evaluate("__bw.E.task.sql")); pg.click('#e-run'); pg.wait_for_timeout(60)
    pg.click('#e-after [data-a=leave]'); pg.wait_for_timeout(200)
    pg.evaluate("__bw.S.hp = 60; __bw.HOST.interact(Scene.debug().map.ents.find(e => e.kind === 'boss'))"); pg.click("#say .opt[data-k=boss]"); pg.wait_for_timeout(900); shot(pg, '8_boss'); pg.evaluate("__bw.ACT.leave()")
    pg.evaluate("__bw.START.dungeon({})"); pg.wait_for_timeout(1500); shot(pg, '9_dungeon')
    pg.evaluate("__bw.HOST.interact(Scene.debug().map.ents.find(e => e.kind === 'guard'))"); pg.wait_for_timeout(900); shot(pg, '10_guard'); pg.evaluate("__bw.ACT.leave()"); pg.evaluate("__bw.ACT.exitdungeon()"); pg.wait_for_timeout(600)
    pg.evaluate("window.__bwFast = false")
    for r in range(1, 9):
        pg.evaluate(f"__bw.HOST.travel({r}, 'plaza')"); pg.wait_for_timeout(1500); shot(pg, f'r{r}')
        print(r, 'pending', pg.evaluate("!!Scene.debug().map.pending"), 'art objs', pg.evaluate("Scene.debug().map.objs.filter(o => o.s.c.hr).length + '/' + Scene.debug().map.objs.length"), 'art ents', pg.evaluate("Scene.debug().map.ents.filter(e => (e.spr && e.spr.art) || (e.obj && e.obj.c.hr)).length + '/' + Scene.debug().map.ents.length"))
    bad = [r for r in reqs if r[0] >= 400]; print('requests', len(reqs), 'failed', bad[:6]); print('LOGS', [l for l in logs if 'fonts' not in l][:6])
    b.close()
finally:
    srv.terminate()
