import sys, json
from playwright.sync_api import sync_playwright
ASM = open('/home/claude/game/node_modules/sql.js/dist/sql-asm.js').read()
def new(p, w=390, h=780):
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, has_touch=True, is_mobile=True)
    pg = ctx.new_page()
    logs = []
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
    pg.route('**/cdnjs.cloudflare.com/**', lambda r: r.fulfill(body=ASM, content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    pg.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    pg.goto('file:///home/claude/game/dist/index.html')
    pg.wait_for_function("document.querySelector('#view').innerText.length > 50")
    return b, pg, logs
