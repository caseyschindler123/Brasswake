import subprocess, time, sys, os
DIST = os.environ.get('BW_DIST', '/home/claude/game/dist')
from playwright.sync_api import sync_playwright
ASM = open('/home/claude/game/node_modules/sql.js/dist/sql-asm.js').read()
srv = subprocess.Popen(['python3', '-m', 'http.server', '8765', '--directory', DIST], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
try:
  with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 720}, device_scale_factor=2, has_touch=True, is_mobile=True)
    pg = ctx.new_page(); logs = []
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text else None); pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e) + ' @ ' + str(getattr(e, 'stack', ''))[:600]))
    pg.route('**/cdnjs.cloudflare.com/**', lambda r: r.fulfill(body=ASM, content_type='application/javascript')); pg.route('**/fonts.g*/**', lambda r: r.abort())
    pg.goto('http://localhost:8765/index.html'); pg.wait_for_function("typeof Scene !== 'undefined' && Scene.debug().map", timeout=30000); pg.wait_for_timeout(600)
    pg.click('[data-a=newslot]'); pg.click('[data-a=pick][data-look="4"]'); pg.click('[data-a=begin]'); pg.wait_for_timeout(400); pg.click('[data-a=beat]'); pg.click('[data-a=beat]'); pg.click('[data-a=ashore]'); pg.wait_for_timeout(300)
    pg.evaluate("window.__bwFast = true; __bw.ACT.closesheet(); __bw.S.been[2] = 1" + ("" if os.environ.get('BW_GUIDE') else "; __bw.ACT.gskip(); __bw.ACT.closesheet()"))
    exec(open(sys.argv[1]).read())
    print('ERRORS', logs[:6])
finally:
    srv.terminate()
