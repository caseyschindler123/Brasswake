import sys; sys.path.insert(0, '/home/claude/game/test')
from playwright.sync_api import sync_playwright
ASM = open('/home/claude/game/node_modules/sql.js/dist/sql-asm.js').read()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 760}, device_scale_factor=2, has_touch=True, is_mobile=True)
    pg = ctx.new_page(); logs = []
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
    pg.route('**/cdnjs.cloudflare.com/**', lambda r: r.fulfill(body=ASM, content_type='application/javascript'))
    pg.route('**/fonts.g*/**', lambda r: r.abort())
    pg.goto('file:///home/claude/game/dist/index.html')
    try:
        pg.wait_for_function("typeof Scene !== 'undefined' && Scene.debug().map", timeout=15000)
    except Exception as e:
        print('NO SCENE', logs); b.close(); sys.exit()
    pg.wait_for_timeout(900); pg.screenshot(path='dist/w0_intro.png')
    pg.click('[data-a=begin]'); pg.wait_for_timeout(1200); pg.screenshot(path='dist/w1.png')
    print('ents:', pg.evaluate("Scene.debug().map.ents.map(e=>e.kind).join(',')"), '| wild tiles:', pg.evaluate("Scene.debug().map.wild.length"), '| objs', pg.evaluate("Scene.debug().map.objs.length"))
    t0 = pg.evaluate("performance.now()"); pg.evaluate("for(let r=1;r<=8;r++){Scene.load(r,'plaza')}"); print('gen 8 regions ms:', round(pg.evaluate("performance.now()") - t0))
    pg.evaluate("for(let r=1;r<8;r++) __bw.S.boss[r]=1")
    for r in range(2, 9):
        pg.evaluate(f"__bw.HOST.travel({r}, 'plaza')"); pg.wait_for_timeout(900); pg.screenshot(path=f'dist/w{r}.png')
    print('LOGS', logs)
    b.close()
