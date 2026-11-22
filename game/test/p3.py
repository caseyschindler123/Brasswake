import subprocess, time
from playwright.sync_api import sync_playwright
ASM = open('/home/claude/game/node_modules/sql.js/dist/sql-asm.js').read()
srv = subprocess.Popen(['python3', '-m', 'http.server', '8765', '--directory', '/home/claude/game/dist'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
try:
  with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_context(viewport={'width': 390, 'height': 760}, device_scale_factor=2, has_touch=True, is_mobile=True).new_page(); logs = []
    pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
    pg.route('**/cdnjs.cloudflare.com/**', lambda r: r.fulfill(body=ASM, content_type='application/javascript')); pg.route('**/fonts.g*/**', lambda r: r.abort())
    pg.goto('http://localhost:8765/index.html'); pg.wait_for_function("typeof Scene !== 'undefined' && Scene.debug().map", timeout=20000); pg.wait_for_timeout(800)
    pg.click('[data-a=path][data-look="4"]'); pg.wait_for_timeout(900)
    for r, pos in [(1, [22, 27]), (1, [14, 31]), (8, [22, 27]), (5, [33, 26]), (6, [13, 30]), (4, [40, 13])]:
        pg.evaluate(f"__bw.S.region = {r}; Scene.load({r}, 'plaza', {pos})"); pg.wait_for_timeout(1700); pg.screenshot(path=f'/home/claude/game/dist/p3_{r}_{pos[0]}.png')
    print('LOGS', logs); b.close()
finally: srv.terminate()
