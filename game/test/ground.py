import base64
from playwright.sync_api import sync_playwright
ASM = open('/home/claude/game/node_modules/sql.js/dist/sql-asm.js').read()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_context(viewport={'width': 390, 'height': 760}).new_page()
    pg.route('**/cdnjs.cloudflare.com/**', lambda r: r.fulfill(body=ASM, content_type='application/javascript'))
    pg.route('**/fonts.g*/**', lambda r: r.abort())
    pg.goto('file:///home/claude/game/dist/index.html')
    pg.wait_for_function("typeof Scene !== 'undefined' && Scene.debug().map", timeout=20000)
    d = pg.evaluate("(() => { const g = Scene.debug().map.ground, c = document.createElement('canvas'); c.width = 24 * 48; c.height = 22 * 48; c.getContext('2d').drawImage(g, -13 * 48, -15 * 48); return c.toDataURL('image/png'); })()")
    open('/home/claude/artin/ground1.png', 'wb').write(base64.b64decode(d.split(',')[1])); b.close()
