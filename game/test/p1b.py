import math
from playwright.sync_api import sync_playwright
ASM = open('/home/claude/game/node_modules/sql.js/dist/sql-asm.js').read()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 760}, device_scale_factor=3, has_touch=True, is_mobile=True)
    pg = ctx.new_page(); logs = []
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
    pg.route('**/cdnjs.cloudflare.com/**', lambda r: r.fulfill(body=ASM, content_type='application/javascript'))
    pg.route('**/fonts.g*/**', lambda r: r.abort())
    pg.goto('file:///home/claude/game/dist/index.html')
    pg.wait_for_function("typeof Scene !== 'undefined' && Scene.debug().map", timeout=20000)
    pg.click('[data-a=path][data-id=thief]'); pg.wait_for_timeout(800)
    print('load ms:', pg.evaluate("(() => { const t = performance.now(); Scene.load(1, 'plaza'); return Math.round(performance.now() - t); })()"), pg.evaluate("(() => { const t = performance.now(); Scene.load(4, 'plaza'); Scene.load(1, 'plaza'); return Math.round((performance.now() - t) / 2); })()"))
    pg.wait_for_timeout(900)
    def screen(e):
        return pg.evaluate("""(e) => { const d = Scene.debug(), P = d.P, m = d.map, st = document.querySelector('#stage').getBoundingClientRect(), z = 2, vw = Math.ceil(st.width / z), vh = Math.ceil(st.height / z);
          const cx = Math.max(0, Math.min(m.w * 16 - vw, P.fx * 16 + 8 - vw / 2)), cy = Math.max(0, Math.min(m.h * 16 - vh, P.fy * 16 + 8 - vh / 2)); return [st.left + (e[0] * 16 + 8 - cx) * z, st.top + (e[1] * 16 + 4 - cy) * z]; }""", e)
    npc = pg.evaluate("(() => { const e = Scene.debug().map.ents.find(e => e.kind === 'npc' && e.i === 0); return [e.x, e.y]; })()")
    x, y = screen(npc); print('npc at', npc, 'screen', round(x), round(y), 'hero', pg.evaluate("Scene.pos()"))
    pg.touchscreen.tap(x, y); pg.wait_for_timeout(3500)
    print('say open:', pg.evaluate("!!__bw.SB"), 'hero', pg.evaluate("Scene.pos()"))
    pos0 = pg.evaluate("Scene.pos()"); pg.touchscreen.tap(195, 200); pg.wait_for_timeout(700); pg.touchscreen.tap(195, 200); pg.wait_for_timeout(500)
    print('tap on world while talking moved hero:', pg.evaluate("Scene.pos()") != pos0, '| opts', pg.evaluate("document.querySelectorAll('#say .opt').length"))
    pg.screenshot(path='dist/p1_b1.png')
    pg.click('#say .opt[data-a=closesheet]'); pg.wait_for_timeout(200); print('closed:', pg.evaluate("!__bw.SB"))
    # walk somewhere by tap
    pg.touchscreen.tap(195, 560); pg.wait_for_timeout(1500); print('walked to', pg.evaluate("Scene.pos()"), 'mv', pg.evaluate("__bw.S.mv"))
    pg.evaluate("__bw.START.dungeon({})"); pg.wait_for_timeout(1400); pg.screenshot(path='dist/p1_b2.png')
    print('LOGS', logs); b.close()
